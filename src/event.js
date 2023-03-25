"use strict";

const Event = function(callback, when) {

  /*
   * Class Event
   * Container for events that fire a callback at a given frame
   */

  this.callback = callback;
  this.__f = when;

  // If the event was cancelled and needs not to be executed
  this.cancelled = false;

}

Event.prototype.frame = function() {

  /*
   * Function Event.frame
   * Returns the frame that the event should be executed on
   */

  return this.__f;

}

Event.prototype.remove = function() {

  /*
   * Function Event.remove
   * Function to remove an event from the event queue
   */

  process.gameServer.world.eventQueue.remove(this);

}

Event.prototype.cancel = function() {

  /*
   * Function Event.cancel
   * Cancels a scheduled event so that it is no longer executed
   */

  this.cancelled = true;

}

Event.prototype.remainingFrames = function() {

  /*
   * Function Event.remainingFrames
   * Returns the number of frames remaining before the event is scheduled
   */

  return this.__f - process.gameServer.gameLoop.getCurrentFrame();

}

module.exports = Event;