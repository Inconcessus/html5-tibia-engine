module.exports = function useLadder(player, tile, index, item) {

  // Only allowed when not moving
  if(player.isMoving()) {
    return true;
  }

  let attempts = new Array(tile.position.ladder(), tile.position.ladderNorth());

  for(let attempt of attempts) {

    let attemptTile = process.gameServer.world.getTileFromWorldPosition(attempt);
    
    if(!player.isTileOccupied(attemptTile)) {
      process.gameServer.world.teleportCreature(player, attempt);
      player.__moveLock.lock(10);
      return true;
    }

  }

  return true;

}
