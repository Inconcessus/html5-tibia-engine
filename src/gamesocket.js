"use strict";

const PacketBuffer = require("./packet-buffer");
const PacketWriter = require("./packet-writer");

const GameSocket = function(socket) {

  /*
   * Class GameSocket
   * Wrapper for a websocket that is connected to the gameserver
   */

  // Wrap the websocket
  this.socket = socket;

  // Each websocket should reference a player in the gameworld
  this.player = null;

  // Keep the address
  this.__address = this.getAddress().address;

  // Time of initial connection
  this.__connected = Date.now();

  // State variable to kick inactive sockets that no longer respond
  this.__alive = true;

  // Buffer incoming & outgoing messages are read and send once per server tick
  this.incomingBuffer = new PacketBuffer();
  this.outgoingBuffer = new PacketBuffer();

}

GameSocket.prototype.getLastPacketReceived = function() {

  /*
   * Function GameSocket.getLastPacketReceived
   * Returns the timestamp of when the latest packet was received 
   */

  return this.incomingBuffer.__lastPacketReceived;

}

GameSocket.prototype.writeLatencyPacket = function() {

  /*
   * Function GameSocket.writeLatencyPacket
   * Latency requests are not subject to buffering: go to the socket
   */

  // Directly write a packet to the client
  this.socket.send(new PacketWriter(PacketWriter.prototype.opcodes.LATENCY).buffer);

}

GameSocket.prototype.isAlive = function() {

  /*
   * Function GameSocket.isAlive
   * Returns true if the gamesocket is still alive and responds to the ping-pong game
   */

  return this.__alive;

}

GameSocket.prototype.ping = function() {

  /*
   * Function GameSocket.ping
   * Requests a pong from the gamesocket
   */

  // Set to not being alive: will be set to alive after receiving the pong
  this.__alive = false;

  this.socket.ping();

}

GameSocket.prototype.getAddress = function() {

  /*
   * Function GameSocket.getAddress
   * Returns IPV4,6 address parameters from the wrapped socket
   */

  return this.socket._socket.address();

}

GameSocket.prototype.writeServerData = function() {

  /*
   * Function GameSocket.writeServerData
   * Writes important server data to the socket
   */

  // Pass the configuration to the client
  this.write(new PacketWriter(PacketWriter.prototype.opcodes.SEND_SERVER_DATA).writeServerData());

}

GameSocket.prototype.closeError = function(message) {

  /*
   * Function GameSocket.closeError
   * Closes the game socket with a particular error
   */

  // Close with an error
  this.socket.send(new PacketWriter(PacketWriter.prototype.opcodes.SERVER_ERROR).writeString(message));

  // Gracefully close
  this.close();

}

GameSocket.prototype.writeMessage = function(message) {

  /*
   * Function GameSocket.writeMessage
   * Writes a server message to the socket
   */

  this.write(new PacketWriter(PacketWriter.prototype.opcodes.SERVER_MESSAGE).writeString(message));

}

GameSocket.prototype.write = function(buffer) {

  /*
   * Function GameSocket.write
   * Writes a message to the outgoing buffer
   */

  this.outgoingBuffer.add(buffer);

}

GameSocket.prototype.terminate = function() {

  /*
   * Function GameSocket.terminate
   * Terminates the websocket
   */

  this.socket.terminate();

}

GameSocket.prototype.close = function() {

  /*
   * Function GameSocket.close
   * Closes the websocket
   */

  this.socket.close();

}

module.exports = GameSocket;