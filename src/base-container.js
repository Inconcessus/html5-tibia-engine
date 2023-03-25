"use strict";

const Item = require("./item");
const PacketWriter = require("./packet-writer");

const BaseContainer = function(guid, size) {

  /*
   * Class BaseContainer
   * Represents the base of a container for multiple items: may be a depot, backpack, or even equipment
   *
   * API:
   *
   * BaseContainer.peekIndex(index) - returns a reference to the current item occupying the slot
   * BaseContainer.deleteThing(thing) - removes an item from the container by its reference and returns the index it was removed from
   * BaseContainer.addThing(thing) - adds a thing to the container
   * BaseContainer.removeIndex(index, count) - removes an item with optional count at the specified index
   * BaseContainer.isFull() - returns true if the container is full and all slots are occupied
   * BaseContainer.copyContents(container) - copies over the contents the passed container to self
   * BaseContainer.getSlots() - returns a reference to the slots of the container
   * BaseContainer.isValidIndex(index) - returns true if the index is valid and falls within 0 and the container size
   * BaseContainer.addFirstEmpty(thing) - adds a thing to the first empty available slot
   *
   */

  // Assign a global unique identifier to each container that is persistent
  this.guid = guid;

  // Each base container has particular size
  this.size = size;

  // The slots that keep references to the items in the container
  this.__slots = new Array(size).fill(null);

  // The spectators that are presently viewing the base container and keep track of container updates
  this.spectators = new Set();

}

BaseContainer.prototype.addSpectator = function(player) {

  /*
   * Function BaseContainer.addSpectator
   * Adds a player spectator to the container
   */

  this.spectators.add(player);

}

BaseContainer.prototype.removeSpectator = function(player) {

  /*
   * Function BaseContainer.removeSpectator
   * Removes a player spectator from the container
   */

  this.spectators.delete(player);

}

BaseContainer.prototype.isFull = function() {

  /*
   * Function BaseContainer.isFull
   * Returns true if the container is full and no empty slots exist within it
   */

  // Go over all slots until we find an empty slot
  for(let i = 0; i < this.__slots.length; i++) {

    if(this.__slots[i] === null) {
      return false;
    }

  }

  return true;

}

BaseContainer.prototype.copyContents = function(container) {

  /*
   * Function BaseContainer.copyContents
   * Copies over the contents from one containers to another
   */

  container.__slots.forEach(function(thing, index) {

    if(thing !== null) {
      this.__setItem(thing, index);
    }

  }, this);

}

BaseContainer.prototype.isValidIndex = function(index) {

  /*
   * Function BaseContainer.isValidIndex
   * Returns true only if the index is within the container bounds
   */

  // Within bounds
  return (index >= 0) && (index < this.size);

}

BaseContainer.prototype.getSlots = function() {

  /*
   * Function BaseContainer.getSlots
   * Returns a reference to all slots in the container (includes empty slots)
   */

  return this.__slots;

}

BaseContainer.prototype.peekIndex = function(slotIndex) {

  /*
   * Function BaseContainer.peekIndex
   * Returns an item from the container
   */

  // Invalid index requested
  if(!this.isValidIndex(slotIndex)) {
    return null;
  }

  return this.__slots[slotIndex];

}

BaseContainer.prototype.addThing = function(thing, index) {

  /*
   * Function BaseContainer.addThing
   * Adds a particular item to the specified index
   */

  let currentThing = this.peekIndex(index);

  // Reference the parent container to the item
  if(currentThing !== null && thing.isStackable()) {
    return this.__addStackable(index, currentThing, thing);
  }

  // Write an item add packet to all observing players
  this.__informSpectators(new PacketWriter(PacketWriter.prototype.opcodes.CONTAINER_ITEM_ADD).writeContainerItemAdd(this.guid, index, thing));

  // Set the item in the slot
  this.__setItem(thing, index);

}

BaseContainer.prototype.removeIndex = function(index, count) {

  /*
   * Function BaseContainer.removeIndex
   * Removes a number (count) of items from the specified slot and returns the removed item
   */

  // We take a peek at the item at the passed index position
  let thing = this.peekIndex(index);

  // There is nothing to remove
  if(thing === null) {
    return null;
  }

  // The thing is not stackable: remove the currently peeked at thing but return a reference to the item
  if(!thing.isStackable()) {
    this.__remove(index);
    return thing;
  }

  // Different handling for stackable items
  return this.__removeStackableItem(index, thing, count);

}

BaseContainer.prototype.deleteThing = function(thing) {

  /*
   * Function BaseContainer.deleteThing
   * Removes an item from the base container by its reference and returns the index it was removed from
   */

  // Get the index of the item to be removed
  let index = this.__slots.indexOf(thing);

  // The requested item does not exist in the container
  if(index === -1) {
    return -1;
  }

  return this.__remove(index);

}

BaseContainer.prototype.addFirstEmpty = function(thing) {

  /*
   * Function BaseContainer.addFirstEmpty
   * Adds an thing to the first available empty slot
   */

  // Go over the items
  for(let i = 0; i < this.__slots.length; i++) {

    // The slot is empty: add the new thing
    if(this.peekIndex(i) === null) {
      return this.addThing(thing, i);
    }

  }

}

BaseContainer.prototype.__remove = function(index) {

  /*
   * Function BaseContainer.__remove
   * Internal function remove an item from the stack
   */

  // Write remove packet to all spectating players
  this.__informSpectators(new PacketWriter(PacketWriter.prototype.opcodes.CONTAINER_ITEM_REMOVE).writeContainerItemRemove(this.guid, index, 0));

  // Clear the slot and return the index
  this.__setItem(null, index);

  return index;

}

BaseContainer.prototype.__overflowStack = function(index, currentItem, overflow) {

  /*
   * Function BaseContainer.__overflowStack
   * Adds a stackable item to another stackable item of the same type
   */

  // There is an overflow: current item is capped at the maximum stack size. Create a small stack on top
  this.__replaceFungibleItem(index, currentItem, Item.prototype.MAXIMUM_STACK_COUNT);

  // Add the remainder to the next open slot
  this.addFirstEmpty(currentItem.createFungibleThing(overflow));

}

BaseContainer.prototype.__replaceFungibleItem = function(index, item, count) {

  /*
   * Function BaseContainer.__replaceFungibleItem
   * Stackable items are fungible: meaning they can deleted and replaced by new items
   */

  // Remove the item and create a new one of the right size
  this.deleteThing(item);

  this.addThing(item.createFungibleThing(count), index);

}

BaseContainer.prototype.__addStackable = function(index, currentItem, item) {

  /*
   * Function BaseContainer.__addStackable
   * Adds a stackable item to another stackable item of the same type
   */

  // Calculate how much the new item overflows the other item
  let overflow = (currentItem.count + item.count) - Item.prototype.MAXIMUM_STACK_COUNT;

  // Overflow? We have to split the stack into a bigger and smaller pile
  if(overflow > 0) {
    this.__overflowStack(index, currentItem, overflow);
  } else {
    this.__replaceFungibleItem(index, currentItem, currentItem.count + item.count);
  }

}

BaseContainer.prototype.__removeStackableItem = function(index, currentItem, count) {

  /*
   * Function BaseContainer.__removeStackableItem
   * Removes an item by an identifier and ammount
   */

  // More requested than available in the item
  if(count > currentItem.count) {
    return null;
  }

  // Exactly equal: still remove the item completely
  if(count === currentItem.count) {
    this.__remove(index);
    return currentItem;
  }

  // We have to split the existing stack into two smaller stacks
  return this.__handleSplitStack(index, currentItem, count);

}

BaseContainer.prototype.__handleSplitStack = function(index, currentItem, count) {

  /*
   * Function BaseContainer.__handleSplitStack
   * Handles splitting of an existing stack 
   */

  // We have to update the count with the difference by subtracting the removed number of items
  this.__replaceFungibleItem(index, currentItem, currentItem.count - count);

  // Create the new smaller stack
  return currentItem.createFungibleThing(count);

}

BaseContainer.prototype.__informSpectators = function(packet) {

  /*
   * Function BaseContainer.__informSpectators
   * Broadcasts a packet to all observers of the container
   */

  this.spectators.forEach(player => player.write(packet));

}

BaseContainer.prototype.__setItem = function(thing, index) {

  /*
   * Function BaseContainer.__setItem
   * Sets a thing in a container at a particular index
   */

  return this.__slots[index] = thing;

}

module.exports = BaseContainer;