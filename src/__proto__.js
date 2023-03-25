"use strict";

Array.prototype.random = function() {

  /*
   * Function Array.random
   * Returns a random element from the array
   */

  return this[Math.floor(this.length * Math.random())];

}

Number.prototype.randomExp = function(min, max, lambda) {

  /*
   * Function Number.randomExp
   * Returns a random non-uniform between min, max depending on the value lambda (1 uniform) (< 1 bias towards high) (> 1 bias towards low)
   */

  return Math.floor(Math.pow(Math.random(), lambda) * (max - min + 1)) + min;

}

Array.prototype.popRandom = function() {

  /*
   * Function Array.popRandom
   * Pops a random element from the array
   */

  return this.splice(Number.prototype.random(0, this.length - 1), 1).pop();

}

Number.prototype.random = function(min, max) {

  /*
   * Function Number.random
   * Returns a random number between min and max (both inclusive)
   */

  return Math.floor(Math.random() * (max - min + 1)) + min;

}

Number.prototype.clamp = function(min, max) {

  /*
   * Function Number.clamp
   * Returns a random number between min and max (both inclusive)
   */

  return Math.min(Math.max(min, this), max);

}

Number.prototype.isValidBitFlag = function() {

  /*
   * Function Array.isValidBitFlag
   * Returns true if the given number if a valid bit flag (power of 2)
   */

  return this !== 0 && (this & (this - 1)) === 0;

}

Array.prototype.nullfilter = function() {

  /*
   * Function Array.nullfilter
   * Applies the array filter operation and eliminates elements that are null
   */

  return this.filter(x => x !== null);

}

String.prototype.capitalize = function() {

  /*
   * Function String.capitalize
   * Capitalizes a string
   */

  let thing = this.toLowerCase();

  return thing.charAt(0).toUpperCase() + thing.slice(1);

}

Array.prototype.head = function() {

  /*
   * Function Array.last
   * Returns a reference to the last element in an array
   */

  return this[0];

}

Array.prototype.last = function() {

  /*
   * Function Array.last
   * Returns a reference to the last element in an array
   */

  return this[this.length - 1];

}

String.prototype.format = function() {

  /*
   * Function String.format
   * Formats a string with interpolation of %s
   */

  let string = this;

  Array.from(arguments).forEach(function(argument) {
    string = string.replace("%s", argument);
  });

  return string;

}
