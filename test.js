"use strict";

const path = require("path");
const fs = require("fs");

// Load the configuration
global.CONFIG = require("./config");

// Create some useful global functions
global.getDataFile = function() {

  /*
   * Function global.getDataFile
   * Returns a file from the base data directory
   */

  return path.join(__dirname, "data", CONFIG.SERVER.CLIENT_VERSION, ...arguments);

}

global.requireModule = function() {

  /*
   * Function global.requireModule
   * Requires a module from the base source directory
   */

  return require(path.join(__dirname, "src", ...arguments));

}

// Load constants
global.CONST = require(getDataFile("constants.json"));

// Requires the prototype modifications
requireModule("__proto__");

if(require.main === module) {

  /*
   * Function __main__
   * Function called when the initialization script is executed
   */
  const GameServer = requireModule("gameserver");

  // Attach the gameserver to the process and initialize
  process.gameServer = new GameServer();
  process.gameServer.initialize();

  fs.readdirSync("tests").forEach(function(file) {

    for(let fn of require(path.join(__dirname, "tests", file))) {
      console.log("Running test: %s".format(fn.name));
      fn.call();
    }

    process.gameServer.__scheduleShutdown();

  });

}
