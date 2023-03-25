"use strict";

const Item = require("./item");
const PacketWriter = require("./packet-writer");
const BaseContainer = require("./base-container");

const Container = function(id, size) {

  /*
   * Function Container
   * Class that describes a container where inputs can be placed in
   *
   * API:
   *
   * Container.addFirstEmpty(thing) - pushes a thing to the container if possible
   * Container.getMaximumAddCount(index)
   * Container.removeIndex(index)
   * Container.peekIndex(index) - Returns a reference to the item at the requested index
   *
   */

  // Inherits from item
  Item.call(this, id);

  // Weight of all the children
  this.__childWeight = 0;

  // Create a base container to handle adding & removing items from the container. Every container has a unique identifier for lookup
  this.container = new BaseContainer(process.gameServer.world.assignUID(), size);

}

Container.prototype = Object.create(Item.prototype);
Container.prototype.constructor = Container;
Container.prototype.MAXIMUM_DEPTH = 1;

Container.prototype.addFirstEmpty = function(thing) {

  /*
   * Function Container.addFirstEmpty
   * Adds an thing to the first available empty slot: use this API to push things to the container!
   */

  // The container is frozen and cannot be interacted with
  if(this.frozen) {
    return false;
  }

  // Guard
  if(!thing.isPickupable()) {
    return false;
  }

  // Can not add to a full container..
  if(this.container.isFull()) {
    return false;
  }

  thing.setParent(this);
  this.container.addFirstEmpty(thing);

}

Container.prototype.hasIdentifier = function(cid) {

  /*
   * Function Container.hasIdentifier
   * Returns true if the container has a particular identifier
   */

  return this.container.guid === cid;

}

Container.prototype.checkPlayersAdjacency = function() {

  /*
   * Function Container.checkPlayersAdjacency
   * Checks whether players are still adjacent to a container after it moves
   */

  // Make sure players can still see the container after being moved
  this.container.spectators.forEach(player => player.containerManager.checkContainer(this));

  // Recursion over all containers within the container: those would need to be closed as well
  this.container.__slots.forEach(function(item) {

    // Do not need to check these items
    if(item === null) {
      return;
    }

    // Found another container: recursive handling
    if(item.constructor === Container) {
      item.checkPlayersAdjacency();
    }

  });

}

Container.prototype.peekIndex = function(index) {

  /*
   * Function Container.peekIndex
   * Returns a reference to the item at the requested index
   */

  return this.container.peekIndex(index);

}

Container.prototype.removeIndex = function(index, amount) {

  /*
   * Function Container.removeIndex
   * Removes an item count from the requested index
   */

  // The container is frozen and cannot be interacted with
  if(this.frozen) {
    return null;
  }

  if(!this.container.isValidIndex(index)) {
    return null;
  }

  let thing = this.container.removeIndex(index, amount);
  this.__updateParentWeightRecursion(-thing.getWeight());
  thing.setParent(null);

  return thing;

}

Container.prototype.deleteThing = function(thing) {

  /*
   * Function Container.deleteThing
   * Removes an item from the container by its reference
   */

  // The container is frozen and cannot be interacted with
  if(this.frozen) {
    return -1;
  }

  let index = this.container.deleteThing(thing);

  if(index === -1) {
    return -1;
  }

  this.__updateParentWeightRecursion(-thing.getWeight());
  thing.setParent(null);

  return index;

}

Container.prototype.addThing = function(thing, index) {

  /*
   * Function Container.addThing
   * Function to add an item to the container: this function should never be called directly!
   */

  // The container is frozen and cannot be interacted with
  if(this.frozen) {
    return false;
  }

  // Guard
  if(!thing.isPickupable()) {
    return false;
  }

  // Guard against invalid indices
  if(!this.container.isValidIndex(index)) {
    return false;
  }

  // Guard against too many (this should be checked in advance too)
  let maximum = this.getMaximumAddCount(null, thing, index);

  if(maximum === 0 || maximum < thing.count) {
    return false;
  }

  // Delegate to the base container
  this.container.addThing(thing, index);
  thing.setParent(this);

  // Go up the parent chain to update the weights of all parent containers
  this.__updateParentWeightRecursion(thing.getWeight());

  return true;

}

Container.prototype.openBy = function(player) {

  /*
   * Function Container.openBy
   * Call to open a container by a player
   */

  // Add the player as a spectator
  this.container.addSpectator(player);

  // Write the container information to the player
  player.write(new PacketWriter(PacketWriter.prototype.opcodes.OPEN_CONTAINER).writeOpenContainer(this.id, this.getName(), this.container));

}

Container.prototype.closeBy = function(player) {

  /*
   * Function Container.closeBy
   * Call to close a container by a player
   */

  // Remove the player as a spectator
  this.container.removeSpectator(player);

  player.write(new PacketWriter(PacketWriter.prototype.opcodes.CONTAINER_CLOSE).writeContainerClose(this.container.guid));

}

Container.prototype.getSlots = function() {

  /*
   * Function Container.getSlots
   * Returns the slots of the container by delegating to the base container
   */

  return this.container.getSlots();

}

Container.prototype.getSize = function() {

  /*
   * Function Container.getSize
   * Returns the size of the container by delegating to the base container
   */

  return this.container.size;

}

Container.prototype.getWeight = function() {

  /*
   * Function Container.getWeight
   * Returns the weight of the container
   */

  // Its own weight plus that of the child items
  return this.weight + this.__childWeight;

}

Container.prototype.getPosition = function() {

  /*
   * Function Container.getPosition
   * Returns the position of the container in the game world
   */

  return this.getTopParent().position;

}

Container.prototype.exceedsMaximumChildCount = function() {

  return this.__getChildCount() > this.MAXIMUM_DEPTH;

}

Container.prototype.getMaximumAddCount = function(player, thing, index) {

  /*
   * Function Container.getMaximumAddCount
   * Implements the API that returns the maximum addable count of a thing at a particular slot: 0 means none
   */

  // This is not a valid index
  if(!this.container.isValidIndex(index)) {
    return 0;
  }

  // Some extra rules if the item being added is a container
  if(thing.isContainer()) {

    // The item cannot be put inside itself
    if(this.__includesSelf(thing)) {
      return 0;
    }

    // Exceeds the maximum recursive depth of containers
    if(this.__getParentCount() > this.MAXIMUM_DEPTH || thing.exceedsMaximumChildCount()) {
      return 0;
    }

  }

  // Take a look at the item at the particular slot
  let currentThing = this.container.peekIndex(index);

  // If the slot is empty we can add the maximum stack count
  if(currentThing === null) {
    return Item.prototype.MAXIMUM_STACK_COUNT;
  }

  // Not empty but the identifiers match and the item is stackable
  if(thing.id === currentThing.id && thing.isStackable()) {

    // If all slots in the container are filled only allow up to the maximum determined by what is already there
    if(this.container.isFull()) {
      return Item.prototype.MAXIMUM_STACK_COUNT - currentThing.count;
    }
    
    // Otherwise overflow: add to an open slot in the container
    return Item.prototype.MAXIMUM_STACK_COUNT;

  }

  // Fallthrough: not possible
  return 0;

}

Container.prototype.__getChildCount = function() {

  /*
   * Function Container.__getChildCount
   * Returns the maximum child count of containers
   */

  let counts = new Array();

  // Recursion over all containers within the container: those would need to be closed as well
  this.container.__slots.forEach(function(item) {

    // Do not need to check these items
    if(item === null) {
      return;
    }

    // Found another container: recursive handling
    if(item.constructor === Container) {
      counts.push(1 + item.__getChildCount());
    }

  });

  if(counts.length === 0) {
    return 1;
  }

  return Math.max.apply(null, counts);

}

Container.prototype.closeAllSpectators = function() {

  /*
   * Function Container.closeAllSpectators
   * Closes the container for all observing players
   */

  // Go over each player that has the container opened and toggle (close) it
  this.container.spectators.forEach(player => player.containerManager.toggleContainer(this));

  // Recursion over all containers within the container: those would need to be closed as well
  this.container.__slots.forEach(function(item) {

    if(item === null) {
      return;
    }

    // Recursion for subcontainers
    if(item instanceof Container) {
      item.closeAllSpectators();
    }

  });

  return true;

}

Container.prototype.cleanup = function() {

  /*
   * Function Container.delete
   * Function called when a container is completely deleted from the game world
   */

  // Clean up all the spectators
  this.closeAllSpectators();

  // Delegate to the internal handler for extra cleanups
  if(this.__scheduledDecayEvent !== null) {
    this.__scheduledDecayEvent.cancel();
  }

}

Container.prototype.__updateWeight = function(weight) {

  /*
   * Function Container.__updateWeight
   * Updates the weight of all parents of this container
   */

  this.__childWeight += weight;

}

Container.prototype.__updateParentWeightRecursion = function(weight) {

  /*
   * Function Container.__updateParentWeightRecursion
   * Updates the weight of all parents of this container
   */

  let current = this;

  // Confirm we are not placing a container in to itself
  while(true) {

    // If the container has no parent yet we can stop (e.g., happens when it is newly created)
    if(this.__isTopParent(current)) {
      return;
    }

    // If we encounter the player in the chain: update its capacity
    current.__updateWeight(weight);

    // Proceed up the parent chain
    current = current.getParent();

  }

}

Container.prototype.__includesSelf = function(container) {

  /*
   * Function Container.__includesSelf
   * Returns true when a container is contained within itself
   */

  let current = this;

  // Confirm we are not placing a container in to itself
  while(true) {

    if(this.__isTopParent(current)) {
      return false;
    }

    // We found a parent being itself
    if(current === container) {
      return true;
    }

    // Proceed to the next parent
    current = current.getParent();

  }

  return false;

}

Container.prototype.__getParentCount = function() {

  /*
   * Function Container.prototype.__getParentCount
   * Returns the depth of a container (surface = 1)
   */

  let count = 1;
  let current = this.getParent();

  // Recursivey walk up the parent chain
  while(true) {

    // Found!
    if(this.__isTopParent(current)) {
      return count;
    }

    // Set the container to its parent
    count++;
    current = current.getParent();

  }

}

module.exports = Container;