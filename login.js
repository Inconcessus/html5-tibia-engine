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

  // Create the login server
  const LoginServer = requireModule("login-server");

  // Start
  new LoginServer(function() {
    console.log("The login server is listening on %s:%s.".format(CONFIG.LOGIN.HOST, CONFIG.LOGIN.PORT));
  });
  
}
