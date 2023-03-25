"use strict";

const Channel = require("./channel");

const DefaultChannel = function(id, name) {

  /*
   * Class DefaultChannel
   * Wrapper for the default channel that broadcasts to all characters inside a particular range
   */

  // Inherits from channel
  Channel.call(this, id, name);

}

DefaultChannel.prototype = Object.create(Channel.prototype);
DefaultChannel.prototype.constructor = DefaultChannel;

DefaultChannel.prototype.send = function(player, packet) {

  /*
   * Function DefaultChannel.send
   * Sends a message to all players near this player in the gameworld
   */

  // Message and loudness
  let message = packet.message;
  let loudness = packet.loudness;

  // Administrators have a red color; players yellow
  let color = player.characterStatistics.admin ? CONST.COLOR.RED : CONST.COLOR.YELLOW;

  // Whispers
  if(packet.loudness === 0) {
    return player.internalCreatureWhisper(message, color);
  }

  if(packet.loudness === 2) {
    return player.internalCreatureYell(message, color);
  }

  // Write to the default game screen and the default chat channel
  player.internalCreatureSay(message, color);

  // NPCs listen to all messages in the default channels
  this.__NPCListen(player, message.toLowerCase());

}

DefaultChannel.prototype.__NPCListen = function(player, message) {

  /*
   * Function PacketHandler.__NPCListen
   * Handler called when a player says a message and NPCs are nearby
   */
 
  // Go over all the NPCs in the nearby game world
  process.gameServer.world.forEachNearbyNPC(player.position, function(npc) {

    // Do not accept anything when in a scene
    if(npc.isScene()) {
      return;
    }

    // If in range
    if(npc.isWithinRangeOf(player, npc.hearingRange)) {
      return npc.handleResponse(player, message);
    } 

  });

}

module.exports = DefaultChannel;