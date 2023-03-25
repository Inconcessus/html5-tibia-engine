const PacketWriter = require("./packet-writer");
const Condition = require("./condition");

const ConditionManager = function(creature) {

  /*
   * Class ConditionManager
   * Container for conditions that are applied the creature
   */

  // Reference the creature
  this.__creature = creature;

  // Reference for the conditions
  this.__conditions = new Map();

}

ConditionManager.prototype.extendCondition = function(id, ticks) {

  let condition = this.__conditions.get(id);
  condition.numberTicks += ticks;

}

ConditionManager.prototype.replace = function(condition, properties) {

  /*
   * Function ConditionManager.replace
   * Attempts to replace a condition with a new condition
   */

  let current = this.__conditions.get(condition.id)

  // Current status is permanent: ignore this request
  if(current.isPermanent()) {
    if(this.__creature.isPlayer()) {
      this.__creature.sendCancelMessage("You are under influence of a more powerful condition.");
      return false;
    }
  }

  // Calculate the total and remainig durations of the respective conditions
  let remaining = current.getRemainigDuration();
  let total = condition.getTotalDuration();

  // Only replace if the new one is longer than the old one: or the new one is permanent
  if(total > remaining || condition.isPermanent()) {
    this.remove(condition.id);
    this.add(condition, properties);
  }

  return true;

}

ConditionManager.prototype.forEach = function(callback) {

  /*
   * Function ConditionManager.forEach
   * Applies a callback over all conditions
   */

  this.__conditions.forEach(callback);

}

ConditionManager.prototype.has = function(id) {

  /*
   * Function ConditionManager.has
   * Returns true is the condition already exists
   */

  return this.__conditions.has(id);

}

ConditionManager.prototype.remove = function(id) {

  /*
   * Function ConditionManager.remove
   * Removes a condition from the player 
   */

  // Doesn't have
  if(!this.has(id)) {
    return;
  }

  // Cancel the scheduled event and expire it
  let condition = this.__conditions.get(id);

  this.__remove(condition);

}

ConditionManager.prototype.cleanup = function() {

  this.__conditions.forEach((condition, id) => this.__remove(condition));

}

ConditionManager.prototype.cancelAll = function() {

  /*
   * Function Creature.cancelAll
   * Cancels all the scheduled conditions (e.g., when logging out)
   */

  this.__conditions.forEach((condition, id) => condition.cancel());

}

ConditionManager.prototype.add = function(condition, properties) {

  /*
   * Function Creature.add
   * Adds a condition to the creature
   */

  let { onStart, onTick, onExpire } = process.gameServer.database.getCondition(condition.id);

  onStart.call(condition, this.__creature, properties);

  // Reference
  this.__conditions.set(condition.id, condition);

  // Start the first tick of the condition
  if(condition.numberTicks !== -1) {
    this.__tickCondition(condition);
  }

  // Players need to be informed
  if(this.__creature.isPlayer()) {
    this.__creature.broadcast(new PacketWriter(PacketWriter.prototype.opcodes.TOGGLE_CONDITION).writeCondition(true, this.__creature.guid, condition.id));
  }

}

ConditionManager.prototype.__tickCondition = function(condition) {

  /*
   * Function Condition.__tickCondition
   * Callback that is fired every condition tick
   */

  let { onStart, onTick, onExpire } = process.gameServer.database.getCondition(condition.id);

  // Call the tick callback on every tick
  onTick.call(condition, this.__creature);

  // May have been expired during the tick (e.g., the creature has died)
  if(!this.__conditions.has(condition.id)) {
    return;
  }

  // There are no remaining ticks: the condition has expired
  if(condition.numberTicks === 0) {
    return this.__expireCondition(condition);
  }

  // Decrement the number of ticks
  condition.numberTicks--;

  // Save a ref. to the event and schedule the next tick
  condition.__applyEvent = process.gameServer.world.eventQueue.addEvent(this.__tickCondition.bind(this, condition), condition.tickDuration);

}

ConditionManager.prototype.__remove = function(condition) {

  this.__expireCondition(condition);

  // Cancel scheduled tick
  condition.cancel();

}

ConditionManager.prototype.__expireCondition = function(condition) {

  /*
   * Function Condition.__expireCondition
   * Called when the condition has expired
   */

  let { onStart, onTick, onExpire } = process.gameServer.database.getCondition(condition.id);

  onExpire.call(condition, this.__creature);
 
  // Delete from the map
  this.__conditions.delete(condition.id);

  // Players need to be informed
  if(this.__creature.isPlayer()) {
    this.__creature.broadcast(new PacketWriter(PacketWriter.prototype.opcodes.TOGGLE_CONDITION).writeCondition(false, this.__creature.guid, condition.id));
  }

}

module.exports = ConditionManager;