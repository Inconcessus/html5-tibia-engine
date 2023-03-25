"use strict";

const fs = require("fs");
const net = require("net");
const path = require("path");

const PacketReader = require("./packet-reader");
const IPCPacket = require("./ipcpacket");

const IPCSocket = function() {

  /*
   * Class IPCSocket
   * Socket for interprocess communication
   */

  // Keep a reference to the IPC clients
  this.clients = new Set();

  // Open a local socket for incoming connections
  this.socket = net.createServer();
  this.socket.listen(this.getSocketPath());

  this.socket.on("connection", this.__handleConnection.bind(this));
  this.socket.on("error", this.__handleSocketError.bind(this));

}

IPCSocket.prototype.getSocketPath = function() {

  /*
   * Function IPCSocket.__handleSocketData
   * Handles incoming data over the socket
   */

  // On windows we have to use named pipes
  if(process.platform === "win32") {
    return path.join("\\\\?\\pipe", CONFIG.IPC.SOCKET);
  }

  // For UNIX we can use the filesys
  return CONFIG.IPC.SOCKET;

}

IPCSocket.prototype.__handleSocketError = function(error) {
  
  /*
   * IPCSocket.__handleSocketError
   * Handles an error
   */

   console.log(error);

}

IPCSocket.prototype.__handleSocketData = function(socket, data) {
  
  /*
   * IPCSocket.__handleSocketData
   * Implements a simple length-prefix protocol to determine when a packet is complete and emits it
   */

  // Shorthand ref
  let ref = socket.__dataBuffer;

  // First packet: save the message length
  if(ref.buffers.length === 0) {
    ref.length = data[0];
  }
  
  // Keep track of the size of the data and the buffer itself
  ref.size += data.length;
  ref.buffers.push(data);
  
  // Keep reading the buffer until it is empty or not long enough
  while(ref.size > ref.length) {
  
    // Concatenate all buffers for packet extraction
    let buf = Buffer.concat(ref.buffers);
  
    // Handle the packet of the appropriate length
    this.__handlePacket(socket, buf.slice(1, ref.length + 1));
  
    // The buffer was emptied: reset state
    if(ref.length + 1 === ref.size) {
      ref.length = 0;
      ref.size = 0;
      return ref.buffers = new Array();
    }
  
    // Otherwise keep the remaninig bytes from the next packet in memory
    let remaining = buf.slice(ref.length + 1);

    ref.buffers = new Array(remaining);
    ref.size = remaining.length;
    ref.length = remaining[0];
  
  }
  
}

IPCSocket.prototype.__internalHandlePacket = function(packet) {

  /*
   * Function IPCSocket.__internalHandlePacket
   * Internal function to handles an incoming packet
   */

  // Read the opcode
  switch(packet.readUInt8()) {
    case 0x00:
      process.gameServer.__scheduleShutdown(packet.readUInt16());
      break;
    case 0x01:
      throw("");
      process.gameServer.broadcast(packet.readString16());
      break;
    case 0x02:
      return new IPCPacket(IPCPacket.prototype.PACKETS.SERVER_RESULT).writeServerData(process.gameServer);
    case 0x03:
      process.gameServer.world.clock.changeTime(packet.readString16());
      break;
  }

  // Always end the request
  return new IPCPacket(IPCPacket.prototype.PACKETS.OK).serializeBuffer();

}

IPCSocket.prototype.__handlePacket = function(socket, buffer) {

  /*
   * Function IPCSocket.__handlePacket
   * Handles a complete incoming buffer
   */

  return socket.write(this.__internalHandlePacket(new PacketReader(buffer)));

}

IPCSocket.prototype.__handleConnection = function(socket) {

  /*
   * Function IPCSocket.__handleConnection
   * Handles an incoming socket connection
   */

  this.clients.add(socket);

  // Create a new container for the buffered socket data
  socket.__dataBuffer = new Object({
    "buffers": new Array(),
    "length": 0,
    "size": 0
  });

  // Listeners
  socket.on("data", this.__handleSocketData.bind(this, socket));
  socket.on("close", this.__closeSocket.bind(this, socket));

}

IPCSocket.prototype.__closeSocket = function(socket) {

  /*
   * Function IPCSocket.__closeSocket
   * Closes a particular socket by deleting it from the list of references
   */

  this.clients.delete(socket);

}

IPCSocket.prototype.close = function() {

  /*
   * Function IPCSocket.close
   * Closes the IPC socket by destroying the remaining clients (if any)
   */

  this.clients.forEach(socket => socket.destroy());

  // Automatically removes the sock file
  this.socket.close();

}

module.exports = IPCSocket;