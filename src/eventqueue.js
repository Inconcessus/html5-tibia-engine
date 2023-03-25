"use strict";

const BinaryHeap = require("./binary-heap");
const Event = require("./event");

const EventQueue = function() {

  /*
   * Class EventQueue
   * Container for priority queuing class based on a binary heap
   * 
   * API:
   * 
   * EventQueue.addEventSeconds(callback, s) - Adds an event a number of seconds from now
   * EventQueue.addEventMs(callback, ms) - Adds an event a number of miliseconds from now
   * EventQueue.addEvent(callback, frames) - Adds an event a number of frames from now
   *
   */

  // Interval counter
  this.__internalCounter = 0;

  // Create the binary heap
  this.heap = new BinaryHeap();

}

EventQueue.prototype.addEventSeconds = function(callback, seconds) {

  /*
   * Function EventQueue.addEventSeconds
   * Adds an event that fires a number of seconds from now
   */

  let when = Math.floor(1000 / CONFIG.SERVER.MS_TICK_INTERVAL) * seconds;

  return this.addEvent(callback, when);

}

EventQueue.prototype.addEventMs = function(callback, ms) {

  /*
   * Function EventQueue.addEventMs
   * Adds an event a number of miliseconds from now
   */

  // Number of ticks
  let when = Math.floor(ms / CONFIG.SERVER.MS_TICK_INTERVAL);

  return this.addEvent(callback, when);

}

EventQueue.prototype.addEvent = function(callback, when) {

  /*
   * Function EventQueue.addEvent
   * Adds an event a number of ticks from now
   */

  if(isNaN(when)) {
    return console.trace("Invalid event added.");
  }

  // Make sure
  when = Math.floor(Math.max(when, 0));

  // Determine the frame when to execute the function
  return this.__addEvent(callback, this.__internalCounter + when);

}

EventQueue.prototype.tick = function() {
  
  /*
   * Function EventQueue.tick
   * Executes all events scheduled to be run in the queue
   */
  
  // Increment the tick counter
  this.__internalCounter++
  
  // Execute all pending events
  while(true) {
    
    // If there are no more items in the heap
    if(this.heap.content.length === 0) {
      return;
    }
    
    // Check that the frame is beyond the current counter 
    if(this.heap.next().frame() > this.__internalCounter) {
      return;
    }
    
    let nextEvent = this.heap.pop();

    // The event was cancelled (but not removed)
    if(nextEvent.cancelled) {
      continue;
    }

    // Execute the bound callback
    nextEvent.callback();
  
  }

}

EventQueue.prototype.remove = function(event) {

  /*
   * Function EventQueue.remove
   * Actually removes an event from the event queue
   */

  this.heap.remove(event);

}

EventQueue.prototype.__addEvent = function(callback, frame) {

  /*
   * Function EventQueue.__addEvent
   * Internall adds the event to the heap queue
   */

  let heapEvent = new Event(callback, frame);

  // Add the event to the heap
  this.heap.push(heapEvent);

  // Return the event to reference
  return heapEvent;

}

module.exports = EventQueue;