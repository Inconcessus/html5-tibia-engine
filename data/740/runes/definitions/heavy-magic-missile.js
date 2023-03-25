module.exports = function heavyMagicMissile(source, target) {

  /*
   * function heavyMagicMissile
   * Code that handles the sudden death rune
   */

  // If no monsters on the tile
  if(target.monsters.size === 0) {
    return false;
  }

  // Send magic effects
  process.gameServer.world.sendDistanceEffect(source.position, target.position, CONST.EFFECT.PROJECTILE.ENERGY);
  process.gameServer.world.sendMagicEffect(target.position, CONST.EFFECT.MAGIC.ENERGYHIT);

  // Apply the damage to all creatures 
  target.monsters.forEach(function(monster) {
      process.gameServer.world.__damageEntity(source, monster, 1);
  });

  return true;

}