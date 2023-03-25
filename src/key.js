"use strict";

const Item = require("./item");

const Key = function(id) {

  /*
   * Class Key
   * Wrapper for items that are keys and can open doors
   */

  // Inherit from container
  Item.call(this, id);

}

Key.prototype = Object.create(Item.prototype);
Key.prototype.constructor = Key;

Key.prototype.handleKeyUse = function(player, tile) {

  /*
   * Function Key.handleKeyUse
   * Wrapper for keys that can be used to open doors
   */

  // Get the top element
  let door = tile.getTopItem();

  // Nothing there
  if(door === null) {
    return;
  }

  // This it not a door..
  if(!door.isDoor()) {
    return;
  }

  if(door.getAttribute("expertise") || door.getAttribute("unwanted")) {
    return player.sendCancelMessage("Keys do not work on magic doors.");
  }

  // Already opened: close it
  if(door.isOpened()) {
    return door.toggle(player);
  }

  // Confirm the action identifiers matches with the key
  if(this.actionId !== door.actionId) {
    return player.sendCancelMessage("The key does not fit inside the keyhole.");  
  }

  // Write message to the player
  player.sendCancelMessage("The door unlocks.");

  // Request the door to be opened by the key
  door.open();

}

module.exports = Key;