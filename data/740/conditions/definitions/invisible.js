"use strict";

function onStart(creature) {

  /*
   * Function onStart
   * Callback fired on condition start
   */

  creature.sendCancelMessage("You have turned invisible.");

}

function onExpire(creature) {

  /*
   * Function onExpire
   * Callback fired on condition expire
   */

  creature.sendCancelMessage("You are visible again.");

}

function onTick(creature) {

}

module.exports.onStart = onStart;
module.exports.onExpire = onExpire;
module.exports.onTick = onTick;