module.exports = function suddenDeath(source, target) {

  /*
   * function suddenDeath
   * Code that handles the sudden death rune
   */

  // If no monsters on the tile
  if(target.players.size === 0) {
    return false;
  }

  process.gameServer.world.sendMagicEffect(target.position, CONST.EFFECT.MAGIC.MAGIC_BLUE);

  // Do damage 
  target.players.forEach(function(player) {
    player.increaseHealth(10);
  });

  return true;

}