"use strict";

const Item = require("./item");

const Door = function(id) {

  /*
   * Class Door
   * Wrapper for doors that can be opened or closed
   *
   */

  // Inherits from item
  Item.call(this, id);

}

Door.prototype = Object.create(Item.prototype);
Door.prototype.constructor = Door;

Door.prototype.getHouseName = function() {

  /*
   * Function Door.getHouseOwner
   * Returns the owner of the house door
   */

  return this.__parent.house.name;

}

Door.prototype.getHouseOwner = function() {

  /*
   * Function Door.getHouseOwner
   * Returns the owner of the house door
   */

  return this.__parent.house.owner;

}

Door.prototype.open = function() {

  /*
   * Function Door.open
   * Opens the door by incrementing the item identifier
   */

  if(this.isOpened()) {
    return;
  }

  return this.__change(+1);

}

Door.prototype.close = function() {

  /*
   * Function Door.close
   * Closes the door by decrementing the item identifier
   */

  if(!this.isOpened()) {
    return;
  }

  this.__change(-1);

}

Door.prototype.handleEnterUnwantedDoor = function(player) {

  /*
   * Function Door.handleEnterExpertiseDoor
   * Handling of expertise doors
   */

  // All unwanted doors should have a unique identifier in RME
  if(!this.hasOwnProperty("actionId")) {
    return player.sendCancelMessage("Only the worthy may pass!");
  }

  // Get the callback
  let action = process.gameServer.database.getDoorEvent(this.actionId);

  // Get the parent of the tile
  let tile = this.getParent();

  // There must be an on use action configured and the callback must return true (implement logic there)
  if(action === null || !action.call(this, player)) {
    return player.sendCancelMessage("Only the worthy may pass!");
  }

  this.open();

  player.sendCancelMessage("The gate pulls you in.");

  // Lock movement action
  player.__moveLock.lock(player.getStepDuration(tile.getFriction()));

  // Move the player by walking!
  return process.gameServer.world.moveCreature(player, tile.position);

}

Door.prototype.handleEnterExpertiseDoor = function(player) {

  /*
   * Function Door.handleEnterExpertiseDoor
   * Handling of expertise doors
   */

  // No action identifier
  if(!this.hasOwnProperty("actionId")) {
    return player.sendCancelMessage("Only the worthy may pass!");
  }

  if(player.characterStatistics.level < (this.actionId - 100)) {
    return player.sendCancelMessage("Only the worthy may pass!");
  }

  // Open the thing and save a reference to the new door
  this.open();

  // Get the parent of the tile
  let tile = this.getParent();

  player.sendCancelMessage("The gate of expertise pulls you in.");

  // Lock movement action
  player.__moveLock.lock(player.getStepDuration(tile.getFriction()));

  // Move the player by walking!
  return process.gameServer.world.moveCreature(player, tile.position);

}

Door.prototype.isHouseDoor = function(player) {

  return this.getParent().isHouseTile();
}

Door.prototype.handleHouseDoor = function(player) {

  if(!player.ownsHouseTile(this.getParent())) {
    return player.sendCancelMessage("You do not own this house.");
  }

  if(!this.isOpened()) {
    return this.open();
  } else {
    return this.close();
  }

}

Door.prototype.toggle = function(player) {

  /*
   * Function Door.toggle
   * Toggles the open/closed state of the door
   */

  // Handle expertise doors
  if(player.isPlayer()) {
    if(this.isHouseDoor()) {
      return this.handleHouseDoor(player);
    } else if(this.getAttribute("expertise")) {
      return this.handleEnterExpertiseDoor(player);
    } else if(this.getAttribute("unwanted")) {
      return this.handleEnterUnwantedDoor(player);
    }
  }

  // If the door is closed and it has an action ID it can only be opened by a key
  if(!this.isOpened()) {

    if(this.isLocked()) {

      if(!player.containerManager.keyring.hasKey(this.actionId)) {
        return player.sendCancelMessage("This door is locked.");
      }

      player.sendCancelMessage("You open the door with your keyring.");

    }

    return this.open();

  }

  // Check if the parent tile is occupied: otherwise close
  if(this.getParent().isOccupiedAny()) {
    return player.sendCancelMessage("Something is blocking the door from closing.");
  }
  
   this.close();

}

Door.prototype.isLocked = function() {

  /*
   * Function Door.isLocked
   * Returns true if the door is locked
   */

  return this.hasOwnProperty("actionId");

}

Door.prototype.isOpened = function() {

  /*
   * Function Door.isOpened
   * Returns true if the door is opened by checking whether it blocks projectiles
   */

  return !this.isBlockSolid();

}

Door.prototype.__change = function(direction) {

  /*
   * Function Door.__change
   * Replaces the door with its open/closed counterpart
   */

  let thing = process.gameServer.database.createThing(this.id + direction);

  // Must copy over the action identifier to the door
  if(this.hasActionId()) {
    thing.setActionId(this.actionId);
  }

  this.replace(thing);

  return thing;

}

module.exports = Door;