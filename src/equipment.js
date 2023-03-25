"use strict";

const Item = require("./item");
const BaseContainer = require("./base-container");
const Condition = require("./condition");

const Equipment = function(cid, player, equipment) {

  /*
   * Class Equipment
   * Container for player equipment that can contain items and keep state of all equipped attributes
   * 
   * API:
   *
   * Equipment.peekIndex(index) - Looks what is equipped at the requested index (see Equipment.SLOTS)
   * Equipment.isAmmunitionEquipped() - Returns true if the correct ammunition is equipped
   *
   */

  // Save a circular reference to the player
  this.__player = player;

  // A base container to keep all the items
  this.container = new BaseContainer(cid, equipment.length);

  // Add the equipment from the database
  this.__addEquipment(equipment);

  // Self spectate changes to the equipment always
  this.container.spectators.add(player);

}

// Slot indices
Equipment.prototype.SLOTS = new Object({
  "HELMET": 0,
  "ARMOR": 1,
  "LEGS": 2,
  "BOOTS": 3,
  "HAND_RIGHT": 4,
  "HAND_LEFT": 5,
  "BACKPACK": 6,
  "NECKLACE": 7,
  "RING": 8,
  "QUIVER": 9
});

Equipment.prototype.getTopParent = function() {

  /*
   * Function Equipment.getTopParent
   * Returns the top parent of the equipment which is the player
   */

  return this.__player;

}

Equipment.prototype.getParent = function() {

  /*
   * Function Equipment.getParent
   * The parent of the container is always the player
   */

  return this.__player;

}

Equipment.prototype.toJSON = function() {

  /*
   * Function Equipment.toJSON
   * Implements the JSON.Stringify interface that is called when the player is serialized
   */

  // Simply return the slots which is an array of items
  return this.container.__slots;

}

Equipment.prototype.handleChangeOnEquip = function(thing, change) {

  let newThing = process.gameServer.database.createThing(change);
  thing.copyProperties(newThing);
  
  thing.cleanup();

  return newThing;

}

Equipment.prototype.handleChangeThing = function(thing, change) {

  /*
   * Function Equipment.handleChangeThing
   * Handles changing an item on equip event
   */

  let newThing = process.gameServer.database.createThing(change);

  // Copy over the properties
  thing.copyProperties(newThing);

  // Clean up the item
  thing.cleanup();

  return newThing;

}

Equipment.prototype.removeIndex = function(index, count) {

  /*
   * Function Equipment.removeIndex
   * Implements the removeIndex API that handles removal of an item by the index and amount
   */

  // Handle removal by index and count
  let thing = this.container.removeIndex(index, count);
  this.__updateWeight(-thing.getWeight());
  thing.setParent(null);

  // Removed thing has attribute invisible?
  if(thing.getAttribute("invisible")) {
    this.__player.removeCondition(Condition.prototype.INVISIBLE);
  }

  if(thing.getAttribute("suppressDrunk")) {
    this.__player.removeCondition(Condition.prototype.SUPPRESS_DRUNK);
  }

  if(thing.getAttribute("manashield")) {
    this.__player.removeCondition(Condition.prototype.MAGIC_SHIELD);
  }

  let change = thing.getChangeOnUnequip();

  // We have to change the item before returning it
  if(change !== null) {
    return this.handleChangeThing(thing, change);
  }

  // Otherwise return the changed item
  return thing;

}

Equipment.prototype.deleteThing = function(thing) {

  /*
   * Function Equipment.deleteThing
   * Implements the deleteThing API that handles removal of an item by its reference
   */

  // Handle removal by thing reference
  let index = this.container.deleteThing(thing);

  if(index === -1) {
    return -1;
  }

  this.__updateWeight(-thing.getWeight());
  thing.setParent(null);

  // Clean up the conditions
  if(thing.getAttribute("invisible")) {
    this.__player.removeCondition(Condition.prototype.INVISIBLE);
  }

  if(thing.getAttribute("suppressDrunk")) {
    this.__player.removeCondition(Condition.prototype.SUPPRESS_DRUNK);
  }

  if(thing.getAttribute("manashield")) {
    this.__player.removeCondition(Condition.prototype.MAGIC_SHIELD);
  }

  return index;

}

Equipment.prototype.peekIndex = function(index) {

  /*
   * Function Equipment.peekIndex
   * Peeks at the item at the specified slot index
   */

  return this.container.peekIndex(index);

}

Equipment.prototype.addThing = function(thing, index) {

  /*
   * Function Equipment.addThing
   * Adds an item to the passed slot index
   */

  // Guard
  if(!thing.isPickupable()) {
    return false;
  }

  let change = thing.getChangeOnEquip();

  // We have to change the item before adding it
  if(change !== null) {
    thing = this.handleChangeThing(thing, change);
  }

  // The equipped item has a property invisible
  if(thing.getAttribute("invisible")) {
    this.__player.addCondition(Condition.prototype.INVISIBLE, -1, -1, null);
  }

  if(thing.getAttribute("suppressDrunk")) {
    this.__player.addCondition(Condition.prototype.SUPPRESS_DRUNK, -1, -1, null);
  }

  if(thing.getAttribute("manashield")) {
    this.__player.addCondition(Condition.prototype.MAGIC_SHIELD, -1, -1, null);
  }

  // Now feel free to add it
  this.container.addThing(thing, index);
  
  // The things parent is of course the player
  thing.setParent(this);
  
  // Decrement the capacity
  return this.__updateWeight(thing.getWeight());



}

Equipment.prototype.getMaximumAddCount = function(player, thing, index) {

  /*
   * Function Equipment.getMaximumAddCount
   * Returns the count of the item that can be added to a tile
   */

  // Check whether the item type matches that of the slot
  if(!this.__isRightType(thing, index)) {
    return 0;
  }

  // Take a look at the item in the slot
  let currentItem = this.peekIndex(index);

  // The slot is currently empty, accept the maximum count
  if(currentItem === null) {
    return Item.prototype.MAXIMUM_STACK_COUNT;
  }

  // Not empty but the identifiers match and the item is stackable: return the maximum minus what is already there.
  if(currentItem.id === thing.id && thing.isStackable()) {
    return Item.prototype.MAXIMUM_STACK_COUNT - currentItem.count;
  }

  // Not able to add: another item is occupying the slot
  return 0;

}

Equipment.prototype.isAmmunitionEquipped = function() {

  /*
   * Public Function Equipment.isAmmunitionEquipped
   * Returns true if the player has ammunition equipped
   */

  // Take a look at the quiver
  let ammunition = this.peekIndex(this.SLOTS.QUIVER);

  // If nothing is equipped there is no ammunition
  if(ammunition === null) {
    return false;
  }

  // Confirm the ammunition of the right type
  let weapon = this.peekIndex(this.SLOTS.HAND_LEFT);

  // Weapon does not match ammunition type
  if(!weapon.isRightAmmunition(ammunition)) {
    return false;
  }

  return true;

}

Equipment.prototype.isDistanceWeaponEquipped = function() {

  /*
   * Public Function Equipment.isDistanceWeaponEquipped
   * Returns true if distance weapon equipped
   */

  // Take a look at the weapon in the left hand slot
  let thing = this.peekIndex(this.SLOTS.HAND_LEFT);

  if(thing === null) {
    return false;
  }

  // Check whether is thing is a distance weapon
  return thing.isDistanceWeapon();

}

Equipment.prototype.hasSufficientResources = function(resource, amount) {

  /*
   * Function Equipment.hasSufficientResources
   * Returns true if the player has a number of sufficient resources (e.g., gold)
   */

  let backpack = this.peekIndex(this.SLOTS.BACKPACK);

  if(backpack === null) {
    return false;
  }

  let remainingAmount = amount;

  for(let i = 0; i < backpack.container.__slots.length; i++) {

    let slot = backpack.container.__slots[i];

    if(slot === null) {
      continue;
    }

    if(slot.id === resource) {

      if(slot.count >= remainingAmount) {
        return true;
      }

      remainingAmount = Math.max(0, remainingAmount - slot.count);

    }

    // The residual is zero: the player has sufficient resources
    if(remainingAmount === 0) {
      return true;
    }

  }

  return false;

}

Equipment.prototype.payWithResource = function(resource, amount) {

  /*
   * Function Equipment.payWithResource
   * Pays with a number of resources from the player's equipped backpack
   */

  let backpack = this.peekIndex(this.SLOTS.BACKPACK);

  if(backpack === null) {
    return false;
  }

  // Guard against not sufficient resources
  if(!this.hasSufficientResources(resource, amount)) {
    return false;
  }

  let remainingAmount = amount;

  // Same algorithm as above but now subtract and remove the resources
  for(let i = 0; i < backpack.container.__slots.length; i++) {

    let slot = backpack.container.__slots[i];

    if(slot === null) {
      continue;
    }

    if(slot.id === resource) {

      // More than enough: subtract
      if(slot.count >= remainingAmount) {
        backpack.removeIndex(i, remainingAmount);
        return true;
      }

      // Remove the entire stack
      backpack.removeIndex(i, slot.count);
      remainingAmount = remainingAmount - slot.count;

    }

  }

}

Equipment.prototype.canPushItem = function(thing) {

  /*
   * Function Equipment.canPushItem
   * Return true if a thing can be pushed to the players inventory
   */

  // Take a look if there is a backpack equipped
  let backpack = this.peekIndex(this.SLOTS.BACKPACK);

  // If the item cannot be added to the backpack just drop it on the ground
  if(backpack === null) {
    return false;
  }

  // Prevent unwanted nesting of containers in the players own backpack (e.g., when evicting nested backpacks from a house)
  if(thing.constructor.name === "Container" && thing.exceedsMaximumChildCount()) {
    return false;
  }

  // Full or no capacity
  if(backpack.container.isFull() || !this.__player.hasSufficientCapacity(thing)) {
    return false;
  }

  return true;

}

Equipment.prototype.pushItem = function(thing) {

  /*
   * Function Equipment.pushItem
   * Pushes an item into the backpack of the player or on the ground
   */

  // Take a look if there is a backpack equipped
  let backpack = this.peekIndex(this.SLOTS.BACKPACK);

  if(backpack === null) {
    return;
  }

  backpack.addFirstEmpty(thing);

}

Equipment.prototype.getAttributeState = function(attribute) {

  /*
   * Function Equipment.getAttributeState
   * Returns the state of the player equipment by summing individual contributions
   */

  let sum = 0;

  // Go over all the slots
  this.container.__slots.forEach(function(thing) {

    // A thing is equipped..
    if(thing === null) {
      return;
    }

    let value = thing.getAttribute(attribute);

    if(value === null) {
      return;
    }

    sum += value;

  });

  return sum;

}

Equipment.prototype.__isRightType = function(item, slot) {

  /*
   * Function Equipment.__isRightType
   * Returns true if the item matches the slot type
   */

  // Get the prototype
  let proto = item.getPrototype();

  switch(slot) {
    case this.SLOTS.HELMET: return proto.properties.slotType === "head";
    case this.SLOTS.ARMOR: return proto.properties.slotType === "body";
    case this.SLOTS.LEGS: return proto.properties.slotType === "legs";
    case this.SLOTS.BOOTS: return proto.properties.slotType === "feet";
    case this.SLOTS.HAND_RIGHT: return proto.properties.weaponType === "shield";	
    case this.SLOTS.HAND_LEFT: return proto.properties.weaponType === "sword" || proto.properties.weaponType === "distance";
    case this.SLOTS.BACKPACK: return proto.properties.slotType === "backpack";
    case this.SLOTS.NECKLACE: return proto.properties.slotType === "necklace";
    case this.SLOTS.RING: return proto.properties.slotType === "ring";
    case this.SLOTS.QUIVER: return proto.properties.weaponType === "ammunition";
    default: return false;
  }

}

Equipment.prototype.__updateWeight = function(weight) {

  /*
   * Function Equipment.__updateWeight
   * Updates the capacity of the parent player
   */

  // Invert the weight
  this.__player.changeCapacity(-weight);

}

Equipment.prototype.__addEquipment = function(equipment) {

  /*
   * Function Equipment.__addEquipment
   * Adds equipment in serialised form from the database
   */

  // Go over all the equipment slots from the database
  equipment.forEach(function(item, index) {

    if(item === null) {
      return;
    }
 
    let thing = process.gameServer.database.parseThing(item);

    this.addThing(thing, index);

    // Adding something with invisible attribute
    if(thing.getAttribute("invisible")) {
      this.__player.addCondition(Condition.prototype.INVISIBLE, -1, -1, null);
    }

  }, this);

}

module.exports = Equipment;