"use strict";

const PacketWriter = require("./packet-writer");

const Friendlist = function(player, friends) {

  /*
   * Class Friendlist
   * Wrapper for a characters friendlist
   */

  this.player = player;
  this.friends = friends;

}

Friendlist.prototype.remove = function(name) {

  /*
   * Function Friendlist.remove
   * Removes a character from the friendlist
   */

  let index = this.friends.indexOf(name);

  if(index === -1) {
    return;
  }

  this.friends.splice(index, 1);
  this.player.write(new PacketWriter(PacketWriter.prototype.opcodes.REMOVE_FRIEND).writeString(name));

}

Friendlist.prototype.add = function(name) {

  /*
   * Function Friendlist.add
   * Adds a character to the existing friendlist
   */

  let index = this.friends.indexOf(name);

  if(index !== -1) {
    return;
  }

  this.friends.push(name);
  this.player.write(new PacketWriter(PacketWriter.prototype.opcodes.FRIEND_STATUS).writeFriendStatus(name));

}

Friendlist.prototype.toJSON = function() {

  /*
   * Function Friendlist.toJSON
   * Serializes the friendlist to be saved to JSON
   */

  return this.friends;

}

Friendlist.prototype.writeFriendList = function() {

  /*
   * Function Friendlist.writeFriendList
   * Writes all the friends of a player to the player with the online/offline status
   */

  // Write the currently online characters to the player
  this.friends.forEach(function(friend) {
    this.player.write(new PacketWriter(PacketWriter.prototype.opcodes.FRIEND_STATUS).writeFriendStatus(friend));
  }, this);

}

module.exports = Friendlist;