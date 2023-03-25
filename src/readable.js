"use strict";

const Item = require("./item");

const Readable = function(id) {

  /*
   * Class Readable
   * Container for weapons that inherit from an item
   */

  // Inherit
  Item.call(this, id, 1);

  // Save the properties
  this.content = null;

}

// Inherit from event emitter
Readable.prototype = Object.create(Item.prototype);
Readable.prototype.constructor = Readable;

Readable.prototype.setContent = function(content) {

  this.content = content;

}

Readable.prototype.getContent = function() {

  /*
   * Function Readable.getContent
   * Returns the content of a readable
   */

  if(this.content === null) {
    return "Nothing is written on it";
  }

  return this.content;

}

module.exports = Readable;