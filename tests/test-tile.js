const assert = require("assert");
const Chunk = requireModule("chunk");
const Tile = requireModule("tile");
const Position = requireModule("position");

function testTileAddStackable() {

  let chunk = new Chunk(0, new Position(0, 0, 0));
  let tile = new Tile(chunk, 102, new Position(0, 0, 0));

  for(let i = 0; i < 100; i++) {
    tile.addTopThing(process.gameServer.database.createThing(2148).setCount(3))
  }

  assert(tile.itemStack.__items.length === 3);

}

function testTileAddOverflow() {

  let chunk = new Chunk(0, new Position(0, 0, 0));
  let tile = new Tile(chunk, 102, new Position(0, 0, 0));

  for(let i = 0; i < 17; i++) {
    tile.addTopThing(process.gameServer.database.createThing(2153));
  }

  assert(tile.itemStack.__items.length === 16);

}

module.exports = [
  testTileAddStackable,
  testTileAddOverflow
]