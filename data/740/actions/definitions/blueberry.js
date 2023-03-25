module.exports = function blueberryBush(player, tile, index, item) {

  /*
   * Function blueberryBush
   * Picks blueberries from a blueberry bush
   */

  let bush = process.gameServer.database.createThing(2786);
  bush.scheduleDecay();

  item.replace(bush);

  let amount = Number.prototype.randomExp(3, 10, 3);

  tile.addTopThing(process.gameServer.database.createThing(2677).setCount(amount));

}
