"use strict";

function onStart(creature) {

  /*
   * Function onStart
   * Callback fired on condition start
   */

  creature.sendCancelMessage("You are burning!");

}

function onExpire(creature) {

  /*
   * Function onExpire
   * Callback fired on condition expire
   */

  creature.sendCancelMessage("You feel better again.");

}

function onTick(creature) {

  /*
   * Function onTick
   * Callback fired every condition tick
   */

  process.gameServer.world.applyEnvironmentalDamage(creature, 10, CONST.COLOR.ORANGE);
  process.gameServer.world.sendMagicEffect(creature.position, CONST.EFFECT.MAGIC.HITBYFIRE);

}

module.exports.onStart = onStart;
module.exports.onExpire = onExpire;
module.exports.onTick = onTick;