const AchievementProperty = function(value) {

  /*
   * Class AchievementProperty
   * Container for a single property that can be incremented
   *
   * API:
   *
   * AchievementProperty.toJSON - Serializes the class to JSON
   * AchievementProperty.addTrigger - Adds an achievement identifier trigger
   * AchievementProperty.addValue - Adds a particular value to the property
   *
   */

  // Has a value and a set of triggers
  this.value = value;
  this.triggers = new Set();

}

AchievementProperty.prototype.toJSON = function() {

  /*
   * Function AchievementProperty.toJSON
   * Serializes an achievement property
   */

  return this.value;

}

AchievementProperty.prototype.addTrigger = function(id) {

  /*
   * Function AchievementProperty.addTrigger
   * Adds an achievement identifier to the list of triggers for this property
   */

  this.triggers.add(id);

}

AchievementProperty.prototype.setBitFlag = function(flag) {

  /*
   * Function AchievementProperty.setBitFlag
   * Sets a bit flag in the integer value
   */

  this.value = this.value |= flag;

}

AchievementProperty.prototype.addValue = function(value) {

  /*
   * Function AchievementProperty.addTrigger
   * Adds an achievement identifier to the list of triggers for this property
   */

  this.value = this.value + value;

}

module.exports = AchievementProperty;