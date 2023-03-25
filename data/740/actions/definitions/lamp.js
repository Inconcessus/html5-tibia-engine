module.exports = function useScythe(player, item, tile) {

  /*
   * Function useScythe
   * Script called when a scythe is used to cut wheat
   */

  // Only allowed when not moving
  if(player.isMoving()) {
    return true;
  }

  if(!player.isBesidesThing(tile)) {
    return;
  }
 
  let thing = tile.getTopItem();

  if(thing.constructor.name !== "FluidContainer") {
    return;
  }

  if(thing.isEmpty() || !thing.isOil()) {
    return;
  }

  item.replace(process.gameServer.database.createThing(2044));
  thing.__empty(); 

  return true;

}