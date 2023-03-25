module.exports = function useShovel(player, item, tile) {

  /*
   * Function useShovel
   * Script called when a shovel is used on a stone pile
   */

  // Only allowed when not moving
  if(player.isMoving()) {
    return player.sendCancelMessage("You can not do this while moving.");
  }

  if(!player.besides(tile)) {
    return player.sendCancelMessage("You need to be closer.");
  }

  // If the tile being used is a pile of loose stones: open it
  if(tile.id === 468) {
    tile.replace(469);
  }

  return true;

}
