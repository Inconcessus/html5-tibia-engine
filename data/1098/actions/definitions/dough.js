module.exports = function useDough(player, item, tile) {

  /*
   * Function useDough
   * Script called when dough is used on an oven
   */

  // Only allowed when not moving
  if(player.isMoving()) {
    return true;
  }

  if(!player.besides(tile)) {
    return;
  }
 
  let thing = tile.getTopItem();

  if(thing === null) {
    return;
  }

  // Identifiers of the ovens
  if(![1786, 1788, 1790, 1792].includes(thing.id)) {
    return;
  }

  let bread = [2689, 2690, 2691].random();

  item.removeCount(1);
  tile.addTopThing(process.gameServer.database.createThing(bread).setCount(1));

  return true;

}