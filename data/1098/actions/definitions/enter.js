module.exports = function(tile, creature) {

  /*
   * Function toggleItem
   * Script called when a shovel is used on a stone pile
   */

  lookup = new Object({
    // Torch
    "426": "425",
    "425": "426"
  });

  if(!lookup.hasOwnProperty(tile.id)) {
    return;
  }

  if(tile.id === 425 && tile.getNumberCharacters() > 1) {
    return;
  }

  tile.replace(Number(lookup[tile.id]));
  process.gameServer.world.sendMagicEffect(tile.position, CONST.EFFECT.MAGIC.PURPLEENERGY);

  return true;

}