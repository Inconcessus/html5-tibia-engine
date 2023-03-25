"use strict";

const PacketWriter = require("./packet-writer");

const DamageMap = function() {

  /*
   * Class DamageMap
   * Contains and records the damage caused to a creature
   */

  this.__map = new Map();

}

DamageMap.prototype.getDividedExperience = function(experience) {

  /*
   * Function DamageMap.getDividedExperience
   * Equally divides the total experience over the number of characters in the map
   */

  // Divide over all character in the map
  return Math.floor(experience / this.__map.size);

}

DamageMap.prototype.update = function(attacker, amount) {

  /*
   * Function DamageMap.update
   * Adds incoming damage from an attacker to the damage map
   */

  if(attacker === null) {
    return;
  }

  // Add the attacker entry (object literal for now) TODO
  if(!this.__map.has(attacker)) {
    return this.__map.set(attacker, new Object({
      "damage": amount,
      "aggro": 0
    }));
  }

  // Add to the existing amount
  this.__map.get(attacker).damage += amount;

}

DamageMap.prototype.distributeExperienceAndLoot = function(proto, loot) {

  /*
   * Function DamageMap.distributeExperience
   * Distributes the experience over all players in the damage map
   */

  // Distribute equally to all attackers
  let sharedExperience = this.getDividedExperience(proto.experience);

  let packet;
  if(loot.length > 0) {
    let message = "%s drops: %s".format(proto.creatureStatistics.name, loot.map(this.__createLootText).join(", "));
    packet = new PacketWriter(PacketWriter.prototype.opcodes.SERVER_MESSAGE).writeString(message);
  } else {
    packet = new PacketWriter(PacketWriter.prototype.opcodes.SERVER_MESSAGE).writeString("%s drops nothing".format(proto.creatureStatistics.name));
  }

  // Evenly distribute the experience
  this.__map.forEach(function(map, attacker) {

    // Add the experience
    if(!attacker.isPlayer()) {
      return;
    }

    // No longer online?
    if(attacker.isOffline()) {
      return;
    }

    // Experience to share
    if(sharedExperience > 0) {
      attacker.characterStatistics.addExperience(sharedExperience);
    }

    // Write the loot packet
    attacker.write(packet);

  }, this);

}

DamageMap.prototype.__createLootText = function(thing) {

  /*
   * Function DamageMap.__createLootText
   * Creates loot text entry
   */

  if(thing.isStackable()) {
    return thing.getCount() + " " + thing.getName();
  }

  return thing.getArticle() + " " + thing.getName();
  
}

module.exports = DamageMap;