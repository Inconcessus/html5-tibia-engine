"use strict";

const crypto = require("crypto");
const Enum = require("./enum");
const http = require("http");
const fs = require("fs");
const url = require("url");

const WebsocketServer = require("./websocket-server");

const HTTPServer = function() {

  /*
   * Class HTTPServer
   * Wrapper for NodeJS HTTP(S) server to host the websocket server
   */

  // Create the websocket server that handles network IO
  this.websocketServer = new WebsocketServer();

  // State variable to keep the current server status
  this.__serverStatus = this.STATUS.STARTUP;

  // Should we enable TLS to encrypt websocket messages?
  this.__server = http.createServer(this.__handleRequest.bind(this));

  // Upgrade of HTTP server to websocket protocol and check authentication with login server
  this.__server.on("upgrade", this.__handleUpgrade.bind(this));
  this.__server.on("error", this.__handleError.bind(this));
  this.__server.on("listening", this.__handleListening.bind(this));
  this.__server.on("close", this.__handleClose.bind(this));

}

// Game server status
HTTPServer.prototype.STATUS = Enum(
  "STARTUP",
  "LISTENING",
  "SHUTDOWN",
  "CLOSED"
);

HTTPServer.prototype.close = function() {

  /*
   * Function HTTPServer.close
   * Closes the HTTP server
   */

  // Close the websocket server
  this.websocketServer.close();

  // And the HTTP server
  this.__server.close();

}

HTTPServer.prototype.enableHTTP = function() {

  /*
   * Function HTTPServer.enableHTTP
   * Enables unencrypted websocket over HTTP
   */

  return http.createServer(this.__handleRequest.bind(this));

}

HTTPServer.prototype.listen = function(host, port) {

  /*
   * Function HTTPServer.listen
   * Sets server to listening for incoming requests
   */

  // Delegate to the internal server
  this.__server.listen(host, port);

}

HTTPServer.prototype.__handleRequest = function(request, response) {

  /*
   * Function HTTPServer.__handleRequest
   * Handles HTTP requests to the game server: we do not accept these.
   */

  const body = new Object({
    "Upgrade": "WebSocket",
    "Connection": "Upgrade",
    "Sec-WebSocket-Version": 13
  });

  // Direct HTTP requests to the gameserver are blocked. Write an update required to websockets to the client
  response.writeHead(426, body);
  response.end();

}

HTTPServer.prototype.__handleUpgrade = function(request, socket, head) {

  /*
   * Function HTTPServer.__handleUpgrade
   * Handles upgrading of the websocket and checks the token from the login server. Only valid tokens are upgraded.
   */

  // The login server will eventually provide a token
  let valid = this.__authenticateToken(request);

  // Token was not valid
  if(valid === null) {
    return socket.destroy();
  }

  // Otherwise handle the upgrade with the submitted account information
  this.websocketServer.websocket.handleUpgrade(request, socket, head, function upgradeWebsocket(websocket) {
    this.websocketServer.websocket.emit("connection", websocket, request, valid);
  }.bind(this));

}

HTTPServer.prototype.__handleError = function(error) {

  /*
   * Function WebsocketServer.__handleError
   * Handles a server error when launching
   */

  // Already in use
  if(error.code === "EADDRINUSE") {
    console.log("Could not start server: the address or port is already in use.");
  }

  process.gameServer.shutdown();

}

HTTPServer.prototype.__parseHMACToken = function(token) {

  /*
   * Function HTTPServer.__parseHMACToken
   * Attempt to parse the HMAC token to JSON
   */

  // Wrap token extraction in a try/catch
  try {
    return JSON.parse(Buffer.from(token, "base64").toString());
  } catch(exception) {
    return null;
  }

}

HTTPServer.prototype.__verifyToken = function(payload) {

  /*
   * Function HTTPServer.__verifyToken
   * Verities the passed HMAC token and check that it was signed by the login server
   */

  // Confirm the HMAC signature
  return payload.token === crypto.createHmac("sha256", CONFIG.HMAC.SHARED_SECRET).update(payload.name + payload.expire).digest("hex");

}

HTTPServer.prototype.__handleListening = function() {

  /*
   * HTTPServer.__handleListening
   * Callback fired when server is listening for incoming connections
   */

  const { address, family, port } = this.__server.address();

  this.__serverStatus = this.STATUS.LISTENING;

  console.log("The gameserver is listening for connections on %s:%s.".format(address, port));

}

HTTPServer.prototype.__handleClose = function() {

  /*
   * WebsocketServer.__handleClose
   * Callback fired when the server is closed
   */

  // Set state to closed
  this.__serverStatus = this.STATUS.CLOSED;

  console.log("The gameserver has been closed.");

}

HTTPServer.prototype.isListening = function() {

  /*
   * Function HTTPServer.isListening
   * Returns true if the server was closed
   */

  return this.__serverStatus === this.STATUS.LISTENING;

}

HTTPServer.prototype.isShutdown = function() {

  /*
   * Function HTTPServer.isShutdown
   * Returns true if the server was closed
   */

  return this.__serverStatus === this.STATUS.SHUTDOWN;

}

HTTPServer.prototype.isClosed = function() {

  /*
   * Function HTTPServer.isClosed
   * Returns true if the server was closed
   */

  return this.__serverStatus === this.STATUS.CLOSED;

}

HTTPServer.prototype.__authenticateToken = function(request) {

  /*
   * Function HTTPServer.__authenticateToken
   * Fake function that authenticates tokens and makes a request to the login server
   */

  // Get the token from the URL 
  let token = url.parse(request.url, true).query.token;

  // Get the payload from the request
  let payload = this.__parseHMACToken(token);

  // Could not parse payload
  if(payload === null) {
    return null;
  }

  // Could not verify token: it was tampered with or not signed by our login server via the shared secret
  if(!this.__verifyToken(payload)) {
    return null; 
  }

  // Token has expired
  if(payload.expire <= Date.now()) {
    return null;
  }

  // Token was verified and succesfully return the name of the account to be loaded
  return payload.name;

}

module.exports = HTTPServer;