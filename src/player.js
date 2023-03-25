"use strict";

const AchievementManager = require("./achievement-manager");
const CharacterStats = require("./stat-manager");
const Condition = require("./condition");
const Creature = require("./creature");
const ContainerManager = require("./container-manager");
const ActionManager = require("./action.js");
const Friendlist = require("./friendlist.js");
const FluidContainer = require("./fluidcontainer.js");
const GenericLock = require("./generic-lock");
const PacketWriter = require("./packet-writer");
const PacketReader = require("./packet-reader");
const Position = require("./position");
const Spellbook = require("./spellbook");
const Equipment = require("./equipment");

const Player = function(gameSocket, data) {

  /*
   * Class Player
   * Wrapper for a playable character
   *
   * API:
   *
   * Player.isInCombat - Returns true if the player is or has recently been in combat
   *
   *
   */

  // Inherit from Creature class
  Creature.call(this, data.creatureStatistics);

  this.type = this.TYPE.PLAYER;

  // Set the position of the player
  this.setPosition(Position.prototype.fromLiteral(data.characterStatistics.position));

  // Circular referencing
  this.gameSocket = gameSocket;
  gameSocket.player = this;

  // Manage for the character statistics (e.g., level, experience)
  this.characterStatistics = new CharacterStats(this, data.characterStatistics);

  // The players' friendlist
  this.friendlist = new Friendlist(this, data.friends);

  // Manager for player containers
  this.containerManager = new ContainerManager(this, data.depot, data.equipment, data.keyring, data.inbox);

  // Achievement properties
  this.achievementManager = new AchievementManager(this, data.achievements);

  // This represents the handler for the player spells
  this.spellbook = new Spellbook(this, data.spellbook);

  // Add the available player actions that are checked every frame
  this.actions.add(this.handleActionAttack);
  this.actions.add(this.handleActionRegeneration);

  // The map of opened (global) channels
  this.__openedChannels = new Map();

  // The use with lcok
  this.__useWithLock = new GenericLock();

  // The movement lock
  this.__moveLock = new GenericLock();
  this.__moveLock.on("unlock", this.__handleActionUnlock.bind(this));
  this.__clientMoveBuffer = null;

  // Last visited
  this.lastVisit = data.lastVisit;

  // Create a lock for combat
  this.__createCombatLock();

}

Player.prototype = Object.create(Creature.prototype);
Player.prototype.constructor = Player;

Player.prototype.COMBAT_LOCK_SECONDS = 3;
Player.prototype.REGENERATION_DURATION = 100;

Player.prototype.extendCondition = function(id, ticks, duration) {

  // Does not exist yet?
  if(!this.hasCondition(id)) {
    return this.conditions.add(new Condition(id, ticks, duration), null);
  }

  this.conditions.extendCondition(id, ticks);

}

Player.prototype.setTarget = function(target) {

  /*
   * Function Creature.setTarget
   * Sets the target of the creature
   */

  this.__target = target;

  let id = target === null ? 0 : target.guid;

  this.write(new PacketWriter(PacketWriter.prototype.opcodes.SET_TARGET).writeSetTarget(id));

}

Player.prototype.isSated = function(ticks) {

  return this.hasCondition(Condition.prototype.SATED) && (ticks + this.conditions.__conditions.get(Condition.prototype.SATED).numberTicks) > 100;

}

Player.prototype.isInvisible = function() {

  return this.hasCondition(Condition.prototype.INVISIBLE);

}

Player.prototype.enterNewChunk = function(newChunks) {

  /*
   * Function Player.enterNewChunk
   * Necessary functions to call when a creature enters a new chunk
   */

  // Introduce self to the new chunk
  newChunks.forEach(chunk => chunk.handleRequest(this));
  newChunks.forEach(chunk => chunk.__internalBroadcast(this.info()));

}

Player.prototype.isInNoLogoutZone = function() {

  /*
   * Function Player.isInNoLogoutZone
   * Returns true if the player is in a no-logout zone
   */

  return process.gameServer.world.getTileFromWorldPosition(this.position).isNoLogoutZone();

}

Player.prototype.isInProtectionZone = function() {

  /*
   * Function Player.isInProtectionZone
   * Returns true if the player is in a protection zone
   */

  return process.gameServer.world.getTileFromWorldPosition(this.position).isProtectionZone();

}

Player.prototype.ownsHouseTile = function(tile) {

  /*
   * Function Player.ownsHouseTile
   * Returns true if the tile is a house tile
   */

  return tile.house.owner === this.name || tile.house.invited.includes(this.name);

}

Player.prototype.isTileOccupied = function(tile) {

  /*
   * Function Player.isTileOccupied
   * Function evaluated for a tile whether it is occupied for the NPC or not
   */

  // If the tile is blocking then definitely
  if(tile.isBlockSolid()) {
    return true;
  }

  // House tile but not owned
  if(tile.isHouseTile() && !this.ownsHouseTile(tile)) {
    this.sendCancelMessage("You do not own this house.");
    return true;
  }

  // The tile items contain a block solid (e.g., a wall)
  if(tile.itemStack.isBlockSolid()) {
    return true;
  }

  // Occupied by other characters
  if(tile.isOccupiedCharacters()) {
    return true;
  }

  return false;

}

Player.prototype.openContainer = function(id, name, baseContainer) {

  /*
   * Function Player.openContainer
   * Opens the base container and writes a packet to the player
   */

  baseContainer.addSpectator(this);
  this.write(new PacketWriter(PacketWriter.prototype.opcodes.OPEN_CONTAINER).writeOpenContainer(id, name, baseContainer));

}

Player.prototype.closeContainer = function(baseContainer) {

  /*
   * Function Player.closeContainer
   * Closes the base container and writes a packet to the player
   */

  baseContainer.removeSpectator(this);
  this.write(new PacketWriter(PacketWriter.prototype.opcodes.CONTAINER_CLOSE).writeContainerClose(baseContainer.guid));

}

Player.prototype.isInCombat = function() {

  /*
   * Function Player.isInCombat
   * Return true if the player is currently engaged in combat
   */

  return this.combatLock.isLocked();

}

Player.prototype.handleActionRegeneration = function() {

  /*
   * Function Player.handleActionRegeneration
   * Handles default health generation of players
   */

  if(!this.isFullHealth()) {

    let regeneration = this.getEquipmentAttribute("healthGain");
    
    // If not full health
    if(!this.isInCombat() && this.hasCondition(Condition.prototype.SATED)) {
      regeneration += 5;
    }

    this.increaseHealth(regeneration);

  }

  this.lockAction(this.handleActionRegeneration, this.REGENERATION_DURATION);
  
}

Player.prototype.isOffline = function() {

  /*
   * Function Player.isOffline
   * Returns true if the creature is moving and does not have the move action available
   */

  return !process.gameServer.server.websocketServer.connectedSockets().has(this.gameSocket);

}

Player.prototype.isMoving = function() {

  /*
   * Function Player.isMoving
   * Returns true if the creature is moving and does not have the move action available
   */

  return this.__moveLock.isLocked();

}

Player.prototype.handleActionAttack = function() {

  /*
   * Function Player.handleActionAttack
   * Handles attack action
   */

  // No target
  if(!this.hasTarget()) {
    return;
  }

  // Drop the target if it is dead
  if(this.__target.isZeroHealth()) {
    return this.setTarget(null);
  }

  // Not besides target and not distance fighting
  if(!this.isBesidesTarget() && !this.isDistanceWeaponEquipped()) {
    return;
  }

  // Confirm player can see the creature for distance (or normal) fighting
  if(!this.isInLineOfSight(this.__target)) {
    return;
  }

  // Lock
  this.combatLock.lockSeconds(this.COMBAT_LOCK_SECONDS);

  // Handle combat with the target
  process.gameServer.world.handleCombat(this);

  // Lock the action for the inverse of the attack speed of the player
  this.lockAction(this.handleActionAttack, this.attackSlowness);

}

Player.prototype.directionToPosition = function(direction) {

  /*
   * Function Player.directionToPosition
   * Maps a particular direction (N, E, S, W) to a world position
   */

  // Map the requested direction
  switch(direction) {
    case PacketReader.prototype.opcodes.MOVE_NORTH.code: return this.position.north();
    case PacketReader.prototype.opcodes.MOVE_EAST.code: return this.position.east();
    case PacketReader.prototype.opcodes.MOVE_SOUTH.code: return this.position.south();
    case PacketReader.prototype.opcodes.MOVE_WEST.code: return this.position.west();
    case PacketReader.prototype.opcodes.MOVE_NORTHWEST.code: return this.position.northwest();
    case PacketReader.prototype.opcodes.MOVE_NORTHEAST.code: return this.position.northeast();
    case PacketReader.prototype.opcodes.MOVE_SOUTHEAST.code: return this.position.southeast();
    case PacketReader.prototype.opcodes.MOVE_SOUTHWEST.code: return this.position.southwest();
    default: return null;
  }

}

Player.prototype.handleActionMove = function(direction) {

  /*
   * Function Player.handleActionMove
   * Callback fired when an action is ended
   */

  let tile = process.gameServer.world.getTileFromWorldPosition(this.directionToPosition(direction));

  let stepDuration = (tile === null || tile.id === 0) ? 10 : this.getStepDuration(tile.getFriction());

  // Lock movement action
  this.__moveLock.lock(stepDuration);

  // Move the player by walking!
  let success = process.gameServer.world.moveCreature(this, this.directionToPosition(direction));

  // Not succesful: teleport to the current position
  if(!success) {
    process.gameServer.world.teleportCreature(this, this.position);
  }

}

Player.prototype.handleActionUseWith = function(packet) {

  /*
   * Function Player.handleActionUseWith
   * Called when a client request is made to use an item with another item
   */

  // This function is not available
  if(this.__useWithLock.isLocked()) {
    return this.sendCancelMessage("You cannot use this object yet.");
  }

  // Both must be present in the packet
  if(packet.fromWhere === null || packet.toWhere === null) {
    return;
  }

  // Must be besides the from (using) item
  if(!this.isBesidesThing(packet.fromWhere)) {
    return this.sendCancelMessage("You have to move closer to use this item.");
  }

  // Fetch the item
  let item = packet.fromWhere.peekIndex(packet.fromIndex);

  // If there is no item there is nothing to do
  if(item === null) {
    return;
  }

  // Emit the event for the prototype listeners
  item.emit("useWith", this, item, packet.toWhere, packet.toIndex);

  // Explicitly handle key uses
  if(item.constructor.name === "Key") {
    item.handleKeyUse(this, packet.toWhere);
  }

  if(item.constructor.name === "FluidContainer") {
    item.handleUseWith(this, item, packet.toWhere, packet.toIndex);
  }

  // Lock the action for the coming global cooldown
  this.__useWithLock.lock(ActionManager.prototype.GLOBAL_COOLDOWN);

}

Player.prototype.canUseHangable = function(thing) {

  /*
   * Function Player.canNotUseHangable
   * Delegates to the internal function
   */

  return (thing.isHorizontal() && this.position.y >= thing.getPosition().y) || (thing.isVertical() && this.position.x >= thing.getPosition().x);

}

Player.prototype.decreaseHealth = function(attacker, amount, color) {

  /*
   * Function Player.decreaseHealth
   * Delegates to the internal function
   */

  // Record the attack in the damage map
  this.internalDecreaseHealth(attacker, amount, color);

}

Player.prototype.consumeAmmunition = function() {

  /*
   * Function Player.consumeAmmunition
   * Consumes a single piece of ammunition
   */

  return this.containerManager.equipment.removeIndex(Equipment.prototype.SLOTS.QUIVER, 1);

}

Player.prototype.isAmmunitionEquipped = function() {

  /*
   * Function Player.isAmmunitionEquipped
   * Returns true if the player has ammunition available
   */

  return this.containerManager.equipment.isAmmunitionEquipped();

}

Player.prototype.isDistanceWeaponEquipped = function() {

  /*
   * Function Player.isDistanceWeaponEquipped
   * Returns true if the player has a distance weapon equipped
   */

  return this.containerManager.equipment.isDistanceWeaponEquipped();

}

Player.prototype.sendCancelMessage = function(message) {

  /*
   * Function Player.sendCancelMessage
   * Writes a cancel message to the player
   */

  this.write(new PacketWriter(PacketWriter.prototype.opcodes.CANCEL_MESSAGE).writeString(message));

}

Player.prototype.cleanup = function() {

  /*
   * Public Function Player.cleanup
   * Cleans up player references and events after socket close
   */

  // Leave all channels
  this.__openedChannels.forEach(channel => channel.leave(this));

  // Close all containers
  this.containerManager.closeAll();

  // Cancel events scheduled by the condition manager
  this.conditions.cleanup();

  // Cancel events scheduled by the combat lock
  this.combatLock.cleanup();

  // Emit the logout event for the player
  this.emit("logout");

}

Player.prototype.handleDeath = function() {

  /*
   * Function Player.handleDeath
   * Handles the death of the player
   */

  // Disconnect the player on death
  this.gameSocket.close();

}

Player.prototype.toJSON = function() {

  /*
   * Function Player.toJSON
   * Implements the JSON.Stringify interface
   */

  // Individual classes implement the toJSON interface too
  return new Object({
    "achievements": this.achievementManager,
    "creatureStatistics": {
      "attack": this.attack,
      "attackSlowness": this.attackSlowness,
      "defense": this.defense,
      "direction": this.direction,
      "health": this.health,
      "maxHealth": this.maxHealth,
      "name": this.name,
      "outfit": this.outfit,
      "speed": this.speed
    },
    "lastVisit": Date.now(),
    "inbox": this.containerManager.inbox,
    "depot": this.containerManager.depot,
    "characterStatistics": this.characterStatistics,
    "spellbook": this.spellbook,
    "equipment": this.containerManager.equipment,
    "keyring": this.containerManager.keyring,
    "friends": this.friendlist
  });

}

Player.prototype.write = function(packet) {

  /*
   * Function Player.write
   * Delegates write to the websocket connection to write a packet
   */

  this.gameSocket.write(packet);

}

Player.prototype.enterNewZone = function(zid) {

  /*
   * Function Player.enterNewZone
   * Trigger that is fired when a player character enters a new zone
   */

  this.write(new PacketWriter(PacketWriter.prototype.opcodes.ENTER_ZONE).writeZoneInformation(zid));

}

Player.prototype.getEquipmentAttribute = function(attribute) {

  /*
   * Function Player.getEquipmentAttribute
   * Returns an attribute from the the players' equipment
   */

  return this.containerManager.equipment.getAttributeState(attribute);

}

Player.prototype.getSpeed = function() {

  /*
   * Function Player.getSpeed
   * Returns the speed of the player
   */

  let base = this.speed + this.getEquipmentAttribute("speed");

  if(this.hasCondition(Condition.prototype.HASTE)) {
    base *= 1.3;
  }

  return base;

}

Player.prototype.getAttack = function() {

  /*
   * Function Player.getAttack
   * Returns the attack of a creature
   */

  return this.attack + this.getEquipmentAttribute("attack");

}

Player.prototype.getDefense = function() {

  /*
   * Function Player.getDefense
   * Returns the attack of a creature
   */

  return this.defense + this.getEquipmentAttribute("armor");

}

Player.prototype.purchase = function(offer, count) {

  /*
   * Function Player.purchase
   * Function to purchase an item from an NPC
   */

  let thing = process.gameServer.database.createThing(offer.id);

  if(thing.isStackable() && count) {
    thing.setCount(count);
  } else if(thing.isFluidContainer() && offer.count) {
    thing.setCount(offer.count);
  }

  if(!this.containerManager.equipment.canPushItem(thing)) {
    return this.sendCancelMessage("You do not have enough available space or capacity.");
  }

  // Price is equivalent to the count times price
  if(!this.payWithResource(2148, offer.price * count)) {
    return this.sendCancelMessage("You do not have enough gold.");
  }

  // Add
  this.containerManager.equipment.pushItem(thing);

  return true;

}

Player.prototype.hasSufficientCapacity = function(thing) {

  /*
   * Function Player.hasSufficientCapacity
   * Returns true if the player has sufficient capacity to carry the thing
   */

  return this.characterStatistics.capacity >= thing.getWeight();

}

Player.prototype.payWithResource = function(currencyId, price) {

  /*
   * Function Player.payWithResource
   * Pays a particular price in gold coins
   */

  return this.containerManager.equipment.payWithResource(currencyId, price);

}

Player.prototype.handleBuyOffer = function(packet) {

  /*
   * Function Player.handleBuyOffer
   * Opens trade window with a friendly NPC
   */

  let creature = process.gameServer.world.getCreatureFromId(packet.id);

  // The creature does not exist
  if(creature === null) {
    return;
  }

  // Trading only with NPCs
  if(creature.constructor.name !== "NPC") {
    return;
  }

  // Not in range
  if(!this.isWithinRangeOf(creature, creature.hearingRange)) {
    return;
  }

  // Get the current offer
  let offer = creature.getTradeItem(packet.index);

  // Try to make the purchase
  if(this.purchase(offer, packet.count)) {
    creature.internalCreatureSay("Here you go!", CONST.COLOR.YELLOW);
  }

}

Player.prototype.getFluidType = function() {

  /*
   * Function Player.getFluidType
   * Returns the fluid type of a player which is always blood
   */

  return FluidContainer.prototype.FLUID_TYPES.BLOOD;

}

Player.prototype.setMoveBuffer = function(direction) {

  /*
   * Function Player.setMoveBuffer
   * Updates the server-side movement buffer of the player
   */

  this.__clientMoveBuffer = direction;

}

Player.prototype.__handleCreatureKill = function(creature) {

  /*
   * Function Player.__handleCreatureKill
   * Callback fired when the player participates in a creature kill
   */

  //this.questlog.kill(creature);

}

Player.prototype.__handleActionUnlock = function(action) {

  /*
   * Function Player.__handleActionUnlock
   * Callback fired when a particular function is unlocked
   */

  // Movement buffer actions must have special handling
  if(this.__clientMoveBuffer === null) {
    return;
  }

  this.handleActionMove(this.__clientMoveBuffer);
  this.setMoveBuffer(null);

}


Player.prototype.__createCombatLock = function() {

  /*
   * Function Player.__createCombatLock
   * Creates and configured the combat lock for the player: this prevents players from logging out after having been in combat
   */

  this.combatLock = new GenericLock();

  // Event callbacks
  this.combatLock.on("unlock", this.__writeChangeCombat.bind(this, false));
  this.combatLock.on("lock", this.__writeChangeCombat.bind(this, true));

}

Player.prototype.changeCapacity = function(value) {

  /*
   * Function Player.changeCapacity
   * Changes the available capacity of a player by a value
   */

  this.characterStatistics.capacity += value;

  if(!this.containerManager) {
    return;
  }

  this.write(new PacketWriter(PacketWriter.prototype.opcodes.PLAYER_STATISTICS).writePlayerStatistics(this));
  
}

Player.prototype.changeSlowness = function(speed) {

  this.speed = this.speed + speed;
  this.write(new PacketWriter(PacketWriter.prototype.opcodes.PLAYER_STATISTICS).writePlayerStatistics(this));

}

Player.prototype.__writeChangeCombat = function(bool) {
 
  /*
   * Function Player.__writeChangeCombat
   * Writes a packet to the client to update the state of the combat lock
   */

  return this.write(new PacketWriter(PacketWriter.prototype.opcodes.COMBAT_LOCK).writeCombatLock(bool));

}

module.exports = Player;
