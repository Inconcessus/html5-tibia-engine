const Condition = requireModule("condition");

module.exports = function useTrunk(player, tile, index, item) {

  // Only allowed when not moving
  if(player.isMoving()) {
    return true;
  }

  player.addCondition(Condition.prototype.MAGIC_FLAME, 1, 250, null);

  return true;

}