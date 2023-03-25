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

  if(thing === null) {
    return;
  }

  // These are the identifiers of wheat in the field
  if(thing.id === 2739 || thing.id === 2738) {
    thing.replace(process.gameServer.database.createThing(2737));
  }

  // Full grown? Add cut wheat
  if(thing.id === 2739) {
    tile.addTopThing(process.gameServer.database.createThing(2694).setCount(1));
  }

  return true;

}