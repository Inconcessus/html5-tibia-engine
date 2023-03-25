const AchievementProperties = require("./achievement-properties");
const PacketWriter = require("./packet-writer");

const AchievementManager = function(player, achievements) {

  /*
   * Class AchievementManager
   * Manager for earnable achievements by the player
   *
   * API:
   *
   * AchievementManager.ACHIEVEMENTS - Data definitions for all the achievements that can be collected
   * AchievementManager.addPropertyValue(id, value) - Adds a particular value to an achievement property with a particular identifier
   * AchievementManager.completeAchievement(id) - Completes an achievement with a given identifier
   * AchievementManager.getAchievement(id) - Returns an achievement definition from the achievement identifier
   * AchievementManager.toJSON() - Serializes the achievement manager for storage
   *
   */

  // Save a reference the player
  this.player = player;

  // Container for the state of all achievement properties that are tracked
  this.achievementProperties = new AchievementProperties(this, achievements.properties);

  // The list of achievements that were completed by the player
  this.completedAchievements = new Set(achievements.completed);

  // Container for all the configured achievements that can still be earned
  this.achievements = new Map();

  // Add all the achievements
  this.ACHIEVEMENTS.forEach(function(achievement, id) {
    this.__addAvailableAchievement(id, achievement.conditions);
  }, this);

}

AchievementManager.prototype.ACHIEVEMENTS = require(getDataFile("achievements.json"));

AchievementManager.prototype.toJSON = function() {

  /*
   * Function AchievementManager.toJSON
   * Serializes the completed achievements
   */

  return new Object({
    "completed": Array.from(this.completedAchievements),
    "properties": this.achievementProperties
  });

}

AchievementManager.prototype.getAchievement = function(id) {

  /*
   * Function AchievementManager.getAchievement
   * Returns the achievement from an achievement identifier (see data/achievements.json)
   */

  // Invalid identifier
  if(id < 0 || id >= this.ACHIEVEMENTS.length) {
    return null;
  }

  return this.ACHIEVEMENTS[id];

}

AchievementManager.prototype.addPropertyValue = function(property, value) {

  /*
   * Function AchievementManager.add
   * Delegates to the properties manager to store the updated state for the property
   */

  this.achievementProperties.add(property, value);

}

AchievementManager.prototype.__addAvailableAchievement = function(id, conditions) {

  /*
   * Function AchievementManager.__addAvailableAchievement
   * Adds an achievement that can be obtained by the player
   */

  // Achievement was already completed: do not add it for the player
  if(this.completedAchievements.has(id)) {
    return;
  }

  // Add the achievement
  this.achievements.set(id, conditions);

  // Set a trigger for each condition: the achievement win condition will be checked each time one of its properties is updated
  conditions.forEach(function(condition) {
    this.achievementProperties.setTrigger(condition.property, id);
  }, this);

  this.__checkStatus(id);

}

AchievementManager.prototype.__checkCondition = function(condition) {

  /*
   * Function AchievementManager.__checkCondition
   * Checks whether a particular condition is fulfilled
   */

  let value = this.__getProperty(condition.property).value;

  // If the value equals or exceeds the condition it was completed
  if(condition.type === "greater") {
    if(value < condition.value) {
      return false;
    }
  }

  // If the flag is set the condition it was completed
  if(condition.type === "flag") {
    if(!(value & condition.value)) {
      return false;
    }
  }

  return true;

}

AchievementManager.prototype.__checkStatus = function(id) {

  /*
   * Function AchievementManager.__checkStatus
   * Called when a state property is updated to check all achievements that depend on this state
   */

  // Does not exist or the achievement has already been completed
  if(!this.achievements.has(id)) {
    return;
  }

  // For the achievement we must check all the win conditions: these may be multiple
  let conditions = this.achievements.get(id);

  // All conditions must be fulfilled before the achievement is completed
  for(let i = 0; i < conditions.length; i++) {

    if(!this.__checkCondition(conditions[i])) {
      return;
    }

  }

  // All conditions were fulfilled: the achievement was completed
  this.completeAchievement(id);

}

AchievementManager.prototype.completeAchievement = function(id) {

  /*
   * Function AchievementManager.__completeAchievement
   * Completes the achievement related to the passed symbol
   */

  this.completedAchievements.add(id);
  this.achievements.delete(id);

  let achievement = this.getAchievement(id);

  this.player.write(new PacketWriter(PacketWriter.prototype.opcodes.ADD_ACHIEVEMENT).writeAddAchievement(achievement));

}

AchievementManager.prototype.__getProperty = function(symbol) {

  /*
   * Function AchievementManager.__getProperty
   * Returns the property that belongs to the given symbol
   */

  return this.achievementProperties.get(symbol);

}

module.exports = AchievementManager;