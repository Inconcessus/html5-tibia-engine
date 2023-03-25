"use strict";

const Outfit = requireModule("outfit");

function onStart(creature, properties) {

  /*
   * Function onStart
   * Callback fired on condition start
   */

  // Save a reference to the default outfit
  this.__defaultOutfit = creature.outfit;

  process.gameServer.world.sendMagicEffect(creature.position, CONST.EFFECT.MAGIC.TELEPORT);
  creature.changeOutfit(new Outfit({"id": properties.id}));

}

function onExpire(creature) {

  /*
   * Function onExpire
   * Callback fired on condition expire
   */

  process.gameServer.world.sendMagicEffect(creature.position, CONST.EFFECT.MAGIC.TELEPORT);
  creature.changeOutfit(this.__defaultOutfit);

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