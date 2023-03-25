"use strict";

const Outfit = function(outfit) {

  /*
   * Class Outfit
   * Container for a creature outfit (player, npc, monster)
   *
   * API:
   *
   * Outfit.getMountName(id) - returns the mount name that belongs to a mount identifier
   * Outfit.getName(id) - returns the name that belongs to an outfit identifier
   *
   */

  // Identifier is required
  this.id = outfit.id ?? 1;

  // Read the passed outfit details or set the default
  this.details = outfit.details ?? null;
  this.mount = outfit.mount ?? null;
  this.mounted = outfit.mounted ?? false;
  this.addonOne = outfit.addonOne ?? false;
  this.addonTwo = outfit.addonTwo ?? false;

}

Outfit.prototype.OUTFITS = require(getDataFile("outfits", "outfits"));
Outfit.prototype.MOUNTS = require(getDataFile("mounts", "mounts"));

Outfit.prototype.getMountName = function(id) {

  /*
   * Function Outfit.getMountName
   * Returns the name of a mount with a particular identifier
   */

  // This mount does not exist
  if(!this.MOUNTS.hasOwnProperty(id)) {
    return null;
  }

  return this.MOUNTS[id].name;

}

Outfit.prototype.getName = function(id) {

  /*
   * Function Outfit.getName
   * Returns the name of an outfit with a particular identifier
   */

  if(!this.OUTFITS.hasOwnProperty(id)) {
    return null;
  }


  return this.OUTFITS[id].name;

}

Outfit.prototype.toJSON = function() {

  /*
   * Function Outfit.toJSON
   * Serializes the outfit class to JSON to be stored in a database or file
   */

  return new Object({
    "id": this.id,
    "details": this.details,
    "mount": this.mount,
    "mounted": this.mounted,
    "addonOne": this.addonOne,
    "addonTwo": this.addonTwo
  });

}

Outfit.prototype.copy = function() {

  /*
   * Function Outfit.copy
   * Returns a memory copy of the outfit
   */

  return new Outfit(this.toJSON());

}

Outfit.prototype.isValid = function() {

  /*
   * Function Outfit.isValid
   * The outfit colors must be between 0 and 132
   */

  if(this.details === null) {
    return true;
  }

  return this.details.head >= 0 && this.details.head < 133 &&
         this.details.body >= 0 && this.details.body < 133 &&
         this.details.legs >= 0 && this.details.legs < 133 &&
         this.details.feet >= 0 && this.details.feet < 133;

}

module.exports = Outfit;