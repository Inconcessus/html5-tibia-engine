"use strict";

const ServerLogger = require("./logger");

const GameLoop = function(interval, callback) {

  /*
   * Class GameLoop
   * Wrapper for the main gameserver loop
   */

  this.__gameLoopStart = null;
  this.__gameLoopEnd = null;
  this.__loopTimeout = null

  // Callback function fired every loop tick at an interval
  this.__callback = callback;
  this.__interval = interval;
  this.__drift = 0;

  // The logger is attached to the game loop
  this.logger = new ServerLogger();

}

GameLoop.prototype.initialize = function() {

  /*
   * Function GameLoop.initialize
   * Delegates to the internal looping function
   */

  this.__internalLoop();

}

GameLoop.prototype.getCurrentFrame = function() {

  /*
   * Function GameLoop.getCurrentFrame
   * Returns the current game server frame from the event queue
   */

  return process.gameServer.world.eventQueue.__internalCounter;

}

GameLoop.prototype.tickModulus = function(modulus) {

  /*
   * Function GameLoop.tickModulus
   * Only returns TRUE when the tick counter passes through the modulus parameter.
   * This function can be used to execute functions only every Nth tick.
   */

  return (this.getCurrentFrame() % modulus) === 0;

}

GameLoop.prototype.__estimateLoopDrift = function() {

  /*
   * Function GameLoop.__estimateLoopDrift
   * Estimates the gameLoop drift in miliseconds which is the quantity that describes how long the server slept since the previous tick
   */

  // Start of the new frame
  this.__gameLoopStart = Date.now();

  // Ignore drift on the first server tick
  if(this.__gameLoopEnd === null) {
    return 0;
  }

  // Estimate the setTimeout drift to keep the tick interval
  this.__drift = Math.max(-this.__interval, this.__drift + (this.__gameLoopStart - this.__gameLoopEnd) - this.__interval);

}

GameLoop.prototype.__estimateNextTimeout = function() {

  /*
   * Function GameLoop.__estimateNextTimeout
   * This is the main looping function for the game server that is executed every server tick
   */

  this.__gameLoopEnd = Date.now();

  // Calculate the drift of the tick
  let gameLoopExecutionTime = (this.__gameLoopEnd - this.__gameLoopStart);

  // Save to average the loop execution time for logging
  this.logger.__gameLoopExecutionTime += gameLoopExecutionTime;

  // Calculate the timeout for the next tick to keep as close as possible to the tick interval, including potential drift and execution
  return this.__interval - this.__drift - gameLoopExecutionTime;

}

GameLoop.prototype.__internalLoop = function() {

  /*
   * Function GameLoop.__internalLoop
   * This is the main looping function for the game server that is executed every server tick
   */

  // Server was closed: abort the loop
  if(process.gameServer.server.isClosed()) {
    return;
  }

  // Estimate the drift from the previous call
  this.__estimateLoopDrift();

  // The game server callback
  this.__callback();

  // Delegate to the logger every 20th frame
  if(this.tickModulus(ServerLogger.prototype.LOG_FRAMES)) {
    this.logger.log();
  }

  // Send a ping to all clients
  if(this.tickModulus(60)) {
    process.gameServer.server.websocketServer.ping();
  }

  // Schedule the next tick
  this.__loopTimeout = setTimeout(this.__internalLoop.bind(this), Math.min(this.__interval, this.__estimateNextTimeout()));

}

module.exports = GameLoop;