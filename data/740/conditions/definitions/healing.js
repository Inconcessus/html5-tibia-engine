"use strict";

function onStart(creature) {

  /*
   * Function onStart
   * Callback fired on condition start
   */

  creature.sendCancelMessage("You are healing!");

}

function onExpire(creature) {

  /*
   * Function onExpire
   * Callback fired on condition expire
   */

  creature.sendCancelMessage("You are done healing.");

}

function onTick(creature) {

  /*
   * Function onTick
   * Callback fired every condition tick
   */

  if(creature.isFullHealth()) {
    return;
  }

  let healing = 10;

  // Apply poison damage to the player
  creature.increaseHealth(healing);
  process.gameServer.world.sendMagicEffect(creature.position, CONST.EFFECT.MAGIC.MAGIC_BLUE);

}

module.exports.onStart = onStart;
module.exports.onExpire = onExpire;
module.exports.onTick = onTick;