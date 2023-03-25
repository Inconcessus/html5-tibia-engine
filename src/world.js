"use strict";

const Condition = require("./condition");
const ChannelManager = require("./channel-manager");
const EventQueue = require("./eventqueue");
const Monster = require("./monster");
const PacketHandler = require("./packet-handler");
const PacketWriter = require("./packet-writer");
const Pathfinder = require("./pathfinder");
const Position = require("./position");
const Lattice = require("./lattice");
const WorldClock = require("./worldclock");

const World = function(size) {

  /*
   * Class World
   * Container for the entire game world
   *
   * API:
   *
   * World.withinBounds(position) - Returns true is the world position is within the world
   * World.sendMagicEffect(to, type) - Sends a magic effect to a position of type
   * World.sendDistanceEffect(from, to, type) - Sends a distance magic effect from a position to another position of type
   * World.broadcast - Sends a packet to the a certain world position
   * World.getActiveChunks - Returns a set of all the currently active sectors that need to be updated
   * World.dieCreature(creature) - Function call to allow a creature to die and create a corpse with loot
   * World.removeCreature(creature) - Function call to force remove a creature from the gameworld
   * World.addSplash(id, position, fluidtype) - Creates and adds a splash with a particular identifier to a position
   * World.getGameSocketByName(name) - Returns the gamesocket by player name
   *
   */

  // Save the world size
  this.width = size.x;
  this.height = size.y;
  this.depth = size.z;

  this.channelManager = new ChannelManager();

  // Create an A* pathfinder class inside the world
  this.pathfinder = new Pathfinder();

  // The handler for packets
  this.packetHandler = new PacketHandler(this);

  // The world lattice that references
  this.lattice = new Lattice(size);

  // Add a binary priority queue for all the game events
  this.eventQueue = new EventQueue();

  // Create the world clock
  this.clock = new WorldClock();

  // Explicitly active sectors for action NPCs
  this.explicitActive = new Set();

  // References to the gamesockets by the character names
  this.__gameSocketReferences = new Map();

  // Map for id -> creature
  this.__creatureMap = new Map();

  // Counter for unique identifiers that are not persistent through server restarts.
  // This includes creatures and containers. The first 0xFF identifiers are reserved.
  this.__UIDCounter = 0xFF;

}

World.prototype.addTopThing = function(position, thing) {

  /*
   * Function World.addTopThing
   * Adds an item to the top of the item stack
   */

  let tile = this.getTileFromWorldPosition(position);

  if(tile === null) {
    return;
  }

  tile.addTopThing(thing);

}

World.prototype.addThing = function(position, item, index) {

  /*
   * Function World.addThing
   * Adds an item to a specific position at a stack index
   */

  // Get the tile
  let tile = this.getTileFromWorldPosition(position);

  if(tile === null) {
    return;
  }

  tile.addThing(item, index);

}

World.prototype.broadcastPosition = function(position, packet) {

  /*
   * Function World.broadcastPosition
   * Broadcasts a packet to all observers at the given position
   */

  let chunk = this.getChunkFromWorldPosition(position);

  if(chunk === null) {
    return;
  }

  chunk.broadcast(packet);

}

World.prototype.isPlayerOnline = function(name) {

  /*
   * Function World.isPlayerOnline
   * Returns true if a player with a particular name is online
   */

  return this.getGameSocketByName(name) !== null;

}

World.prototype.assignUID = function() {

  /*
   * Function World.assignUID
   * Assigns an incremented unique identifier to a creature or container (up to 2^32)
   */

  // Simply increment the counter to generate a new unique identifier
  return this.__UIDCounter++;

}

World.prototype.getGameSocketByName = function(name) {

  /*
   * Function World.getGameSocketByName
   * Returns a reference to the gamesocket by player name
   */

  name = name.capitalize();

  // Does not exist
  if(!this.__gameSocketReferences.has(name)) {
    return null;
  }

  // Return the gamesocket
  return this.__gameSocketReferences.get(name);

}

World.prototype.getCreatureFromId = function(id) {

  /*
   * Function World.getCreatureFromId
   * Returns a creature (monster, player, NPC) from an identifier
   */

  // Check the creature map
  if(!this.__creatureMap.has(id)) {
    return null;
  }

  return this.__creatureMap.get(id);

}

World.prototype.handleCombat = function(source) {

  /*
   * Function World.handleCombat
   * Handles combat between a creature and its target
   */

  // Reference the target
  let target = source.getTarget();

  // Calculate the damage
  let damage = source.calculateDamage();
  let defense = target.calculateDefense();

  // Get the unmitigated damage
  let unmitigatedDamage = damage - defense;

  // If the attacker has a distance weapon equipped
  if(source.isDistanceWeaponEquipped()) {

    // No ammunition?
    if(!source.isAmmunitionEquipped()) {
      return;
    }

    this.handleDistanceCombat(source, target);

  }

  // If there is no damage send a block poff effect
  if(unmitigatedDamage < 0) {
    return this.sendMagicEffect(target.position, CONST.EFFECT.MAGIC.POFF);
  }

  // Precisely zero
  if(unmitigatedDamage === 0) {
    return this.sendMagicEffect(target.position, CONST.EFFECT.MAGIC.BLOCKHIT);
  }

  // Damage the entity
  this.__damageEntity(source, target, unmitigatedDamage, CONST.COLOR.RED);
  
}

World.prototype.handleDistanceCombat = function(source, target) {
  
  /*
   * Function World.handleDistanceCombat
   * Handles the distance combat
   */

  // Consume the ammunition
  let ammo = source.consumeAmmunition();

  // Write a distance effect
  this.sendDistanceEffect(source.position, target.position, ammo.getShootType());

}

World.prototype.addSplash = function(id, position, type) {

  /*
   * Function World.addSplash
   * Creates a splash item at the bottom
   */

  // Create the splash and make it the right count (color)
  let splash = process.gameServer.database.createThing(id);
  splash.setFluidType(type);
  splash.scheduleDecay();

  // Add at bottom of the stack
  this.addThing(position, splash, 0);

}

World.prototype.getChunkFromWorldPosition = function(position) {

  /*
   * Function World.getChunkFromWorldPosition
   * Returns the chunk that belongs to a world position
   */

  return this.lattice.getChunkFromWorldPosition(position);

}

World.prototype.forEachNearbyNPC = function(position, callback) {

  /*
   * Function World.forEachNearbyNPC
   * Returns the NPCs within activity range of a certain position
   */

  return this.getChunkFromWorldPosition(position).forEachNPC(callback);

}

World.prototype.dieCreature = function(monster) {

  /*
   * Function World.dieCreature
   * Call to kill a creature and remove it from the game world
   */

  // Emit the death event to all available listeners
  monster.emit("death");

  // Create the corpse
  this.__addCorpse(monster);

  // Remove the creature from the world
  this.removeCreature(monster);

  monster.conditions.cleanup();

  this.__scheduleRespawnCreature(monster.spawn);

}

World.prototype.sendDistanceEffect = function(from, to, type) {

  /*
   * Function World.sendMagicEffect
   * Sends a magic effect to the world at a position
   */

  // Invalid
  if(!this.withinBounds(from) || !this.withinBounds(to)) {
    return;
  }

  // Cannot send from one floor to another
  if(!from.isSameFloor(to)) {
    return;
  }

  // Inform spectators
  this.broadcastPosition(to, new PacketWriter(PacketWriter.prototype.opcodes.SEND_DISTANCE_MAGIC_EFFECT).writeDistanceEffect(from, to, type));

}

World.prototype.sendMagicEffect = function(position, type) {

  /*
   * Function World.sendMagicEffect
   * Sends a magic effect to the world at a position
   */

  // Invalid
  if(!this.withinBounds(position)) {
    return;
  }

  // Inform spectators
  this.broadcastPosition(position, new PacketWriter(PacketWriter.prototype.opcodes.SEND_MAGIC_EFFECT).writeMagicEffect(position, type));

}

World.prototype.findPath = function(creature, fromPosition, toPosition, mode) {

  /*
   * Function World.findPath
   * Finds path between from and to using A* pathfinding algorithm
   */

  // Can only do pathfinding on the same level
  if(!fromPosition.isSameFloor(toPosition)) {
    return new Array();
  }

  let from = this.getTileFromWorldPosition(fromPosition);
  let to = this.getTileFromWorldPosition(toPosition);

  // No path between non-existing tiles
  if(from === null || to === null) {
    return new Array();
  }

  // Delegate to the pathfinder
  return this.pathfinder.search(creature, from, to, mode);

}

World.prototype.getTileFromWorldPosition = function(position) {

  /*
   * Function World.getTileFromWorldPosition
   * Returns a tile from the given world position (x, y, z) and may return null
   */

  // Not within bounds
  if(!this.withinBounds(position)) {
    return null;
  }

  return this.lattice.getTileFromWorldPosition(position);

}

World.prototype.spawnCreature = function(spawn) {

  /*
   * Function World.spawnCreature
   * Spawns a creature to the world from the configured spawn data
   */

  if(process.gameServer.database.getMonster(spawn.mid) === null) {
    return;
  }

  // Get the monster data (mid = monster identifier)
  let monster = new Monster(spawn);

  // Find an available tile for the player
  let tile = this.findAvailableTile(monster, Position.prototype.fromLiteral(spawn.position));

  if(tile === null) {
    return this.__scheduleRespawnCreature(spawn);
  }

  // Set explicitly
  monster.position = tile.position;

  // Add the creature to the world at the spawn position
  this.addCreature(monster, tile.position);
  this.sendMagicEffect(tile.position, CONST.EFFECT.MAGIC.TELEPORT);

}

World.prototype.handleChunkChange = function(creature, oldChunk, newChunk) {

  /*
   * Function World.handleChunkChange
   * Handles change from one chunk to another
   */

  // No change in chunk was detected
  if(oldChunk === newChunk) {
    return;
  }

  // Enter and leave the complements of the old/new chunks
  creature.enterNewChunk(oldChunk.findChunkComplement(newChunk));
  creature.leaveOldChunk(newChunk.findChunkComplement(oldChunk));

}

World.prototype.addCreaturePosition = function(creature, position) {

  /*
   * Function World.addCreaturePosition
   * Adds a non-existing creature at the respective position
   */

  // Set the position 
  creature.position = position;

  // Determine the chunk to spawn in
  let chunk = this.getChunkFromWorldPosition(position);
  creature.enterNewChunk(chunk.neighbours);
  chunk.addCreature(creature);

}

World.prototype.updateCreaturePosition = function(creature, position) {

  /*
   * Function World.updateCreaturePosition
   * Handles movement of an creature in the world
   */

  // Get the new chunk at the new position
  let oldChunk = this.lattice.getChunkFromWorldPosition(creature.position);
  let newChunk = this.lattice.getChunkFromWorldPosition(position);

  // If the new position falls within a new chunk: introduce yourself there
  this.handleChunkChange(creature, oldChunk, newChunk);

  // Unset the old tile and chunk
  let oldTile = this.getTileFromWorldPosition(creature.position);
  oldTile.removeCreature(creature);
  oldChunk.removeCreature(creature);

  // Actually update the position
  creature.position = position;

  // Set the new tile and chunk
  let newTile = this.getTileFromWorldPosition(position);
  newChunk.addCreature(creature);
  newTile.addCreature(creature);

  // Special handling for players entering a new tile
  if(!creature.is("Player")) {
    return;
  }

  // Write an alert to all NPCs in the new sector
  this.__alertNPCEnter(creature);

  // Always check containers after moving
  creature.containerManager.checkContainers();

  // Again may be null
  if(oldTile !== null && oldTile.zoneIdentifier !== newTile.zoneIdentifier) {
    creature.enterNewZone(newTile.zoneIdentifier);
  }

}

World.prototype.teleportCreature = function(creature, position) {

  /*
   * Function Creature.teleportCreature
   * Teleports a creature to a particular world position
   */

  let tile = this.getTileFromWorldPosition(position);
  let oldTile = this.getTileFromWorldPosition(creature.position);

  // Not possible
  if(tile === null) {
    return false;
  }

  // Find the destination through other portals etc..
  let destination = this.lattice.findDestination(tile);

  if(destination === null) {
    destination = creature;
  }

  // Try to set the position: it may fail however
  this.updateCreaturePosition(creature, destination.position);

  // Inform the spectators
  destination.broadcast(new PacketWriter(PacketWriter.prototype.opcodes.CREATURE_TELEPORT).writeCreatureTeleport(creature.guid, destination.getPosition()));

  creature.emit("move", tile);
  oldTile.emit("exit", oldTile, creature);
  tile.emit("enter", tile, creature);

  // Success
  return true;

}

World.prototype.moveCreature = function(creature, position) {

  /*
   * Function World.moveCreature
   * Moves a creature from one position to a new position
   */

  // Get the tile the creature wants to move to
  let tile = this.getTileFromWorldPosition(position);

  if(creature.isDrunk() && Math.random() < 0.1) {
    creature.sayEmote("Hicks!", CONST.COLOR.ORANGE);
  }

  // Handle elevation moving up & down
  if(creature.isPlayer()) {

    if(tile === null) {

      let dtile = this.getTileFromWorldPosition(position.down());
      if(dtile.hasElevation() && !creature.position.isDiagonal(position)) {
        return this.teleportCreature(creature, position.down());
      }
      return false;
    }
    
    // Elevation up
    if(process.gameServer.world.getTileFromWorldPosition(creature.position).hasElevation() && tile.isOccupied() && !creature.position.isDiagonal(position)) {
      if(process.gameServer.world.getTileFromWorldPosition(creature.position.up().south().east()) === null) {
        return this.teleportCreature(creature, position.up());
      }
    }

  }

  if(tile === null || tile.id === 0) {
    return false;
  }

  // Stop if the tile is occupied for the creature
  if(creature.isTileOccupied(tile)) {
    return false;
  }

  // NPCs can open doors
  if((creature.is("NPC") || creature.is("Monster")) && creature.behaviour.openDoors) {
    creature.handleOpenDoor(tile.getTopItem());
  }

  // Let us update the facing direction of the creature
  let direction = creature.position.getFacingDirection(position);

  if(direction !== null) {
    creature.setDirection(direction);
  }

  // Get the destination tile: this may be different from the requested position
  if(tile.hasDestination()) {
    return this.teleportCreature(creature, position);
  }

  // Losing target
  if(creature.isPlayer() && creature.hasTarget()) {
    if(!creature.canSee(creature.__target.position)) {
      creature.setTarget(null);
      creature.sendCancelMessage("Target lost.");
    }
  }

  let oldTile = this.getTileFromWorldPosition(creature.position);

  // Set the creature position
  this.updateCreaturePosition(creature, position);

  // Movement callback events
  creature.emit("move", tile);

  // Step duration
  let stepDuration = creature.getStepDuration(tile.getFriction());

  // Write packet to all spectators
  let packet = new PacketWriter(PacketWriter.prototype.opcodes.ENTITY_MOVE).writeCreatureMove(creature.guid, position, stepDuration);

  creature.broadcast(packet);

  tile.emit("enter", tile, creature);
  oldTile.emit("exit", oldTile, creature);

  // Check for magic fields and apply damage
  tile.itemStack.applyFieldDamage(creature);
  return true;

}

World.prototype.removePlayer = function(player) {

  /*
   * Function World.removePlayer
   * Removes a player from the world and completes a cleanup
   */

  // Remove reference to the player
  this.__deferencePlayer(player.name);

  // Clean up the player references
  player.cleanup();

  // Remove from the game world
  this.removeCreature(player);

}

World.prototype.removeCreature = function(creature) {

  /*
   * Function World.removeCreature
   * Removes a creature from the world
   */

  // Does not exist
  if(!this.__creatureMap.has(creature.guid)) {
    return;
  }

  // Delete the creature from the map
  this.__creatureMap.delete(creature.guid);

  // Write a packet to remove the creature from the sector
  creature.broadcast(new PacketWriter(PacketWriter.prototype.opcodes.ENTITY_REMOVE).writeCreatureRemove(creature.guid));

  // Remove tile and chunk
  creature.__chunk.removeCreature(creature);
  let tile = this.getTileFromWorldPosition(creature.position);
  tile.removeCreature(creature);

  // Clean up
  creature.setTarget(null);
  tile.emit("exit", tile, creature);
}

World.prototype.addCreatureSpawn = function(creature, literal) {

  let position = Position.prototype.fromLiteral(literal);
  creature.position = creature.spawnPosition = position;
  this.addCreature(creature, position);

}

World.prototype.addCreature = function(creature, position) {

  /*
   * Function World.addCreature
   * Adds an creature to the world at a particular position
   */

  // The creature is already in the world: block
  if(this.__creatureMap.has(creature.guid)) {
    return;
  }

  // Add the creature to the lookup map
  this.__creatureMap.set(creature.guid, creature);

  // Sets the creature position on the world too
  this.addCreaturePosition(creature, position);

  let tile = this.getTileFromWorldPosition(position);
  // Set the new tile and chunk
  tile.addCreature(creature);
  tile.emit("enter", tile, creature);

}
World.prototype.findAvailableTile = function(creature, position) {

  /*
   * Function World.findAvailableTile
   * Finds an available tile for the creature starting from itself and its neighbours
   */

  // This is the requested tile
  let tile = this.getTileFromWorldPosition(position);

  if(tile === null) {
    return null;
  }

  // Go over its neighbours: this includes itself as the first element
  for(let neighbour of tile.neighbours) {

    // Cannot log into no-logout zones
    if(creature.isPlayer() && neighbour.isNoLogoutZone()) {
      continue;
    }

    if(creature.isTileOccupied(neighbour)) {
      continue;
    }

    return neighbour;

  }

  // No available tile to place the creature
  return null;

}

World.prototype.addPlayer = function(player) {

  /*
   * Function World.addPlayer
   * Adds a newly logged in player to the game world
   */

  if(this.__creatureMap.has(player.guid)) {
    return;
  }

  // Add the creature to the lookup map
  this.__creatureMap.set(player.guid, player);

  // Save a reference to the character name so we can look it up by name
  this.__referencePlayer(player);

  // Find an available tile for the player
  let tile = this.findAvailableTile(player, player.position);
  
  if(tile === null) {
    tile = this.getTileFromWorldPosition(player.characterStatistics.templePosition);
  }

  // Set the position to add the player. If no tile was found then set it to the temple position
  let position = (tile === null) ? player.characterStatistics.templePosition : tile.position;

  // Call to add the creature to the gameworld
  this.addCreaturePosition(player, position);

  // Write the assigned player identifier to the client and the login success
  player.write(new PacketWriter(PacketWriter.prototype.opcodes.LOGIN_SUCCESS).writeLoginSuccess(player));

  // Call to write the login packets
  this.writeLoginPackets(player);

  // Set the new tile and chunk
  this.getTileFromWorldPosition(position).addCreature(player);
  tile.emit("enter", tile, player);

}

World.prototype.writePlayerLogout = function(name) {

  /*
   * Function World.writePlayerLogout
   * Writes logout action of a player to all connected gamesockets
   */

  // Write the currently online characters to the player
  process.gameServer.server.websocketServer.broadcastPacket(new PacketWriter(PacketWriter.prototype.opcodes.PLAYER_LOGOUT).writeString(name));

}

World.prototype.writeLoginPackets = function(player) {

  /*
   * Function World.writeLoginPackets
   * Writes the login packets to the player
   */

  player.enterNewZone(this.getTileFromWorldPosition(player.position).zoneIdentifier);

  // The login effect
  player.broadcast(new PacketWriter(PacketWriter.prototype.opcodes.SEND_MAGIC_EFFECT).writeMagicEffect(player.position, CONST.EFFECT.MAGIC.TELEPORT));

  // Send the friend list to the player
  player.friendlist.writeFriendList();

  // The world time of the server so the client can sync up
  player.write(new PacketWriter(PacketWriter.prototype.opcodes.WORLD_TIME).writeWorldTime(this.clock.getTime()));

  // Spells
  player.write(new PacketWriter(PacketWriter.prototype.opcodes.WRITE_SPELLS).writeAvailableSpells(player.spellbook.getAvailableSpells()));
  player.spellbook.applyCooldowns();

  // Write the player statistics
  player.write(new PacketWriter(PacketWriter.prototype.opcodes.PLAYER_STATISTICS).writePlayerStatistics(player));

  // Write the last visited message
  if(player.lastVisit) {
    player.sendCancelMessage("Welcome back! Your last visit was at %s.".format(new Date(player.lastVisit).toISOString()));
  }

}

World.prototype.doCreatureActions = function(sockets) {

  /*
   * Function World.doCreatureActions
   * Applies all actions that creatures & players take
   */

  // All NPCs that are in a scene and need to update the world everywhere
  this.__handleExplicitNPCs();

  // Go over each sector activated by a player and make the creatures (monsters & NPCs) think
  this.lattice.getActiveChunks(sockets).forEach(function(sector) {

    sector.players.forEach(player => player.think());
    sector.monsters.forEach(monster => monster.think());

    this.__handleSectorNPCs(sector);

  }, this);

}

World.prototype.withinBounds = function(position) {

  /*
   * Function World.withinBounds
   * Returns whether a position is within the accepted world bounds
   */

  if(position === null) {
    return false;
  }

  return position.x >= 0 && (position.x < this.width) &&
         position.y >= 0 && (position.y < this.height) &&
         position.z >= 0 && (position.z < this.depth);
         
}

World.prototype.__handleExplicitNPCs = function() {

  /*
   * Function World.__handleExplicitNPCs
   * Handles monster events inside a particular sector
   */

  // All creatures that are explicitly active (e.g. NPCs involved in an action)
  this.explicitActive.forEach(function(npc) {

    // The NPC is locked in a scene
    if(npc.__locked) {
      return;
    }

    return npc.cutsceneManager.currentSceneAction();

  }, this);

}

World.prototype.__handleSectorNPCs = function(sector) {

  /*
   * Function World.__handleSectorNPCs
   * Handles monster events inside a particular sector
   */

  sector.npcs.forEach(function(npc) {

    // Do not handle explicitly active NPCs: they are previously handled!
    if(this.explicitActive.has(npc)) {
      return;
    }

    // Paused because already speaking with a player
    if(npc.isSpeaking()) {
      return;
    }

    npc.think();

  }, this);

}

World.prototype.__addCorpse = function(creature) {

  /*
   * Function World.__addCorpse
   * Adds a creature corpse to the world
   */

  // Generate the corpse
  let corpse = creature.createCorpse();

  // Add the corpse
  this.addTopThing(creature.position, corpse);

  // Also add a splash when the creature is killed
  if(corpse.constructor.name === "Corpse") {
    this.addSplash(2016, creature.position, corpse.getFluidType());
  }

}

World.prototype.__scheduleRespawnCreature = function(spawn) {

  /*
   * Function __scheduleRespawnCreature
   * Function called to schedule the respawn of a creature
   */

  // Schedule a respawn event after a number of ticks
  return process.gameServer.world.eventQueue.addEventSeconds(this.spawnCreature.bind(this, spawn), spawn.respawnTime);

}

World.prototype.__alertNPCEnter = function(creature) {

  /*
   * Function World.__alertNPCEnter
   * Emits an enter event to the NPC when a creature walks in range
   */

  // Go over all neighbouring sectors and NPCs
  creature.getAdjacentChunks().forEach(function(chunk) {

    chunk.npcs.forEach(function(npc) {

      if(npc.isScene()) {
        return;
      }

      // Skip alert on self
      if(creature === npc) {
        return;
      }

      if(npc.__seenCreatures.has(creature)) {
        return;
      }

      // Within range 6 emit an enter event
      if(npc.isWithinRangeOf(creature, 5)) {
        npc.__seenCreatures.add(creature);
        npc.emit("enter", creature);
      }

    });

  });

}

World.prototype.applyEnvironmentalDamage = function(target, amount, color) {

  /*
   * Function World.applyEnvironmentalDamage
   * Applies environmental damage from the gameworld (fire, energy, poison)
   */

  // Make sure to lock the player in combat
  if(target.isPlayer()) {
    target.combatLock.lockSeconds(target.COMBAT_LOCK_SECONDS);
  }

  target.decreaseHealth(null, amount, color);

  // Zero health
  if(target.isZeroHealth()) {

    // A before death event exists so we execute that instead of killing the creature
    if(target.hasEvent("beforeDeath")) {
      return target.emit("beforeDeath");
    }

    this.__setCreatureDead(null, target);
  }

}

World.prototype.__damageEntity = function(source, target, amount, color) {

  /*
   * Function World.__damageEntity
   * Internal function that damages the entity
   */

  // Clamp the amount between zero and the maximum health
  amount = amount.clamp(0, target.health);

  // Remove health from target
  target.decreaseHealth(source, amount, color);

  // If the creature is dead or alive: create a different splash
  if(!target.isZeroHealth()) {
    return this.addSplash(2019, target.position, target.getFluidType());
  }

  return this.__setCreatureDead(source, target);

}


World.prototype.__deferencePlayer = function(name) {

  /*
   * Function World.__deferencePlayer
   * Derefences a player from the game world
   */

  this.__gameSocketReferences.delete(name);

}

World.prototype.__referencePlayer = function(player) {

  /*
   * Function World.__referencePlayer
   * References a player in the game world
   */

  this.__gameSocketReferences.set(player.name, player.gameSocket);

}

World.prototype.__setCreatureDead = function(source, target) {

  /*
   * Function World.__setCreatureDead
   * Sets a creature to the dead state
   */

  // If a player is killed: set player to log out but restore health
  if(target.isPlayer()) {
    return target.handleDeath();
  }

  // Player killed a monster
  if(target.is("Monster")) {

    this.dieCreature(target);

    if(source !== null) {
      source.__handleCreatureKill(target);
    }

  }

}

module.exports = World;