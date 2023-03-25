module.exports = function useMachete(player, item, tile) {

  /*
   * Function useMachete
   * Script called when a machete is used
   */

  // Only allowed when not moving
  if(player.isMoving()) {
    return true;
  }

  if(!player.besides(tile)) {
    return;
  }

  let grass = tile.getItem();

  if(grass === null) {
    return;
  }

  // If the tile being used has a rope hole: teleport up!
  if(grass.id === 2782) {
    grass.transform(2781);
    process.gameServer.eventQueue.addEvent(grass.transform.bind(grass, 2782), 100);
  }

  return true;

}