module.exports = function useSewerGrate(player, tile, index, item) {

  // Only allowed when not moving
  if(player.isMoving()) {
    return true;
  }

  // Teleport the player and 
  process.gameServer.world.teleportCreature(player, tile.position.down());
  player.__moveLock.lock(player.getSlowness());

  return true;

}
