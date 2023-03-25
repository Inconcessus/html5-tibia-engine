"use strict";

const Position = require("./position");
const World = require("./world");
const otbm2json = require("../lib/otbm2json.js");

const RMEParser = function(database) {

  /*
   * Class RMEParser
   * Parses a RME item definition that is present on the map
   */

  // Circular reference
  this.database = database;

}

RMEParser.prototype.load = function() {

  /*
   * Function RMEParser.load
   * Loads the world from the Open Tibia Binary Mapping (OTBM) format
   */

  // Define the map size (always 2048x2048x16)
  let size = new Position(
    CONFIG.WORLD.CHUNK.WIDTH * Math.ceil(2048 / CONFIG.WORLD.CHUNK.WIDTH),
    CONFIG.WORLD.CHUNK.HEIGHT * Math.ceil(2048 / CONFIG.WORLD.CHUNK.HEIGHT),
    16
  );

  let start = performance.now();

  // Create the world of the particular size
  let world = process.gameServer.world = new World(size);

  // Add all the zones
  Object.entries(this.database.zones).forEach(function([ key, value ]) {
    this.__loadOTBMFile(world, value.file, key);
  }, this);

  // After all zones are loaded: reference neighbouring chunks and tiles in the world "lattice"
  world.lattice.setReferences();

  console.log("Completed loading world in %s miliseconds.".format(Math.round(performance.now() - start)));

  return world;

}

RMEParser.prototype.__parseRMEItem = function(item) {

  /*
   * Function RMEParser.__parseRMEItem
   * Parses a RME item definition that is present on the map
   */

  // Create a wrapper for easy lookup
  let thing = this.database.createThing(item.id);

  // The item has text
  if(item.text) {
    thing.setContent(item.text);
  }

  // The item has a count
  if(item.count) {
    thing.setCount(item.count);
  }

  // The item (e.g., teleporter) has a destination
  if(item.destination) {
    thing.setDestination(item.destination);
  }

  // The object has an action identifier
  if(item.aid) {
    thing.setActionId(item.aid);
  }

  if(item.uid) {
    thing.setUniqueId(item.uid);
  }

  if(item.content) {
    this.__parseItems(thing, item.content);
  }

  if(thing.isDecaying()) {
    thing.scheduleDecay();
  }


  return thing;

}

RMEParser.prototype.__parseItems = function(container, things) {

  /*
   * Function RMEParser.__parseItems
   * Parses item definitions from JSON
   */

  things.forEach(function(thing, index) {

    if(thing !== null) {
      return container.addThing(this.__parseRMEItem(thing), index);
    }
    
  }, this);

}

RMEParser.prototype.__RMEVersion = function(version) {

  /*
   * Function RMEParser.__RMEVersion
   * Maps the server version to the appropriate RME minor/major versions:
   * 	
   */

  // Implement other versions here mapping version string -> minor, major item version
  switch(version) {
    case "740":
    case "750":
      return [1, 1];
    case "755":
      return [1, 2];
    case "760":
    case "770":
      return [1, 3];
    case "780":
      return [1, 4];
    case "790":
      return [1, 5];
    case "792":
      return [1, 6];
    case "1098":
      return [3, 57];
    case "10100":
      return [3, 58];
  }

  return [0, 0];

}

RMEParser.prototype.__readOTBMFile = function(file) {

  /*
   * Function RMEParser.__readOTBMFile
   * Reads an .OTBM file from disk using a modified version of OTBM2JSON
   */

  return otbm2json.read(getDataFile("world", "definitions", "otbm", file), this.database.items);

}

RMEParser.prototype.__addHouseTile = function(hid, tile) {

  /*
   * Function RMEParser.__loadOTBMFile
   * Loads a single .otbm file from disk
   */

  // Get the house from the database
  let house = this.database.getHouse(hid);

  // Add the tile to this particular house
  if(house !== null) {
    return house.addTile(tile);
  }

}

RMEParser.prototype.__loadOTBMFile = function(world, file, zid) {

  /*
   * Function RMEParser.__loadOTBMFile
   * Loads a single .otbm file from disk
   */

  console.log("Loading map file [[ %s ]].".format(file));

  // Read the data using OTBM2JSON (have to pass the OTB for old versions too)
  let mapData = this.__readOTBMFile(file);

  // Determine the RME versions from the client versions
  let [ major, minor ] = this.__RMEVersion(CONFIG.SERVER.CLIENT_VERSION);
  
  // Make sure the map is OK with the version
  if(major !== mapData.data.itemsMajorVersion || minor !== mapData.data.itemsMinorVersion) {
    throw("Map version does not match the specified server version.");
  }

  // Go over the OTBM map data
  mapData.data.nodes.forEach(function(node) {

    node.features.forEach(function(feature) {

      // Only tile areas contain information on tiles
      if(feature.type !== otbm2json.HEADERS.OTBM_TILE_AREA) {
        return; 
      }

      // There are no tiles in this area
      if(!feature.tiles) {
        return; 
      }
 
      // Go over each tile
      feature.tiles.forEach(function(tile) {

        if(tile.type !== otbm2json.HEADERS.OTBM_TILE && tile.type !== otbm2json.HEADERS.OTBM_HOUSETILE) {
           return; 
        }

        // Add the tile position to the area position (swap the z-coordinate: this is better)
        let worldPosition = new Position(
          feature.x + tile.x,
          feature.y + tile.y,
          15 - feature.z
        );

        // If the sector does not exist yet: create it
        let chunk = world.lattice.getChunkFromWorldPosition(worldPosition);

        // Creates the chunk
        if(chunk === null) {
          chunk = world.lattice.createChunk(worldPosition);
        }

        // Somehow tiles with actions have become items..
        if(!tile.tileid && tile.items && (tile.items[0].aid || tile.items[0].uid)) {

          tile = new Object({
            "tileid": tile.items[0].id,
            "aid": tile.items[0].aid,
            "uid": tile.items[0].uid
          });

        }

        // Create the tile
        let worldTile = chunk.createTile(worldPosition, tile.tileid || 0);

        // Reference the zone identifier
        worldTile.zoneIdentifier = zid;

        // Set the action identifier
        if(tile.aid) {
          worldTile.setActionId(tile.aid);
        }

        // Set the action identifier
        if(tile.uid) {
          worldTile.setUniqueId(tile.uid);
        }

        // Set the tile zone flags
        if(tile.zones) {
          worldTile.setZoneFlags(tile.zones);
        }

        // Add the items to the tile
        if(tile.items) {

          tile.items.forEach(function(item) {
            worldTile.addTopThing(this.__parseRMEItem(item));
          }, this);

        }

        if(tile.type === otbm2json.HEADERS.OTBM_HOUSETILE) {
          this.__addHouseTile(tile.houseId, worldTile);
        }

      }, this);

    }, this);

  }, this);

}

module.exports = RMEParser;
