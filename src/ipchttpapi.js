"use strict";

const http = require("http");
const url = require("url");

const IPCClient = require("./ipcclient");
const IPCPacket = require("./ipcpacket");

const IPCHTTPAPI = function() {

  /*
   * Class IPCHTTPAPI
   * Wrapper for the IPC channel exposed through an HTTP API
   */

  // Create the IPC client
  this.client = new IPCClient(IPCClient.prototype.getSocketPath());

  // And the HTTP server
  this.server = http.createServer(this.__handleRequest.bind(this));

  // Connect to the IPC socket
  this.client.connect();

}

IPCHTTPAPI.prototype.listen = function() {

  /*
   * Function IPCHTTPAPI.listen
   * Delegates listen call to the HTTP server
   */

  this.server.listen(...arguments);

}

IPCHTTPAPI.prototype.__requestBroadcast = function(request, response, queryObject) {

  /*
   * Function IPCHTTPAPI.__requestBroadcast
   * Handles a request to broadcast a message to the server
   */

  let message = queryObject.query.message;
  let req = new IPCPacket(IPCPacket.prototype.PACKETS.BROADCAST_MESSAGE).writeBroadcastMessage(message);

  this.client.makeRequest(req, function(error, packet) {

    if(error) {
      return this.__writeStatusCode(500, response);
    }

    response.statusCode = 200;
    response.end("Broadcast sent: \"%s\".".format(message));

  }.bind(this));

}

IPCHTTPAPI.prototype.__requestShutdown = function(request, response, queryObject) {

  /*
   * Function IPCHTTPAPI.__requestShutdown
   * Requests a shutdown of the server
   */

  let seconds = queryObject.query.seconds;
  let req = new IPCPacket(IPCPacket.prototype.PACKETS.SHUTDOWN).writeShutdown(seconds);

  this.client.makeRequest(req, function(error, packet) {

    if(error) {
      return this.__writeStatusCode(500, response);
    }

    response.statusCode = 200;
    response.end("Shutdown command sent: \"%s\".".format(seconds));

  }.bind(this));

}

IPCHTTPAPI.prototype.__requestTimeChange = function(request, response, queryObject) {

  /*
   * Function IPCHTTPAPI.__requestTimeChange
   * Requests a time change to the server
   */

  let time = queryObject.query.time;

  if(time.length !== 5) {
    return this.__writeStatusCode(400, response);
  }

  let req = new IPCPacket(IPCPacket.prototype.PACKETS.CHANGE_TIME).writeChangeTime(time);

  this.client.makeRequest(req, function(error) {

    if(error) {
      return this.__writeStatusCode(500, response);
    }

    response.statusCode = 200;
    response.end("Change time command sent: \"%s\".".format(time));

  }.bind(this));

}

IPCHTTPAPI.prototype.__writeStatusCode = function(statusCode, response) {

  /*
   * Function IPCHTTPAPI.__writeStatusCode
   * Writes a server error back to the client
   */

  response.statusCode = statusCode;
  response.end();

}

IPCHTTPAPI.prototype.__requestStatus = function(request, response, queryObject) {

  /*
   * Function IPCHTTPAPI.__requestStatus
   * Requests the status of the server that includes the numbers of players online
   */

  let req = new IPCPacket(IPCPacket.prototype.PACKETS.SERVER_DATA).serializeBuffer();

  this.client.makeRequest(req, function(error, packet) {
  
    if(error) {
      return this.__writeStatusCode(500, response);
    }

    packet.readUInt8();
    let amount = packet.readUInt16();
  
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");

    response.end(JSON.stringify({
      "nPlayersOnline": amount
    }));
  
  }.bind(this));

}

IPCHTTPAPI.prototype.__handleRequest = function(request, response) {

  /*
   * Function IPCHTTPAPI.__handleRequest
   * Handles an incoming HTTP request to the server and delegates to the appropriate request handler
   */

  // Data submitted in the querystring
  let queryObject = url.parse(request.url, true);

  switch(queryObject.pathname) {
    case "/status": return this.__requestStatus(request, response, queryObject);
    case "/broadcast": return this.__requestBroadcast(request, response, queryObject);
    case "/shutdown": return this.__requestShutdown(request, response, queryObject);
    case "/time": return this.__requestTimeChange(request, response, queryObject);
  }

  this.__writeStatusCode(404, response);
  
}

module.exports = IPCHTTPAPI;