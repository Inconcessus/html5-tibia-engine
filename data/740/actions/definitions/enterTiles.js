let lookup = new Object({
  "446": 447,
  "416": 417,
  "426": 425
});

module.exports = function onEnterTile(tile) {

  if(!lookup.hasOwnProperty(tile.id)) {
    return true;
  }

  tile.replace(lookup[tile.id]);

  return true;

}
