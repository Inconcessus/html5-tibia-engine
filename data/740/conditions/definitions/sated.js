"use strict";

function onStart(creature) {

  /*
   * Function onStart
   * Callback fired on condition start
   */

  creature.sendCancelMessage("Yum!");

}

function onExpire(creature) {

  /*
   * Function onExpire
   * Callback fired on condition expire
   */

  creature.sendCancelMessage("You are feeling hungry!");

}

function onTick(creature) {

  /*
   * Function onTick
   * Callback fired every condition tick
   */

}

module.exports.onStart = onStart;
module.exports.onExpire = onExpire;
module.exports.onTick = onTick;