"use strict";

const AccountManager = require("./account-manager");
const GameSocket = require("./gamesocket");
const NetworkManager = require("./network-manager");
const PacketReader = require("./packet-reader");
const PacketWriter = require("./packet-writer");
const Player = require("./player");
const WebSocket = require("ws");

const WebsocketServer = function() {

  /*
   * Class WebsocketServer
   * Container for the websocket server that accepts incoming websocket connections
   */

  // Keep a reference to all connected gamesockets
  this.__gameSockets = new Set();

  // Create the websocket server
  this.websocket = new WebSocket.Server({"noServer": true});

  // Manager for network I/O
  this.networkManager = new NetworkManager();

  // Manager for the account information
  this.accountManager = new AccountManager();

  // The main websocket server listeners
  this.websocket.on("connection", this.__handleConnection.bind(this));
  
}

WebsocketServer.prototype.checkIdlePlayers = function() {

  /*
   * Function WebsocketServer.checkIdlePlayers
   * Checks what players are idle and informs or kicks them from the gameworld
   */

  // When to inform and kick the player
  const INFORM_AFTER_MS = 1000 * 60 * 14;
  const KICK_AFTER_INFORM_MS = 1000 * 60;
  const IDLE_MESSAGE = "You have been idle for %s minutes and will be disconnected in %s seconds.".format(Math.floor(INFORM_AFTER_MS / 60000), KICK_AFTER_INFORM_MS / 1000);

  let now = Date.now();
  let packet = new PacketWriter(PacketWriter.prototype.opcodes.SERVER_MESSAGE).writeString(IDLE_MESSAGE);

  // Go over all gamesockets
  this.__gameSockets.forEach(function(socket) {

    // Timestamp of when the latest packet was received
    let lastPacketReceived = socket.getLastPacketReceived();

    // If exceeds the inform and kick after time: kill the connection
    if(lastPacketReceived < (now - INFORM_AFTER_MS - KICK_AFTER_INFORM_MS)) {
      return socket.close();
    }

    // If exceeds the inform time: tell the player
    if(lastPacketReceived < (now - INFORM_AFTER_MS)) {
      return socket.write(packet);
    }

  });

}

WebsocketServer.prototype.broadcastPacket = function(packet) {

  /*
   * Function WebsocketServer.broadcastPacket
   * Broadcasts a particular packet to all the connected sockets
   */

  // Write to all sockets
  this.__gameSockets.forEach(gameSocket => gameSocket.write(packet));

}

WebsocketServer.prototype.connectedSockets = function() {

  /*
   * Function WebsocketServer.connectedSockets
   * Returns the set of connnected sockets
   */

  return this.__gameSockets;

}

WebsocketServer.prototype.readIncomingBuffer = function(socket) {

  /*
   * Function WebsocketServer.readIncomingBuffer
   * Delegates the reading of incoming buffer to the network manager
   */

  this.networkManager.readIncomingBuffer(socket);

}

WebsocketServer.prototype.close = function() {

  /*
   * Function WebsocketServer.close
   * Delegates the call to the websocket server to close it
   */

  // Terminate remaining socket connections
  this.__gameSockets.forEach(this.forceCloseSocket, this);

  // Close the websocket server
  this.websocket.close();
  
}

WebsocketServer.prototype.forceCloseSocket = function(socket) {

  /*
   * Function WebsocketServer.forceCloseSocket
   * Force closes a socket connection
   */

  // Remove the reference
  this.__dereferenceSocket(socket);

  // Remove the player from the world etc..
  this.__removePlayerFromWorld(socket);

  // Close the TCP socket
  socket.close();

}

WebsocketServer.prototype.ping = function() {

  /*
   * Function WebsocketServer.ping
   * Pings all clients over the websocket protocol
   */

  this.__gameSockets.forEach(gameSocket => this.__ping(gameSocket));

}

WebsocketServer.prototype.flushSocketBuffers = function(gameSocket) {

  /*
   * Function WebsocketServer.flushSocketBuffers
   * Flushing the incoming and outgoing websocket buffer
   */

  // Go over all sockets and handle buffers
  this.__gameSockets.forEach(gameSocket => this.networkManager.handleIO(gameSocket));

}

WebsocketServer.prototype.__referenceSocket = function(gameSocket) {

  /*
   * WebsocketServer.__referenceSocket
   * Saves a reference to the gamesocket
   */

  this.__gameSockets.add(gameSocket);

}

WebsocketServer.prototype.__dereferenceSocket = function(gameSocket) {

  /*
   * WebsocketServer.__dereferenceSocket
   * Deletes a reference to the gamesocket
   */

  this.__gameSockets.delete(gameSocket);

}

WebsocketServer.prototype.__ping = function(gameSocket) {

  /*
   * Function WebsocketServer.__ping
   * Pings a client and sets the socket state to being false for the next ping
   */

  // The socket has not responded: terminate it
  if(!gameSocket.isAlive()) {
    return gameSocket.terminate();
  }

  // Otherwise write another ping packet
  gameSocket.ping();

}

WebsocketServer.prototype.__handleConnection = function(socket, request, accountName) {

  /*
   * Function WebsocketServer.__handleConnection
   * Handles an incoming websocket connection that was upgraded from HTTP with a valid token
   */

  // Create a new class that wraps the connected socket
  let gameSocket = new GameSocket(socket);

  // The server is full
  if(this.__gameSockets.size >= CONFIG.SERVER.ALLOW_MAXIMUM_CONNECTIONS) {
    return gameSocket.closeError("The server is full. Please try again later.");
  }

  // Server is in the process of shutting down: do not accept any new connections
  if(process.gameServer.server.isShutdown()) {
    return gameSocket.closeError("The server is going offline. Please try again later.");
  }

  this.__acceptConnection(gameSocket, accountName);

}

WebsocketServer.prototype.__acceptConnection = function(gameSocket, accountName) {

  /*
   * Function WebsocketServer.__acceptConnection
   * Accepts the connection of the websocket
   */

  // Get the socket address
  let { address, family, port } = gameSocket.getAddress();

  console.log("A new client has joined the gameserver: %s.".format(address));

  // Attach the socket listeners
  gameSocket.socket.on("message", this.__handleSocketData.bind(this, gameSocket));
  gameSocket.socket.on("error", this.__handleSocketError.bind(this, gameSocket));
  gameSocket.socket.on("close", this.__handleSocketClose.bind(this, gameSocket));
  gameSocket.socket.on("pong", this.__handlePong.bind(this, gameSocket));

  // Write the server parameters
  this.__handleLogin(gameSocket, accountName);

}

WebsocketServer.prototype.__handleLogin = function(gameSocket, name) {

  /*
   * Function WebsocketServer.handleLogin
   * Handles a login request from a socket
   */

  // Attempt to load the account from the character database
  this.accountManager.getPlayerAccount(name, function(error, data) {

    // There was an error loading the account
    if(error) {
      return gameSocket.closeError("Invalid account number or password.");
    }

    // The character is already online
    if(process.gameServer.world.__gameSocketReferences.has(data.creatureStatistics.name)) {
      return gameSocket.closeError("This character is already online.");
    }

    // Accept the gamesocket
    this.__acceptPlayer(gameSocket, data);

  }.bind(this));

}

WebsocketServer.prototype.__acceptPlayer = function(gameSocket, data) {

  /*
   * Function WebsocketServer.__acceptPlayer
   * Handles a login request from a socket
   */

  // Save a reference to the socket
  this.__referenceSocket(gameSocket);

  // Write important server data to the client
  gameSocket.writeServerData();

  // Create the new player class that references the gameSocket
  let player = new Player(gameSocket, data);
  
  // Add creature to the world
  process.gameServer.world.addPlayer(player);
  
  // Write all the online players to the newly logged in player
  this.__writeOnlinePlayers(player);

}

WebsocketServer.prototype.__writeOnlinePlayers = function(player) {

  /*
   * Function WebsocketServer.__writeOnlinePlayers
   * Writes all the currently online players
   */

  // Write the currently online characters to the player
  this.__gameSockets.forEach(gameSocket => player.write(new PacketWriter(PacketWriter.prototype.opcodes.PLAYER_LOGIN).writeString(gameSocket.player.name)));

  // Write to all players that are already online who has just logged in
  this.broadcastPacket(new PacketWriter(PacketWriter.prototype.opcodes.PLAYER_LOGIN).writeString(player.name));

}

WebsocketServer.prototype.__handlePong = function(gameSocket) {

  /*
   * Function GameSocket.__handlePong
   * Updates the state for the ping/pong
   */

  gameSocket.__alive = true;

}

WebsocketServer.prototype.__isLatencyRequest = function(buffer) {

  /*
   * Function WebsocketServer.__isLatencyRequest
   * Returns true if the message is a latency request
   */

  return buffer.length === 1 && buffer[0] === PacketReader.prototype.opcodes.LATENCY.code;

}

WebsocketServer.prototype.__handleSocketError = function(gameSocket) {

  /*
   * Function WebsocketServer.__handleSocketError
   * Delegates to the close socket handler
   */

  gameSocket.close();

}

WebsocketServer.prototype.__handleSocketData = function(gameSocket, buffer) {

  /*
   * Function WebsocketServer. __handleSocketData
   * Handles incoming socket data
   */

  // Array buffer was not received
  if(!Buffer.isBuffer(buffer)) {
    return gameSocket.close();
  }

  // If latency request do not buffer: immediately write the response
  if(this.__isLatencyRequest(buffer)) {
    return gameSocket.writeLatencyPacket();
  }

  // Buffer the incoming message. The buffers are read once per server tick
  gameSocket.incomingBuffer.add(buffer);

}

WebsocketServer.prototype.__removePlayerFromWorld = function(gameSocket) {

  /*
   * Function GameServer.__removePlayerFromWorld
   * Closes a game socket and removes the player from the game world
   */

  // Dereference player from gameworld
  process.gameServer.world.sendMagicEffect(gameSocket.player.position, CONST.EFFECT.MAGIC.POFF);
  process.gameServer.world.removePlayer(gameSocket.player);
  process.gameServer.world.writePlayerLogout(gameSocket.player.name);

  let pointer = new Object({
    "buffer": JSON.stringify(gameSocket.player, null, 2),
    "error": false
  });
  
  // Save the character account
  this.accountManager.savePlayerAccount(gameSocket.player.name, pointer);

  gameSocket.player.gameSocket = null;

}

WebsocketServer.prototype.__handleSocketClose = function(gameSocket) {

  /*
   * Function GameServer.__handleSocketClose
   * Closes a game socket and removes the player from the game world
   */

  console.log("A client has left the server: %s.".format(gameSocket.__address));

  // Shutting down: do nothing -- clients are already forced to log out
  if(process.gameServer.server.isShutdown()) {
    return;
  }

  // Not referenced in the game world
  if(!this.__gameSockets.has(gameSocket)) {
    return;
  }

  // Dereference from the list of gamesockets
  this.__dereferenceSocket(gameSocket);

  if(gameSocket.player.isZeroHealth()) {
    gameSocket.player.health = gameSocket.player.maxHealth;
    return this.__removePlayerFromWorld(gameSocket);
  }

  // If the player is still connected to the game world
  if(!gameSocket.player.isInCombat()) {
    return this.__removePlayerFromWorld(gameSocket);
  }

  // Schedule the remove event for when the combat lock is lifted
  process.gameServer.world.eventQueue.addEvent(this.__removePlayerFromWorld.bind(this, gameSocket), gameSocket.player.combatLock.remainingFrames());

}

module.exports = WebsocketServer;
