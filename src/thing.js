"use strict";

const ThingEmitter = require("./thing-emitter");
const { OTBBitFlag } = require("./bitflag");

const Thing = function(id) {

  /*
   * Class Thing
   * Base container for things (items, containers, corpses)
   *
   * API:
   *
   * Thing.getPrototype() - Returns the prototype of the item that contains the object information
   * Thing.setUniqueId() - Sets a unique identifier 
   *
   */

  // Inherit from event emitters
  ThingEmitter.call(this);

  this.id = id;

  this.duration = null;
  this.frozen = false;

  // Things must have a parent that is a tile or container
  this.__parent = null;
  this.__scheduledDecayEvent = null;

}

Thing.prototype = Object.create(ThingEmitter.prototype);
Thing.prototype.constructor = Thing;

Thing.prototype.unfreeze = function() {

  /*
   * Function Thing.unfreeze
   * Unfreezes the thing from all player interactions
   */

  this.frozen = false;

}

Thing.prototype.freeze = function() {

  /*
   * Function Thing.freeze
   * Freeze the thing from all player interactions (e.g., when it is undergoing I/O)
   */

  this.frozen = true;

}

Thing.prototype.hasUniqueId = function() {

  /*
   * Function Thing.hasUniqueId
   * Returns true if the item has a unique identifier
   */

  return this.uid;

}

Thing.prototype.isRightAmmunition = function(ammunition) {

  /*
   * Function Thing.isRightAmmunition
   * Returns true if the ammunition matches the weapon ammunition type
   */

  return this.getAttribute("ammoType") === ammunition.getAttribute("ammoType");

}

Thing.prototype.getWeight = function() {

  /*
   * Function Thing.getWeight
   * Returns the weight of a thing
   */

  // Weight 0 means it cannot be picked up
  if(!this.isPickupable()) {
    return 0;
  }

  // Multiple the count by the individual weight
  if(this.isStackable()) {
    return this.weight * this.count;
  }

  return this.weight;

}

Thing.prototype.scheduleDecay = function() {

  /*
   * Function Thing.scheduleDecay
   * Schedules the decay event for a particular thing
   */

  // Defensive
  if(!this.isDecaying()) {
    return;
  }

  // If there is no duration: set the default decay duration
  if(this.duration === null) {
    this.setDuration(this.__getDecayProperties().duration);
  }

  // Schedule a decay event at the requested duration
  this.__scheduleDecay(this.duration);

}

Thing.prototype.setActionId = function(actionId) {

  /*
   * Function Thing.setActionId
   * Sets the action id to a number
   */

  this.actionId = actionId;

}

Thing.prototype.setUniqueId = function(uid) {

  /*
   * Function Thing.setUniqueId
   * Sets the unique identifier of a thing
   */

  // Update the identifier
  this.uid = uid;

  // Make sure to attach listeners to the identifier
  process.gameServer.database.attachUniqueEvent(uid, this);

}

Thing.prototype.setDuration = function(duration) {

  /*
   * Function Thing.setDuration
   * Sets the default decay duration for a thing in a number of frames
   */

  this.duration = duration;

}

Thing.prototype.setCount = function(count) {

  /*
   * Function Thing.setCount
   * Sets the count of an item between minimum and maximum
   */

  this.count = count.clamp(0, this.MAXIMUM_STACK_COUNT);

  return this;

}

Thing.prototype.setParent = function(parent) {

  /*
   * Function Container.setParent
   * Sets the parent of the container
   */

  // Reference the parent container or tile
  this.__parent = parent;

}

Thing.prototype.setContent = function(content) {

  /*
   * Function Thing.setContent
   * Sets the content of a thing
   */

  this.content = content;

}

Thing.prototype.getShootType = function() {

  /*
   * Function Thing.getShootType
   * Returns the distance type of a particular thing
   */

  // Map the shootType property to the correct projectile type
  switch(this.getAttribute("shootType")) {
    case "spear": return CONST.EFFECT.PROJECTILE.SPEAR;
    case "bolt": return CONST.EFFECT.PROJECTILE.BOLT;
    case "arrow": return CONST.EFFECT.PROJECTILE.ARROW;
    case "fire": return CONST.EFFECT.PROJECTILE.FIRE;
    case "energy": return CONST.EFFECT.PROJECTILE.ENERGY;
    case "poisonarrow": return CONST.EFFECT.PROJECTILE.POISONARROW;
    case "burstarrow": return CONST.EFFECT.PROJECTILE.BURSTARROW;
    case "throwingstar": return CONST.EFFECT.PROJECTILE.THROWINGSTAR;
    case "throwingknife": return CONST.EFFECT.PROJECTILE.THROWINGKNIFE;
    case "smallstone": return CONST.EFFECT.PROJECTILE.SMALLSTONE;
    case "death": return CONST.EFFECT.PROJECTILE.DEATH;
    case "largerock": return CONST.EFFECT.PROJECTILE.LARGEROCK;
    case "snowball": return CONST.EFFECT.PROJECTILE.SNOWBALL;
    case "powerbolt": return CONST.EFFECT.PROJECTILE.POWERBOLT;
    case "poison": return CONST.EFFECT.PROJECTILE.POISON;
    default: return CONST.EFFECT.PROJECTILE.SPEAR;
  }

}

Thing.prototype.getArticle = function() {

  /*
   * Function Thing.getArticle
   * Returns the thing article from the items.xml
   */

  return this.getAttribute("article");

}

Thing.prototype.getPosition = function() {

  /*
   * Function Thing.getPosition
   * Returns the parent of a thing: if it has a position it is its own parent
   */

  return this.getTopParent().position;

}

Thing.prototype.getTopParent = function() {

  /*
   * Function Container.getTopParent
   * Returns the top level parent of the container
   */

  let current = this;

  // Confirm we are not placing a container in to itself
  while(true) {

    // Stop when we reached the top level container
    if(this.__isTopParent(current)) {
      return current;
    }

    // Go over the parent
    current = current.getParent();

  }

}

Thing.prototype.getAttribute = function(attribute) {

  /*
   * Function Thing.getAttribute
   * Returns an attribute from the thing prototype
   */

  let properties = this.getPrototype().properties;

  // Does not exist
  if(!properties.hasOwnProperty(attribute)) {
    return null;
  }

  return properties[attribute];

}

Thing.prototype.getPrototype = function() {

  /*
   * Function Thing.getPrototype
   * Returns the data object based on the identifier
   */

  return process.gameServer.database.getThingPrototype(this.id);

}

Thing.prototype.getTrashEffect = function() {

  /*
   * Function Thing.getTrashEffect
   * Returns the trash effect after trashing an item
   */

  switch(this.getAttribute("effect")) {
    case "fire": return CONST.EFFECT.MAGIC.HITBYFIRE;
    case "bluebubble": return CONST.EFFECT.MAGIC.LOSEENERGY;
    default: return CONST.EFFECT.MAGIC.POFF;
  }

}

Thing.prototype.isMagicDoor = function() {

  return this.isDoor() && (this.getAttribute("expertise") || this.getAttribute("unwanted"));

}

Thing.prototype.getName = function(player) {

  /*
   * Function Thing.getName
   * Returns the thing description from the items.xml
   */

  // Return the name and the key number
  if(this.constructor.name === "Key" && this.hasOwnProperty("actionId")) {
    return "%s (#%s)".format(this.getAttribute("name"), this.actionId);
  }

  // Only return the name
  return "%s".format(this.getAttribute("name"));

}

Thing.prototype.getRemainingDuration = function() {

  /*
   * Function Thing.getRemainingDuration
   * Returns the remaining duration on a thing
   */

  // Not decaying: just copy over
  if(!this.isDecaying()) {
    return this.duration;
  }

  // Just return the remaining number of frames until decay
  return Math.floor(1E-3 * CONFIG.SERVER.MS_TICK_INTERVAL * this.__scheduledDecayEvent.remainingFrames());

}

Thing.prototype.getDescription = function() {

  /*
   * Function Thing.getDescription
   * Returns the thing description from the items.xml
   */

  // Has a duration
  if(this.getAttribute("showduration")) {

    if(this.duration === null) {
      return "It is brand-new.";
    } else {
      return this.getDurationString();
    }

  }

  // Special handling for expertise doors
  if(this.isDoor()) {
    if(this.isHouseDoor()) {
      return "It belongs to %s and is owned by %s.".format(this.getHouseName(), this.getHouseOwner());
    } else if(this.getAttribute("expertise")) {
      return "Only adventurers of level %s may pass.".format(this.actionId - 100);
    }
  }

  return this.getAttribute("description");

}

Thing.prototype.getDurationString = function() {

  /*
   * Function Thing.getDurationString
   * Returns string representation of the number of seconds until a decay happens
   */

  // Calculate the number of remaining seconds
  let remainingSeconds = this.getRemainingDuration();
  let minutes = Math.ceil(remainingSeconds / 60);

  // Seconds or minutes
  if(remainingSeconds > 60) {
    if(this.isDecaying()) {
      return "It will decay in %s minutes and %s seconds.".format(minutes, (remainingSeconds % 60));
    } else {
      return "It has %s minutes and %s seconds remaining.".format(minutes, (remainingSeconds % 60));
    }
  } else {
    if(this.isDecaying()) {
      return "It will decay in %s seconds.".format(remainingSeconds);
    } else {
      return "It has %s seconds remaining.".format(remainingSeconds);
    }
  }

}

Thing.prototype.getCount = function() {

  /*
   * Function Thing.getCount
   * Returns the count of an item (always 0 for non-stackables)
   */

  // These items have a count: either stackable or it identifies something else (e.g., the fluid type)
  if(this.isFluidContainer() || this.isStackable() || this.isSplash()) {
    return this.count;
  }

  return 0;

}

Thing.prototype.hasActionId = function() {

  /*
   * Function Thing.hasActionId
   * Returns true if the thing has an actionID
   */

  return this.hasOwnProperty("actionId");

}

Thing.prototype.createFungibleThing = function(count) {

  /*
   * Function Thing.createFungibleThing
   * Creates a stackable item that is fungible
   */

  return process.gameServer.database.createThing(this.id).setCount(count);

}

Thing.prototype.delete = function() {

  // Remove the item
  this.remove();

  // Clean up the item
  this.cleanup();

}

Thing.prototype.remove = function() {

  /*
   * Function Thing.remove
   * Removes an item from the gameworld
   */

  // Delegate to the internal handler: other classes may implement the .remove() function for special handling (e.g., containers)
  return this.__parent.deleteThing(this);

}

Thing.prototype.copyProperties = function(thing) {

  /*
   * Function Thing.copyProperties
   * Copies over the state properties from one thing to another
   */

  // The thing does not have a duration yet: copy it over from the transformed item
  if(thing.duration === null) {
    thing.setDuration(this.getRemainingDuration());
  }

  // Make sure to schedule the decay event itself
  if(thing.isDecaying()) {
    thing.scheduleDecay();
  }
 
  if(this.uid) {
    thing.setUniqueId(this.uid);
  }

  // Both are containers of the same size: carry over the items to the new container
  // This is required for e.g., corpses that decay but still contain items
  if(this.isContainer() && thing.isContainer() && this.size === thing.size) {
    thing.container.copyContents(this.container);
  }

}

Thing.prototype.replace = function(thing) {

  /*
   * Function Thing.replace
   * Replaces one thing with another at the same position
   */

  this.copyProperties(thing);

  // Replacing means adding and removing an item at the same time
  this.__parent.addThing(thing, this.remove());

  // Clean up the thing
  this.cleanup();

  return thing;

}

Thing.prototype.rotate = function() {

  /*
   * Function Thing.rotate
   * Rotates the thing to the defined "rotate to" attribute in the metadata
   */

  // The thing cannot be rotated
  if(!this.isRotateable()) {
    return;
  }

  // Replace with the rotated item
  this.replace(process.gameServer.database.createThing(this.getAttribute("rotateTo")));

}

Thing.prototype.removeCount = function(count) {

  /*
   * Function Thing.removeCount
   * Returns true if the parent is a tile or player
   */

  // Not stackable: remove everything
  if(!this.isStackable()) {
    return this.remove();
  }
 
  this.__parent.deleteThing(this, count);

}

Thing.prototype.isTrashholder = function() {

  /*
   * Function Thing.isTrashholder
   * Returns true when the thing is a trashholder
   */

  return this.getPrototype().isTrashholder();

}

Thing.prototype.isDoor = function() {

  /*
   * Function Thing.isDoor
   * Returns true when the thing is a door
   */

  return this.getPrototype().isDoor();

}

Thing.prototype.isReadable = function() {

  /*
   * Function Thing.isReadable
   * Returns true when the type of the thing is a readable
   */

  return this.getPrototype().isReadable();

}

Thing.prototype.isDistanceWeapon = function() {

  /*
   * Function Thing.isDistanceWeapon
   * Returns true if the weapon is a distance weapon
   */

  return this.getAttribute("weaponType") === "distance";

}

Thing.prototype.isDepot = function() {

  /*
   * Function Thing.isDepot
   * Returns true when the type of the thing is a depot
   */

  return this.getPrototype().isDepot();

}

Thing.prototype.isContainer = function() {

  /*
   * Function Thing.isContainer
   * Returns true when the type of the thing is a container
   */

  return this.getPrototype().isContainer();

}

Thing.prototype.isTeleporter = function() {

  /*
   * Function Thing.isTeleporter
   * Returns true when the type of the thing is a teleporter
   */

  return this.getPrototype().isTeleporter();

}

Thing.prototype.isMailbox = function() {

  return this.getPrototype().isMailbox();

}


Thing.prototype.isPickupable = function() {

  /*
   * Function Thing.isPickupable
   * Returns true if the item is a trashholder
   */

  return this.getPrototype().isPickupable();

}

Thing.prototype.getChangeOnUnequip = function() {

  return this.getAttribute("transformDeEquipTo");

}

Thing.prototype.getChangeOnEquip = function() {

  return this.getAttribute("transformEquipTo");

}

Thing.prototype.isDecaying = function() {

  /*
   * Function Thing.isDecaying
   * Returns true if the thing is a decaying thing
   */

  return this.getAttribute("decayTo") !== null;

}

Thing.prototype.isHangable = function() {

  return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_HANGABLE);

}

Thing.prototype.isHorizontal = function() {

  return this.isHangable() && this.hasFlag(OTBBitFlag.prototype.flags.FLAG_HORIZONTAL);

}

Thing.prototype.isVertical = function() {

  return this.isHangable() && this.hasFlag(OTBBitFlag.prototype.flags.FLAG_VERTICAL);

}

Thing.prototype.isBlockProjectile = function() {

  /*
   * Function Thing.isBlockProjectile
   * Returns true if the thing blocks pathfinding
   */

  return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_BLOCK_PROJECTILE);

}

Thing.prototype.isDistanceReadable = function() {

  /*
   * Function Thing.isDistanceReadable
   * Returns true if the item is readable from a distance
   */

  return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_ALLOWDISTREAD);

}

Thing.prototype.isBlockPathfind = function() {

  /*
   * Function Thing.isBlockPathfind
   * Returns true if the thing blocks pathfinding
   */

  return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_BLOCK_PATHFIND);

}

Thing.prototype.isBlockSolid = function() {

  /*
   * Function Thing.isBlockSolid
   * Returns true if the item blocks solid items
   */

  return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_BLOCK_SOLID);

}

Thing.prototype.isStackable = function() {

  /*
   * Function Thing.isMoveable
   * Returns TRUE when the item is moveable
   */

  return this.hasFlag(OTBBitFlag.prototype.flags.FLAG_STACKABLE);

}

Thing.prototype.isMagicField = function() {

  /*
   * Function Thing.isMagicField
   * Returns true if the thing is a magic field
   */

  return this.getPrototype().isMagicField();

}

Thing.prototype.isSplash = function() {

  /*
   * Function Thing.isSplash
   * Returns true if the thing is a splash
   */

  return this.getPrototype().isSplash();

}


Thing.prototype.isFluidContainer = function() {

  /*
   * Function Thing.isFluidContainer
   * Returns true if the thing is a fluid container
   */

  return this.getPrototype().isFluidContainer();

}

Thing.prototype.isTrashholder = function() {

  /*
   * Function Thing.isTrashholder
   * Returns true if the item is a trashholder
   */

  return this.getPrototype().isTrashholder();

}

Thing.prototype.isRotateable = function() {

  /*
   * Function Thing.isRotateable
   * Returns true if the item is rotateable
   */

  return this.getPrototype().isRotateable();

}

Thing.prototype.hasFlag = function(flag) {

  /*
   * Function Thing.hasFlag
   * Returns whether the flag in the data object is set
   */

  return this.getPrototype().flags.get(flag);

}

Thing.prototype.cleanup = function() {

  /*
   * Function Thing.delete
   * Deletes a thing by cleaning up: other classes (e.g., containers may implement the "delete" method)
   */

  if(this.__scheduledDecayEvent !== null) {
    this.__scheduledDecayEvent.cancel();
  }

}

Thing.prototype.__scheduleDecay = function(duration) {

  /*
   * Function Thing.__scheduleDecay
   * Schedules a decay event for a particular thing
   */

  // Get the decaying properties
  let properties = this.__getDecayProperties();

  // Decay to zero means remove from game world
  if(properties.decayTo === 0) {
    return this.__scheduledDecayEvent = process.gameServer.world.eventQueue.addEventSeconds(this.remove.bind(this), duration);
  }

  // Schedule an event to create a replace the item with a new item: the new decay process is started when an item is created
  this.__scheduledDecayEvent = process.gameServer.world.eventQueue.addEventSeconds(this.__decayCallback.bind(this, properties.decayTo), duration);

}

Thing.prototype.__decayCallback = function(id) {

  /*
   * Function Thing.__decayCallback
   * Callback fired when an item has to be decayed
   */

  // Create a new thing with a particular "decay to" identifier
  let thing = process.gameServer.database.createThing(id);

  // If this is a splash we should copy over the count which indicates the fluid type
  if(this.isSplash()) {
    thing.setCount(this.count);
  }

  // Make sure to set the new decay duration (e.g., torch -> smaller torch -> smallest torch)
  if(this.isDecaying()) {
    thing.setDuration(this.__getDecayProperties().duration);
  }

  // Call the replace function
  this.replace(thing);

}

Thing.prototype.__isTopParent = function(thing) {

  /*
   * Function Thing.__isTopParent
   * Returns true if the parent is a tile or player or the depot. These things have no "parent" and represent the top of the chain
   */

  // These are top levels
  return thing === null ||
         thing.constructor.name === "DepotContainer" ||
         thing.constructor.name === "Tile" ||
         thing.constructor.name === "Player";

}

Thing.prototype.__getDecayProperties = function() {

  /*
   * Function Thing.__getDecayProperties
   * Returns the decay properties of the thing
   */

  // Read from the prototype
  let proto = this.getPrototype();

  // Has a duration and identifier it decays to
  return new Object({
    "decayTo": Number(proto.properties.decayTo),
    "duration": Number(proto.properties.duration)
  });

}

Thing.prototype.getParent = function() {

  return this.__parent;

}

module.exports = Thing;
