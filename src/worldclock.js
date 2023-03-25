"use strict";

const EventEmitter = require("./eventemitter");
const PacketWriter = require("./packet-writer");

const WorldClock = function() {

  /*
   * Class WorldClock
   * Container for the time keeper of the world (every minute = 1s)
   *
   * API:
   *
   * WorldClock.on("time", callback): subscribes to the time event that is fired every time a new minute has passed (in game time)
   * WorldClock.tick: ticks the world clock
   * WorldClock.getTime: returns the current world time in seconds (0 - 1439)
   * WorldClock.getTimeString: returns the current world time as a string (HH:MM)
   * WorldClock.before (time string as HH:MM) - returns whether the world time is before the given time
   * WorldClock.at (time string as HH:MM) - returns whether the world time is equal to the given time
   * WorldClock.after (time string as HH:MM) - returns whether the world time is after the given time
   * WorldClock.between (time string as HH:MM, time string as HH:MM) - returns whether the world time within a time range
   *
   */

  // Emitter for minute ticks
  EventEmitter.call(this);

  this.__previousMinuteCount = 0;
  this.__initialized = performance.now();

  // Maximum rate to speed up time with some tolerance. Otherwise it becomes hard to broadcast every minute change
  if(CONFIG.WORLD.CLOCK.SPEED > 250) {
    throw("Speed up rate of %s exceeds the maximum.".format(CONFIG.WORLD.CLOCK.SPEED));
  }

  this.__startOffset = this.__convertStringToTime(CONFIG.WORLD.CLOCK.START);

}

// Set the prototype and constructor
WorldClock.prototype = Object.create(EventEmitter.prototype);
WorldClock.prototype.constructor = WorldClock;

WorldClock.prototype.isMorning = function() {

  /*
   * Function World.isMorning
   * Returns true if the worldtime is in the morning
   */

  return this.between("06:00", "12:00");

}

WorldClock.prototype.isAfternoon = function() {

  /*
   * Function World.isAfternoon
   * Returns true if the worldtime is in the afternoon
   */

  return this.between("12:00", "18:00");

}

WorldClock.prototype.isEvening = function() {

  /*
   * Function World.isEvening
   * Returns true if the worldtime is at the evening
   */

  return this.between("18:00", "24:00");

}

WorldClock.prototype.isNight = function() {

  /*
   * Function World.isNight
   * Returns true if the worldtime is at night
   */

  return this.between("00:00", "06:00");

}

WorldClock.prototype.getTime = function() {

  /*
   * Function World.getTime
   * Returns game time based on the world time
   */

  // Number of miliseconds in a day
  let max = 24 * 60 * 60 * 1000;

  // 60 times faster than real life (1min = 1s)
  return Math.round((this.__startOffset + CONFIG.WORLD.CLOCK.SPEED * (performance.now() - this.__initialized)) % max);
  
}

WorldClock.prototype.getTimeString = function() {

  /*
   * Function WorldClock.getTimeString
   * Returns the current world clock time as a string (HH:MM)
   */

  // Get time and extract hours & minutes
  let unix = this.getTime();

  let seconds = Math.floor(unix / 1000) % 60;
  let minutes = Math.floor(unix / (60 * 1000)) % 60;
  let hours = Math.floor(unix / (60 * 60 * 1000)) % 24;

  // Pad with leading zero
  let padHour = String(hours).padStart(2, "0");
  let padMinute = String(minutes).padStart(2, "0");

  return "%s:%s".format(padHour, padMinute);

}

WorldClock.prototype.before = function(time) {

  /*
   * Function WorldClock.before
   * Returns whether the current time is before
   */

  return this.getTime() <= this.__convertStringToTime(time);

}

WorldClock.prototype.after = function(time) {

  /*
   * Function WorldClock.after
   * Returns whether the current time is after
   */

  return this.getTime() >= this.__convertStringToTime(time);

}

WorldClock.prototype.at = function(time) {

  /*
   * Function WorldClock.at
   * Returns true if the world clock is equal to the passed HH:MM
   */

  return this.getTimeString() === time;

}

WorldClock.prototype.changeTime = function(time) {

  this.__initialized = performance.now();
  this.__startOffset = this.__convertStringToTime(time);

  let packet = new PacketWriter(PacketWriter.prototype.opcodes.WORLD_TIME).writeWorldTime(this.getTime());
  process.gameServer.server.websocketServer.broadcastPacket(packet);

}

WorldClock.prototype.between = function(start, end) {

  /*
   * Function WorldClock.between
   * Returns whether the current time is between the start & end
   */

  if(start === end) {
    return this.at(start);
  }

  let st = this.__convertStringToTime(start);
  let se = this.__convertStringToTime(end);

  // Swap them if needed.. for example from 23:00 to 03:00
  if(st > se) {
    return this.after(start) || this.before(end);
  } else {
    return this.after(start) && this.before(end);
  }

}

WorldClock.prototype.tick = function() {

  /*
   * Function WorldClock.tick
   * This function is ran every tick and makes an emit call if a new second begins. It is oversampled to make sure not a single second is missed
   */

  // Minutes in the world
  let minute = Math.floor(this.getTime() / (1000 * 60)) % 60;

  // Check if we need to fire the callback
  if(minute === this.__previousMinuteCount) {
    return;
  }

  // Store the new second count
  this.__previousMinuteCount = minute;

  // Emit the callback
  this.emit("time", this.getTimeString());

}

WorldClock.prototype.__convertStringToTime = function(time) {

  /*
   * Function WorldClock.__convertStringToTime
   * Private function to convert a time string to an integer
   */

  let [ hours, minutes ] = time.split(":");

  return 1000 * 60 * (Number(minutes) + 60 * Number(hours));

}

module.exports = WorldClock;