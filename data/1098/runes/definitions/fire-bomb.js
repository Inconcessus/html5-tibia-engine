const Position = requireModule("position");

module.exports = function greatFireball(source, target) {

  /*
   * function suddenDeath
   * Code that handles the sudden death rune
   */

  let square = Position.prototype.getSquare(1);

  process.gameServer.world.sendDistanceEffect(source.position, target.position, CONST.EFFECT.PROJECTILE.FIRE);

  square.forEach(function(position) {

    let relPosition = target.position.add(position);
    let tile = process.gameServer.world.getTileFromWorldPosition(relPosition);

    if(tile === null) {
      return;
    }

    if(tile.isBlockSolid()) {
      return;
    }

    // Get circle position for the GFB
    tile.addItem(process.gameServer.database.createThing(1487));

  });

  return true;

}