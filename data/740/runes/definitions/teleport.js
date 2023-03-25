module.exports = function teleport(source, target) {

  /*
   * Function teleport
   * Code that handles the teleport rune to another (reachable) position
   */

  // Attempt to find a path from creature to the destination: if possible: allow teleport
  let path = process.gameServer.world.findPath(
    source,
    source.position,
    target.position,
    process.gameServer.world.pathfinder.opcodes.EXACT
  );

  // Pathfinding is not possible
  if(path.length === 0) {
    process.gameServer.world.sendMagicEffect(source.position, CONST.EFFECT.MAGIC.POFF);
    source.sendCancelMessage("You cannot teleport there.");
    return false;
  }

  // Teleport and effects
  process.gameServer.world.sendMagicEffect(source.position, CONST.EFFECT.MAGIC.MAGIC_BLUE);
  process.gameServer.world.teleportCreature(source, target.position);
  process.gameServer.world.sendMagicEffect(source.position, CONST.EFFECT.MAGIC.TELEPORT);

  // Consume
  return true;

}