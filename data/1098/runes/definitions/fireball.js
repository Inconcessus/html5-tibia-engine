const Position = requireModule("position");

module.exports = function greatFireball(source, target) {

  /*
   * function suddenDeath
   * Code that handles the sudden death rune
   */

  // Get circle position for the GFB
  let circle = Position.prototype.getRadius(2);

  process.gameServer.world.sendDistanceEffect(source.position, target.position, CONST.EFFECT.PROJECTILE.FIRE);

  circle.forEach(function(position) {

    let relPosition = target.position.add(position);
    let tile = process.gameServer.world.getTileFromWorldPosition(relPosition);

    if(tile === null) {
      return;
    }

    // Tile is blocked
    if(tile.isBlockSolid()) {
      return;
    }

    // Apply to the tile
    process.gameServer.world.sendMagicEffect(relPosition, CONST.EFFECT.MAGIC.FIREAREA);

    tile.monsters.forEach(function(monster) {
      process.gameServer.world.__damageEntity(source, monster, 1000, CONST.COLOR.RED);
    });

  });

  return true;

}