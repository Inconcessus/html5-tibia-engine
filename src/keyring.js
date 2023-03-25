const BaseContainer = require("./base-container");
const Key = require("./key");

const Keyring = function(id, player, keyring) {

  /*
   * Class Keyring
   * Container for just keys that can automatically open doors
   */

  // Keep track of the action identifiers of all keys
  this.__keys = new Set();

  this.__player = player;
  this.container = new BaseContainer(id, 32);

  // Serialize keys
  this.__addKeys(keyring);

}

Keyring.prototype.getPosition = function() {

  /*
   * Function Keyring.getPosition
   * Returns the position of the container in the game world (which is with the player)
   */

  return this.__player.position;

}

Keyring.prototype.hasKey = function(aid) {

  /*
   * Function Keyring.hasKey
   * Returns true if a particular action identifier is in the keyring
   */

  return this.__keys.has(aid);

}

Keyring.prototype.toJSON = function() {

  /*
   * Function Equipment.toJSON
   * Implements the JSON.Stringify interface that is called when the player is serialized
   */

  // Simply return the slots which is an array of items
  return this.container.__slots;

}

Keyring.prototype.peekIndex = function(index) {

  /*
   * Function Equipment.peekIndex
   * Peeks at the item at the specified slot index
   */

  return this.container.peekIndex(index);

}

Keyring.prototype.addThing = function(key, index) {

  /*
   * Function Keyring.addThing
   * Adds a key to the keyring at the specified index
   */

  // Now feel free to add it
  this.container.addThing(key, index);
  
  // The things parent is of course the player
  key.setParent(this);
  this.__updateWeight(key.getWeight());

  // Add the identifier to the set
  this.__keys.add(key.actionId);

}

Keyring.prototype.removeIndex = function(index, count) {

  /*
   * Function Keyring.removeIndex
   * Implements the removeIndex API that handles removal of an item by the index and amount
   */

  // Handle removal by index and count
  let key = this.container.removeIndex(index, count);
  this.__updateWeight(-key.getWeight());
  key.setParent(null);

  // Delete the action identifier
  this.__keys.delete(key.actionId);

  // Otherwise return the changed item
  return key;

}

Keyring.prototype.getTopParent = function() {

  /*
   * Function Keyring.getTopParent
   * Returns the top level parent of the keyring which is the player
   */

  return this.__player;

}

Keyring.prototype.getMaximumAddCount = function(player, key, index) {

  /*
   * Function Keyring.getMaximumAddCount
   * Logic that implements whether a thing can be added to the keyring
   */

  // Block invalid indices
  if(!this.container.isValidIndex(index)) {
    return 0;
  }

  // Only accept keys
  if(key.constructor !== Key) {
    return 0;
  }

  // Already has the key (but allow moving of keys inside keyring)
  if(this.__keys.has(key.actionId) && key.__parent !== this) {
    return 0;
  }

  // Take a look at the item at the particular slot
  let thing = this.container.peekIndex(index);

  // If the slot is occupied: do not add
  if(thing !== null) {
    return 0;
  }

  return 1;

}

Keyring.prototype.__addKeys = function(keys) {

  /*
   * Function Keyring.__addKeys
   * Adds all keys serialised form the database
   */

  // Go over all the slots from the database
  keys.forEach(function(item, index) {

    if(item === null) {
      return;
    }
 
    this.addThing(process.gameServer.database.parseThing(item), index);

  }, this);

}

Keyring.prototype.__updateWeight = function(weight) {

  /*
   * Function Equipment.__updateWeight
   * Updates the capacity of the parent player
   */

  // Invert the weight
  this.__player.changeCapacity(-weight);

}

module.exports = Keyring;