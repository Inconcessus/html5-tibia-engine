"use strict";

const DefaultChannel = require("./channel-default");
const GlobalChannel = require("./channel-global");
const PacketWriter = require("./packet-writer");

const ChannelManager = function() {

  /*
   * Class ChannelManager
   * Container for all channels in the world
   *
   * Public API:
   *
   * ChannelManager.getChannel(id) - returns the channel from an identifier
   * ChannelManager.leaveChannel(player, id) - removes a player from a chat channel
   * ChannelManager.joinChannel(player, id) - removes a player from a chat channel
   * ChannelManager.handleSendPrivateMessage(player, packet) - handles a write private message packet from a player to another player
   *
   * Private API:
   *
   * ChannelManager.__isValidIdentifier(id) - returns true if the identifier is valid
   *
   */

  // Public game server channels
  this.channels = new Array(
    new DefaultChannel(this.CHANNELS.DEFAULT, "Default"),
    new GlobalChannel(this.CHANNELS.WORLD, "World"),
    new GlobalChannel(this.CHANNELS.TRADE, "Trade"),
    new GlobalChannel(this.CHANNELS.HELP, "Help")
  );

}

// Identifiers for channels global and the default channel
ChannelManager.prototype.CHANNELS = new Object({
  "DEFAULT": 0x00,
  "WORLD": 0x01,
  "TRADE": 0x02,
  "HELP": 0x03
});

ChannelManager.prototype.getChannel = function(cid) {

  /*
   * Function ChannelManager.getChannel
   * Returns a channel from the configured list of channels
   */

  // If the chat identifier is not valid
  if(!this.__isValidIdentifier(cid)) {
    return null;
  }

  return this.channels[cid];

}

ChannelManager.prototype.leaveChannel = function(player, cid) {

  /*
   * Function ChannelManager.leaveChannel
   * Allows a player to leave general channel with identifier ID
   */

  let channel = this.getChannel(cid);

  if(channel === null) {
    return player.sendCancelMessage("This channel does not exist.");
  }

  // Only global channels can be left: the default channel must always exist
  if(channel.constructor !== GlobalChannel) {
    return;
  }

  // Remove the player from the channel
  channel.leave(player);

}

ChannelManager.prototype.joinChannel = function(player, id) {

  /*
   * Function ChannelManager.joinChannel
   * Joins a player to a global channel with identifier id
   */

   let channel = this.getChannel(id);

  // Confirm the channel is valid and exists
  if(channel === null) {
    return player.sendCancelMessage("This channel does not exist.");
  }

  // Only global channels can be joined
  if(channel.constructor !== GlobalChannel) {
    return;
  }

  // Add the player to the channel
  channel.join(player);

}

ChannelManager.prototype.handleSendPrivateMessage = function(player, packet) {

  /*
   * Function ChannelManager.handleSendPrivateMessage
   * Sends a private message to the target gameSocket (references by name)
   */

  // Avoid sending messages to self
  if(packet.name === player.name) {
    return player.sendCancelMessage("You cannot message yourself.");
  }

  // Get a reference to the gamesocket from the player name
  let gameSocket = process.gameServer.world.getGameSocketByName(packet.name);

  // No player with this name
  if(gameSocket === null) {
    return player.sendCancelMessage("A player with this name is not online.");
  }

  // Write the packet to the targeted player
  gameSocket.write(new PacketWriter(PacketWriter.prototype.opcodes.SEND_PRIVATE_MESSAGE).writePrivateMessage(player.name, packet.message));

}

ChannelManager.prototype.__isValidIdentifier = function(cid) {

  /*
   * Function ChannelManager.__isValidIdentifier
   * Returns true if it is a valid identifier
   */

  return cid >= 0 && cid < this.channels.length;

}

module.exports = ChannelManager;
