"use strict";

const PacketWriter = require("./packet-writer");
const Tile = require("./tile");

const Chunk = function(id, chunkPosition) {

  /*
   * Class Chunk
   * Container for a single chunk: an 8x8x8 area that references
   * neighbouring chunk cells. When an update happens in one chunk,
   * only adjacent chunks need to be pushed an update.
   *
   * API:
   *
   * Chunk.broadcast - broadcasts a packet to all entities that can view the chunk (including neighbours)
   * Chunk.getTileFromWorldPosition - Returns the tile within the chunk based on a world position
   * Chunk.getTileIndex - Returns index of a tile with a world position in the chunk
   * Chunk.serialize - Serializes the tiles of the chunk to a packet
   *
   */

  // Save the chunk identifier and its position in the world
  this.id = id;
  this.position = chunkPosition;

  // Container for the creatures in the chunk
  this.monsters = new Set();
  this.players = new Set();
  this.npcs = new Set();

  // Reference to neighbouring chunks including self
  this.neighbours = new Array(this);

  // Reference to slice of tiles and reserve some memory
  this.tiles = new Array(this.WIDTH * this.HEIGHT * this.DEPTH).fill(null);

}

Chunk.prototype.WIDTH = CONFIG.WORLD.CHUNK.WIDTH;
Chunk.prototype.HEIGHT = CONFIG.WORLD.CHUNK.HEIGHT;
Chunk.prototype.DEPTH = CONFIG.WORLD.CHUNK.DEPTH;

Chunk.prototype.findChunkComplement = function(chunk) {

  /*
   * Function Chunk.findChunkComplement
   * Returns the chunks that are in the passed chunk but not in this chunk
   */

  // Own neighbours
  let complement = new Set(chunk.neighbours);

  // Delete everything that also exists in the new chunk
  this.neighbours.forEach(x => complement.delete(x));

  // We are left with what is different
  return complement;

}

Chunk.prototype.createTile = function(position, id) {

  /*
   * Function Chunk.createTile
   * Creates a tile within the chunk and returns it
   */

  // Reference the tile and also the chunk from the tile in a circular way
  return this.tiles[this.getTileIndex(position)] = new Tile(this, id, position);

}

Chunk.prototype.getTileIndex = function(worldPosition) {

  /*
   * Function Chunk.getTileIndex
   * Returns the index of a tile in the chunk
   */

  // Project the z-component. The coordinates are truncated to the chunk size
  let z = (worldPosition.z % this.DEPTH);
  let x = (worldPosition.x - z) % this.WIDTH;
  let y = (worldPosition.y - z) % this.HEIGHT;

  // Return the tile from the chunk
  return x + (y * this.WIDTH) + (z * this.WIDTH * this.HEIGHT);

}

Chunk.prototype.getTileFromWorldPosition = function(position) {

  /*
   * Function Chunk.getTileFromWorldPosition
   * Returns a tile from the chunk relative to the chunk
   */

  let index = this.getTileIndex(position);

  // Return the tile from the chunk
  return this.tiles[index];

}

Chunk.prototype.removeCreature = function(creature) {

  /*
   * Function Chunk.removeCreature
   * Removes an creature (player, monster) from a chunk
   */

  // Set chunk to null
  creature.setChunk(null);

  // Remove the creature from the chunk
  this.__removeCreature(creature);

}

Chunk.prototype.forEachNPC = function(callback) {

  /*
   * Function Chunk.forEachNPC
   * Returns all NPCs that are active in a chunk & neighbours
   */

  // Collect all NPCs from the (neighbouring) chunk(s)
  this.neighbours.forEach(neighbour => neighbour.npcs.forEach(callback));

}

Chunk.prototype.addCreature = function(creature) {
  
  /*
   * Function Chunk.addCreature
   * Adds a creature to the respective chunk
   */

  // Reference the active chunk
  creature.setChunk(this);

  this.__addCreature(creature);

}

Chunk.prototype.handleRequest = function(player) {

  /*
   * Function Chunk.handleRequest
   * Introduces the creature to its new chunk
   */

  // Serialize the chunk tiles itself (fixed size)
  player.write(new PacketWriter(PacketWriter.prototype.opcodes.WRITE_CHUNK).writeChunk(this));

  // Write all players inside the sector
  this.players.forEach(function(chunkPlayer) {

    // Do not send information on self
    if(player === chunkPlayer) {
      return;
    }

    // Otherwise write information on other players
    player.write(chunkPlayer.info());

  });

  // Write the other creatures (npcs & monsters)
  this.npcs.forEach(creature => player.write(creature.info()));
  this.monsters.forEach(creature => player.write(creature.info()));

  this.serializeTiles(player);

}

Chunk.prototype.serializeTiles = function(player) {

  /*
   * Function Chunk.serializeTiles
   * Serialize the items on the individual tiles tiles
   */

  // Write all the items on the chunk
  this.tiles.forEach(function(tile) {

    // Nothing
    if(tile === null) {
      return;
    }

    // Write all the items in the chunk
    tile.getItems().forEach(function(item, i) {
      player.write(new PacketWriter(PacketWriter.prototype.opcodes.ITEM_ADD).writeItemAdd(tile.position, item, i));
    });

  });

}

Chunk.prototype.broadcast = function(packet) {

  /*
   * Function Chunk.broadcast
   * Broadcasts a packet to all the chunk spectators (including neighbours)
   */

  // Chunks needs to broadcast to their neighbours
  this.neighbours.forEach(chunk => chunk.__internalBroadcast(packet));

}

Chunk.prototype.broadcastFloor = function(floor, packet) {

  /*
   * Function Chunk.broadcastFloor
   * Broadcasts a packet to all the chunk spectators (including neighbours) on the same floor
   */

  // Add chunk information to each connected game socket in each neighbouring chunk cell
  this.neighbours.forEach(chunk => chunk.__internalBroadcastFloor(floor, packet));

}

Chunk.prototype.__internalBroadcast = function(packet) {

  /*
   * Function Chunk.__internalBroadcast
   * Broadcasts a packet to the players within the chunk itself (not neighbours)
   */

  // Go over each players in the chunk
  this.players.forEach(player => player.write(packet));

}

Chunk.prototype.__internalBroadcastFloor = function(floor, packet) {

  /*
   * Function Chunk.__internalBroadcastFloor
   * Broadcasts a packet to the players within the chunk itself (not neighbours)
   */

  this.players.forEach(function(player) {

    // Check if the floor matches
    if(player.position.z === floor) {
      player.gameSocket.write(packet);
    }

  });

}

Chunk.prototype.__removeCreature = function(creature) {

  /*
   * Function Chunk.__removeCreature
   * Removes the creature reference from the chunk
   */

  switch(creature.constructor.name) {
    case "Player": return this.players.delete(creature);
    case "Monster": return this.monsters.delete(creature);
    case "NPC": return this.npcs.delete(creature);
  }

}

Chunk.prototype.__addCreature = function(creature) {

  /*
   * Function Chunk.__addCreature
   * Adds a creature to the correct entity set of the chunk
   */

  switch(creature.constructor.name) {
    case "Player": return this.players.add(creature);
    case "Monster": return this.monsters.add(creature);
    case "NPC": return this.npcs.add(creature);
  }

}

module.exports = Chunk;