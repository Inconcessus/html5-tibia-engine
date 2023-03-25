const Condition = require("./condition");

const ItemStack = function() {

  /*
   * Class ItemStack
   * Wrapper for all items that belong on a tile
   *
   * Public API:
   *
   * ItemStack.isFull - returns true if the item stack is full and does not accept any more items
   * ItemStack.push - pushes an item to the top of the item stack
   * ItemStack.getFloorChange - returns the floor change attribute for the first item of the stack
   * ItemStack.addThing - adds a thing to the item stack at the particular index
   *
   */

  // This is where all the items are saved in sequence
  this.__items = new Array();

}

ItemStack.prototype.MAX_CAPACITY = 16;
ItemStack.prototype.TOP_INDEX = 0xFF;

ItemStack.prototype.isFull = function() {

  /*
   * Function ItemStack.isFull
   * Returns true if the stack is full and does not accept any more items
   */

  return this.hasMagicDoor() || this.__items.length >= this.MAX_CAPACITY;

}

ItemStack.prototype.isMailbox = function() {

  /*
   * Function ItemStack.isMailbox
   * Returns true if there is a mailbox (on the top item)
   */

  if(this.__items.length  === 0) {
    return false;
  }

  return this.getTopItem().isMailbox();

}

ItemStack.prototype.hasMagicDoor = function() {

  /*
   * Function ItemStack.getFloorChange
   * Returns floor change attributes from items on the tile
   */

  if(this.__items.length === 0) {
    return false;
  }

  if(!this.__items[0].isDoor()) {
    return false;
  }

  return this.__items[0].getAttribute("expertise") || this.__items[0].getAttribute("unwanted") || this.__items[0].isHouseDoor();

}

ItemStack.prototype.getFloorChange = function() {

  /*
   * Function ItemStack.getFloorChange
   * Returns floor change attributes from items on the tile
   */

  // Check all the items
  for(let i = 0; i < this.__items.length; i++) {

    let floor = this.__items[i].getAttribute("floorchange");

    if(floor !== null) {
      return floor
    }

  }

  return null;

}

ItemStack.prototype.addThing = function(index, thing) {

  /*
   * Function ItemStack.addThing
   * Inserts at the appropriate index
   */

  if(index === this.TOP_INDEX) {
    this.__items.push(thing);
  } else {
    this.__items.splice(index, 0, thing);
  }

}

ItemStack.prototype.isBlockNPC = function() {

  for(let i = 0; i < this.__items.length; i++) {

    if(this.__items[i].isDoor() && !this.__items[i].isLocked()) {
      continue;
    }

    if(this.__items[i].isMoveable()) {
      continue;
    }

    // Check whether the item is a block solid
    if(this.__items[i].isBlockSolid()) {
      return true;
    }

  }

  return false;

}

ItemStack.prototype.isItemSolid = function() {

  /*
   * Function ItemStack.isItemSolid
   * Returns true if the items on the tile are block solid
   */

  for(let i = 0; i < this.__items.length; i++) {

    // Check whether the item is a block solid
    if(this.__items[i].isBlockSolid() && !this.__items[i].hasHeight()) {
      return true;
    }

  }

  return false;


}

ItemStack.prototype.isBlockSolid = function(ignoreDoors) {

  /*
   * Function ItemStack.isBlockSolid
   * Returns true if the items on the tile are block solid
   */

  for(let i = 0; i < this.__items.length; i++) {

    // We are asked to skip over doors since they can be opened
    if(ignoreDoors && this.__items[i].isDoor() && !this.__items[i].isLocked()) {
      continue;
    }

    // Check whether the item is a block solid
    if(this.__items[i].isBlockSolid()) {
      return true;
    }

  }

  return false;

}

ItemStack.prototype.isBlockProjectile = function() {

  /*
   * Function ItemStack.isBlockProjectile
   * Returns true when the items on the tile block projectiles
   */

  for(var i = 0; i < this.__items.length; i++) {
    if(this.__items[i].isBlockProjectile()) {
      return true;
    }
  }

  return false;

}

ItemStack.prototype.hasElevation = function() {

  /*
   * Function ItemStack.hasElevation
   * Returns true if the tile has sufficient elevation to bring the player to another level
   */

  let elevation = 0;

  this.__items.forEach(function(item) {

    if(item.hasHeight()) {
      elevation++;
    }

  });

  return elevation >= 3;

}

ItemStack.prototype.getTeleporterDestination = function() {

  /*
   * Function ItemStack.getTeleporterDestination
   * Returns true if there is a teleporter on the tile
   */

  for(let i = 0; i < this.__items.length; i++) {
    if(this.__items[i].isTeleporter()) {
      return this.__items[i].destination;
    }
  }

  return null;

}

ItemStack.prototype.isTrashholder = function() {

  /*
   * Function ItemStack.isTrashholder
   * Checks whether there is a trashholder in the stack
   */

  // Go over all the items: maybe one of the items is a trashholder
  for(var i = 0; i < this.__items.length; i++) {
    if(this.__items[i].isTrashholder()) {
      return true;
    }
  }

  return false;

}

ItemStack.prototype.deleteThing = function(index) {

  /*
   * Function ItemStack.deleteThing
   * Removes a thing from the item stack at a particular index
   */

  // Top index or remove from the middle of the stack (e.g., decaying)
  if(index === this.TOP_INDEX) {
    return this.__items.pop();
  }

  this.__items.splice(index, 1);

}

ItemStack.prototype.isEmpty = function() {

  /*
   * Function ItemStack.isEmpty
   * Returns true if the item stack is completely empty
   */

  return this.__items.length === 0;

}

ItemStack.prototype.getTopItem = function() {

  /*
   * Function ItemStack.getTopItem
   * Returns the top item of the item stack
   */

  // If there are no items on the tile return null
  if(this.isEmpty()) {
    return null;
  }

  // Otherwise return the last elemenet
  return this.__items.last();

}

ItemStack.prototype.peekIndex = function(index) {

  /*
   * Function ItemStack.peekIndex
   * Takes a peek at the item at a particular index
   */

  // Must be a valid requested index
  if(!this.isValidIndex(index)) {
    return null;
  }

  // Special handling for the top item: identified by TOP_INDEX
  if(index === this.TOP_INDEX) {
    return this.getTopItem();
  }

  return this.__items[index];

}

ItemStack.prototype.isValidIndex = function(index) {

  /*
   * Function ItemStack.isValidIndex
   * Returns true if the passed index is valid and can be resolved
   */

  return index === this.TOP_INDEX || ((index >= 0) && (index <= this.__items.length));

}

ItemStack.prototype.applyFieldDamage = function(creature) {

  /*
   * Function ItemStack.applyFieldDamage
   * Adds the reference of a creature to the tile
   */

  // Go over the item stack from top to bottom
  for(let i = this.__items.length - 1; i >= 0; i--) {

    let proto = this.__items[i].getPrototype();

    if(!proto.isField()) {
      continue;
    }

    return this.__applyFieldCondition(proto.properties.field, creature);

  }

}

ItemStack.prototype.__applyFieldCondition = function(field, creature) {

  /*
   * Function ItemStack.__applyFieldCondition
   * Applies the field condition to the creature
   */

  // Handle specific field types
  switch(field) {
    case "energy": return creature.addCondition(Condition.prototype.ELECTRIFIED, 3, 100, null);
    case "fire": return creature.addCondition(Condition.prototype.BURNING, 5, 50, null);
    case "poison": return creature.addCondition(Condition.prototype.POISONED, 20, 10, null);
  }

}

module.exports = ItemStack;