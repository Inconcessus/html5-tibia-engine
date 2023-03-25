"use strict";

function onStart(creature) {

  /*
   * Function onStart
   * Callback fired on condition start
   */

  creature.sendCancelMessage("You were poisoned!");

}

function onExpire(creature) {

  /*
   * Function onExpire
   * Callback fired on condition expire
   */

  creature.sendCancelMessage("You feel healthy again.");

}

function onTick(creature) {

  /*
   * Function onTick
   * Callback fired every condition tick
   */

  let damage = Math.max(1, 3 * (this.getFraction()));

  // Apply poison damage to the player
  process.gameServer.world.applyEnvironmentalDamage(creature, damage, CONST.COLOR.LIGHTGREEN);
  process.gameServer.world.sendMagicEffect(creature.position, CONST.EFFECT.MAGIC.GREEN_RINGS);

}

module.exports.onStart = onStart;
module.exports.onExpire = onExpire;
module.exports.onTick = onTick;