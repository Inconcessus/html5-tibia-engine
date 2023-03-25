const AchievementProperty = require("./achievement-property");

const AchievementProperties = function(achievementManager, properties) {

  /*
   * Class AchievementProperties
   * Container for state properties that concern player achievements
   *
   * API:
   *
   * AchievementProperties.DEFAULT_PROPERTIES - The default proprties and values
   * AchievementProperties.toJSON - Serializes the achievement properties class to JSON
   * AchievementProperties.setSubAchievement(property, flag) - Sets an achievement check that is triggered when the property is updated
   * AchievementProperties.setTrigger(property, id) - Sets an achievement check that is triggered when the property is updated
   * AchievementProperties.get(property) - Returns the property
   * AchievementProperties.add(property, value) - Returns a value to the specified property
   * AchievementProperties.__setDefaultProperties - Sets deafault propreties and overwrites with player values where available
   *
   */

  // The manager for the achievements themselves
  this.achievementManager = achievementManager;

  // Add the trackable properties here
  this.properties = new Map();

  this.__setDefaultProperties(properties);

}

// Default achievement properties that are stored for each player
AchievementProperties.prototype.DEFAULT_PROPERTIES = new Object({
  "NUMBER_TILES_WALKED": 0,
  "TEST_ADDITION": 0,
  "EXPLORE_TOWN": 0,
});

AchievementProperties.prototype.toJSON = function() {

  /*
   * Function AchievementProperties.toJSON
   * Serializes the property to JSON when called by JSON.stringify
   */

  // Convert the map to a { key => value } pair for serialization
  return Object.fromEntries(this.properties);

}

AchievementProperties.prototype.setTrigger = function(property, id) {

  /*
   * Function AchievementProperties.setTrigger
   * Attached a trigger to a particular property that will check events
   */

  // The property does not exist
  if(!this.properties.has(property)) {
    return;
  }

  // Add the trigger. When this property is updated all of its triggers are checked for completion.
  this.properties.get(property).addTrigger(id);

}

AchievementProperties.prototype.get = function(property) {

  /*
   * Function AchievementProperties.get
   * Returns the value that belongs to a given property
   */

  return this.properties.get(property);

}

AchievementProperties.prototype.setAchievementFlag = function(property, flag) {

  /*
   * Function AchievementProperties.setAchievementFlag
   * Sets a sub achievement in a bitflag with a maximum of 31 achievement flags
   */

  // The property does not exist..
  if(!this.properties.has(property)) {
    return;
  }

  // Must be a power of two
  if(!flag.isValidBitFlag()) {
    return;
  }

  // Update the value with the bitflag
  this.get(property).setBitFlag(flag);

  // Go over the configured triggers (i.e., all achievements that depend on this property)
  this.get(property).triggers.forEach(function(trigger) {
    this.achievementManager.__checkStatus(trigger);
  }, this);

}

AchievementProperties.prototype.add = function(property, amount) {

  /*
   * Function AchievementProperties.add
   * Increments an achievement property. An increment triggers the configured triggers and check for achievement status
   */

  // The property does not exist..
  if(!this.properties.has(property)) {
    return;
  }

  // Add the value
  this.get(property).addValue(amount);

  // Go over the configured triggers (i.e., all achievements that depend on this property)
  this.get(property).triggers.forEach(function(trigger) {
    this.achievementManager.__checkStatus(trigger);
  }, this);

}

AchievementProperties.prototype.__setDefaultProperties = function(properties) {

  /*
   * Function AchievementProperties.__setDefaultProperties
   * Sets the initial default properties and overwrites with whatever comes from the database
   */

  // Go over the default properties
  Object.entries(this.DEFAULT_PROPERTIES).forEach(function([ property, value ]) {

    // Overwrite with existing value
    if(properties.hasOwnProperty(property)) {
      value = properties[property];
    }

    this.properties.set(property, new AchievementProperty(value));

  }, this);

}

module.exports = AchievementProperties;