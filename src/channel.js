"use strict";

const Channel = function(id, name) {

  /*
   * Class Channel
   * Base for classes that implement channels (e.g., default or global channels)
   *
   */

  // Each channel has a readalbe name and identifier
  this.id = id;
  this.name = name;

}

Channel.prototype.equals = function(id) {

  /*
   * Function Channel.equals
   * Returns if this is the channel with identifier id
   */

  return this.id === id;

}

module.exports = Channel;