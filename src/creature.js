"use strict";

const ActionManager = require("./action.js");
const Condition = require("./condition");
const ConditionManager = require("./condition-manager");
const EventEmitter = require("./eventemitter");
const FluidContainer = require("./fluidcontainer");
const Outfit = require("./outfit");
const PacketWriter = require("./packet-writer");
const PacketReader = require("./packet-reader");
const Position = require("./position");

const Creature = function(data) {

  /*
   * Class Creature
   * Base container for all creatures (npc, monster, player)
   *
   * Creature.internalCreatureSay(message, color) - writes a character message to all spectators
   *
   */

  // Inherits from event emitter
  EventEmitter.call(this);

  // Assign a unique persistent identifier to each creature
  this.guid = process.gameServer.world.assignUID();

  // All creatures have the following state
  this.position = null;
  this.direction = Position.prototype.SOUTH;

  // Set defaults properties
  this.name = data.name ?? "Unknown";
  this.speed = data.speed;

  this.health = data.health ?? 1;
  this.maxHealth = data.maxHealth ?? 1;
  this.mana = data.mana ?? 0;
  this.maxMana = data.maxMana ?? 0;
  this.attack = data.attack ?? 0;
  this.attackSlowness = data.attackSlowness ?? 0;
  this.defense = data.defense ?? 0;

  // Wrapper for the outfit
  this.outfit = new Outfit(data.outfit);

  // All creatures have action functions that can be added: these are executed whenever available
  this.actions = new ActionManager();

  // The conditions that are affecting the creature
  this.conditions = new ConditionManager(this);

  // Internal state of each creature
  this.__chunk = null;
  this.__target = null;
  this.__spawnPosition = null;

}

// Set the prototype and constructor
Creature.prototype = Object.create(EventEmitter.prototype);
Creature.prototype.constructor = Creature;

// Enumeration of player types
Creature.prototype.TYPE = new Object({
  "PLAYER": 0x00,
  "MONSTER": 0x01,
  "NPC": 0x02
});

Creature.prototype.sendCancelMessage = function() {

  return;

}

Creature.prototype.getFacePosition = function() {

  switch(this.direction) {
    case Position.prototype.NORTH: return this.position.north();
    case Position.prototype.EAST: return this.position.east();
    case Position.prototype.SOUTH: return this.position.south();
    case Position.prototype.WEST: return this.position.west();
  }

}

Creature.prototype.getSpeed = function() {

  return this.speed;

}

Creature.prototype.getStepDuration = function(friction) {

  /*
   * Function Creature.getStepDuration
   * Math to calcualte the amount of frames to lock when walking (50MS tick)
   * See: https://tibia.fandom.com/wiki/Speed_Breakpoints
   */

  const A = 857.36;
  const B = 261.29;
  const C = -4795.009;

  // Logarithm of speed with some constants (never less than 1)
  let calculatedStepSpeed = Math.max(1, Math.round(A * Math.log(this.getSpeed() + B) + C));

  return Math.ceil(Math.floor(1000 * friction / calculatedStepSpeed) / CONFIG.SERVER.MS_TICK_INTERVAL);

}

Creature.prototype.isDrunk = function(id) {

  return this.hasCondition(Condition.prototype.DRUNK) && !this.hasCondition(Condition.prototype.SUPPRESS_DRUNK);

}

Creature.prototype.hasCondition = function(id) {

  /*
   * Function Creature.hasCondition
   * Returns true if the creature has a particular condition
   */

  return this.conditions.has(id);

}

Creature.prototype.removeCondition = function(id) {

  /*
   * Function Creature.addCondition
   * Removes a condition from the creature
   */

  return this.conditions.remove(id);

}

Creature.prototype.addCondition = function(id, ticks, duration, properties) {

  /*
   * Function Creature.addCondition
   * Adds a condition to the creature
   */

  let condition = new Condition(id, ticks, duration);

  // The condition is already applied: remove it first
  if(this.hasCondition(condition.id)) {
    return this.conditions.replace(condition, properties);
  }

  // Add the condition
  this.conditions.add(condition, properties);

  return true;

}

Creature.prototype.sayEmote = function(emote, color) {

  /*
   * Function Creature.sayEmote
   * Makes the creature say an emote with a particular color
   */

  this.broadcastFloor(new PacketWriter(PacketWriter.prototype.opcodes.WRITE_EMOTE).writeCreatureSay(this, emote, color));

}

Creature.prototype.handleOpenDoor = function(thing) {

  /*
   * Function Creature.handleOpenDoor
   * Checks whether a door exists at the tile and that the door can be opened
   */

  // There is no thing or the thing is not a door
  if(thing === null || !thing.isDoor()) {
    return;
  }

  // If the door is closed then just open it
  if(!thing.isOpened() && !thing.isLocked()) {
    return thing.open();
  }

}

Creature.prototype.getFluidType = function() {

  /*
   * Function Creature.getFluidType
   * Returns the fluid type of a creature
   */

  switch(this.getPrototype().fluidType) {
    case CONST.BLOODTYPE.BLOOD: return FluidContainer.prototype.FLUID_TYPES.BLOOD;
    case CONST.BLOODTYPE.POISON: return FluidContainer.prototype.FLUID_TYPES.SLIME;
    default: return FluidContainer.prototype.FLUID_TYPES.BLOOD;
  }

}

Creature.prototype.getChunk = function() {

  /*
   * Function Creature.getChunk
   * Returns the sector that a creature is in
   */

  return this.__chunk;

}

Creature.prototype.getAdjacentChunks = function() {

  /*
   * Function Creature.getAdjacentChunks
   * Returns all neighbouring sectors (including self)
   */

  if(this.__chunk === null) {
    return new Array();
  }

  return this.__chunk.neighbours;

}

Creature.prototype.getHealthFraction = function() {

  /*
   * Function Creature.getHealthFraction
   * Returns the health fraction of a particular creature
   */

  return (this.health / this.maxHealth);

}

Creature.prototype.getTarget = function() {

  /*
   * Function Creature.getTarget
   * Returns the target of a creature
   */

  return this.__target;

}

Creature.prototype.changeOutfit = function(outfit) {

  /*
   * Function Creature.changeOutfit
   * Changes the outfit (look type) of a creature
   */

  // Check whether the outfit is in fact valid
  if(!outfit.isValid()) {
    return;
  }

  // Internall change the outfit
  this.__setOutfit(outfit);

  // Broadcast change the change to all spectators
  this.broadcast(new PacketWriter(PacketWriter.prototype.opcodes.CHANGE_OUTFIT).writeChangeOutfit(this));

}

Creature.prototype.calculateDefense = function() {

  /*
   * Creature.calculateDefense
   * Calculates the random damage mitigated by a defense
   */

  // Draw a random sample between 0 and the defense
  return Number.prototype.random(0, this.getDefense());

}

Creature.prototype.calculateDamage = function() {

  /*
   * Creature.calculateDamage
   * Calculates the random damage done by an attack
   */

  // Draw a random sample
  return Number.prototype.random(0, this.getAttack());

}

Creature.prototype.getPosition = function() {

  /*
   * Function Creature.getPosition
   * Returns the position of the creature
   */

  return this.position;

}

Creature.prototype.getDefense = function() {

  /*
   * Function Creature.getDefense
   * Base creature function that returns the defense of a particular creature
   */

  return this.defense;

}

Creature.prototype.getAttack = function() {

  /*
   * Function Creature.getAttack
   * Base creature function that returns the attack of a particular creature
   */

  return this.attack;

}

Creature.prototype.lockAction = function(action, duration) {

  /*
   * Function Creature.lockAction
   * Locks a particular action for a particular time
   */

  return this.actions.lock(action, duration);

}

Creature.prototype.leaveOldChunk = function(oldChunks) {

  /*
   * Function Creature.leaveOldChunk
   * Called when the creatures leaves a number of adjacent chunks
   */

  // Dereference self in these old chunks. Other players then know they should not keep a reference to this player
  oldChunks.forEach(chunk => chunk.__internalBroadcast(this.deintroduce()));

}

Creature.prototype.enterNewChunk = function(newChunks) {

  /*
   * Function Creature.enterNewChunk
   * Called when the creatures enters a number of new adjacent chunks
   */

  // Introduce self to the new chunk
  newChunks.forEach(chunk => chunk.__internalBroadcast(this.info()));

}

Creature.prototype.canSee = function(position) {

  /*
   * Function Creature.prototype.canSee
   * Returns whether a creature can see another creature
   */

  return Math.abs(this.position.x - position.x) < 8 &&
         Math.abs(this.position.y - position.y) < 6;
}

Creature.prototype.setHealth = function(health) {

  /*
   * Function Creature.setHealth
   * Sets the health of a creature and clamps it between zero and the maximum health of the creature
   */

  // Update the health but clamp it between 0 and the creature's maximum health
  this.health = health.clamp(0, this.maxHealth);

  // Can subscribe to this
  this.emit("healthchange", this.health);

}

Creature.prototype.setChunk = function(chunk) {

  /*
   * Function Creature.setChunk
   * Sets the chunk of the creature
   */

  this.__chunk = chunk;

}

Creature.prototype.setPosition = function(position) {

  /*
   * Function Creature.setPosition
   * Sets the position of the creature
   */

  this.position = position;

}

Creature.prototype.setDirection = function(direction) {

  /*
   * Function Creature.setDirection
   * Sets the creature look direction
   */

  // Update the state
  this.direction = direction;

  // Inform spectators
  this.broadcast(new PacketWriter(PacketWriter.prototype.opcodes.CREATURE_TURN).writeCreatureTurn(this.guid, direction));

}

Creature.prototype.deintroduce = function() {

  /*
   * Function Creature.deintroduce
   * Returns the pack to deintroduce the creature to spectators
   */

  return new PacketWriter(PacketWriter.prototype.opcodes.ENTITY_REMOVE).writeCreatureRemove(this.guid);

}

Creature.prototype.info = function() {

  /*
   * Function Creature.info
   * Serializes creature information and sends it over to the client
   */

  return new PacketWriter(PacketWriter.prototype.opcodes.CREATURE_INFO).writeCreatureInfo(this);

}

Creature.prototype.internalCreatureYell = function(message, color) {

  /*
   * Function Creature.internalCreatureYell
   * Yells a messages to even far away characters
   */

  this.broadcast(new PacketWriter(PacketWriter.prototype.opcodes.CREATURE_SAY).writeCreatureSay(this, message.toUpperCase(), color));

}

Creature.prototype.internalCreatureWhisper = function(message, color) {

  /*
   * Function Creature.internalCreatureWhisper
   * Whispers to nearby creatures on the adjacent tiles
   */

  // Get the tile from the creature position
  let tile = process.gameServer.world.getTileFromWorldPosition(this.position);
  let packet = new PacketWriter(PacketWriter.prototype.opcodes.CREATURE_SAY).writeCreatureSay(this, message, color);

  tile.broadcastNeighbours(packet);

}

Creature.prototype.internalCreatureSay = function(message, color) {

  /*
   * Function Creature.internalCreatureSay
   * Writes a creature message to all spectators
   */

  // Write to the floor
  this.broadcastFloor(new PacketWriter(PacketWriter.prototype.opcodes.CREATURE_SAY).writeCreatureSay(this, message, color));

}

Creature.prototype.privateSay = function(player, message, color) {

  /*
   * Function Creature.privateSay
   * Writes a message that only a particular player can hear
   */

  player.write(new PacketWriter(PacketWriter.prototype.opcodes.CREATURE_SAY).writeCreatureSay(this, message, color));

}

Creature.prototype.hasTarget = function() {

  /*
   * Function Creature.hasTarget
   * Returns true when the creature has a target
   */

  return this.__target !== null;

}

Creature.prototype.isWithinRangeOf = function(creature, range) {

  /*
   * Function Creature.isWithinRangeOf
   * Returns true is a creature is in range of another creature
   */

  return this.position.isWithinRangeOf(creature.position, range);

}

Creature.prototype.is = function(name) {

  /*
   * Function Creature.is
   * Returns true if the creature has a particular class name
   */

  return this.constructor.name === name;

}

Creature.prototype.isWithinChunk = function(chunk) {

  /*
   * Function Creature.isWithinChunk
   * Returns true if the creature is within a given chunk
   */

  return this.__chunk === chunk;

}

Creature.prototype.isMoving = function() {

  /*
   * Function Creature.isMoving
   * Returns true if the creature is moving and does not have the move action available
   */

  return !this.actions.has(this.handleActionMove);

}

Creature.prototype.isBesidesTarget = function() {

  /*
   * Function Creature.isBesidesTarget
   * Returns true when the creature is besides its target
   */

  // No target
  if(this.__target === null) {
    return false;
  }

  return this.isBesidesThing(this.__target);

}

Creature.prototype.isBesidesThing = function(thing) {

  /*
   * Function Creature.isBesidesThing
   * Returns true when a creature is besides another thing
   */

  return this.position.besides(thing.getPosition());

}

Creature.prototype.isMounted = function() {

  /*
   * Function Creature.isMounted
   * Returns true if the creature is mounted
   */

  return this.outfit.mounted;

}

Creature.prototype.isZeroHealth = function() {

  /*
   * Function Creature.isZeroHealth
   * Returns true if the creature has 0 health and is therefore slain
   */

  return this.health === 0;

}

Creature.prototype.isPlayer = function() {

  /*
   * Function Creature.isPlayer
   * Returns true if the creature is a player
   */

  return this.constructor.name === "Player";

}

Creature.prototype.isFullHealth = function() {

  /*
   * Function Creature.isFullHealth
   * Returns true if the health of the creature is full
   */

  return this.health === this.maxHealth;

}

Creature.prototype.setFullHealth = function() {

  this.increaseHealth(this.maxHealth - this.health);

}

Creature.prototype.increaseHealth = function(amount) {

  /*
   * Function Creature.increaseHealth
   * Increases the health of an entity
   */

  // Set the health of the creature
  this.setHealth(this.health + amount);

  // Write a packet to the clients
  this.broadcast(new PacketWriter(PacketWriter.prototype.opcodes.INCREASE_HEALTH).writeIncreaseHealth(this.guid, amount));

}

Creature.prototype.internalDecreaseHealth = function(attacker, amount, color) {

  /*
   * Function Creature.internalDecreaseHealth
   * Decreases the health of a creature with a particular amount
   */

  // Set health of the creature
  this.setHealth(this.health - amount);

  // Write both who attacks and what is being attacked
  this.broadcast(new PacketWriter(PacketWriter.prototype.opcodes.DECREASE_HEALTH).writeDecreaseHealth(attacker, this, amount, color));

}

Creature.prototype.broadcast = function(packet) {

  /*
   * Function Creature.broadcast
   * Broadcasts a packet to all spectators: delegates to the sector class
   */

  // Not in the gameworld: ignore this call
  if(this.__chunk === null) {
    return;
  }

  // Broadcast in the current active sector
  this.__chunk.broadcast(packet);

}

Creature.prototype.broadcastFloor = function(packet) {

  /*
   * Function Creature.broadcastFloor
   * Broadcasts a packet to all spectators on the same floor as the creature
   */

  if(this.position === null) {
    return;
  }

  // Broadcast in the current active sector
  this.__chunk.broadcastFloor(this.position.z, packet);

}

Creature.prototype.isInLineOfSight = function(other) {

  /*
   * Function Creature.isInLineOfSight
   * Returns true if the creature can see another thing at a position
   */

  if(this.position === null) {
    return false;
  }

  return this.position.inLineOfSight(other.position);

}

Creature.prototype.think = function() {

  /*
   * Function Creature.think
   * Function called when an creature should think
   */

  // Delegates to handling all the available actions
  this.actions.handleActions(this);

}

Creature.prototype.wander = function() {

  /*
   * Function Creature.wander
   * Returns a random position around the monster's position
   */

  // We have these options: explore them in a random order
  let options = new Array(
    this.position.north(),
    this.position.east(),
    this.position.south(),
    this.position.west()
  );

  // Try them all
  while(options.length > 0) {

    let tile = process.gameServer.world.getTileFromWorldPosition(options.popRandom());

    if(tile !== null && tile.id !== 0 && !this.isTileOccupied(tile)) {
      return tile;
    }

  }

  return null;

}

Creature.prototype.getPathToTarget = function() {

  /*
   * Public Function Creature.__getPathToTarget
   * Call to the pathfinder to recover the next step to be set by the creature
   */

  if(this.position === null) {
    return null;
  }

  // A* pathfinding between creature and target (stop at an adjacent tile)
  let path = process.gameServer.world.findPath(
    this,
    this.position,
    this.getTarget().position,
    process.gameServer.world.pathfinder.ADJACENT
  );

  // If no path is found the creature should instead wander randomly
  if(path.length === 0) {
    return null;
  }

  // Get the next position to move to following the pathing algorithm
  return path.pop();

}

Creature.prototype.__setOutfit = function(outfit) {

  /*
   * Public Function Creature.__setOutfit
   * Sets a new outfit
   */

  this.outfit = outfit;

}

Creature.prototype.__registerEvents = function(events) {

  /*
   * Function Creature.__registerEvents
   * Registers events to be fired for the creature
   */

  // Not specified
  if(events === undefined) {
    return;
  }

  // Bind the events
  events.forEach(function(event) {
    this.on(event.on, event.callback.bind(this));
  }, this);

}


Creature.prototype.__getSpellPosition = function(x, y) {

  /*
   * Function World.__getSpellPosition
   * Rotates a relative 2D position around 90-degrees (positions are defined with character facing NORTH)
   */

  return this.position.add(this.__rotate2DPosition(this.direction, x, y));

}

Creature.prototype.__rotate2DPosition = function(direction, x, y) {

  /*
   * Function World.__rotate2DPosition
   * Rotates a relative 2D position around 90-degrees (positions are defined with character facing NORTH)
   */

  // 2D rotation around 90 degrees
  switch(this.direction) {
    case Position.prototype.NORTH: return new Position(+x, +y, 0);
    case Position.prototype.EAST: return new Position(-y, -x, 0);
    case Position.prototype.SOUTH: return new Position(+x, -y, 0);
    case Position.prototype.WEST: return new Position(+y, -x, 0);
  }

}

module.exports = Creature;
