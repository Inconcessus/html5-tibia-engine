"use strict";

const PacketWriter = require("./packet-writer");

const IPCPacket = function(packet) {

  /*
   * Class IPCPacket
   * Wrapper for a single length-prefixed packet that is sent over the IPC channel
   */

  // Inherits from packet writer for writing bytes to the packet
  PacketWriter.call(this, packet);

}

IPCPacket.prototype = Object.create(PacketWriter.prototype);
IPCPacket.constructor = IPCPacket;

// Packet definitions
IPCPacket.prototype.PACKETS = new Object({
  // Client
  "SHUTDOWN": {"code": 0x00, "length": 3},
  "BROADCAST_MESSAGE": {"code": 0x01, "length": 255},
  "SERVER_DATA": {"code": 0x02, "length": 1},
  "CHANGE_TIME": {"code": 0x03, "length": 255},

  // Server
  "OK": {"code": 0x00, "length": 1},
  "SERVER_RESULT": {"code": 0x01, "length": 3},
});

IPCPacket.prototype.writeChangeTime = function(time) {

  this.__writeString(time);

  return this.__serializeBufferSlice();

}

IPCPacket.prototype.writeServerData = function(gameServer) {

  /*
   * Function IPCPacket.writeServerData
   * Writes the requested server data over the channel
   */

  this.writeUInt16(gameServer.server.websocketServer.__gameSockets.size);

  return this.serializeBuffer();

}

IPCPacket.prototype.writeBroadcastMessage = function(message) {

  /*
   * Function IPCPacket.writeBroadcastMessage
   * Writes the packet that defined a message to be broadcasted
   */

  this.__writeString(message);

  return this.__serializeBufferSlice();

}

IPCPacket.prototype.writeShutdown = function(seconds) {

  /*
   * Function IPCPacket.writeShutdown
   * Writes a shutdown command to the server
   */

  this.writeUInt16(seconds);

  return this.serializeBuffer();

}

IPCPacket.prototype.__serializeBufferSlice = function() {

  /*
   * Function IPCPacket.__serializeBufferSlice
   * Serializes the written buffer with an a-priori unknown length
   */

  let slice = this.__slicePacket();

  return Buffer.concat([
    Buffer.from([slice.length]),
    slice,
  ]);

}

IPCPacket.prototype.serializeBuffer = function() {

  /*
   * Function IPCPacket.serializeBuffer
   * Serializes the IPC packet by prepending the length of the packet
   */

  // Return a new buffer with the length + buffer
  return Buffer.concat([
    Buffer.from([this.buffer.length]),
    this.buffer,
  ]);

}

module.exports = IPCPacket;