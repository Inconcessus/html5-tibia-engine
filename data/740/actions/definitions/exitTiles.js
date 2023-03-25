let lookup = new Object({
  "447": 446,
  "417": 416,
  "425": 426
});

module.exports = function onExitTile(tile) {

  if(!lookup.hasOwnProperty(tile.id)) {
    return true;
  }

  tile.replace(lookup[tile.id]);

  return true;

}
