"use strict";

const Packet = require("./packet");
const Outfit = require("./outfit");

const PacketWriter = function(packet) {

  /*
   * Class PacketWriter
   * Wrapper for a packet buffer to write packets to the clients
   */

  // Inherits from packet
  Packet.call(this);

  // Allocate the appropriate size and write the packet identifier
  this.__allocateBuffer(packet);

}

PacketWriter.prototype = Object.create(Packet.prototype);
PacketWriter.constructor = PacketWriter;

// Read the packet opcodes
PacketWriter.prototype.opcodes = require("./opcodes").SERVER;

PacketWriter.prototype.writeSetTarget = function(guid) {

  /*
   * Function PacketWriter.writeSetTarget
   * Writes packet to set the target of the player
   */

  this.writeUInt32(guid);

  return this.buffer;

}

PacketWriter.prototype.writeCharacterInformation = function(creature) {

  /*
   * Function PacketWriter.writeCondition
   * Writes packet that contains a condition toggle (on/off)
   */

  this.__writeString(creature.name);

  if(creature.isPlayer()) {
    this.writeUInt16(creature.characterStatistics.level);
    this.writeUInt8(creature.characterStatistics.sex);
  } else {
    this.writeUInt16(0);
    this.writeUInt8(0);
  }

  return this.__slicePacket();

}

PacketWriter.prototype.writeCondition = function(toggle, guid, cid) {

  /*
   * Function PacketWriter.writeCondition
   * Writes packet that contains a condition toggle (on/off)
   */

  this.writeUInt32(guid);
  this.writeBoolean(toggle);
  this.writeUInt16(cid);

  return this.buffer;

}

PacketWriter.prototype.writeCastSpell = function(sid, duration) {

  /*
   * Function PacketWriter.writeCastSpell
   * Writes packet that says the player casts a spell with an identifier and cooldown
   */

  this.writeUInt16(sid);
  this.writeUInt32(duration);

  return this.buffer;

}

PacketWriter.prototype.writeCombatLock = function(bool) {

  /*
   * Function PacketWriter.writeCombatLock
   * Updates the client with the current state of the combat lock (on/off)
   */

  this.writeBoolean(bool);

  return this.buffer;

}

PacketWriter.prototype.writePlayerStatistics = function(player) {

  /*
   * Function PacketWriter.writePlayerStatistics
   * Writes player statistics to the player
   */

  // Information that needs to be overwritten when it changes
  this.writeUInt32(player.characterStatistics.capacity);
  this.writeUInt8(player.getAttack());
  this.writeUInt8(player.getDefense());
  this.writeUInt16(player.getSpeed());

  return this.buffer;


}

PacketWriter.prototype.writeWorldTime = function(offset) {

  /*
   * Function PacketWriter.writeWorldTime
   * Writes the "unix" world time to the client which is in fact a 32-bit number
   */

  this.writeUInt32(offset);

  return this.buffer;

}

PacketWriter.prototype.writeTrade = function(npc) {

  /*
   * Function PacketWriter.writeTrade
   * Writes NPC trade offers
   */

  // Write the number of available trades
  this.writeUInt32(npc.guid);
  this.writeUInt8(npc.trade.length);

  // Write individual trade information
  npc.trade.forEach(this.__writeSingleTrade, this);

  // Slice the packet to the appropriate size
  return this.__slicePacket();

}

PacketWriter.prototype.writeAddAchievement = function(achievement) {

  /*
   * Function PacketWriter.writeAddAchievement
   * Writes a packet that says the player has completed an achievement
   */

  this.__writeString(achievement.title);
  this.__writeString(achievement.description);

  return this.__slicePacket();

}

PacketWriter.prototype.writeZoneInformation = function(zid) {

  /*
   * Function PacketWriter.writeZoneInformation
   * Writes a packet that contains the current zone information
   */

  // Fetch the zone from the identifier
  let zone = process.gameServer.database.getZone(zid);

  // The zone name
  this.__writeString(zone.name);
  this.__writeString(zone.title);
  this.__writeString(zone.music);

  // Weather
  this.writeUInt8(zone.weather);

  // Ambient colors
  this.writeUInt8(zone.ambient.r);
  this.writeUInt8(zone.ambient.g);
  this.writeUInt8(zone.ambient.b);
  this.writeUInt8(zone.ambient.a);

  // Rain and thunder
  this.writeBoolean(zone.rain);

  return this.__slicePacket();

}

PacketWriter.prototype.writeReadable = function(readable) {

  /*
   * Function PacketWriter.writeReadable
   * Writes the content of a readable thing (e.g., book)
   */

  this.writeBoolean(false);
  this.__writeString(readable.getContent());
  this.__writeString(readable.getName());

  return this.__slicePacket();

}

PacketWriter.prototype.writeDistanceEffect = function(from, to, id) {

  /*
   * Function PacketWriter.writeDistanceEffect
   * Writes a distance magic effect from & to with a particular identifier
   */

  // Two positions and an identifier
  this.writePosition(from);
  this.writePosition(to);
  this.writeUInt8(id);

  return this.buffer;

}

PacketWriter.prototype.writeItemInformation = function(player, tile, item) {

  /*
   * Function PacketWriter.writeItemInformation
   * Writes information when looking at an item
   */

  // Server and client identifier
  this.writeUInt16(item.id);
  this.writeClientId(item.id);

  let includeDetails = !item.hasUniqueId() && (tile.constructor.name !== "Tile" || player.isBesidesThing(tile));
 
  // Weight
  if(includeDetails) {
    this.writeUInt16(item.getWeight());
  } else {
    this.writeUInt16(0);
  }

  // Attack
  if(includeDetails && item.getAttribute("attack")) {
    this.writeUInt8(item.getAttribute("attack"));
  } else {
    this.writeUInt8(0);
  }

  // Defense
  if(includeDetails && item.getAttribute("armor")) {
    this.writeUInt8(item.getAttribute("armor"));
  } else {
    this.writeUInt8(0);
  }

  // Distance
  if(item.isDistanceReadable()) {
    this.__writeString("You read: %s".format(item.getContent()));
  } else {
    this.__writeString(null);
  }

  // Some more information
  this.__writeString(item.getArticle());
  this.__writeString(item.getName(player));

  // Add details
  if(includeDetails) {
    this.__writeString(item.getDescription());
  } else {
    this.__writeString(null);
  }

  // Always include the count
  this.writeUInt8(item.count);

  return this.__slicePacket();

}

PacketWriter.prototype.writeServerData = function() {

  /*
   * Function PacketWriter.writeServerData
   * Writes important server information e.g., world parameters and the tick rate
   */

  // World size information
  this.writeUInt16(process.gameServer.world.width);
  this.writeUInt16(process.gameServer.world.height);
  this.writeUInt8(process.gameServer.world.depth);

  // The chunk information and size
  this.writeUInt8(CONFIG.WORLD.CHUNK.WIDTH);
  this.writeUInt8(CONFIG.WORLD.CHUNK.HEIGHT);
  this.writeUInt8(CONFIG.WORLD.CHUNK.DEPTH);

  // Other information that is very impportant like the server tick rate
  this.writeUInt8(CONFIG.SERVER.MS_TICK_INTERVAL);
  this.writeUInt16(CONFIG.WORLD.CLOCK.SPEED);
  this.__writeString(CONFIG.SERVER.VERSION);
  this.writeUInt16(CONFIG.SERVER.CLIENT_VERSION);

  return this.__slicePacket();

}

PacketWriter.prototype.writeLevelAdvance = function() {

  return this.buffer;

}

PacketWriter.prototype.writePrivateMessage = function(name, message) {

  /*
   * Function PacketWriter.writePrivateMessage
   * Writes a private message packet to the client
   */

  this.__writeString(name);
  this.__writeString(message);

  return this.__slicePacket();

}

PacketWriter.prototype.writeJoinChannel = function(channel) {

  /*
   * Function PacketWriter.writeJoinChannel
   * Writes a channel join packet to the client
   */

  this.writeUInt32(channel.id);
  this.__writeString(channel.name);

  return this.__slicePacket();

}

PacketWriter.prototype.writeIncreaseHealth = function(id, amount) {

  this.writeUInt32(id);
  this.writeUInt16(amount);

  return this.buffer;

}


PacketWriter.prototype.writeUnequipItem = function(slot) {

  this.writeUInt8(slot);

  return this.buffer;

}

PacketWriter.prototype.writeEquipItem = function(item, slot) {

  this.writeClientId(item.id);
  this.writeUInt8(item.count);
  this.writeUInt8(slot);

  return this.buffer;

}

PacketWriter.prototype.writeGainExperience = function(id, experience) {

  /*
   * Function PacketWriter.writeGainExperience
   * Writes a packet that contains an experience gain event
   */

  this.writeUInt32(id);
  this.writeUInt16(experience);

  return this.buffer;

}

PacketWriter.prototype.writeCreatureType = function(creature) {

  /*
   * Function PacketWriter.writeCreatureType
   * Writess the identifier for creature types to the client
   */

  switch(creature.constructor.name) {
    case "Player": return this.writeUInt8(0);
    case "Monster": return this.writeUInt8(1);
    case "NPC": return this.writeUInt8(2);
   
  }

}

PacketWriter.prototype.writeConditions = function(conditions) {

  /*
   * Function PacketWriter.writeConditions
   * Writes the conditions of the creature
   */

  this.writeUInt8(conditions.__conditions.size);

  conditions.forEach(x => this.writeUInt8(x.id));

}

PacketWriter.prototype.writeCreatureInfo = function(creature) {

  /*
   * Function PacketWriter.writeCreatureInfo
   * Writes the necessary creature information to a packet
   */

  this.writeUInt32(creature.guid);
  this.writeCreatureType(creature);
  this.writePosition(creature.position);
  this.writeUInt8(creature.direction);

  // Write the looktype
  this.writeOutfit(creature.outfit);

  // Write healthinformation
  this.writeUInt32(creature.health);
  this.writeUInt32(creature.maxHealth);
  this.writeUInt16(creature.speed);

  this.writeUInt8(creature.type);
  this.__writeString(creature.name);

  // The conditions
  this.writeConditions(creature.conditions);

  return this.__slicePacket();

}

PacketWriter.prototype.writeMagicEffect = function(position, type) {

  /*
   * Function PacketWriter.writeMagicEffect
   * Writes a magic effect packet for a position and magic effect type
   */

  this.writePosition(position);
  this.writeUInt8(type);

  return this.buffer;

}

PacketWriter.prototype.writeContainerItemRemove = function(id, slotIndex, count) {

  /*
   * Function PacketWriter.writeContainerItemRemove
   * Writes a packet that contains an item remove event from a container
   */

  this.writeUInt32(id);
  this.writeUInt8(slotIndex);
  this.writeUInt8(count);

  return this.buffer;

}

PacketWriter.prototype.writeContainerClose = function(guid) {

  /*
   * Function PacketWriter.writeContainerClose
   * Writes closure of a container
   */

  this.writeUInt32(guid);

  return this.buffer;

}

PacketWriter.prototype.writeItemRemove = function(position, index, count) {

  /*
   * Function PacketWriter.writeItemRemove
   * Writes a packet that contains an item remove event from a container
   */

  this.writePosition(position);
  this.writeUInt8(index);
  this.writeUInt8(count);

  return this.buffer;

}

PacketWriter.prototype.writeCreatureRemove = function(id) {

  /*
   * Function PacketWriter.writeCreatureRemove
   * Writes removal of creature from gameworld
   */

  this.writeUInt32(id);

  return this.buffer;

}

PacketWriter.prototype.writeCreatureTurn = function(id, direction) {

  /*
   * Function PacketWriter.writeCreatureTurn
   * Writes turn of creature to a new direction
   */

  this.writeUInt32(id);
  this.writeUInt8(direction);

  return this.buffer;

}

PacketWriter.prototype.writeEquipment = function(equipment) {

  /*
   * Function PacketWriter.writeEquipment
   * Writes all equipment to a packet
   */

  equipment.container.getSlots().forEach(function(item) {
    this.writeItem(item);
  }, this);

}

PacketWriter.prototype.writeLoginSuccess = function(player) {

  /*
   * Function PacketWriter.writeLoginSucces
   * Sends information of player to player
   */

  this.writeUInt32(player.guid);
  this.__writeString(player.name);
  this.writePosition(player.position);
  this.writeUInt8(player.direction);

  // State variables
  this.writeUInt32(player.characterStatistics.experience);
  this.writeUInt8(player.characterStatistics.level);
  this.writeUInt16(player.speed);
  this.writeUInt8(player.attack);
  this.writeUInt8(player.attackSlowness);

  this.writeEquipment(player.containerManager.equipment);
  this.writeUInt32(player.characterStatistics.capacity);

  // Write the number of available mounts
  this.writeMounts(player.characterStatistics.availableMounts);
  this.writeOutfits(player.characterStatistics.availableOutfits);

  // Write the outfit
  this.writeOutfit(player.outfit);

  // Write health information
  this.writeUInt8(player.health);
  this.writeUInt8(player.maxHealth);

  this.writeConditions(player.conditions);

  // Only return the part of the packet with information
  return this.__slicePacket();

}

PacketWriter.prototype.writeMounts = function(ids) {

  /*
   * Function PacketWriter.writeMounts
   * Writes the available mount identifier and mount name to the packet
   */

  let mounts = Array.from(ids).filter(x => Outfit.prototype.MOUNTS.hasOwnProperty(x));

  this.writeUInt8(mounts.length);

  mounts.forEach(function(id) {
    this.writeUInt16(id);
    this.__writeString(Outfit.prototype.getMountName(id));
  }, this);

}

PacketWriter.prototype.writeAvailableSpells = function(ids) {

  /*
   * Function PacketWriter.writeAvailableSpells
   * Writes the available spells to the player
   */

  this.writeUInt8(ids.size);

  // Write the available identifiers  
  ids.forEach(id => this.writeUInt8(id));

  return this.__slicePacket();

}

PacketWriter.prototype.writeOutfits = function(ids) {

  /*
   * Function PacketWriter.writeOutfits
   * Writes the available outfits to the client
   */

  let outfits = Array.from(ids).filter(x => Outfit.prototype.OUTFITS.hasOwnProperty(x));

  this.writeUInt8(outfits.length);

  outfits.forEach(function(outfit) {
    this.writeUInt16(outfit);
    this.__writeString(Outfit.prototype.getName(outfit));
  }, this);

}

PacketWriter.prototype.writeChangeOutfit = function(creature) {

  /*
   * Function PacketWriter.writeOutfits
   * Writes the available outfits
   */

  // Write the identifier of the creature & new outfit
  this.writeUInt32(creature.guid);
  this.writeOutfit(creature.outfit);

  return this.buffer;

}

PacketWriter.prototype.writeOutfit = function(outfit) {

  /*
   * Function PacketWriter.writeOutfit
   * Writes the player look type details (outfit colors)
   */

  this.writeUInt16(outfit.id);

  // If outfit details are enabled
  if(outfit.details) {
    this.writeLookDetails(outfit.details);
  } else {
    this.writeNull(4);
  }

  // If addons & mount features are enabled
  if(process.gameServer.isFeatureEnabled()) {
    this.writeUInt16(outfit.mount);
    this.writeBoolean(outfit.mounted);
    this.writeBoolean(outfit.addonOne);
    this.writeBoolean(outfit.addonTwo);
  } else {
    this.writeNull(5);
  }

}

PacketWriter.prototype.writeNull = function(amount) {

  /*
   * Function PacketWriter.writeNull
   * Writes a number of null values to the buffer
   */

  for(let i = 0; i < amount; i++) {
    this.writeUInt8(0);
  }

}

PacketWriter.prototype.writeLookDetails = function(details) {

  /*
   * Function PacketWriter.writeLookType
   * Writes the player look type details (outfit colors)
   */

  // Four times a single byte
  this.writeUInt8(details.head);
  this.writeUInt8(details.body);
  this.writeUInt8(details.legs);
  this.writeUInt8(details.feet);

}

PacketWriter.prototype.writeClientId = function(id) {

  /*
   * Function PacketWriter.writeClientId
   * Writes the client ID by converting server ID to client ID
   */

  this.writeUInt16(process.gameServer.database.getClientId(id));

}

PacketWriter.prototype.writeItem = function(item) {

  /*
   * Function writeItem
   * Writes packet that defines an item (id and count)
   */

  // If there is no item write three zero bytes
  if(item === null) {
    this.writeUInt16(0);
    this.writeUInt8(0);
    return;
  }

  this.writeClientId(item.id);
  this.writeUInt8(item.count);

}

PacketWriter.prototype.writeOpenContainer = function(id, name, container) {

  /*
   * Function writeOpenContainer
   * Writes packet that defines a container and contents
   */

  // Get the items
  this.writeUInt32(container.guid);
  this.writeClientId(id);
  this.__writeString(name);
  this.writeUInt8(container.size);

  container.getSlots().forEach(this.writeItem.bind(this));

  return this.__slicePacket();

}

PacketWriter.prototype.writeContainerItemAdd = function(id, slot, item) {

  /*
   * Function writeContainerItemAdd
   * Writes packet that adds an item to a particualr container
   */

  this.writeUInt32(id);
  this.writeUInt8(slot);
  this.writeItem(item);

  return this.buffer;

}

PacketWriter.prototype.writeCreatureSay = function(creature, message, color) {

  /*
   * Functon PacketWriter.writeCreatureSay
   * Writes a creature say event to the client
   */

  // Write creature information
  this.writeUInt32(creature.guid);
  this.writeUInt8(creature.type);

  // Make sure to escape the HTML to prevent XSS
  this.__writeString(message);
  this.writeUInt8(color);

  return this.__slicePacket();

}

PacketWriter.prototype.writeCreatureMove = function(id, position, speed) {

  /*
   * Functon PacketWriter.writeCreatureMove
   * Writes packet that defines a creature movement
   */

  this.writeUInt32(id);
  this.writePosition(position);
  this.writeUInt16(speed);

  return this.buffer;

}

PacketWriter.prototype.writeDefaultChannelMessage = function(name, message, color) {

  /*
   * Functon PacketWriter.writeDefaultChannelMessage
   * Writes a message to the default channel
   */

  return this.writeChannelMessage(
    process.gameServer.world.channelManager.CHANNELS.DEFAULT,
    name,
    message,
    color
  );

}

PacketWriter.prototype.writeChannelMessage = function(id, name, message, color) {

  /*
   * Functon PacketWriter.writeChannelMessage
   * Writes packet that defines a creature message
   */

  this.writeUInt32(id);
  this.__writeString(name);
  this.__writeString(message);
  this.writeUInt8(color);

  return this.__slicePacket();

}

PacketWriter.prototype.writeDecreaseHealth = function(source, target, attack, color) {

  /*
   * Functon PacketWriter.writeDecreaseHealth
   * Writes packet that defines a creature message
   */

  this.writeUInt32(source === null ? 0 : source.guid);
  this.writeUInt32(target.guid);
  this.writeUInt16(attack);
  this.writeUInt8(color);

  return this.buffer;

}

PacketWriter.prototype.writeItemTransform = function(position, id) {

  this.writePosition(position);
  this.writeClientId(id);

  return this.buffer;

}

PacketWriter.prototype.writeCreatureTeleport = function(id, position) {

  /*
   * Function PacketWriter.writeCreatureTeleport
   * Writes teleport event of a creature
   */

  this.writeUInt32(id)
  this.writePosition(position);

  return this.buffer;

}

PacketWriter.prototype.writeTile = function(tile) {

  /*
   * Function PacketWriter.writeTile
   * Serializes a single tile with its client side identifier
   */

  // The tile nullptr is identified by id 0
  if(tile === null) {
    return this.writeUInt32(0);
  }
  
  this.writeClientId(tile.id);
  this.writeUInt8(tile.tilezoneFlags.flag);
  this.writeUInt8(tile.zoneIdentifier);

}

PacketWriter.prototype.writeChunk = function(chunk) {

  /*
   * Function Packet.writeChunk
   * Serializes sector tile information
   */

  // This is the number that unique identifies the sector
  this.writeUInt32(chunk.id);
  this.writePosition(chunk.position);

  // Serialize each tile
  chunk.tiles.forEach(this.writeTile, this);

  return this.__slicePacket();

}

PacketWriter.prototype.writeFriendStatus = function(friend) {

  /*
   * Function PacketWriter.writeFriendStatus
   * Writes the online status of a friend
   */

  // Name and online status
  this.__writeString(friend);
  this.writeBoolean(process.gameServer.world.isPlayerOnline(friend));

  return this.__slicePacket();

}

PacketWriter.prototype.writeItemAdd = function(position, thing, slot) {

  /*
   * Function PacketWriter.writeItemAdd
   * Writes item add event to a packet
   */

  this.writeClientId(thing.id);
  this.writeUInt8(thing.count);
  this.writePosition(position);
  this.writeUInt8(slot);

  return this.buffer;

}

PacketWriter.prototype.writePosition = function(position) {

  /*
   * Function Packet.writePosition
   * Writes x, y, z position to the packet
   */

  this.writeUInt16(position.x);
  this.writeUInt16(position.y);
  this.writeUInt16(position.z);

}

PacketWriter.prototype.writeString = function(name) {

  /*
   * Function PacketWriter.writeString
   * Writes a string to the packet
   */

  // Delegate to internal writing function
  this.__writeString(name);

  // Return the sliced packet (by string length)
  return this.__slicePacket();

}

PacketWriter.prototype.writeUInt8 = function(value) {

  /*
   * Function PacketWriter.writeUInt8
   * Writes an unsigned byte to the packet
   */

  this.buffer.writeUInt8(value, this.index);
  this.index += 1

}

PacketWriter.prototype.writeUInt16 = function(value) {

  /*
   * Function PacketWriter.writeUInt16LE
   * Writes two unsigned byte to the packet
   */

  this.buffer.writeUInt16LE(value, this.index);
  this.index += 2

}

PacketWriter.prototype.writeUInt32 = function(value) {

  /*
   * Function PacketWriter.writeUInt32
   * Writes four unsigned bytes to the packet
   */

  this.buffer.writeUInt32LE(value, this.index);
  this.index += 4

}

PacketWriter.prototype.writeInt8 = function(value) {

  /*
   * Function PacketWriter.writeInt8
   * Writes an signed byte to the packet
   */

  this.buffer.writeInt8(value, this.index);
  this.index += 1

}

PacketWriter.prototype.writeBoolean = function(value) {

  /*
   * Function PacketWriter.writeBoolean
   * Writes a boolean value to the packet
   */

  this.writeUInt8(value ? 1 : 0);

}

PacketWriter.prototype.__writeSingleTrade = function(offer) {

  /*
   * Function PacketWriter.__writeSingleTrade
   * Writes a single trade to the packet
   */

  // The required information by the client
  this.writeClientId(offer.id);
  this.__writeString(offer.name);
  this.writeUInt32(offer.price);
  this.writeBoolean(offer.sell);

}

PacketWriter.prototype.__writeString = function(message) {

  /*
   * Function PacketWriter.__writeString
   * Writes a message to the packet
   */

  // If the input message is null write an empty string
  if(message === null) {
    return this.writeUInt16(0);
  }

  // Escape HTML to prevent XSS
  message = this.__escapeHTML(message);

  // Truncate to maximum message length for safety
  if(message.length > 0xFFFF) {
    message = message.slice(0, 0xFFFF);
  }

  // Write length and message encoded as utf-8
  let encoded = new TextEncoder("utf-8").encode(message);
  this.writeUInt16(encoded.length);
  this.buffer.write(message, this.index, "utf-8");

  // Increment the buffer too
  this.index += encoded.length;

}

PacketWriter.prototype.__allocateBuffer = function(packet) {

  /*
   * Function PacketWriter.__allocateBuffer
   * Allocates a buffer of the appropriate sizes and writes the packet identifier
   */

  this.buffer = Buffer.alloc(packet.length);

  // Immediately write the packet code
  this.writeUInt8(packet.code);

}

PacketWriter.prototype.__slicePacket = function() {

  /*
   * Function PacketWriter.__slicePacket
   * Slices the packet to the appropriate length
   */

  // The index points to the end of the buffer so slice it up to there
  return this.buffer.slice(0, this.index);

}

PacketWriter.prototype.__escapeHTML = function(message) {

  /*
   * Function PacketWriter.__escapeHTML
   * Escapes unsafe HTML characters to prevent XSS attacks
   */

  return message.replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll("'", "&apos;")
                .replaceAll('"', "&quot;");

}

module.exports = PacketWriter;
