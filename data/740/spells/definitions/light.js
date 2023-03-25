const Condition = requireModule("condition");

module.exports = function spellLight(properties) {

  process.gameServer.world.sendMagicEffect(this.position, CONST.EFFECT.MAGIC.MAGIC_BLUE);
  this.sayEmote("Parva Lux!", CONST.COLOR.SKYBLUE);

  if(!this.addCondition(Condition.prototype.LIGHT, 5000, 1)) {
    return 0;
  }

  return 50;

}