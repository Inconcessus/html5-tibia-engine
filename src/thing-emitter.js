"use strict";

const EventEmitter = require("./eventemitter");

const ThingEmitter = function() {

  /*
   * Class ThingEmitter
   * Subscribes to events and wait for emit
   */

  // Inherits from an event emitter
  EventEmitter.call(this);

}

ThingEmitter.prototype = Object.create(EventEmitter.prototype);
ThingEmitter.prototype.constructor = ThingEmitter;

ThingEmitter.prototype.emit = function(which, ...args) {

  /*
   * Function ThingEmitter.emit
   * Emits a call to the event emitter and executes callbacks
   * All user scripts are executed through here: wrap them in try|catch statements
   */

  // Delegate to internal eventemitter handler: if any callback returns false we halt the event propagation to the prototype
  // For example, all fishing rods have a prototype event listener: therefore, fishing works for all fishing rods. In the case
  // of a special fishing rod, we can attach an event handler to only that fishing rod and return false in its callback. This way
  // it will not execute the prototype.
  try {
    if(!this.__emit(which, ...args)) {
      return;
    }
   } catch(error) {
     console.debug(error);
   }

  // Wrap used defined scripts for safety and delegate to the prototype event listener too
  try {
    this.getPrototype().emit(which, ...args);
  } catch(error) {
    console.debug(error);
  }

}

module.exports = ThingEmitter;