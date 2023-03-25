"use strict";

const Channel = require("./channel");
const PacketWriter = require("./packet-writer");

const GlobalChannel = function(id, name) {
  
  /*
   * Class GlobalChannel
   *
   * Wrapper for channels that are global for the gameserver and can be joined by players.
   * These are effectively chatrooms that broadcast messages to all subscribers.
   *
   * API:
   *
   * GlobalChannel.has(player) - Returns true if the player is inside the channel
   * GlobalChannel.join(player) - Subscribes a player to the channel
   * GlobalChannel.leave(player) - Unsubscribes a player to the channel
   * GlobalChannel.send(player, message) - Sends a message from player to the entire channel
   * 
   */
  
  // Inherits from channel
  Channel.call(this, id, name);
  
  // Parameter to save what characters are in the channel
  this.__players = new Set();

}

GlobalChannel.prototype = Object.create(Channel.prototype);
GlobalChannel.prototype.constructor = GlobalChannel;

GlobalChannel.prototype.has = function(player) {

  /*
   * Function GlobalChannel.has
   * Returns true if a player is inside a channel
   */

  return this.__players.has(player);

}

GlobalChannel.prototype.join = function(player) {

  /*
   * Function GlobalChannel.join
   * Adds a player to this particular global channel
   */

  // Create circular reference
  this.__players.add(player);
  player.__openedChannels.set(this.id, this);

  // Write a packet to the player to join the channel
  player.write(new PacketWriter(PacketWriter.prototype.opcodes.JOIN_CHANNEL).writeJoinChannel(this));

}

GlobalChannel.prototype.leave = function(player) {

  /*
   * Function GlobalChannel.leave
   * Removes a player from this particular global channel
   */

  // Delete circular reference
  this.__players.delete(player);
  player.__openedChannels.delete(this.id);

}

GlobalChannel.prototype.send = function(player, message) {

  /*
   * Function GlobalChannel.send
   * Sends a message to all subscribers in the global channel
   */

  // Administrators have a red color
  let color = player.characterStatistics.admin ? CONST.COLOR.RED : CONST.COLOR.YELLOW;

  // Generate the packet once
  let packet = new PacketWriter(PacketWriter.prototype.opcodes.CREATURE_MESSAGE).writeChannelMessage(this.id, player.name, message, color);

  // Write this packet to all players in the channel
  this.__players.forEach(player => player.write(packet));

}

module.exports = GlobalChannel;