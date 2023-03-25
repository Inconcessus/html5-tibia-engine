"use strict";

const Enum = function() {

  /*
   * Class Enum
   * Generates an enum by returning an object with symbols
   */

  // Go over each elements
  let enumerator = new Object();

  Array.from(arguments).forEach(function(x) {
    enumerator[x] = Symbol(x);
  });

  return Object.freeze(enumerator);

}

module.exports = Enum;