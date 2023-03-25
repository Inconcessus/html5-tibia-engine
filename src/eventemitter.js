"use strict";

const EventEmitter = function() {

  /*
   * Class EventEmitter
   * Subscribes to events and wait for emit
   */

  this.__events = new Object();

}

EventEmitter.prototype.emit = function() {

  /*
   * Function EventEmitter.emit
   * Delegates to the internal emit handler
   */

  return this.__emit.apply(this, arguments)

}

EventEmitter.prototype.once = function(which, callback) {

  /*
   * Function EventEmitter.once
   * Subscribes to an event emitter but only executes the function once
   */

  // Save calling context
  let context = this;

  // Wrap the function in a new anonymous function
  let wrappedFunction = function(...args) {

    // After executing the function delete it immediately
    context.off(which, wrappedFunction);

    // Call the wrapper function with the same scope as the wrapper function
    callback.call(this, args);

  }

  // Subscribe
  this.on(which, wrappedFunction);

}

EventEmitter.prototype.hasEvent = function(which) {

  /*
   * Function EventEmitter.hasEvent
   * Returns true if the creature has an event subscribed
   */

  return this.__events.hasOwnProperty(which) && this.__events[which].size > 0;

}

EventEmitter.prototype.__emit = function(which, ...args) {

  /*
   * Function EventEmitter.emit
   * Emits a call to the event emitter and executes callbacks
   */

  // If the event is not available
  if(!this.__events.hasOwnProperty(which)) {
    return true;
  }

  // Execute all of the attached callbacks and return
  return Array.from(this.__events[which]).map(function(callback) {
    return callback.apply(this, args);
  }, this).every(Boolean);

}

EventEmitter.prototype.on = function(which, callback) {

  /*
   * Function EventEmitter.on
   * Subscribes a callback to an event
   */

  // Create a new event of this type
  if(!this.__events.hasOwnProperty(which)) {
    this.__events[which] = new Set();
  }

  // Add the function to the set
  this.__events[which].add(callback);

  // Make sure to return a reference to the callback
  return callback;

}

EventEmitter.prototype.off = function(which, callback) {

  /*
   * Function EventEmitter.off
   * Unsubscribe a callback from an event
   */

  // Not available
  if(!this.__events.hasOwnProperty(which)) {
    return;
  }

  this.__events[which].delete(callback);

}

EventEmitter.prototype.clear = function() {

  /*
   * Function EventEmitter.clear
   * Clears an event emitter
   */

  this.__events = new Object();

}

module.exports = EventEmitter;