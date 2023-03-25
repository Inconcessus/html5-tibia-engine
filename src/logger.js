"use strict";

const fs = require("fs");

const ServerLogger = function() {

  /*
   * Class ServerLogger
   * Logs internal server parameters to logfile
   */

  // State to keep average game loop exec time
  this.__gameLoopExecutionTime = 0;

  // Create writeable stream to disk
  this.logfile = fs.createWriteStream("server.log");

  // Write the header
  const header = new Array(
    "Timestamp",
    "Memory (MB)",
    "Clients",
    "Event Heap Size",
    "Bytes Recv",
    "Bytes Sent",
    "Loop Exec Time (ms)",
    "Drift",
    "Frame",
    "World Time"
  );

  this.writeLine(header);

}

ServerLogger.prototype.LOG_FRAMES = 60;

ServerLogger.prototype.writeLine = function(line) {

  /*
   * Function ServerLogger.writeLine
   * Writes an array of parameters to a line delimited by tabs
   */

  this.logfile.write(line.join("\t"));
  this.logfile.write("\n");

}

ServerLogger.prototype.log = function() {

  /*
   * Function ServerLogger.log
   * Writes server diagnostics to logfile
   */

  let networkDetails = process.gameServer.server.websocketServer.networkManager.getDataDetails();

  // Generate a logging message
  let message = new Array(
    new Date().toISOString(),
    (process.memoryUsage().rss / (1024 * 1024)).toFixed(0),
    process.gameServer.server.websocketServer.connectedSockets().size,
    process.gameServer.world.eventQueue.heap.size(),
    networkDetails.received,
    networkDetails.sent,
    (this.__gameLoopExecutionTime / this.LOG_FRAMES).toFixed(0),
    process.gameServer.gameLoop.__drift,
    process.gameServer.gameLoop.getCurrentFrame(),
    process.gameServer.world.clock.getTimeString()
  );

  this.writeLine(message);

  // Reset the execution time
  this.__gameLoopExecutionTime = 0;

}

module.exports = ServerLogger;
