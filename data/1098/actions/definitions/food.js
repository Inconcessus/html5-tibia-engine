module.exports = function playerEatFood(player, thing, index, item) {

  /*
   * Function playerEatFood
   * Writes a little text message and removes one of the item
   */

  player.internalCreatureSay("Yum!", CONST.COLOR.ORANGE);

  // Refactor
  thing.removeIndex(index, 1);

}