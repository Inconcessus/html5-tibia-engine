module.exports = function explosion() {

  /*
   * Function beamEnergy
   * Creature energy beam function
   */

  process.gameServer.world.applyEnvironmentalDamage(this, 40, CONST.COLOR.ORANGE);
  process.gameServer.world.sendMagicEffect(this.position, CONST.EFFECT.MAGIC.HITBYFIRE);

  return 50;

}