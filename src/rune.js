"use strict";

const Item = require("./item");

const Rune = function(id) {

  /*
   * Class Rune
   * Container for a corpse that inherits from a container
   */

  // Inherits from Item
  Item.call(this, id);

  // Set the initial charges from the otb metadata
  this.charges = this.getMaximumCharges();
 
}

Rune.prototype = Object.create(Item.prototype);
Rune.prototype.constructor = Rune;

Rune.prototype.getMaximumCharges = function() {

  /*
   * Function Rune.getMaximumCharges
   * Returns the number of initial charges from the prototype definitions
   */

  // Read from the prototype
  let proto = this.getPrototype();

  // Check if the number of charges exists
  if(proto.properties.hasOwnProperty("charges")) {
    return Number(proto.properties.charges);
  }

  return 1;

}

module.exports = Rune;