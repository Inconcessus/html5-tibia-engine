module.exports = function useFishingRod(player, item, tile) {

  /*
   * Function useFishingRod
   * Function called when a fishing rod is used with
   */

  process.gameServer.world.sendMagicEffect(tile.position, CONST.EFFECT.MAGIC.LOSEENERGY);

  player.equipment.pushItem(process.gameServer.database.createThing(2667).setCount(1));

}