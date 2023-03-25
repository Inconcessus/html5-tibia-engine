"use strict";

const BitFlag = function(flags) {

  /*
   * Function BitFlag
   * Wrapper to create a bitflag class
   */

  // Only 31 bits in a JavaScript number..
  if(flags.length > 31) {
    throw("Cannot construct a bit flag with more than 31 options.");
  }

  // The internal class generator
  const __BitFlag = function(flag) {
    this.flag = flag;
  }

  __BitFlag.prototype = Object.create(BitFlag.prototype);
  __BitFlag.prototype.constructor = __BitFlag;
  __BitFlag.prototype.flags = new Object();

  // Add all flags to the prototype
  flags.forEach(function(flag, i) {
    __BitFlag.prototype.flags[flag] = 1 << i;
  });

  return __BitFlag;

}

BitFlag.prototype.get = function(flag) {

  /*
   * Function BitFlag.get
   * Returns TRUE if a particular flag is set
   */

  return !!(this.flag & flag);

}

BitFlag.prototype.set = function(flag) {

  /*
   * Function BitFlag.set
   * Sets a particular flag in the bitflag
   */

  this.flag |= flag;

}

BitFlag.prototype.unset = function(flag) {

  /*
   * Function BitFlag.unset
   * Unsets a particular flag in the bitflag
   */

  this.flag &= ~this.flags[flag];

}

BitFlag.prototype.print = function() {

  /*
   * Function BitFlag.print
   * Prints readable representation of all flags set in a bitflag
   */

  Object.keys(this.flags).forEach(function(flag) {
    if(this.get(this.flags[flag])) {
      console.log(flag);
    }
  }, this);

}

// Define some bit flags
module.exports.OTBBitFlag = BitFlag([
  "FLAG_BLOCK_SOLID", // 1
  "FLAG_BLOCK_PROJECTILE", // 2
  "FLAG_BLOCK_PATHFIND", // 4
  "FLAG_HAS_HEIGHT", // 8
  "FLAG_USEABLE", // 16
  "FLAG_PICKUPABLE", // 32
  "FLAG_MOVEABLE", // 64
  "FLAG_STACKABLE", // 128
  "FLAG_FLOORCHANGEDOWN", // 256
  "FLAG_FLOORCHANGENORTH", // 512
  "FLAG_FLOORCHANGEEAST", // 1024
  "FLAG_FLOORCHANGESOUTH", // 2048
  "FLAG_FLOORCHANGEWEST", // 4096
  "FLAG_ALWAYSONTOP", // 8192
  "FLAG_READABLE", // 16384
  "FLAG_ROTATABLE", // 32768
  "FLAG_HANGABLE", // 65536
  "FLAG_VERTICAL", // 131072
  "FLAG_HORIZONTAL", // 262144
  "FLAG_CANNOTDECAY", // 524288
  "FLAG_ALLOWDISTREAD", // 1048576
  "FLAG_UNUSED", // 2097152
  "FLAG_CLIENTCHARGES", // 4194304
  "FLAG_LOOKTHROUGH", // 8388608
  "FLAG_ANIMATION", // 16777216
  "FLAG_FULLTILE", // 33554432
  "FLAG_FORCEUSE" // 67108864
]);

// Tile zone bitflag
module.exports.TileFlag = BitFlag([
  "TILESTATE_PROTECTIONZONE",
  "TILESTATE_DEPRECATED",
  "TILESTATE_NOPVP",
  "TILESTATE_NOLOGOUT",
  "TILESTATE_PVPZONE",
  "TILESTATE_REFRESH"
]);