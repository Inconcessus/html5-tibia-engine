"use strict";

const Item = require("./item");

const Teleporter = function(id) {

  /*
   * Class Teleporter
   * Wrapper for an item that teleports the player to another location
   */

  Item.call(this, id);

  this.destination = null;

}

Teleporter.prototype = Object.create(Item.prototype);
Teleporter.prototype.constructor = Teleporter;

Teleporter.prototype.setDestination = function(destination) {

  /*
   * Function Teleporter.setDestination
   * Wrapper for an item that teleports players and items to another location
   */

  this.destination = destination;

}

module.exports = Teleporter;