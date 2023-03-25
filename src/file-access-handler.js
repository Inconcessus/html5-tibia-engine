const fs = require("fs");

const FileAccessHandler = function() {

  /*
   * Class FileAccessHandler
   * Handles asynchronous accessing of files on disk and prevents race conditions.
   *
   * Image doing a readFile(callback) followed by an immediate writeFile(callback): the order is undefined.
   * In this class we introduce a queue per file so multiple accesses to the same file are handler sequentially and do not cause race conditions.
   *
   */

  // The filename lock map
  this.__locks = new Map();

}

FileAccessHandler.prototype.READ = 0x00;
FileAccessHandler.prototype.WRITE = 0x01;

FileAccessHandler.prototype.writeFile = function(filename, pointer, callback) {

  /*
   * Function FileAccessHandler.writeFile
   * External function to asynchronously write a buffer to a file
   */

  let lock = this.__createLock(filename);

  // An object (pointer) to a buffer must be passed; e.g., let pointer = {"buffer": Buffer}
  // Why? Sometimes the buffer is presently undefined and will be filled in later: so we pass by pointer.
  lock.callbacks.push(new Object({
    "fs": this.WRITE,
    "pointer": pointer,
    "callback": callback
  }));

  this.__consume(lock);

}

FileAccessHandler.prototype.readFile = function(filename, callback) {

  /*
   * Function FileAccessHandler.readFile
   * External function to asynchronously read a buffer from a file
   */

  let lock = this.__createLock(filename);

  // Add the new callback
  lock.callbacks.push({
    "fs": this.READ,
    "callback": callback
  });

  this.__consume(lock);

}

FileAccessHandler.prototype.__consume = function(lock) {

  /*
   * Function FileAccessHandler.__consume
   * Consumes the lock and applies a read/write callback to the filesystem 
   */

  // Block if the lock already locked
  if(lock.locked) {
    return;
  }

  lock.locked = true;

  // Get the first queued callback
  let handler = lock.callbacks.shift();

  switch(handler.fs) {
    case this.READ: return this.__handleRead(lock, handler);
    case this.WRITE: return this.__handleWrite(lock, handler);
    default: throw("Invalid lock apllied");
  }

}

FileAccessHandler.prototype.__handleRead = function(lock, handler) {

  /*  
   * Function FileAccessHandler.__handleRead
   * Wrapper around the NodeJS async fs.readFile function
   */

  fs.readFile(lock.filename, function(error, result) {

    handler.callback(error, result);
    this.__free(lock);

  }.bind(this));

}

FileAccessHandler.prototype.__free = function(lock) {

  /*
   * Function FileAccessHandler.__handleWrite
   * Wraps the fs.writeFile function
   */

  // The file is freely accessible for another call
  lock.locked = false;

  // More callbacks were queued: immediatelly apply the next one
  if(lock.callbacks.length > 0) { 
    return this.__consume(lock);
  } 

  // No more callbacks then we can delete the lock on the file
  if(lock.callbacks.length === 0) { 
    return this.__locks.delete(lock.filename);
  }

}

FileAccessHandler.prototype.__handleWrite = function(lock, handler) {

  /*
   * Function FileAccessHandler.__handleWrite
   * Wraps the fs.writeFile function
   */

  // If the pointer errored then ignore this write
  if(handler.pointer.error) {
    return this.__free(lock);
  }

  fs.writeFile(lock.filename, handler.pointer.buffer, function(error) {

    // Apply the saved callback
    handler.callback(error);

    // Unlock the lock and allow the next callback to access the file
    this.__free(lock);

  }.bind(this));

}

FileAccessHandler.prototype.__createLock = function(filename) {

  /*
   * Function FileAccessHandler.__createLock
   * Creates a lock for a filename if it does not exist
   */

  // Lock already exists
  if(this.__locks.has(filename)) {
    return this.__locks.get(filename);
  }

  // Create a new lock: keep track of all callbacks, whether it is locked (making a request, and the lock filename)
  this.__locks.set(filename, new Object({
    "callbacks": new Array(),
    "locked": false,
    "filename": filename
  }));
  
  return this.__locks.get(filename);

}

module.exports = FileAccessHandler;