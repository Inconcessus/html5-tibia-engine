"use strict";

function onStart(creature) {

  /*
   * Function onStart
   * Callback fired on condition start
   */

  creature.sendCancelMessage("You feel warm.");

}

function onExpire(creature) {

  /*
   * Function onExpire
   * Callback fired on condition expire
   */

  creature.sendCancelMessage("The warmth fades.");

}

function onTick(creature) {

  /*
   * Function onTick
   * Callback fired every condition tick
   */

  process.gameServer.world.sendMagicEffect(creature.position, CONST.EFFECT.MAGIC.HITBYFIRE);

}

module.exports.onStart = onStart;
module.exports.onExpire = onExpire;
module.exports.onTick = onTick;