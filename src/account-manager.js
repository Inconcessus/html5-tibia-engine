"use strict";

const fs = require("fs");
const bcrypt = require("bcryptjs");
const fileAccessHandler = require("./file-access-handler");

const AccountManager = function() {

  /*
   * Class AccountManager
   * Container for interaction with the player database (filesys)
   */

  // The access handler that prevents race conditions when accessing files
  this.fileAccessHandler = new fileAccessHandler();

}

// The template for new characters
AccountManager.prototype.CHARACTER_BLUEPRINT = fs.readFileSync(getDataFile("account-template.json"));
// Number of rounds for BCRYPT
AccountManager.prototype.SALT_ROUNDS = 12;

AccountManager.prototype.__getCharacterBlueprint = function(queryObject) {

  /*
   * AccountManager.__getCharacterBlueprint
   * Returns a new character template to create a new account with
   */

  // Copy the template in memory
  let buffer = Buffer.allocUnsafe(this.CHARACTER_BLUEPRINT.length);
  this.CHARACTER_BLUEPRINT.copy(buffer);

  let copiedTemplate = JSON.parse(buffer.toString());

  // Replace names and return the string for saving
  copiedTemplate.creatureStatistics.name = queryObject.name.capitalize();

  // The player sex is 0 for male, 1 for female, 2 for whatever
  copiedTemplate.characterStatistics.sex = queryObject.sex === "male" ? 0 :
                                     queryObject.sex === "female" ? 1 : null;

  // Default male & female outfits
  if(queryObject.sex === "male") {
    copiedTemplate.characterStatistics.availableOutfits = [128, 129, 130, 131];
  } else if(queryObject.sex === "female") {
    copiedTemplate.characterStatistics.availableOutfits = [136, 137, 138, 139];
  }

  // Set default outfit too
  copiedTemplate.creatureStatistics.outfit.id = (queryObject.sex === "male") ? 128 : 136;

  // Return the template as a string to write it to the filesystem
  return JSON.stringify(copiedTemplate, null, 2);

}

AccountManager.prototype.createAccount = function(queryObject, requestCallback) {

  /*
   * AccountManager.createAccount
   * Creates an account with the specified query parameters and calls a callback on success/failure
   */

  let name = queryObject.name.toLowerCase();

  // Name of the character
  let filepath = this.getAccountFile(name);

  fs.exists(filepath, function(exists) {

    // The character already exists
    if(exists) {
      return requestCallback(409, null);
    }

    // Proceed to hash the submitted password
    bcrypt.hash(queryObject.password, this.SALT_ROUNDS, function(error, hash) {

      // Something wrong hashing?
      if(error) {
        return requestCallback(500, null);
      }

      let buffer = {"buffer": this.__getCharacterBlueprint(queryObject)}

      // Create and copy over the template
      this.fileAccessHandler.writeFile(filepath, buffer, function(error) {

        // Could not write file?
        if(error) {
          return requestCallback(500, null);
        }

        // Return the newly created account information
        return requestCallback(null, new Object({
          "hash": hash,
          "definition": name
        }));

      }.bind(this));

    }.bind(this));

  }.bind(this));

}

AccountManager.prototype.getAccountFile = function(name) {

  /*
   * Function AccountManager.getAccountFile
   * Returns the account file of a particular name
   */

  return getDataFile("accounts", "definitions", "%s.json".format(name.toLowerCase()));

}

AccountManager.prototype.getPlayerAccount = function(name, callback) {

  /*
   * Function AccountManager.getPlayerAccount
   * Reads an account from the filesystem database
   */

  // Filepath of where the account information is stored in JSON
  let filepath = this.getAccountFile(name);

  // Asynchronously read the database file: may return an error if the file does not exist
  this.fileAccessHandler.readFile(filepath, function readPlayerAccount(error, buffer) {

    // Error reading from the database: propagate error
    if(error) {
      return callback(error, null);
    }

    // Serialize the file and return it by calling back
    return callback(null, JSON.parse(buffer.toString()));

  });

}

AccountManager.prototype.atomicUpdate = function(owner, callback) {

  /*
   * Function AccountManager.atomicUpdate
   * Applies an atomic read/write to the player file on disk that does not allow for race conditions to occur
   */

  // This looks really weird but it works by passing a pointer with data to the write function: currenly null
  // This pointer is eventually updated AFTER async reading of the file and modification in the read callback
  let pointer = new Object({
    "buffer": null,
    "error": false
  });

  // Read the account and update the buffer in the pointer
  this.getPlayerAccount(owner, function(error, json) {

    if(error) {
      pointer.error = true;
      return callback(error, null);
    }

    // Here we apply the callback to the data (which updates the JSON)
    callback(null, json);

    // Overwrite the buffer in the pointer with the data
    pointer.buffer = JSON.stringify(json, null, 2);

  });

  // Immediately schedule the write event so NOTHING can come in between and we prevent race conditions!
  this.savePlayerAccount(owner, pointer);

}

AccountManager.prototype.savePlayerAccount = function(name, pointer) {

  /*
   * Function AccountManager.savePlayerAccount
   * Writes the account to the filesystem database
   */

  // Determine the filepath to store the data
  let filepath = this.getAccountFile(name);

  // Write the account to disk
  this.fileAccessHandler.writeFile(filepath, pointer, function writePlayerAccount(error) {

    if(error !== null) {
      return console.error("Could not save account data for %s".format(name));
    }

  });

}

module.exports = AccountManager;