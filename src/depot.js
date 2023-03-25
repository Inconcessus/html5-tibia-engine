"use strict";

const Item = require("./item");
const BaseContainer = require("./base-container");

const DepotContainer = function(cid, things) {

  /*
   * Class DepotContainer
   * Container for the player depot that can contain items. Each player has an individual depot stored at player.depot
   *
   * API:
   *
   * DepotContainer.toJSON - Implements the toJSON method to serialize the depot to JSON
   * DepotContainer.setPosition - Sets the parent tile of the players opened depot container
   * DepotContainer.getMaximumAddCount(item, index) - Returns the maximum addable count to the passed index
   * DepotContainer.peekIndex(index) - Takes a peek at the passed index
   *
   */

  // Should include a base container to handle the items
  this.container = new BaseContainer(cid, things.length);

  // The parent of the depot container is updated based on what particular depot box is being opened
  this.position = null;

  // Add the depot items
  this.__addDepotItems(things);

}

DepotContainer.prototype.getTopParent = function() {

  return this;

}

DepotContainer.prototype.isClosed = function() {

  /*
   * Function DepotContainer.isClosed
   * Returns true if the depot is closed and has a null position
   */

  return this.position === null;

}

DepotContainer.prototype.toJSON = function() {

  /*
   * Function DepotContainer.toJSON
   * Implements the toJSON API to serialize the depot when the player is saved
   */

  return this.container.__slots;

}

DepotContainer.prototype.getPosition = function() {

  /*
   * Function DepotContainer.getPosition
   * Sets the parent tile of the depot on which it is being opened
   */

  return this.position;

}

DepotContainer.prototype.openAtPosition = function(position) {

  /*
   * Function DepotContainer.openAtPosition
   * Sets the parent tile of the depot on which it is being opened
   */

  this.position = position;

}

DepotContainer.prototype.getMaximumAddCount = function(player, item, index) {

  /*
   * Function DepotContainer.getMaximumAddCount
   * Implements the API that returns the maximum addable count of a thing at a particular slot
   */

  // This is not a valid index
  if(!this.container.isValidIndex(index)) {
    return 0;
  }

  // Take a look at the item at the particular slot
  let thing = this.container.peekIndex(index);

  // If the slot is empty we can add the maximum stack count
  if(thing === null) {
    return Item.prototype.MAXIMUM_STACK_COUNT;
  }

  // Not empty but the identifiers match and the item is stackable
  if(thing.id === item.id && thing.isStackable()) {

    // If all slots in the container are filled only allow up to the maximum determined by what is already there
    if(this.container.isFull()) {
      return Item.prototype.MAXIMUM_STACK_COUNT - thing.count;
    }
    
    // Otherwise overflow: add to an open slot in the container
    return Item.prototype.MAXIMUM_STACK_COUNT;

  }

  // Fallthrough: not possible
  return 0;

}

DepotContainer.prototype.peekIndex = function(index) {

  /*
   * Function DepotContainer.peekIndex
   * Returns a reference to the item at the requested index
   */

  return this.container.peekIndex(index);

}

DepotContainer.prototype.removeIndex = function(index, amount) {

  /*
   * Function DepotContainer.removeIndex
   * Removes an item count from the requested index
   */

  let thing = this.container.removeIndex(index, amount);
  thing.setParent(null);

  return thing;

}

DepotContainer.prototype.deleteThing = function(thing) {

  /*
   * Function DepotContainer.deleteThing
   * Removes an item from the container by its reference
   */

  let index = this.container.deleteThing(thing);

  if(index === -1) {
    return -1;
  }

  thing.setParent(null);

  return index;

}

DepotContainer.prototype.addThing = function(thing, index) {

  /*
   * Function DepotContainer.addThing
   * Function to add an item to the container
   */

  if(!thing.isPickupable() && thing.id !== 2594 && thing.id !== 2593) {
    return false;
  }

  // Delegate to the base container
  this.container.addThing(thing, index);

  // Save a ref from item -> parent
  thing.setParent(this);

}

DepotContainer.prototype.addFirstEmpty = function(thing) {

  /*
   * Function Container.canAddFirstEmpty
   * Adds an thing to the first available empty slot: use this API to push things to the container!
   */

  // Set parent and push to the base container
  thing.setParent(this);
  this.container.addFirstEmpty(thing);

}

DepotContainer.prototype.canAddFirstEmpty = function(thing) {

  /*
   * Function Container.canAddFirstEmpty
   * Adds an thing to the first available empty slot: use this API to push things to the container!
   */

  // Guard against non-pickupable items
  if(!thing.isPickupable()) {
    return false;
  }

  // Can not add to a full container..
  if(this.container.isFull()) {
    return false;
  }

  return true;

}

DepotContainer.prototype.__addDepotItems = function(things) {

  /*
   * Function DepotContainer.__addDepotItems
   * Adds equipment in serialised form from the database
   */

  // Go over all the equipment slots from the database and add them
  things.forEach(function(thing, index) {

    if(thing !== null) {
      return this.addThing(process.gameServer.database.parseThing(thing), index);
    }

  }, this);

}

module.exports = DepotContainer;