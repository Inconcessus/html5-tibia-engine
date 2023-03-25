const Condition = requireModule("condition");

module.exports = function morph(properties) {

  process.gameServer.world.sendMagicEffect(this.position, CONST.EFFECT.MAGIC.MAGIC_GREEN);
  this.addCondition(Condition.prototype.HASTE, 1, 100);

  return 100;

}