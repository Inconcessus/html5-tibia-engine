"use strict";

const PacketWriter = require("./packet-writer");

const Spellbook = function(player, data) {

  /*
   * Class Spellbook
   * Container for all spells that a player has and handles casting / cooldowns
   */

  // Circular reference
  this.player = player;

  // The map of spells that are currently on cooldown
  this.__spellCooldowns = new Map();

  this.__cooldowns = data.cooldowns;

  // The set of available spell identifiers
  this.__availableSpells = new Set(data.availableSpells);

}

Spellbook.prototype.GLOBAL_COOLDOWN = 0xFFFF;
Spellbook.prototype.GLOBAL_COOLDOWN_DURATION = 20;

Spellbook.prototype.getAvailableSpells = function() {

  /*
   * Function Spellbook.getAvailableSpells
   * Returns the spells that are available in the player's spellbook
   */

  return this.__availableSpells;

}

Spellbook.prototype.toJSON = function() {

  /*
   * Function Spellbook.toJSON
   * Implements the toJSON API to serialize the spellbook when writing to file
   */

  // Serialize
  return new Object({
    "availableSpells": Array.from(this.__availableSpells),
    "cooldowns": Array.from(this.__spellCooldowns).map(this.__serializeCooldown, this)
  });

}

Spellbook.prototype.__serializeCooldown = function([ key, value ]) {

  /*
   * Function Spellbook.__serializeCooldown
   * Serializes the cooldowns
   */

  return new Object({
    "sid": key,
    "cooldown": value.remainingFrames()
  });

}

Spellbook.prototype.addAvailableSpell = function(sid) {

  /*
   * Function Spellbook.addAvailableSpell
   * Adds an available spell to the player's spellbook
   */

  // Add it
  this.__availableSpells.add(sid);

  // Inform the player they have learned a new spell
  this.player.sendCancelMessage("You have learned a new spell!");

  // Write the spells again
  this.player.write(new PacketWriter(PacketWriter.prototype.opcodes.WRITE_SPELLS).writeAvailableSpells(this.__availableSpells));

}

Spellbook.prototype.handleSpell = function(sid) {

  /*
   * Function Spellbook.handleSpell
   * Handles casting of a spell by an entity
   */

  // Ignore cast requests that are already on cooldown
  if(this.__spellCooldowns.has(this.GLOBAL_COOLDOWN) || this.__spellCooldowns.has(sid)) {
    return;
  }

  // Try to get the spell
  let spell = process.gameServer.database.getSpell(sid);

  // Does not exist
  if(spell === null) {
    return;
  }

  // The player does not own this spell
  if(!this.__availableSpells.has(sid)) {
    return;
  }

  // Call with reference to player
  let cooldown = spell.call(this.player);

  // Zero cooldown means that the cast was unsuccesful
  if(cooldown === 0) {
    return;
  }

  // Write a packet to the player that the spell needs to be put on cooldown by a number of frames
  this.player.write(new PacketWriter(PacketWriter.prototype.opcodes.CAST_SPELL).writeCastSpell(sid, cooldown));

  // Lock it
  this.__lockSpell(sid, cooldown);

}

Spellbook.prototype.__lockSpell = function(sid, duration) {

  /*
   * Function Spellbook.__lockSpell
   * Handles locking of a spell by adding it to the cooldown map. A reference to the locked down event is included
   */

  // Also lock to the global cooldown
  this.__internalLockSpell(sid, duration);
  this.__internalLockSpell(this.GLOBAL_COOLDOWN, this.GLOBAL_COOLDOWN_DURATION);

}

Spellbook.prototype.applyCooldowns = function() {

  /*
   * Function Spellbook.applyCooldowns
   * Applies the serialized cooldowns when the player logs in
   */

  // Apply a correction for the duration the player has been offline
  let correction = (Date.now() - this.player.lastVisit);

  this.__cooldowns.forEach(function({ sid, cooldown }) {

    cooldown = Math.max(0, cooldown - (correction / CONFIG.SERVER.MS_TICK_INTERVAL));

    // Cooldown of zero: not needed
    if(cooldown === 0) {
      return;
    }

    // Lock and inform
    this.__internalLockSpell(sid, cooldown);
    this.player.write(new PacketWriter(PacketWriter.prototype.opcodes.CAST_SPELL).writeCastSpell(sid, cooldown));

  }, this);

}

Spellbook.prototype.__internalLockSpell = function(sid, duration) {

  /*
   * Function Spellbook.__internalLockSpell
   * Internal function actually schedule the lock
   */

  this.__spellCooldowns.set(sid, process.gameServer.world.eventQueue.addEvent(this.__unlockSpell.bind(this, sid), duration));

}

Spellbook.prototype.__unlockSpell = function(sid) {

  /*
   * Function Spellbook.__unlockSpell
   * Handles unlocking of a spell by deleting it from the cooldown map
   */

  this.__spellCooldowns.delete(sid);

}

module.exports = Spellbook;