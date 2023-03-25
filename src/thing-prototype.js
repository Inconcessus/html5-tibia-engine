"use strict";

const EventEmitter = require("./eventemitter");
const { OTBBitFlag }  = require("./bitflag");

const ThingPrototype = function(data) {

  /*
   *
   * Class ThingPrototype
   * Container for a thing prototype that contains the data definition of every thing in the world
   *
   */

  // Inherit from event emitter to handle events
  EventEmitter.call(this);

  // Set the properties passed from the OTB file
  this.id = data.id;
  this.flags = new OTBBitFlag(data.flags);
  this.group = data.group;
  this.properties = data.properties;

}

ThingPrototype.prototype = Object.create(EventEmitter.prototype);
ThingPrototype.prototype.constructor = ThingPrototype;

ThingPrototype.prototype.hasContent = function() {

  /*
   * Function ThingPrototype.hasContent
   * Returns true if the thing has content & is readable
   */

  return this.isReadable() || this.isDistanceReadable();

}

ThingPrototype.prototype.isWeapon = function() {

  /*
   * Function ThingPrototype.isWeapon
   * Returns true if the thing is a weapon
   */

  return this.__has("weaponType");

}

ThingPrototype.prototype.isEquipment = function() {

  /*
   * Function ThingPrototype.isEquipment
   * Returns true if the thing is something that can be equipped in a slot
   */

  return this.__has("slotType");

}

ThingPrototype.prototype.isDoor = function() {

  /*
   * Function ThingPrototype.isDoor
   * Returns true if the thing is a door
   */

  return this.__isType("door");

}

ThingPrototype.prototype.isDestroyable = function() {

  /*
   * Function ThingPrototype.isDestroyable
   * Returns true if the thing can be destroyed
   */

  return this.__has("destroyTo");

}

ThingPrototype.prototype.isRotateable = function() {

  /*
   * Function ThingPrototype.isRotateable
   * Returns true if the thing can be rotated
   */

  return this.__has("rotateTo");

}

ThingPrototype.prototype.isDistanceReadable = function() {

  /*
   * Function ThingPrototype.isDistanceReadable
   * Returns true if the thing is readable from a distance
   */

  return this.flags.get(OTBBitFlag.prototype.flags.FLAG_ALLOWDISTREAD);

}

ThingPrototype.prototype.isMailbox = function() {

  return this.__isType("mailbox");

}

ThingPrototype.prototype.isReadable = function() {

  /*
   * Function Thing.isReadable
   * Returns true if the thing is readable (book)
   */

  return this.__isType("readable");

}

ThingPrototype.prototype.isStackable = function() {

  /*
   * Function ThingPrototype.isStackable
   * Returns TRUE when the item is moveable
   */

  return this.flags.get(OTBBitFlag.prototype.flags.FLAG_STACKABLE);

}

ThingPrototype.prototype.isTeleporter = function() {

  /*
   * Function ThingPrototype.isTeleporter
   * Returns true when the type of the thing is a teleporter
   */

  return this.__isType("teleport");

}

ThingPrototype.prototype.isDepot = function() {

  /*
   * Function ThingPrototype.isDepot
   * Returns true when the type of the thing is a depot
   */

  return this.__isType("depot");

}

ThingPrototype.prototype.isField = function() {

  return this.__has("field");

}

ThingPrototype.prototype.isMagicField = function() {

  /*
   * Function ThingPrototype.isMagicField
   * Returns true if the thing is a magic field (e.g., energy, fire, poison)
   */

  return this.__isType("magicfield");

}

ThingPrototype.prototype.isTrashholder = function() {

  /*
   * Function Thing.isTrashholder
   * Returns true if the thing is a trashholder
   */

  return this.__isType("trashholder");

}

ThingPrototype.prototype.isPickupable = function() {

  /*
   * Function Thing.isPickupable
   * Returns true if the item is a trashholder
   */

  return this.flags.get(OTBBitFlag.prototype.flags.FLAG_PICKUPABLE);

}

ThingPrototype.prototype.isFluidContainer = function() {

  /*
   * Function Thing.isFluidContainer
   * Returns true when the type of the thing is a container. This is apparently defined by the group === 12
   */

  return this.group === 0x0C;

}

ThingPrototype.prototype.isSplash = function() {

  /*
   * Function Thing.isSplash
   * Returns true when the type of the thing is a container. This is apparently defined by the group === 11
   */

  return this.group === 0x0B;

}

ThingPrototype.prototype.isContainer = function() {

  /*
   * Function Thing.isContainer
   * Returns true when the type of the thing is a container. This is apparently defined by the group === 2
   */

  return this.group === 0x02;

}

ThingPrototype.prototype.__isType = function(type) {

  /*
   * Function Thing.__isType
   * Returns true if thing has a type
   */

  // Somehow does not have properties
  if(this.properties === null) {
    return false;
  }

  // Does not have a type
  if(!this.__has("type")) {
    return false;
  }

  return this.properties.type === type;

}

ThingPrototype.prototype.__has = function(type) {

  /*
   * Function ThingPrototype.__has
   * Returns true if the thing prototype has a particular property
   */

  return this.properties.hasOwnProperty(type);

}

module.exports = ThingPrototype;