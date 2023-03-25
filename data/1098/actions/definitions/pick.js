module.exports = function useRope(player, item, tile) {

  /*
   * Function useRope
   * Script called when a rope is used
   */

  // Only allowed when not moving
  if(player.isMoving()) {
    return;
  }

  if(!player.besides(tile)) {
    return;
  }

  // Must be mud!
  if(tile.id < 351 || tile.id > 355) {
    return;
  }

  // Mud tiles with action ID 101 are pick holes
  if(tile.actionId === 101) {
    tile.replace(392);
  }

  return true;

}