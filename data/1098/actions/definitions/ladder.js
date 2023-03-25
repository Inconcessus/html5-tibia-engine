const path = require("path");

module.exports = function useLadder(player, tile, index, item) {

  // Only allowed when not moving
  if(player.isMoving()) {
    return true;
  }

  // Teleport the player and 
  process.gameServer.world.teleportCreature(player, tile.position.ladder());
  player.__moveLock.lock(player.getSlowness());

  return true;

}
