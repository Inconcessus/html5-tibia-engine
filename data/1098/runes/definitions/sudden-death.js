module.exports = function suddenDeath(source, target) {

  /*
   * function suddenDeath
   * Code that handles the sudden death rune
   */

  // If no monsters on the tile
  if(target.monsters.size === 0) {
    return false;
  }

  process.gameServer.world.sendDistanceEffect(source.position, target.position, CONST.EFFECT.PROJECTILE.DEATH);
  process.gameServer.world.sendMagicEffect(target.position, CONST.EFFECT.MAGIC.MORTAREA);

  // Do damage 
  target.monsters.forEach(function(monster) {
      process.gameServer.world.__damageEntity(source, monster, 10);
  });

  return true;

}