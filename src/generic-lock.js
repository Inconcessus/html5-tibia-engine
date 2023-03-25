const GenericLock = function() {

  /*
   * Class GenericLock
   *
   * Smart wrapper for a lock that can be locked and will be unlocked in the future
   * This is used by the combat lock, where players cannot log out after having been in combat
   * This lock often needs to be extended while still in combat.
   *
   * Public API:
   *
   * GenericLock.cancel() - cancels and resets the lock to its initial state
   * GenericLock.isLocked - returns true if the lock is locked
   * GenericLock.lockSeconds(seconds) - locks the generic lock until a certain number of seconds
   * GenericLock.lock(frames) - locks the generic lock until a certain number of frames
   * GenericLock.unlock() - unlocks the generic lock
   * GenericLock.on(which, callback) - attaches a callback to a "lock" or "unlock" event
   * GenericLock.remainingFrames() - returns the remaining frames on the lock (or 0 when unlocked)
   *
   */

  // State of the lock
  this.__lockEvent = null;
  this.__extendedLockFrame = null;

  // These are callbacks that may be attached
  this.__unlockCallback = null;
  this.__lockCallback = null;


}

GenericLock.prototype.remainingFrames = function() {

  /*
   * Function GenericLock.remainingFrames
   * Returns the remainig frames the generic lock is locked for
   */

  // No event
  if(this.__lockEvent === null) {
    return 0;
  }

  // Delegate to the event handler
  return this.__lockEvent.remainingFrames();

}

GenericLock.prototype.isLocked = function() {

  /*
   * Function GenericLock.isLocked
   * Return true if the player is currently engaged in combat
   */

  return this.__lockEvent !== null;

}

GenericLock.prototype.on = function(which, callback) {

  /*
   * Function GenericLock.on
   * Most basic event emitter for lock and unlock events of the generic lock
   */

  // Only two options: not a generic event emitter
  switch(which) {
    case "lock": return this.__lockCallback = callback;
    case "unlock": return this.__unlockCallback = callback;
  }

}

GenericLock.prototype.cleanup = function() {

  /*
   * Function GenericLock.cleanup
   * Cleans up the generic lock by canceling the event and dropping all bound player references
   */

  this.__lockCallback = null;
  this.__unlockCallback = null;

  this.cancel();

}

GenericLock.prototype.unlock = function() {

  /*
   * Function GenericLock.unlock
   * Forces unlocking of the lock and will execute the ending callback
   */

  // Unlocking means that we apply the end callback
  if(this.__unlockCallback !== null) {
    this.__unlockCallback();
  }

  // And now it can be canceled
  this.cancel();

}

GenericLock.prototype.cancel = function() {

  /*
   * Function GenericLock.cancel
   * Cancels the lock event without firing the unlock calback
   */

  // Was not locked?
  if(!this.isLocked()) {
    return;
  }

  // Cancel the schedule unlocking event
  this.__lockEvent.cancel();
  this.__lockEvent = null;
  this.__extendedLockFrame = null;

}

GenericLock.prototype.lockSeconds = function(seconds) {

  /*
   * Function GenericLock.lockSeconds
   * Locks the generic lock for a number of seconds
   */

  // Delegate to lock but convert seconds to frames
  this.lock(Math.floor(seconds * (1000 / CONFIG.SERVER.MS_TICK_INTERVAL)));

}

GenericLock.prototype.lock = function(amount) {

  /*
   * Function GenericLock.lock
   * Call the lock function to either schedule an unlock or extend it
   */

  // If the lock is locked again after being locked we have to extend it by a numb
  if(this.isLocked()) {
    return this.__extendLock(amount);
  }

  this.__lock(amount);

  // A lock callback was assigned
  if(this.__lockCallback !== null) {
    this.__lockCallback();
  }

}

GenericLock.prototype.__extendLock = function(amount) {

  /*
   * Function GenericLock.__extendLock
   * Extends the lock with until a number of frames
   */

  let extension = amount - this.__lockEvent.remainingFrames();

  if(extension <= 0) {
    return;
  }

  return this.__extendedLockFrame = extension;

}

GenericLock.prototype.__lock = function(amount) {

  /*
   * Function GenericLock.__lock
   * Callback executed when the player has left combat
   */

  // Reset the lock extension
  this.__extendedLockFrame = null;

  // Schedule the new unlock event
  this.__lockEvent = process.gameServer.world.eventQueue.addEvent(this.__unlock.bind(this), amount);

}

GenericLock.prototype.__unlock = function() {

  /*
   * Function GenericLock.__unlock
   * Callback executed when the player has left combat
   */

  // The lock was extended and we have to reschedule the lock
  if(this.__extendedLockFrame !== null && this.__extendedLockFrame > 0) {
    return this.__lock(this.__extendedLockFrame);
  }

  this.__lockEvent = null;

  // An unlock callback was assigned
  if(this.__unlockCallback !== null) {
    this.__unlockCallback();
  }

}

module.exports = GenericLock;