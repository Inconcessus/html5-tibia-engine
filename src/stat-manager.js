"use strict";

const Position = require("./position");
const PacketWriter = require("./packet-writer");

const CharacterStats = function(player, stats) {

  /*
   * Class CharacterStats
   * Container for player statistics and properties
   */

  // Circular reference the player
  this.player = player;

  // Statistics in the class
  this.experience = stats.experience;
  this.level = stats.level;
  this.admin = stats.admin;
  this.sex = stats.sex;

  this.capacity = stats.maxCapacity;
  this.maxCapacity = stats.maxCapacity

  // Save the temple position
  this.templePosition = Position.prototype.fromLiteral(stats.templePosition);

  // The mounts and outfits available for the character
  this.availableOutfits = new Set(stats.availableOutfits);
  this.availableMounts = new Set(stats.availableMounts)

}

CharacterStats.prototype.setTemplePosition = function(position) {

  /*
   * Function CharacterStats.setTemplePosition
   * Sets the temple position of the character
   */

  this.templePosition = position;

}

CharacterStats.prototype.toJSON = function() {

  /*
   * Function CharacterStats.toJSON
   * Serialization of the player statistics to JSON
   */

  return new Object({
    "position": this.player.position,
    "admin": this.admin,
    "sex": this.sex,
    "templePosition": this.templePosition,
    "maxCapacity": this.maxCapacity,
    "level": this.level,
    "experience": this.experience,
    "availableMounts": Array.from(this.availableMounts),
    "availableOutfits": Array.from(this.availableOutfits)
  });

}

CharacterStats.prototype.setLevel = function(level) {

  /*
   * Function CharacterStats.setLevel
   * Sets the level of a player character
   */

  // Set the level & experience
  this.level = level;
  this.setExperience(this.__getExperienceForLevel(level));

}

CharacterStats.prototype.setExperience = function(experience) {

  /*
   * Function CharacterStats.setExperience
   * Sets the experience
   */

  this.experience = experience;

  // Check the level is OK
  this.__handleGainExperience();

}

CharacterStats.prototype.addExperience = function(experience) {

  /*
   * Function Player.addExperience
   * Adds an amount of experience to the player
   */

  // Add the experience
  this.setExperience(this.experience + experience);

  // Broadcast the gained experience
  this.player.broadcast(new PacketWriter(PacketWriter.prototype.opcodes.GAIN_EXPERIENCE).writeGainExperience(this.player.guid, experience));

}

CharacterStats.prototype.__getExperienceForLevel = function(x) {

  /*
   * Function CharacterStats.__getExperienceForLevel
   * Returns the absolute amount of experience required to level which is the Tibia experience formula
   * https://tibia.fandom.com/wiki/Experience_Formula (3rd order polynomial)
   */

  // Apply the polynomial
  return Math.max(0, (50 / 3) * (Math.pow(x, 3) - 6 * Math.pow(x, 2) + 17 * x - 12));

}

CharacterStats.prototype.__handleGainExperience = function() {

  /*
   * Function CharacterStats.checkLevelUp
   * Function to check whether the player needs to be leveled up
   */

  // While the player has enough experience to level up
  while(this.experience >= this.__getExperienceForLevel(this.level + 1)) {
    this.__handleGainLevel();
  }

}

CharacterStats.prototype.__handleGainLevel = function() {

  /*
   * Function CharacterStats.increaseLevel
   * Increases the level of the player
   */

  this.level++;

  // Inform the player
  this.player.write(new PacketWriter(PacketWriter.prototype.opcodes.LEVEL_ADVANCE).writeLevelAdvance());

}

module.exports = CharacterStats;