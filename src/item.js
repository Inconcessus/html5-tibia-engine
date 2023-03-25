"use strict";

const { OTBBitFlag } = require("./bitflag");

const Thing = require("./thing");

const Item = function(id) {

  /*
   * Class Item
   * Container for an item
   *
   * API
   * Item.isMoveable - return true if the item is moveable
   * Item.isStackable - returns true if the item is stackable
   * Item.stringify - returns a serialized string of the class
   */

  // Inherit from a thing
  Thing.call(this, id);

  this.weight = 0;

}

// Inherit from event emitter
Item.prototype = Object.create(Thing.prototype);
Item.prototype.constructor = Item;

Item.prototype.MAXIMUM_STACK_COUNT = 100;

Item.prototype.setWeight = function(weight) {

  /*
   * Function Item.setWeight
   * Sets the fluid type by delegating an update to the count
   */

  this.weight = weight;

}

Item.prototype.setFluidType = function(count) {

  /*
   * Function Item.setFluidType
   * Sets the fluid type by delegating an update to the count
   */

  this.setCount(count);

}

Item.prototype.hasHeight = function() {

  return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_HAS_HEIGHT);

}

Item.prototype.isBlockSolid = function() {

  /*
   * Function Item.isBlockProjectile
   * Returns true when the item blocks a projectile
   */

  return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_BLOCK_SOLID);

}

Item.prototype.isBlockProjectile = function() {

  /*
   * Function Item.isBlockProjectile
   * Returns true when the item blocks a projectile
   */

  return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_BLOCK_PROJECTILE);

}

Item.prototype.supportsHangable = function() {

  /*
   * Function Item.supportsHangable
   * Returns true if the item supports a hangle (e.g., wall)
   */

  return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_HORIZONTAL | OTBBitFlag.prototype.flags.FLAG_VERTICAL);

}

Item.prototype.isHorizontal = function() {

  /*
   * Function Item.isHorizontal
   * Returns true if the item is horizontal (for hangables)
   */

  return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_HORIZONTAL);

}

Item.prototype.isVertical = function() {

  /*
   * Function Item.isVertical
   * Returns true if the item is vertical (for hangables)
   */

  return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_VERTICAL);

}

Item.prototype.isHangable = function() {

  /*
   * Function Item.isHangable
   * Returns true if the item is hangable
   */

  return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_HANGABLE);

}

Item.prototype.isPickupable = function() {

  /*
   * Function Item.isPickupable
   * Returns true when the item is pickupable
   */

  return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_PICKUPABLE);

}

Item.prototype.isMoveable = function() {

  /*
   * Function Item.isMoveable
   * Returns TRUE when the item is moveable
   */

  return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_MOVEABLE);

}

Item.prototype.split = function(count) {

  /*
   * Public Function Thing.split
   * Splits an existing item by decrementing its own count and creating a new item with the remaining count
   */

  // If not stackable return the thing itself
  if(!this.isStackable()) {
    return this;
  }

  // Cannot be less than 0 or more than the available count
  count = count.clamp(0, this.count);

  // Nothing to do
  if(count === 0) {
    return this;
  }

  // Reduce the count of the item itself
  this.setCount(this.count - count);

  // Create the new item
  let item = process.gameServer.database.createThing(this.id);
  item.setCount(count);

  // Return a new item generated from the stack
  return item;

}

Item.prototype.toJSON = function() {

  /*
   * Function Item.stringify
   * Recursively serializes the item class
   */

  let item = this.__serialize();

  // Containers need to be recursively serialized (may contain other containers)
  if(this.isContainer()) {
    item.items = this.container.__slots;
  }

  // Always clean up events after serializing items
  this.cleanup();

  return item;

}

Item.prototype.__serialize = function() {

  /*
   * Function Item.serialize
   * Serializes the item class to JSON
   */

  return new Object({
    "id": this.id,
    "count": this.count,
    "actionId": this.actionId,
    "duration": this.duration,
    "content": this.content
  });

}

module.exports = Item;