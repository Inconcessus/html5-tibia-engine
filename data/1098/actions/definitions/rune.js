module.exports = function useRuneWith(player, item, tile) {

  /*
   * Function useRuneWith
   * Callback fired when a rune is used on a tile
   */

  let from = player.position;
  let to = tile.position;

  // Check possible
  if(!from.inLineOfSight(to)) {
    return player.sendCancelMessage("Target is not in line of sight.");
  }

  // Look up the function to execute
  let rune = process.gameServer.database.getRune(item.id);

  // The rune does not exist
  if(rune === null) {
    return player.sendCancelMessage("The rune does nothing.");
  }

  // Call the configured rune function: return of true means succesful cast and we reduce a charge
  if(rune.call(null, player, tile)) {
    item.charges--;
  }

  // No more charges: delete the item
  if(item.charges === 0) {
    item.remove(1);
  }

}