module.exports = function Hearthstone(properties) {

  /*
   * Function Hearthstone
   * Teleports the player to his/her temple position
   */

  process.gameServer.world.sendMagicEffect(this.position, CONST.EFFECT.MAGIC.POFF);
  process.gameServer.world.teleportCreature(this, this.characterStatistics.templePosition);
  process.gameServer.world.sendMagicEffect(this.position, CONST.EFFECT.MAGIC.TELEPORT);

  return 100;

}