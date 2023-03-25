const Position = requireModule("position");

module.exports = function greatFireball(source, target) {

  /*
   * function suddenDeath
   * Code that handles the sudden death rune
   */

  // Get circle position for the GFB
  process.gameServer.world.sendDistanceEffect(source.position, target.position, CONST.EFFECT.PROJECTILE.FIRE);
  target.addItem(process.gameServer.database.createThing(1487));

  return true;

}
