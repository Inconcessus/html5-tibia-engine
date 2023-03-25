const Position = requireModule("position");
//let ghost = process.gameServer.database.npcs["ghost"];

module.exports = function cemeteryGhost(time) {
  return;
  /*
   * Function cemeteryGhost
   * Example callback implement when time changes
   */

  if(time === "04:00") {
    process.gameServer.world.sendMagicEffect(new Position(70, 81, 8), CONST.EFFECT.MAGIC.TELEPORT);
    return process.gameServer.world.addCreatureSpawn(ghost, new Position(70, 81, 8));
  }

  if(time === "04:10") {
    process.gameServer.world.sendMagicEffect(ghost.position, CONST.EFFECT.MAGIC.TELEPORT);
    return process.gameServer.world.removeCreature(ghost);
  }

}