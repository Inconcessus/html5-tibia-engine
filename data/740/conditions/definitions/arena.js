"use strict";

const Condition = requireModule("condition");
const Position = requireModule("position");
const Monster = requireModule("monster");

let monster;

function handleOnBeforeDeath() {

  /*
   * Function handleOnBeforeDeath
   * Callback function to handle the on death event
   */

  // Remove the arena condition 
  this.removeCondition(Condition.prototype.ARENA);

}

function onStart(creature) {

  /*
   * Function onStart
   * Callback fired on condition start
   */

  // Teleport the player to the arena
  process.gameServer.world.teleportCreature(creature, new Position(74, 74, 5));

  monster = new Monster({"mid": "troll", "position": new Position(77, 77, 5)});
  process.gameServer.world.addCreature(monster, new Position(77, 77, 5));
  process.gameServer.world.sendMagicEffect(new Position(77, 77, 5), CONST.EFFECT.MAGIC.TELEPORT);
  monster.on("death", handleOnBeforeDeath);

  // Subscribe to the before death event and remove the arena condition
  creature.on("beforeDeath", handleOnBeforeDeath);

}

function onExpire(creature) {

  /*
   * Function onExpire
   * Callback fired on condition expire
   */

  // Remove listener to death event
  creature.off("beforeDeath", handleOnBeforeDeath);

  // Teleport the player out of the arena
  process.gameServer.world.teleportCreature(creature, new Position(77, 94, 8));

  // Remove the creature
  process.gameServer.world.removeCreature(monster);
  
  creature.sendCancelMessage("You have been rescued.");

  // Return the player to full health
  creature.setFullHealth();

}

function onTick(creature) {

  /*
   * Function onTick
   * Callback fired every condition tick
   */

  creature.sendCancelMessage("You have %s seconds left.".format(this.numberTicks));

}

module.exports.onStart = onStart;
module.exports.onExpire = onExpire;
module.exports.onTick = onTick;