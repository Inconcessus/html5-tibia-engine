const House = function(id, entry) {

  /*
   * Class House
   * Wrapper for a player-ownable house
   */

  this.id = id;

  this.name = entry.name;
  this.owner = entry.owner;
  this.invited = entry.invited;
  this.exit = entry.exit;
  this.rent = entry.rent;

  // Save a reference to all the tiles in the house
  this.tiles = new Array();

}

House.prototype.setOwner = function(player) {

  /*
   * Function House.setOwner
   * Updates the owner of the house
   */

  // Evict all players and items from the emptied house
  this.__evictAllPlayers();
  this.__evictAllItems();

  this.owner = player.name;
  this.invited = new Array();

}

House.prototype.__evictAllItems = function() {

  /*
   * Function House.__evictAllItems
   * Moves all pickupable items to the inbox
   */

  let owner = process.gameServer.world.getGameSocketByName(this.owner);

  // Check whether the player is online or offline
  if(owner === null) {
    return this.__evictAllItemsOffline(this.owner);
  } else {
    return this.__evictAllItemsOnline(owner);
  }

}

House.prototype.__evictAllItemsOffline = function(owner) {

  /*
   * Function House.__evictAllItemsOffline
   * Updates the player account if the player is offline
   */

  let items = new Array();

  this.tiles.forEach(function(tile) {

    // Get all items that can be picked up
    tile.itemStack.__items.filter(function(thing) {
      return thing.isPickupable();
    }).forEach(function(thing) {

      // Delete each item
      tile.__deleteThing(thing);
      items.push(thing.toJSON());

    });

  });

  // Apply an atomic update to the player file on disk
  process.gameServer.server.websocketServer.accountManager.atomicUpdate(owner, function(error, json) {

    if(error) {
      return console.error("Encountered a fatal error writing inbox to player file.");
    }

    // Update the players inbox
    Array.prototype.push.apply(json.inbox, items);

  });

}

House.prototype.__evictAllItemsOnline = function(owner) {

  /*
   * Function House.__evictAllItemsOnline
   * Evicts all players from the house to the exit tile
   */

  this.tiles.forEach(function(tile) {

    tile.itemStack.__items.filter(function(thing) {
      return thing.isPickupable();
    }).forEach(function(thing) {

      tile.__deleteThing(thing);
      owner.player.containerManager.inbox.addThing(thing);

    });

  });

}

House.prototype.__evictAllPlayers = function() {

  /*
   * Function House.__evictAllPlayers
   * Evicts all players from the house to the exit tile
   */

  this.tiles.forEach(function(tile) {
    tile.players.forEach(function(player) {
      process.gameServer.world.teleportCreature(player, this.exit);
      process.gameServer.world.sendMagicEffect(player.position, CONST.EFFECT.MAGIC.TELEPORT);
    }, this);
  }, this);

}

House.prototype.toJSON = function() {

  /*
   * Function House.toJSON
   * Implements the toJSON API and serializes the house metadata like owner and exit tile
   */

  return new Object({
    "owner": this.owner,
    "rent": this.rent,
    "exit": this.exit,
    "invited": this.invited,
    "name": this.name
  });

}

House.prototype.isOwnedBy = function(player) {

  /*
   * Function House.isOwnedBy
   * Adds a tile reference to the house
   */

  return this.owner === player.name;

}

House.prototype.addTile = function(tile) {

  /*
   * Function House.addTile
   * Adds a tile reference to the house
   */

  this.tiles.push(tile);

  // Circular reference
  tile.house = this;

}

module.exports = House;