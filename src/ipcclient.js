"use strict";

const path = require("path");
const net = require("net");

const IPCPacket = require("./ipcpacket");
const PacketReader = require("./packet-reader");

const IPCClient = function() {

  /*
   * Class IPCClient
   * Wrapper for a class that can handle inter-process communication over a named pipe/domain socket
   */

  // Create
  this.socket = new net.Socket();

  // Interval for reconnection
  this.__reconnectInterval = null;

  // Reset internal state
  this.__resetInternalState();

}

IPCClient.prototype.__resetInternalState = function() {

  /*
   * IPCClient.__resetInternalState
   * Resets all the state variables of the client
   */

  this.__buffers = new Array();
  this.__length = 0;
  this.__size = 0;
  this.__pending = false;
  this.__requestCallback = Function.prototype;
  this.__connected = false;

}

IPCClient.prototype.makeRequest = function(packet, callback) {

  /*
   * IPCClient.makeRequest
   * Makes a request over the ICP socket. If a request is already underway it is buffered
   */

  // Not connected yet: ignore
  if(!this.__connected) {
    return callback(true);
  }

  // Already pending another request: write an error
  if(this.__pending) {
    return callback(true);
  }

  // Write the next packet over the IPC channel
  this.__write({ packet, callback });

}

IPCClient.prototype.getSocketPath = function() {

  /*
   * IPCClient.getSocketPath
   * Returns the socket path that is different for windows and unix
   */

  // Windows handling is different
  if(process.platform === "win32") {
    return path.join("\\\\?\\pipe", CONFIG.IPC.SOCKET);
  }

  return CONFIG.IPC.SOCKET;

}

IPCClient.prototype.connect = function() {

  /*
   * IPCClient.connect
   * Connects to the specified socket
   */

  // Already connected block for safety
  if(this.__connected) {
    return;
  }

  // Connect to the local socket
  this.socket.connect(this.getSocketPath());
  
  // Set state of socket
  this.socket.on("close", this.__handleSocketClose.bind(this));

  // Write a messasge after connection
  this.socket.on("connect", this.__handleSocketConnect.bind(this));
  
  // When data is recevied over the socket: this is a stream of bytes (TCP)
  this.socket.on("data", this.__handleSocketData.bind(this));

  // Could not connect?
  this.socket.on("error", this.__handleSocketError.bind(this));

}

IPCClient.prototype.__handleSocketConnect = function(error) {

  /*
   * IPCClient.__handleSocketConnect
   * Handles connction of the IPC socket
   */

  // Clear if reconnect exists
  clearInterval(this.__reconnectInterval);

  this.__connected = true;
  this.__reconnectInterval = null;

}

IPCClient.prototype.__handleSocketClose = function(error) {

  /*
   * IPCClient.__handleSocketClose
   * Handles connction of the IPC socket
   */

  // Stop if not connected..
  if(!this.__connected) {
    return;
  }

  // Attempt to reconnect
  this.__reconnectInterval = setInterval(() => this.socket.connect(this.getSocketPath()), CONFIG.IPC.RECONNECT_MS);

  // Was pending for a request: callback with an error
  if(this.__pending) {
    this.__requestCallback(true);
  }

  // When closing the connection reset the internal state
  this.__resetInternalState();

}

IPCClient.prototype.__handleSocketError = function(error) {

  /*
   * IPCClient.__handleSocketError
   * Handles an incoming connection error
   */

  console.log("Could not connect to the gameserver IPC socket at %s. Is the gameserver online?".format(this.getSocketPath()));

}

IPCClient.prototype.__handleSocketData = function(data) {
  
  /*
   * IPCClient.__handleSocketData
   * Implements a simple length-prefix protocol to determine when a packet is complete and emits it
   */
  
  // First packet: save the message length
  if(this.__buffers.length === 0) {
    this.__length = data[0];
  }
  
  // Keep track of the size of the data and the buffer itself
  this.__size += data.length;
  this.__buffers.push(data);
  
  // Keep reading the buffer until it is empty or not long enough
  while(this.__size > this.__length) {
  
    // Concatenate all buffers for packet extraction
    let buf = Buffer.concat(this.__buffers);
  
    // Handle the packet of the appropriate length (do not include the length-prefix)
    this.__handlePacket(buf.slice(1, this.__length + 1));
  
    // The buffer was emptied: reset state
    if(this.__length + 1 === this.__size) {
      this.__length = 0;
      this.__size = 0;
      return this.__buffers = new Array();
    }
  
    // Otherwise keep the remaninig bytes from the next packet in memory
    let remaining = buf.slice(this.__length + 1);

    this.__buffers = new Array(remaining);
    this.__size = remaining.length;
    this.__length = remaining[0];
  
  }
  
}

IPCClient.prototype.__write = function({ packet, callback }) {

  /*
   * IPCClient.__write
   * Writes a buffer over the IPC Socket to the server
   */

  // Set the request status to pending and attach the callback
  this.__pending = true;
  this.__requestCallback = callback;

  // Send over the IPC channel
  this.socket.write(packet);

}

IPCClient.prototype.__handlePacket = function(buffer) {

  /*
   * IPCClient.__handlePacket
   * Handles a packet that was sent over the IPC socket
   */

  // Set waiting to false: finished request
  this.__pending = false;

  // Emit the packet for this request
  this.__requestCallback(null, new PacketReader(buffer));

}

module.exports = IPCClient;