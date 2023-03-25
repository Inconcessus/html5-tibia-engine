const Inbox = function(player, inbox) {

  /*
   * Class Inbox
   * Container for items that were added to the players inbox and can be extracted by clicking a mailbox
   */

  this.__player = player;
  this.__items = new Array();

  // Serialize all the items
  inbox.forEach(function(item) {
    this.__items.push(process.gameServer.database.parseThing(item));
  }, this);

}

Inbox.prototype.addThing = function(thing) {

  /*
   * Class Inbox.addThing
   * Adds a thing to the inbox
   */

  this.__items.push(thing);
  this.__player.sendCancelMessage("You just received mail.");

}

Inbox.prototype.toJSON = function() {

  /*
   * Class Inbox.toJSON
   * Serializes the inbox
   */

  return this.__items;

}

Inbox.prototype.pop = function(position) {

  /*
   * Class Inbox.pop
   * Returns the top item of the mailbox (first in last out)
   */

  if(this.isEmpty()) {
    process.gameServer.world.sendMagicEffect(position, CONST.EFFECT.MAGIC.POFF);
    return this.__player.sendCancelMessage("There are no items in your inbox.");
  }

  let thing = this.__items[this.__items.length - 1];

  if(!this.__player.containerManager.equipment.canPushItem(thing)) {
    return this.__sendToDepot(thing, position);
  }

  thing = this.__items.pop();

  this.__player.containerManager.equipment.pushItem(thing);
  this.__player.sendCancelMessage("You took %s from your inbox.".format(thing.getName()));
  process.gameServer.world.sendMagicEffect(position, CONST.EFFECT.MAGIC.BLOCKHIT);

}

Inbox.prototype.__sendToDepot = function(thing, position) {

  /*
   * Class Inbox.__sendToDepot
   * Sends the next item in the list to the depot
   */

  // There is no space in the depot
  if(!this.__player.containerManager.depot.canAddFirstEmpty(thing)) {
    process.gameServer.world.sendMagicEffect(position, CONST.EFFECT.MAGIC.POFF);
    return this.__player.sendCancelMessage("You cannot carry this item and there is no space in your depot.");
  }

  // Cannot carry: send it over to the depot
  this.__player.sendCancelMessage("You cannot carry this item and it was sent to your depot.");
  this.__player.containerManager.depot.addFirstEmpty(this.__items.pop());
  process.gameServer.world.sendMagicEffect(position, CONST.EFFECT.MAGIC.TELEPORT);

}


Inbox.prototype.isEmpty = function() {

  /*
   * Class Inbox.isEmpty
   * Returns true if the inbox is empty
   */

  return this.__items.length === 0;

}

module.exports = Inbox;