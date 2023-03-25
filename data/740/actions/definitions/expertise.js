module.exports = function expertiseDoor(player, tile, index, item) {

  /*
   * Function expertise
   * Picks blueberries from a blueberry bush
   */

  process.gameServer.world.teleportCreature(player, tile.position);

  player.on("move", function() {
    item.toggle(player);
  });

}
