const Condition = requireModule("condition");

module.exports = function enterCryptTile(tile, player) {

  if(player.hasCondition(Condition.prototype.INVISIBLE)) {
    process.gameServer.world.sendMagicEffect(tile.position, CONST.EFFECT.MAGIC.MAGIC_GREEN);
    return true;
  }

  player.sendCancelMessage("A magical barrier is holding you back.");
  process.gameServer.world.teleportCreature(player, tile.position.north());
  process.gameServer.world.sendMagicEffect(tile.position, CONST.EFFECT.MAGIC.ENERGYHIT);

  return false;

}