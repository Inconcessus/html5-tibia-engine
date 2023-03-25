"use strict";

const path = require("path");

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

  // Check the NodeJS version
  let [ major, minor, patch ] = process.versions.node.split(".");

  // Confirm major version
  if(major < 16) {
    console.log("Could not launch gameserver: required version: %s and current version: %s.".format("16.0.0", process.versions.node));
    return process.exit(1);
  }

  console.log("Starting NodeJS Forby Open Tibia Server.");
  console.log("Creating server with version [[ %s ]].".format(CONFIG.SERVER.CLIENT_VERSION));
  console.log("Setting data directory to [[ %s ]].".format(getDataFile("")));

  const GameServer = requireModule("gameserver");

  // Attach the gameserver to the process and initialize
  process.gameServer = new GameServer();
  process.gameServer.initialize();

}
