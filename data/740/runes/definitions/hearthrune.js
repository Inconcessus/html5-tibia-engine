module.exports = function hearthrune(source, target) {

  /*
   * Function teleport
   * Code that handles the teleport rune to another (reachable) position
   */

  // Teleport and effects
  process.gameServer.world.teleportCreature(source, source.characterStatistics.templePosition);
  process.gameServer.world.sendMagicEffect(source.position, CONST.EFFECT.MAGIC.TELEPORT);

  // Never consume
  return false;

}