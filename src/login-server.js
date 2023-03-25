"use strict";

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const http = require("http");
const fs = require("fs");
const url = require("url");

const AccountManager = require("./account-manager");

const LoginServer = function(callback) {

  /*
   * Class LoginServer
   *
   * Wrapper for the Forby HTML5 Open Tibia Server
   * Checks database of accounts / bcrypt passwords and returns a HMAC token to be provided to the gameserver
   * The gameserver uses the validity of the HMAC token to allow a websocket connection and load the required account file
   *
   */

  // List of available account
  this.__init();
  this.accounts = JSON.parse(fs.readFileSync(getDataFile("accounts", "accounts.json").toString()));
  this.accountManager = new AccountManager();

  // Create the server and handler
  this.server = http.createServer(this.__handleRequest.bind(this));

  // Graceful close
  process.on("SIGINT", this.server.close.bind(this.server));
  process.on("SIGTERM", this.server.close.bind(this.server));
  process.on("exit", this.__handleExit.bind(this));
  //process.on("uncaughtException", process.exit.bind(this, 1));

  // Listen for incoming requests
  this.server.listen(CONFIG.LOGIN.PORT, CONFIG.LOGIN.HOST, callback);

}

LoginServer.prototype.__init = function() {

  /*
   * LoginServer.__init
   * Initializes the login server and handles creation of account directory if it does not exist
   */

  // If accounts does not exist create the folder and necessary files
  try {
    fs.accessSync(getDataFile("accounts"));
  } catch(error) {
    fs.mkdirSync(getDataFile("accounts"));
    fs.writeFileSync(getDataFile("accounts", "accounts.json"), "{}");
    fs.mkdirSync(getDataFile("accounts", "definitions"));
  }

}

LoginServer.prototype.__handleExit = function(exit) {

  /*
   * LoginServer.__handleExit
   * Writes the account state to the filesystem
   */

  fs.writeFileSync(getDataFile("accounts", "accounts.json"), JSON.stringify(this.accounts, null, 2));

}

LoginServer.prototype.__generateToken = function(name) {

  /*
   * LoginServer.__generateToken
   * Generates a simple HMAC token for the client to identify itself with.
   */

   // Token is only valid for a few seconds
   let expire = Date.now() + 3000;

   // Return the JSON payload
   return new Object({
     "name": name,
     "expire": expire,
     "token": crypto.createHmac("sha256", CONFIG.HMAC.SHARED_SECRET).update(name + expire).digest("hex")
   });

}

LoginServer.prototype.__isValidCreateAccount = function(queryObject) {

  /*
   * LoginServer.__isValidCreateAccount
   * Returns true if the request to create the account is valid 
   */

  // Missing
  if(!queryObject.account || !queryObject.password || !queryObject.name || !queryObject.sex) {
    return false;
  }

  // Accept only lower case letters for the character name
  if(!/^[a-z]+$/.test(queryObject.name)) {
    return false;
  }

  // Must be male or female
  if(queryObject.sex !== "male" && queryObject.sex !== "female") {
    return false;
  }

  return true;

}

LoginServer.prototype.__createAccount = function(request, response) {

  /*
   * LoginServer.__createAccount
   * Makes a call to the account manager to create a new account if the request is valid
   */

  let queryObject = url.parse(request.url, true).query;

  // Account number already exists..
  if(this.accounts.hasOwnProperty(queryObject.account)) {
    response.statusCode = 409;
    return response.end();
  }

  if(!this.__isValidCreateAccount(queryObject)) {
    response.statusCode = 400;
    return response.end();
  }

  this.accountManager.createAccount(queryObject, function(error, accountObject) {

    // Failure creating the account
    if(error) {
      response.statusCode = error;
      return response.end();
    }

    // Created! Append to the in-memory map    
    this.accounts[queryObject.account] = accountObject;

    // Finish the HTTP response
    response.statusCode = 201;
    response.end();

  }.bind(this));

}

LoginServer.prototype.__handleRequest = function(request, response) {

  /*
   * LoginServer.__handleRequest
   * Handles incoming HTTP requests
   */

  // Enabled CORS to allow requests from JavaScript
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET, POST");

  // Only GET (for tokens) and POST (for account creation)
  if(request.method !== "GET" && request.method !== "POST") {
    response.statusCode = 501;
    return response.end();
  }

  // Post means creating account
  if(request.method === "POST") {
    return this.__createAccount(request, response);
  }

  // Data submitted in the querystring
  let requestObject = url.parse(request.url, true);

  if(requestObject.pathname !== "/") {
    response.statusCode = 404;
    return response.end();
  }

  let queryObject = requestObject.query;

  // Account or password were not supplied
  if(!queryObject.account || !queryObject.password) {
    response.statusCode = 401;
    return response.end();
  }

  // Account does not exist
  if(!this.accounts.hasOwnProperty(queryObject.account)) {
    response.statusCode = 401;
    return response.end();
  }

  // Reference the entry
  let entry = this.accounts[queryObject.account];

  // Compare the submitted password with the hashed + salted password
  bcrypt.compare(queryObject.password, entry.hash, function(error, result) {

    if(error) {
      response.statusCode = 500;
      return response.end();
    }

    if(!result) {
      response.statusCode = 401;
      return response.end();
    }

    // Valid return a HMAC token to be verified by the GameServer
    response.writeHead(200, {"Content-Type": "application/json"});

    // Return the host and port of the game server too in addition to the token
    response.end(JSON.stringify({
      "token": Buffer.from(JSON.stringify(this.__generateToken(entry.definition))).toString("base64"),
      "host": CONFIG.SERVER.EXTERNAL_HOST
    }));

  }.bind(this));

}

module.exports = LoginServer;