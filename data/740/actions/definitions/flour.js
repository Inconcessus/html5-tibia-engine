module.exports = function useFlour(player, item, tile) {

  /*
   * Function useFlour
   * Script called when flour is used on a container with water
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

  if(!thing.isFluidContainer() || !thing.containsWater()) {
    return;
  }

  // Empty the container, remove the flour, and add dough
  thing.empty();
  item.removeCount(1);
  tile.addTopThing(process.gameServer.database.createThing(2693).setCount(1));

  return true;

}