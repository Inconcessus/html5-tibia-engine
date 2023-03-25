"use strict";

const Container = require("./container");
const Corpse = require("./corpse");
const DataValidator = require("./validator");
const Door = require("./door");
const FluidContainer = require("./fluidcontainer");
const House = require("./house");
const Item = require("./item");
const Key = require("./key");
const NPC = require("./npc");
const Readable = require("./readable");
const Rune = require("./rune");
const Teleporter = require("./teleporter");
const Thing = require("./thing");
const ThingPrototype = require("./thing-prototype");
const RMEParser = require("./rme-parser");

// Standard lib
const fs = require("fs");

const Database = function() {

  /*
   * Class Database
   * Container for the database that maintains all the server data
   *
   * API:
   * 
   * getSpell(id) - returns a spell with a particular identifier
   * getRune(id) - returns a rune with a particular identifier
   * getMoster(id) - returns a monster with a particular identifier
   * getZone(id) - returns a zone with a particular identifier
   *
   */

  // Map parser for OTBM files
  this.worldParser = new RMEParser(this);

  // Validate for server data using JSON schemas
  this.validator = new DataValidator();

}

Database.prototype.loadHouseItems = function() {

  /*
   * Function Database.loadHouses
   * Loads the items that are within the houses
   */

  // Go over all the house definitions
  this.houses.forEach(function(house) {

    // Read the house definition from disk
    let json = JSON.parse(fs.readFileSync(getDataFile("houses", "definitions", "%s.json".format(house.id))));

    json.forEach(function(entry) {

      // Get the tile and create the item
	  let tile = process.gameServer.world.getTileFromWorldPosition(entry.position);
      let thing = process.gameServer.database.parseThing(entry.item);

      // Push the thing to the top of the tile
      tile.addTopThing(thing);

    });

  });

}

Database.prototype.saveHouses = function() {

  /*
   * Function Database.saveHouses
   * Serializes and saves the house items to disk
   */

  // Go over everything
  this.houses.forEach(function(house) {

    // Collect all things for serialization
    let things = new Array();

    house.tiles.forEach(function(tile) {

      tile.itemStack.__items.forEach(function(item) {

        // Save everything that can be moved or picked up
        if(!item.isPickupable() && !item.isMoveable()) {
          return;
        }

        // We have to save a position and the item itself
        things.push(new Object({
          "position": tile.position,
          "item": item
        }));

      });

    });

    // Write to disk
    fs.writeFileSync(getDataFile("houses", "definitions", "%s.json".format(house.id)), JSON.stringify(things));

  });

  let done = JSON.stringify(Object.fromEntries(this.houses), null, 2);
  fs.writeFileSync(getDataFile("houses", "definitions.json"), done);

}

Database.prototype.initialize = function() {

  /*
   * Function Database.initialize
   * Loads all the server data and things
   */

  // Load the configured unique actions per unique identifier
  this.__attachUniqueEvents("unique");

  // Load all other data files
  this.items = this.__loadItemDefinitions("items");

  this.spells = this.__loadDefinitions("spells");
  this.runes = this.__loadDefinitions("runes");
  this.zones = this.__loadDefinitions("world");
  this.doors = this.__loadDefinitions("doors");

  // Read house information from the database
  this.houses = this.__loadHouses("houses");

  this.conditions = this.__loadDefinitions("conditions");

  // Actions need the item definitions to be present: so load them now
  this.__attachPrototypeEvents("actions");

  // Load the gameworld itself
  process.gameServer.world = this.worldParser.load();

  // Load house items
  this.loadHouseItems();

  // Monsters now
  this.monsters = this.__loadDefinitions("monsters");

  // Validate monsters
  Object.entries(this.monsters).forEach(function([ key, value ]) {
    this.validator.validateMonster(key, value);
  }, this);

  // NPCs if they are enabled
  if(CONFIG.WORLD.NPCS.ENABLED) {
    this.npcs = this.__loadNPCDefinitions("npcs");
  }

  // Spawns if they are enabled
  if(CONFIG.WORLD.SPAWNS.ENABLED) {
    this.__loadSpawnDefinitions("spawns");
  }

  this.__attachClockEvents("clock");

}

Database.prototype.__loadHouses = function(definition) {

  let json = JSON.parse(fs.readFileSync(getDataFile(definition, "definitions.json")));
  let houses = new Map();

  Object.entries(json).forEach(function([ id, entry ]) {
    houses.set(Number(id), new House(Number(id), entry));
  });

  return houses;

}

Database.prototype.getHouse = function(hid) {

  if(!this.houses.has(hid)) {
    return null;
  }

  return this.houses.get(hid);

}

Database.prototype.getCondition = function(name) {

  if(!this.conditions.hasOwnProperty(name)) {
    return null;
  }

  return this.conditions[name];

}

Database.prototype.createThing = function(id) {

  /*
   * Function Database.createThing
   * Creates a new thing from a particular identifier
   */

  // The requested item identifier does not exist
  if(!this.items.hasOwnProperty(id)) {
    return null;
  }

  // Get the right constructor from the identifier
  let thing = this.__createClassFromId(id);

  // Set the weight of pickupable items
  if(thing.isPickupable()) {
    thing.setWeight(thing.getPrototype().properties.weight);
  }

  return thing;

}

Database.prototype.attachUniqueEvent = function(uid, thing) {
	
  /*
   * Function Database.attachUniqueEvent
   * Attaches a unique event to a particular thing with a unique identifier
   */

  // No unique events assigned to this identifier
  if(!this.__uniqueActions.hasOwnProperty(uid)) {
    return;
  }

  // Add all the configured listeners
  this.__uniqueActions[uid].forEach(definition => thing.on(definition.on, definition.callback));

}

Database.prototype.parseItems = function(container, things) {

  /*
   * Function Database.parseItems
   * Recursively parses items from JSON
   */

  things.forEach(function(thing, index) {

    if(thing !== null) {
      return container.addThing(process.gameServer.database.parseThing(thing), index);
    }
    
  }, this);

}

Database.prototype.getDoorEvent = function(aid) {

  // Create a bucket to collect the functions
  if(!this.doors.hasOwnProperty(aid)) {
    return null;
  }

  return this.doors[aid];

}

Database.prototype.parseThing = function(item) {

  /*
   * Function Database.parseThing
   * Parses a thing from a database JSON definition
   */

  // Create the thing based on the identifier
  let thing = this.createThing(item.id);

  // Copy over the count
  if(item.count) {
    thing.setCount(item.count);
  }

  // Recursively add items to the container
  if(thing.isContainer()) {

    if(item.items) {
      this.parseItems(thing, item.items);
    }

    if(item.content) {
      this.parseItems(thing, item.content);
    }

  }

  // Copy the item identifier
  if(item.actionId) {
    thing.setActionId(item.actionId);
  }

  if(item.duration) {
    thing.setDuration(item.duration);
    if(thing.isDecaying()) {
      thing.__scheduleDecay(item.duration);
    }
  }

  if(item.content) {
    thing.setContent(item.content);
  }

  return thing;

}

Database.prototype.getZone = function(id) {

  /*
   * Function Database.getZone
   * Returns the zone that belongs to a particular zone identifier
   */

  // Invalid identifier
  if(!this.zones.hasOwnProperty(id)) {
    return null;
  }

  return this.zones[id];

}

Database.prototype.getMonster = function(id) {

  /*
   * Function Database.getMonster
   * Returns the monsters that belongs to a particular identifier
   */

  // Does not exist
  if(!this.monsters.hasOwnProperty(id)) {
    return null;
  }

  return this.monsters[id];

}

Database.prototype.getRune = function(id) {

  /*
   * Function Database.getRune
   * Returns the function that belongs to a rune with a particular ID
   */

  if(!this.runes.hasOwnProperty(id)) {
    return null;
  }

  return this.runes[id];

}

Database.prototype.getSpell = function(sid) {

  /*
   * Function Database.getRune
   * Returns the function that belongs to a rune with a particular ID
   */

  if(!this.spells.hasOwnProperty(sid)) {
    return null;
  }

  return this.spells[sid];

}

Database.prototype.getThingPrototype = function(id) {

  /*
   * Function Database.getThingPrototype
   * Returns the prototype of a thing with an identifier
   */

  // The item does not exist
  if(!this.items.hasOwnProperty(id)) {
    return null;
  }

  return this.items[id];

}

Database.prototype.getClientId = function(id) {

  /*
   * Function Database.getClientId
   * Returns the client identifier from server identifier
   */

  let proto = this.getThingPrototype(id);

  if(proto === null) {
    return 0;
  }

  return proto.id;

}

Database.prototype.__loadSpawnDefinitions = function(definition) {

  /*
   * Function Database.__loadSpawnDefinitions
   * Loads all the configured spawns and associated monsters
   */

  this.__readDataDefinition(definition).forEach(spawn => process.gameServer.world.spawnCreature(spawn));

}

Database.prototype.__loadNPCDefinitions = function(definition) {

  /*
   * Function Database.__loadNPCDefinitions
   * Loads the NPC configuration from the data files
   */

  let reference = new Object();

  Object.entries(this.__readDataDefinition(definition)).forEach(function([ key, value ]) {
    reference[key] = this.__readNPCDefinition(value);
  }, this);

  console.log("Loaded [[ %s ]] %s definitions.".format(Object.keys(reference).length, definition));

  return reference;

}

Database.prototype.__readNPCDefinition = function(name) {

  /*
   * Function Database.getZone
   * Returns the zone that belongs to a particular zone identifier
   */

  let data = require(getDataFile("npcs", "definitions", name.definition));

  // Validate the data: are there errors?
  this.validator.validateNPC(name.definition, data);

  // Create the NPC
  let npc = new NPC(data);

  // If enabled add the NPC to the gameworld: otherwise just keep it in memory
  if(name.enabled) {
    process.gameServer.world.addCreatureSpawn(npc, name.position);
  }

  // Return a reference to the npc
  return npc;

}

Database.prototype.__loadDefinitions = function(definition) {

  /*
   * Function Database.__loadDefinitions
   * Loads particular data definitions from the folders
   */

  let reference = new Object();

  Object.entries(this.__readDataDefinition(definition)).forEach(function([ key, value ]) {
    reference[key] = require(getDataFile(definition, "definitions", value));
  });

  console.log("Loaded [[ %s ]] %s definitions.".format(Object.keys(reference).length, definition));

  return reference;

}

Database.prototype.__loadItemDefinitions = function(definition) {

  /*
   * Function Database.__loadItemDefinitions
   * Loads items from the combined item.xml and items.otbm. These were merged to a JSON file using a tool.
   */

  let reference = new Object();

  // Create a thing prototype
  Object.entries(this.__readDataDefinition(definition)).forEach(function([ key, value ]) {
    reference[key] = new ThingPrototype(value);
  });

  return reference;

}

Database.prototype.__createClassFromId = function(id) {

  /*
   * Function Database.__createClassFromId
   * Creates the appropriate class entity for a particular identifier
   */

  // Create a wrapper for easy lookup
  let proto = this.getThingPrototype(id);

  // Specific mapping of thing types to classes
  switch(proto.properties.type) {
    case "corpse": return new Corpse(id, Number(proto.properties.containerSize));
    case "container": return new Container(id, Number(proto.properties.containerSize));
    case "fluidContainer": return new FluidContainer(id);
    case "rune": return new Rune(id);
    case "key": return new Key(id);
    case "door": return new Door(id);
    case "readable": return new Readable(id);
    case "teleport": return new Teleporter(id);
    default: return new Item(id);
  }

}

Database.prototype.__attachPrototypeEvents = function(filepath) {

  /*
   * Function Database.__attachPrototypeEvents
   *
   * Loads the defined prototype actions from disk. These are callbacks fired per thing prototype
   * Each Thing (Corpse/Container/Item/Tile) "inherits" events from a ThingPrototype
   * This way we only need to attach a single listener to the prototype of each thing
   *
   */

  // These are the JSON definitions that configure the action and reference the script
  let definitions = this.__readDataDefinition(filepath);

  // Read the definition
  definitions.forEach(function(definition) {

    // The callback is a function to be executed when the event is emitted
    let callback = require(getDataFile(filepath, "definitions", definition.callback));
   
    // Single identifier
    if(definition.id) {
      definition.from = definition.to = definition.id;
    }

    // An array
    if(definition.ids) {
      definition.ids.forEach(function(id) {
        this.__addPrototypeEventListener(id, definition.on, callback);
      }, this);
    }

    // A range
    if(definition.from && definition.to) {

      for(let id = definition.from; id <= definition.to; id++) {
        this.__addPrototypeEventListener(id, definition.on, callback);
      }

    }

  }, this);

  console.log("Attached [[ %s ]] prototype event listeners.".format(definitions.length));

}

Database.prototype.__addPrototypeEventListener = function(id, which, callback) {

  /*
   * Function Database.__addPrototypeEventListener
   * Delegates an additional listener to the thing prototype: this is used to give e.g., all ropes an action
   */

  // Find the prototype and attach it
  let proto = this.getThingPrototype(id);
  
  // Attach
  proto.on(which, callback);

}

Database.prototype.__attachClockEvents = function(filepath) {

  /*
   * Function Database.__attachClockEvents
   * Attaches event that execute on every minute clock change
   */

  // Save all definitions
  this.__readDataDefinition(filepath).forEach(function(definition) {
 
      // Read the function to memory
      let callback = require(getDataFile(filepath, "definitions", definition.callback));

      // Attach to event listener
      process.gameServer.world.clock.on("time", callback);

  });

}

Database.prototype.__attachUniqueEvents = function(filepath) {

  /*
   * Function Database.__attachUniqueEvents
   * Loads the configured unique actions
   */

  // Container for lookup when items are spawned
  this.__uniqueActions = new Object();

  // Save all definitions
  this.__readDataDefinition(filepath).forEach(function(definition) {

    // Create a bucket to collect the functions
    if(!this.__uniqueActions.hasOwnProperty(definition.uid)) {
      this.__uniqueActions[definition.uid] = new Array();
    }

    // Can be multiple
    this.__uniqueActions[definition.uid].push({
      "on": definition.on,
      "callback": require(getDataFile(filepath, "definitions", definition.callback))
    });

  }, this);

  console.log("Attached [[ %s ]] unique action listeners.".format(Object.keys(this.__uniqueActions).length));

}

Database.prototype.__readDataDefinition = function(definition) {

  /*
   * Function Database.__readDataDefinition
   * Loads a JSON definition file from a particular folder
   */
 
  return JSON.parse(fs.readFileSync(getDataFile(definition, "definitions.json")));

}

module.exports = Database;