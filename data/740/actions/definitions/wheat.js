module.exports = function useMachete(player, item, tile) {

  /*
   * Function useMachete
   * Script called when a machete is used
   */

  // Only allowed when not moving
  if(player.isMoving()) {
    return true;
  }

  if(!player.isBesidesThing(tile)) {
    return;
  }
 
  let thing = tile.getTopItem();

  if(thing === null) {
    return;
  }

  if(![1381, 1382, 1383, 1384].includes(thing.id)) {
    return;
  }

  item.removeCount(1);
  tile.addTopThing(process.gameServer.database.createThing(2692).setCount(1));

  return true;

}