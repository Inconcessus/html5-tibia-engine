"use strict";

const Creature = require("./creature");
const ActionManager = require("./action");
const DamageMap = require("./damage-map");
const Position = require("./position");
const Behaviour = require("./behaviour");

const Monster = function(spawn) {

  /*
   * Class Monster
   * Container for an attackable monster
   */

  // Fetch data from its prototype
  let data = process.gameServer.database.getMonster(spawn.mid);

  // Inherit from creature
  Creature.call(this, data.creatureStatistics);
	
  // Save the monster spawn information
  this.spawn = spawn;
  this.position = spawn.position;

  // The monster type
  this.type = Creature.prototype.TYPE.MONSTER;

  // Map for damage done to the creature
  this.damageMap = new DamageMap();

  // Container for the behaviour
  this.behaviour = new Behaviour(this);
  this.behaviour.setBehaviour(data.behaviour);

  // Monsters have these actions to choose from
  this.actions.add(this.handleActionMove);
  this.actions.add(this.handleSpellAction);
  this.actions.add(this.handleActionAttack);
  this.actions.add(this.handleActionTarget);

  // Sayings were configured
  if(data.hasOwnProperty("sayings")) {
    this.actions.add(this.handleActionSpeak);
  }

  // Register specific callback events
  if(data.events && data.events.length > 0) {
    this.__registerEvents(data.events);
  }

  // The spellbook of the creature
  this.spellActions = new ActionManager();

  // Add the spells
  if(data.spells) {
    this.__addSpells(data.spells);
  }

}

Monster.prototype = Object.create(Creature.prototype);
Monster.prototype.constructor = Monster;

Monster.prototype.setTarget = function(target) {

  this.behaviour.setTarget(target);

}

Monster.prototype.isTileOccupied = function(tile) {

  /*
   * Function Monster.isTileOccupied
   * Function evaluated for a tile whether it is occupied for the monster or not
   */

  if(tile === null) {
    return true;
  }

  // Tiles that block solid can never be walked on
  if(tile.isBlockSolid()) {
    return true;
  }

  if(tile.isProtectionZone()) {
    return true;
  }

  // The tile items contain a block solid (e.g., a wall)
  if(tile.itemStack.isBlockSolid(this.behaviour.openDoors)) {
    return true;
  }

  // Cannot pass through characters
  if(tile.isOccupiedCharacters()) {
    return true;
  }

  return false;

}

Monster.prototype.createCorpse = function() {

  /*
   * Function Monster.createCorpse
   * Returns the corpse of a particular creature
   */

  // Get the monster prototype (different from thing definitions)
  let proto = this.getPrototype();

  // Create a new corpse based on the monster type
  let corpse = process.gameServer.database.createThing(proto.corpse);

  if(corpse.isDecaying()) {
    corpse.scheduleDecay();
  }

  // Add loot to the corpse and schedule a decay event
  if(corpse.constructor.name === "Corpse") {
    corpse.addLoot(proto.loot);
    this.damageMap.distributeExperienceAndLoot(this.getPrototype(), corpse.container.__slots.nullfilter());
  } else {
    this.damageMap.distributeExperienceAndLoot(this.getPrototype(), []);
  }

  // Add the experience

  return corpse;

}

Monster.prototype.getPrototype = function() {

  /*
   * Function Monster.getPrototype
   * Returns the prototype definition of a monster from its monster identifier
   */

  return process.gameServer.database.getMonster(this.spawn.mid);

}

Monster.prototype.getTarget = function() {

  /*
   * Function Creature.getTarget
   * Returns the target of a creature
   */

  return this.behaviour.target;

}

Monster.prototype.push = function(position) {

  /*
   * Function Monster.push
   * Cooldown function that handles the creature movement
   */

  // Cannot push when the creature is moving
  if(this.isMoving()) {
    return;
  }

  if(!position.besides(this.position)) {
    return;
  }

  let tile = process.gameServer.world.getTileFromWorldPosition(position);

  if(tile === null || tile.id === 0) {
    return;
  }

  let lockDuration = this.getStepDuration(tile.getFriction());

  // Determine the slowness
  let slowness = this.position.isDiagonal(position) ? 2 * lockDuration : lockDuration;

  // Delegate to move the creature to the new tile position
  process.gameServer.world.moveCreature(this, position);

  // Lock this function for a number of frames
  this.actions.lock(this.handleActionMove, slowness);

}

Monster.prototype.handleActionMove = function() {

  /*
   * Function Monster.handleActionMove
   * Cooldown function that handles the creature movement
   */

  // Let the creature decide its next strategic move
  let tile = this.behaviour.getNextMoveTile();

  // Invalid tile was returned: do nothing
  if(tile === null) {
    return;
  }

  if(tile.id === 0) {
    return;
  }

  let lockDuration = this.getStepDuration(tile.getFriction());

  // Number of frames to lock
  let slowness = this.position.isDiagonal(tile.position) ? 2 * lockDuration : lockDuration;

  // Delegate to move the creature to the new tile position
  process.gameServer.world.moveCreature(this, tile.position);

  // Lock this function for a number of frames
  this.actions.lock(this.handleActionMove, slowness);

}

Monster.prototype.handleActionTarget = function() {

  /*
   * Function Monster.handleActionTarget
   * Handles targeting action of the monster that is done every once in a while
   */

  // Delegate to find or drop a target
  this.behaviour.handleTarget();

  this.lockAction(this.handleActionTarget, ActionManager.prototype.GLOBAL_COOLDOWN);

}

Monster.prototype.handleActionSpeak = function() {

  /*
   * Function Monster.handleActionSpeak
   * Handles speaking action of the monster
   */

  let sayings = this.getProperty("sayings");

  // Say a random thing
  if(Math.random() > 0.15) {
    this.internalCreatureSay(sayings.texts.random(), CONST.COLOR.ORANGE);
  }

  // Lock the action for a random duration
  this.lockAction(this.handleActionSpeak, Number.prototype.random(1, 5) * sayings.slowness);

}

Monster.prototype.handleActionAttack = function() {

  /*
   * Function Monster.handleActionAttack
   * Handles the attack action for a monster
   */

  // No target or not besides target: do nothing
  if(!this.behaviour.is(this.behaviour.BEHAVIOUR.HOSTILE)) {
    return this.lockAction(this.handleActionAttack, ActionManager.prototype.GLOBAL_COOLDOWN);
  }

  // We do not have a target
  if(!this.behaviour.hasTarget()) {
    return this.lockAction(this.handleActionAttack, ActionManager.prototype.GLOBAL_COOLDOWN);
  }

  // Fetch the target
  let target = this.getTarget();

  // Target is offline or missing
  if(!this.behaviour.canSeeTarget()) {
    return this.lockAction(this.handleActionAttack, ActionManager.prototype.GLOBAL_COOLDOWN);
  }

  // Put the target player in combat
  if(target.constructor.name === "Player") {
    target.combatLock.lockSeconds(target.COMBAT_LOCK_SECONDS);
  }

  // Not yet besides the target
  if(!this.behaviour.isBesidesTarget()) {
    return this.lockAction(this.handleActionAttack, ActionManager.prototype.GLOBAL_COOLDOWN);
  }

  // Match the angle to the target
  this.setDirection(this.position.getFacingDirection(target.position));

  // Delegate to handle the actual combat
  process.gameServer.world.handleCombat(this);

  // And lock the attack action until next time
  this.lockAction(this.handleActionAttack, this.attackSlowness);

}

Monster.prototype.hasTarget = function() {

  return this.behaviour.hasTarget();

}

Monster.prototype.handleSpellAction = function() {

  /*
   * Function Monster.handleSpellAction
   * Handles monster cast spell events
   */

  // Must have a target before casting any spells
  if(!this.behaviour.hasTarget()) {
    return;
  }

  // Always lock the global spell cooldown
  this.lockAction(this.handleSpellAction, ActionManager.prototype.GLOBAL_COOLDOWN);

  // Can not shoot at the target (line of sight blocked)
  if(!this.isInLineOfSight(this.behaviour.target)) {
    return;
  }

  // Go over all the available spells in the spellbook
  this.spellActions.forEach(function(spell) {

    // This means there is a failure to cast the spell
    if(Math.random() > spell.chance) {
      return;
    }

    // Get the spell callback from the database and apply it
    let cast = process.gameServer.database.getSpell(spell.id);

    // If casting was succesful lock it with the specified cooldown
    if(cast.call(this, spell)) {
      this.spellActions.lock(spell, spell.cooldown);
    }

  }, this);
  
}

Monster.prototype.isDistanceWeaponEquipped = function() {

  /*
   * Function Monster.isDistanceWeaponEquipped
   * Returns true if the monster has a distance weapon equipped
   */

  return false;

}

Monster.prototype.decreaseHealth = function(attacker, amount, color) {

  /*
   * Function Monster.decreaseHealth
   * Callback fired when the health of a creature decreases with a particular amount
   */

  // Record the attack in the damage map
  this.damageMap.update(attacker, amount);

  // Delegate to the internal function
  this.internalDecreaseHealth(attacker, amount, color);

  // Inform behaviour handler of the damage event
  this.behaviour.handleDamage(attacker);

}

Monster.prototype.getProperty = function(property) {

  /*
   * Function Monster.getProperty
   * Returns a property from the monster prototype definition
   */

  let proto = this.getPrototype();

  if(!proto.hasOwnProperty(property)) {
    return null;
  }

  return proto[property];

}

Monster.prototype.__addSpells = function(spells) {

  /*
   * Function Monster.__addSpells
   * Adds the spells to the spellbook
   */

  spells.forEach(spell => this.spellActions.add(spell));

}

module.exports = Monster;