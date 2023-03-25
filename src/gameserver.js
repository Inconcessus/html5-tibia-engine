"use strict";

const Database = require("./database");
const GameLoop = require("./gameloop");
const HTTPServer = require("./http-server");
const PacketWriter = require("./packet-writer");
const IPCSocket = require("./ipcsocket");
const fs = require("fs");

const GameServer = function() {

  /*
   * Class GameServer
   * Main container for the Tibia HTML5 Gameserver
   * Wraps both a HTTP server for resources (e.g., .js) and WebSocket server for the game protocol
   *
   * GameServer API:
   * GameServer.tickModulus(mod) - Returns true if the internal tick counter is a multiple of the passed modulus.
   * GameServer.isPlayerOnline(name) - Returns true if a player with a particular name is online
   * GameServer.getGameSocketByName(name) - Returns the gamesocket that belongs to a character name
   *
   */

  // Interrupt: gracefully shut down server
  process.on("SIGINT", this.__scheduleShutdown.bind(this));
  process.on("SIGTERM", this.__scheduleShutdown.bind(this));
  //process.on("uncaughtException", this.__handleUncaughtException.bind(this));

  // Reference to the gameworld will be saved here
  this.world = null;

  // Connect to the information database that keeps all the server data
  this.database = new Database();

  // Create the game loop with a callback function
  this.gameLoop = new GameLoop(CONFIG.SERVER.MS_TICK_INTERVAL, this.loop.bind(this));

  // Open the server for HTTP connections
  this.server = new HTTPServer();
  this.server.listen(CONFIG.SERVER.PORT, CONFIG.SERVER.HOST);

  this.ipcsocket = new IPCSocket();

}

GameServer.prototype.loop = function() {

  /*
   * Function GameServer.loop
   * Callback function fired every time server tick happens
   */

  // Tick the world clock
  this.world.clock.tick();

  // Handle all the events scheduled in the internal event queue
  this.world.eventQueue.tick();

  // Handle the input / output buffers for all connected clients
  this.server.websocketServer.flushSocketBuffers();

  // Handle all the creature actions
  this.world.doCreatureActions(this.server.websocketServer.connectedSockets());

  // Check the idle players
  this.server.websocketServer.checkIdlePlayers();

}

GameServer.prototype.initialize = function() {

  /*
   * Function GameServer.initialize
   * Initializes the game server and starts the internal game loop
   */

  // When the server was started
  this.__initialized = Date.now();

  // Database
  this.database.initialize();

  // Start the gameloop
  this.gameLoop.initialize();

}

GameServer.prototype.broadcast = function(message) {

  /*
   * Function GameServer.broadcast
   * Broadcasts a server message to all clients
   */

  this.server.websocketServer.broadcastPacket(new PacketWriter(PacketWriter.prototype.opcodes.SERVER_MESSAGE).writeString(message))

}

GameServer.prototype.shutdown = function() {

  /*
   * Function GameServer.shutdown
   * Shuts down the game server and disconnects all clients
   */

  // Inform operator
  console.log("Server is closing now: disconnecting all clients.");

  this.database.saveHouses();

  // Close
  this.server.close();
  this.ipcsocket.close();

}

GameServer.prototype.handleClose = function(error) {

  /*
   * Function handleClose
   * Closing event of the game server
   */

  console.log("The gameserver has been closed.");

}

GameServer.prototype.isFeatureEnabled = function() {

  /*
   * Function GameServer.isFeatureEnabled
   * Implement different version features here..
   */

  CONFIG.SERVER.CLIENT_VERSION > 1000;

}

GameServer.prototype.__scheduleShutdown = function() {

  /*
   * Function GameServer.__scheduleShutdown
   * Schedules the server to shutdown in a configured time
   */

  // The server is already shutting down
  if(this.server.isShutdown()) {
    return console.log("Shutdown command refused because the server is already shutting down.");
  }

  // Update the server status
  this.server.__serverStatus = this.server.STATUS.SHUTDOWN;

  // Write to all connected sockets
  this.broadcast("The gameserver is closing in %s seconds. Please log out in a safe place.".format(Math.floor(1E-3 * CONFIG.SERVER.MS_SHUTDOWN_SCHEDULE)));

  // Use the timeout function not the event queue
  setTimeout(this.shutdown.bind(this), CONFIG.SERVER.MS_SHUTDOWN_SCHEDULE);

}

GameServer.prototype.__handleUncaughtException = function(error, origin) {

  /*
   * Function GameServer.__handleUncaughtException
   * Handles an uncaught exception in the server
   */

  fs.writeSync(
    process.stderr.fd,
    "Uncaught exception: %s from origin: %s".format(error, origin)
  );

  // If not listening yet
  if(!this.server.isListening()) {
    return process.exit(1);
  }

  // Shut the server down
  this.shutdown();

}

module.exports = GameServer;