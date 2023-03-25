module.exports = function lifeDrain() {

  /*
   * Function lifeDrain
   * Creature energy beam function
   */

  let source = this;

  if(!this.hasTarget()) {
    return;
  }

  let amount = Number.prototype.random(5, 7);

  this.increaseHealth(amount);
  process.gameServer.world.sendMagicEffect(this.position, CONST.EFFECT.MAGIC.MAGIC_GREEN);


  this.getTarget().decreaseHealth(this, amount, CONST.COLOR.RED);
  process.gameServer.world.sendMagicEffect(this.getTarget().position, CONST.EFFECT.MAGIC.MAGIC_RED);

  return 50;

}