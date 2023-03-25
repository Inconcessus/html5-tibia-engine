module.exports = function levitate(properties) {

  let facePosition = this.getFacePosition();
  let faceTile = process.gameServer.world.getTileFromWorldPosition(facePosition);

  if(faceTile === null) {

    let downTile = process.gameServer.world.getTileFromWorldPosition(facePosition.down());
    
    if(downTile !== null && downTile.id !== 0 && !this.isTileOccupied(downTile)) {
      process.gameServer.world.sendMagicEffect(downTile.position, CONST.EFFECT.MAGIC.TELEPORT);
      process.gameServer.world.teleportCreature(this, downTile.position);
      return 100;
    }

  }

  let directUpTile = process.gameServer.world.getTileFromWorldPosition(this.position.up());

  if(directUpTile === null) {

    let upTile = process.gameServer.world.getTileFromWorldPosition(facePosition.up());
    
    if(upTile !== null && upTile.id !== 0 && !this.isTileOccupied(upTile)) {
      process.gameServer.world.sendMagicEffect(upTile.position, CONST.EFFECT.MAGIC.TELEPORT);
      process.gameServer.world.teleportCreature(this, upTile.position);
      return 100;
    }
  }

  return 0;

}