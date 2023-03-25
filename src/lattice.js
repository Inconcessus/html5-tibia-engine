"use strict";

const Chunk = require("./chunk");
const Position = require("./position");

const Lattice = function(size) {

  /*
   * Class Lattice
   * Container for the chunk lattice that blocks all chunks together
   *
   * API:
   *
   * Lattice.getChunkFromWorldPosition(position) - returns the chunk that belongs to a world position
   * Lattice.getTileFromWorldPosition(position) - returns the tile that belongs to a world position
   * Lattice.setReferences() - Creates the lattice by setting all references to each other
   * Lattice.createChunk(position) - Creates a chunk at the given position
   *
   */

  // Determine the number of chunks on the map
  this.nChunksWidth = size.x / Chunk.prototype.WIDTH;
  this.nChunksHeight = size.y / Chunk.prototype.HEIGHT;
  this.nChunksDepth = size.z / Chunk.prototype.DEPTH;

  // Create the chunks and tiles and save reference memory
  this.__reserveChunksMemory();

}


Lattice.prototype.getActiveChunks = function(gameSockets) {

  /*
   * Function Lattice.getActiveChunks
   * Returns the currently active chunks that have a player in them.
   * Monsters and NPCs in these chunks need to be updated!
   */

  // Create a set of the currently sectors activated by players
  let activeChunks = new Set();

  gameSockets.forEach(function(gameSocket) {

    // Add all neighbouring chunks for all players to the active set (no duplicates)
    gameSocket.player.getAdjacentChunks().forEach(function(chunk) {

      if(chunk === null) {
        return;
      }

      activeChunks.add(chunk);

    });

  }, this);

  return activeChunks;

}

Lattice.prototype.findDestination = function(tile) {

  /*
   * Function Lattice.findDestination
   * When teleporting: recursively go down the tile to find its eventual destination
   */

  // Maximum of eight hops
  let retries = 8;

  // Following floor changes & teleporters forever
  while(tile.hasDestination()) {

    // Prevent infinite loops from one to back
    if(--retries === 0) {
      return null;
    }

    // Get the floor change
    let position = this.__handleFloorChange(tile);

    // Nothing found
    if(position === null) {
      return null;
    }

    // Prevent infinite loops to self
    if(tile.position.equals(position)) {
      return null;
    }

    // Update the tile
    tile = this.getTileFromWorldPosition(position);

    // Dead end..
    if(tile === null) {
      return null;
    }

  }

  // Found the final tile
  return tile;

}

Lattice.prototype.getChunkFromWorldPosition = function(position) {

  /*
   * Function Lattice.getChunkFromWorldPosition
   * Returns the chunk beloning to a particular position
   */

  // Calculate the chunk position
  let chunkPosition = this.__getChunkPositionFromWorldPosition(position);

  // Must be valid
  if(!this.__isValidChunkPosition(chunkPosition)) {
    return null;
  }

  // Get the index
  let index = this.__getChunkIndex(chunkPosition);

  // Return the chunk
  return this.__chunks[index];

}

Lattice.prototype.getTileFromWorldPosition = function(position) {

  /*
   * Function Lattice.getTileFromWorldPosition
   * Returns tile based on a requested world position
   */

  // First get the chunk
  let chunk = this.getChunkFromWorldPosition(position);

  if(chunk === null) {
    return null;
  }

  // Delegate to find the tile within the chunk
  return chunk.getTileFromWorldPosition(position);

}

Lattice.prototype.createChunk = function(position) {

  /*
   * Function Lattice.createChunk
   * Creates a chunk that contains the given worldPosition (executed during database load)
   */

  let chunkPosition = this.__getChunkPositionFromWorldPosition(position);
  let index = this.__getChunkIndex(chunkPosition);

  this.__chunks[index] = new Chunk(index, chunkPosition);

  // Return the created chunk
  return this.__chunks[index];

}

Lattice.prototype.setReferences = function() {

  /*
   * Function Lattice.setReferences
   * Goes over all available chunks and references its neighbours, including tiles for pathfinding
   */

  this.__chunks.forEach(function(chunk) {

    // Chunk does not exist
    if(chunk === null) {
      return;
    }

    // First reference all chunks
    this.__referenceChunkNeighbours(chunk);

    // Go over all tiles that exist and reference its neighbours
    chunk.tiles.forEach(function(tile) {

      if(tile === null) {
        return;
      }

      this.__referenceTileNeighbours(tile);

    }, this);

  }, this);

}

Lattice.prototype.__getFloorChangePosition = function(position) {

  /*
   * Function Lattice.__getFloorChangePosition
   * When a tile is specified to move you down, let us see downstairs in what direction we need to move
   */

  // Get the tile below the current floor change
  let tile = this.getTileFromWorldPosition(position.down());

  // No tile was found there..
  if(tile === null) {
    return null;
  }

  // Map to the appropriate direction and up!
  switch(tile.getFloorChange()) {
    case "north": return position.south().down();
    case "west": return position.east().down();
    case "east":return position.west().down();
    case "south": return position.north().down();
    default: return position.down();
  }

}

Lattice.prototype.__handleFloorChange = function(tile) {

  /*
   * Function Lattice.__handleFloorChange
   * Handles a floor change event by stepping on a floor change tile
   */

  // Perhaps a teleporter?
  let destination = tile.itemStack.getTeleporterDestination();

  // Destination was found through teleporter
  if(destination !== null) {
    process.gameServer.world.sendMagicEffect(tile.position, CONST.EFFECT.MAGIC.TELEPORT);
    // Defer
    setImmediate(() => process.gameServer.world.sendMagicEffect(destination, CONST.EFFECT.MAGIC.TELEPORT));
    return destination;
  }

  let change = tile.getFloorChange();

  // Teleport to the appropriate tile
  switch(change) {
    case "north": return new Position(tile.position.x, tile.position.y - 1, tile.position.z + 1);
    case "west": return new Position(tile.position.x - 1, tile.position.y, tile.position.z + 1);
    case "east": return new Position(tile.position.x + 1, tile.position.y, tile.position.z + 1);
    case "south": return new Position(tile.position.x, tile.position.y + 1, tile.position.z + 1);
    case "down": return this.__getFloorChangePosition(tile.position);
  }

  return null;

}

Lattice.prototype.__referenceChunkNeighbours = function(chunk) {

  /*
   * Function Lattice.__referenceChunkNeighbours
   * References neighbouring chunks for quick lookup
   */

  // These are all the neighbours
  let chunks = new Array(
    chunk.position.west(),
    chunk.position.north(),
    chunk.position.east(),
    chunk.position.south(),
    chunk.position.northwest(),
    chunk.position.southwest(),
    chunk.position.northeast(),
    chunk.position.southeast()
  );

  // Add the neighbouring chunks
  chunks.map(this.__getChunkFromChunkPosition, this).nullfilter().forEach(x => chunk.neighbours.push(x));

}

Lattice.prototype.__referenceTileNeighbours = function(tile) {

  /*
   * Function Lattice.__referenceTileNeighbours
   * References tile neighbours to use for A* pathfinding
   */

  // All tiles to reference
  let tiles = new Array(
    tile.position.west(),
    tile.position.north(),
    tile.position.east(),
    tile.position.south(),
    tile.position.northwest(),
    tile.position.southwest(),
    tile.position.northeast(),
    tile.position.southeast()
  );

  // Add the neighbouring chunks
  tiles.map(this.getTileFromWorldPosition, this).nullfilter().forEach(x => tile.neighbours.push(x));

}

Lattice.prototype.__reserveChunksMemory = function() {

  /*
   * Function Lattice.__reserveChunksMemory
   * Generates the projected chunks for the gameworld 
   */

  // Calculate the total amount of required chunks and fill with none
  this.__chunks = new Array(this.nChunksWidth * this.nChunksHeight * this.nChunksDepth).fill(null);

}

Lattice.prototype.__isValidChunkPosition = function(position) {

  /*
   * Function Lattice.__isValidChunkPosition
   * Returns true if the chunk position is valid
   */

  return position.x >= 0 && position.x < this.nChunksWidth &&
         position.y >= 0 && position.y < this.nChunksHeight &&
         position.z >= 0 && position.z < this.nChunksDepth;

}

Lattice.prototype.__getChunkIndex = function(position) {

  /*
   * Function Lattice.__getChunkIndex
   * Returns the chunk index from a chunk position
   */

  return position.x + 
         (position.y * this.nChunksWidth) +
         (position.z * this.nChunksWidth * this.nChunksHeight);

}

Lattice.prototype.__getChunkFromChunkPosition = function(position) {

  /*
   * Function Lattice.__getChunkFromChunkPosition
   * Returns the chunk from a chunk (x, y) position
   */

  // Not a valid chunk position
  if(!this.__isValidChunkPosition(position)) {
    return null;
  }

  // Look up per index
  return this.__chunks[this.__getChunkIndex(position)];

}


Lattice.prototype.__getChunkPositionFromWorldPosition = function(position) {

  /*
   * Function Lattice.__getChunkPositionFromWorldPosition
   * Returns the chunk position based on the world position
   */

  // Project the z-component tile on the zeroth floor
  let x = position.x - (position.z % Chunk.prototype.DEPTH);
  let y = position.y - (position.z % Chunk.prototype.DEPTH);

  // Simple division to get the chunk x, y
  let sx = Math.floor(x / Chunk.prototype.WIDTH);
  let sy = Math.floor(y / Chunk.prototype.HEIGHT);
  let sz = Math.floor(position.z / Chunk.prototype.DEPTH);

  // Calculate the chunk index
  return new Position(sx, sy, sz);

}

module.exports = Lattice;