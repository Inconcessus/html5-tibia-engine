"use strict";

function onStart(creature) {

  /*
   * Function onStart
   * Callback fired on condition start
   */

}

function onExpire(creature) {

  /*
   * Function onExpire
   * Callback fired on condition expire
   */

}

function onTick(creature) {

  /*
   * Function onTick
   * Callback fired every condition tick
   */

  if(creature.isFullHealth() || creature.isInCombat()) {
    return;
  }

  creature.increaseHealth(1);

}

module.exports.onStart = onStart;
module.exports.onExpire = onExpire;
module.exports.onTick = onTick;