"use strict";

const Position = require("./position");

const Behaviour = function(monster) {

  /*
   * Class Behaviour
   * Container for monster behaviour and choices: implements different types of monster behaviour
   *
   * API:
   *
   * Behaviour.hasTarget() - Returns true if the monster has a target
   * Behaviour.canSeeTarget() - Returns true if the monster can see its target
   * Behaviour.handleTarget() - Function called occasionally to (re)-target players or drop the target
   * Behaviour.setTarget(target) - Function to set the target of a monster
   * Behaviour.handleDamage(attacker) - Callback fired when a monster is damaged and may need to update its behaviour
   * Behaviour.is(behaviour) - Returns true if the monster currently subscribes to this behavioural state
   * Behaviour.getNextMoveTile() - Returns the next move for the monster based on its behaviour
   * Behaviour.setBehaviour() - Sets the behaviour of a monster from the configuration
   *
   * Behaviour.BEHAVIOUR - States of possible behaviour for a monster
   *
   */

  // Save a circular reference to the parent mosnter
  this.monster = monster;

  // This is the target of the creature
  this.target = null;
  this.state = this.BEHAVIOUR.NEUTRAL;

  // Whether we ignore characters
  this.ignoreCharacters = false;

  // Whether we can open doors
  this.openDoors = true;

}

// The behaviours that can be used by the monsters
Behaviour.prototype.BEHAVIOUR = new Object({
  "NEUTRAL": 0x00,
  "FRIENDLY": 0x01,
  "HOSTILE": 0x02,
  "FLEEING": 0x03,
  "RANGED": 0x04,
  "HOSTILE_ON_ATTACK": 0x05
});

Behaviour.prototype.hasTarget = function() {

  /*
   * Function Behaviour.hasTarget
   * Returns true if the monster has a target
   */

  return this.target !== null;

}

Behaviour.prototype.canSeeTarget = function() {

  /*
   * Function Behaviour.hasTarget
   * Returns true if the monster has a target
   */

  // Check whether the monster can see the target
  return this.monster.canSee(this.target.position);

}

Behaviour.prototype.handleTarget = function() {

  /*
   * Function Behaviour.handleTarget
   * Function called to find a new target
   */

  // If the monster has a target but can no longer see the target: reset the behaviour and target
  if(this.hasTarget()) {
 
    if(this.target.isInvisible()) {
      return this.setTarget(null);
    }

    // Target has gone into a protection zone
    if(this.target.isInProtectionZone()) {
      return this.setTarget(null);
    }

    if(this.target.isOffline()) {
      return this.setTarget(null);
    }

    if(!this.canSeeTarget()) {
      return this.setTarget(null);
    }

  }

  // If the creature does not have a target yet try to find one
  if(this.requiresTarget() && !this.hasTarget()) {
    this.__findTarget();
  }

}

Behaviour.prototype.setTarget = function(target) {

  /*
   * Function Behaviour.setTarget
   * Sets the target of the monster
   */

  this.target = target;

}

Behaviour.prototype.handleDamage = function(attacker) {

  /*
   * Function Behaviour.handleDamage
   * Handles changes to behaviour for an incoming event by an attacker
   */

  // If hostile on attack change to being hostile and set the target to the attacker
  if(this.is(this.BEHAVIOUR.HOSTILE_ON_ATTACK)) {
    this.state = this.BEHAVIOUR.HOSTILE;
    this.setTarget(attacker);
  }

  // Fleeing
  if(this.monster.health <= this.fleeHealth) {
    this.state = this.BEHAVIOUR.FLEEING;
    this.setTarget(attacker);
  }

}

Behaviour.prototype.is = function(behaviour) {

  /*
   * Function Behaviour.is
   * Returns true if the behaviour state is currently equal to the passed behaviour
   */

  return this.state === behaviour;

}

Behaviour.prototype.isBesidesTarget = function() {

  /*
   * Function Monster.isBesidesTarget
   * Handles moving behaviour
   */

  return this.monster.isBesidesThing(this.target);

}

Behaviour.prototype.requiresTarget = function() {

  /*
   * Function Behaviour.requiresTarget
   * Returns whether the particular behaviour state requires a target
   */

  return this.is(this.BEHAVIOUR.HOSTILE) ||
         this.is(this.BEHAVIOUR.FLEEING) ||
         this.is(this.BEHAVIOUR.FRIENDLY) ||
         this.is(this.BEHAVIOUR.RANGED) ||
         this.is(this.BEHAVIOUR.FRIENDLY_FLEE_ON_ATTACK);

}

Behaviour.prototype.getNextMoveTile = function() {

  /*
   * Function Behaviour.getNextMoveTile
   * Returns the next move action for the monster based on its behaviour
   */

  // If the monster does not have a target always aimlessly wander around
  if(!this.hasTarget()) {
    return this.monster.wander();
  }

  // Otherwise if fleeing: get the best fleeing direction from a list of priorities
  if(this.is(this.BEHAVIOUR.FLEEING)) {
    return this.__handleFleeMoveBehaviour();
  }

  // Handle ranged behaviour
  if(this.is(this.BEHAVIOUR.RANGED)) {
    return this.__handleRangedMoveBehaviour();
  }

  return this.__handleTargetMoveBehaviour();

}

Behaviour.prototype.setBehaviour = function(behaviour) {

  /*
   * Function Behaviour.setBehaviour
   * Sets the behaviour of the creature to an integer from a string for brevity
   */

  // Set behaviours from strings to integers corresponding to the lookup table
  if(!this.BEHAVIOUR.hasOwnProperty(behaviour.type)) {
    return this.state = this.BEHAVIOUR.NEUTRAL;
  }

  this.state = this.BEHAVIOUR[behaviour.type];
  this.fleeHealth = behaviour.fleeHealth ?? 0;
  this.openDoors = behaviour.openDoors ?? false;

}

Behaviour.prototype.__findTarget = function() {

  /*
   * Function Monster.__findTarget
   * Finds a player to target and be hostile or friendly with
   */

  let neighbours = this.monster.getAdjacentChunks();

  // Go over all the chunks to find the first target
  for(let i = 0; i < neighbours.length; i++) {

    for(let player of neighbours[i].players) {

      if(player.isInProtectionZone()) {
        continue;
      }

      if(player.isInvisible()) {
        continue;
      }

      // Can reach a player
      if(this.__canReach(player.position)) {
        return this.setTarget(player);
      }

    }

  }

}

Behaviour.prototype.__canReach = function(position) {

  /*
   * Function Monster.__canReach
   * Returns true if the creature can reach a particular target position
   */

  // Not visible so no
  if(!this.monster.canSee(position)) {
    return false;
  }

  // A* pathfinding between creature and target (stop at an adjacent tile)
  let path = process.gameServer.world.findPath(
    this.monster,
    this.monster.position,
    position,
    process.gameServer.world.pathfinder.ADJACENT
  );

  // If no path is found the creature should instead wander randomly
  return path.length !== 0;

}

Behaviour.prototype.__handleRangedMoveBehaviour = function() {

  /*
   * Function Behaviour.__handleRangedMoveBehaviour
   * Returns the next move action for the monster if its behaviour is ranged
   */

  // Distance to be kept from the target
  const KEEP_DISTANCE = 3;

  // Calculate distance
  let distance = this.monster.position.pythagoreanDistance(this.target.position);
  
  // Either move inward or outward
  if(distance < KEEP_DISTANCE) {
    return this.__handleFleeMoveBehaviour();
  } else if(distance > KEEP_DISTANCE) {
    return this.__handlePathToTarget();
  }

  if(this.__canReach(this.target.position)) {
    return null;
  }

  this.setTarget(null);

  return null;

}

Behaviour.prototype.__handlePathToTarget = function() {

  // Otherwise use A* to find path to get adjacent to the target
  let path = this.monster.getPathToTarget();

  // The target can be reached
  if(path !== null) {
    return path;
  }

  // If the target cannot be reached then drop it
  this.setTarget(null);

  return null;

}

Behaviour.prototype.__handleTargetMoveBehaviour = function() {

  /*
   * Function Monster.__handleTargetMoveBehaviour
   * Handles moving behaviour
   */

  // Always stop moving when already besides the target
  if(this.isBesidesTarget()) {
    return null;
  }

  return this.__handlePathToTarget();

}

Behaviour.prototype.__handleFleeMoveBehaviour = function() {

  /*
   * Function Monster.__handleFleeMoveBehaviour
   * Returns the optimal fleeing position using a simple heuristic
   */

  let heuristics = new Array();
  let tiles = new Array();

  for(let x = -1; x <= 1; x++) {
    for(let y = -1; y <= 1; y++) {

      let added = this.monster.position.add(new Position(x, y, 0));
      let tile = process.gameServer.world.getTileFromWorldPosition(added);

      // The tile cannot be used to walk on
      if(this.monster.isTileOccupied(tile)) {
        continue;
      }

      // Determine simple heuristic: farther distance (higher) away from "target" is better
      let heuristic = this.target.position.manhattanDistance(added);

      // Impose a penalty for diagonal movement
      if(this.monster.position.isDiagonal(added)) {
        heuristic /= 3;
      }

      // Save the heuristic and beloning tiles
      heuristics.push(heuristic);
      tiles.push(tile);

    }
  }

  // This means no tiles were found
  if(tiles.length === 0) {
    return null;
  }

  // Maximum heuristic
  let maximum = Math.max.apply(null, heuristics);

  // The best tile
  return tiles[heuristics.indexOf(maximum)];

}

module.exports = Behaviour;