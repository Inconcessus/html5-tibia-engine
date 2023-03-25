const MailboxHandler = function() {

  /*
   * Class MailboxHandler
   * Seperate class for handling of items being added to the mailbox
   */

}

MailboxHandler.prototype.UNSTAMPED_PARCEL = 2595;
MailboxHandler.prototype.STAMPED_PARCEL = 2596;
MailboxHandler.prototype.UNSTAMPED_LETTER = 2597;
MailboxHandler.prototype.STAMPED_LETTER = 2598;
MailboxHandler.prototype.LABEL = 2599;

MailboxHandler.prototype.canMailItem = function(thing) {

  /*
   * Function MailboxHandler.canMailItem
   * Public function that determines whether something can be mailed or not
   */

  return thing.id === this.UNSTAMPED_PARCEL || thing.id === this.UNSTAMPED_LETTER;

}

MailboxHandler.prototype.sendThing = function(fromWhere, toWhere, player, thing) {

  /*
   * Function MailboxHandler.sendThing
   * Sub function for sending a parcel when adding to the mailbox
   */

  switch(thing.id) {
    case this.UNSTAMPED_LETTER: return this.__sendLetter(fromWhere, toWhere, player, thing);
    case this.UNSTAMPED_PARCEL: return this.__sendParcel(fromWhere, toWhere, player, thing);
  }

}

MailboxHandler.prototype.writeParcel = function(name, thing, callback) {

  /*
   * Function MailboxHandler.writeLetter
   * Function that writes a parcel to a player with a particular name.
   * This function is asynchronous because it does I/O in case the player is not online.
   */

  // Create the new stamped parcel and copy over the contents
  let newParcel = process.gameServer.database.createThing(this.STAMPED_PARCEL);
  thing.copyProperties(newParcel);

  this.__mailThing(name, newParcel, callback); 

}

MailboxHandler.prototype.writeLetter = function(name, content, callback) {

  /*
   * Function MailboxHandler.writeLetter
   * Function that writes a letter to a player with a particular name.
   * This function is asynchronous because it does I/O in case the player is not online.
   */

  // Create a new letter and copy over the content
  let newLetter = process.gameServer.database.createThing(this.STAMPED_LETTER);
  newLetter.setContent(content);

  this.__mailThing(name, newLetter, callback); 

}

MailboxHandler.prototype.__getLabel = function(parcel) {

  /*
   * Function MailboxHandler.__getLabel
   * Attempts to find a label inside the parcel
   */

  for(let thing of parcel.container.__slots) {

    if(thing === null) {
      continue;
    }

    // Found a label!
    if(thing.id === this.LABEL) {
      return thing;
    }

  }

  return null;

}

MailboxHandler.prototype.__mailThing = function(name, thing, callback) {

  /*
   * Function MailboxHandler.__addItemsOffline
   * Writes a letter to a player that is offline by doing an atomic update
   */

  // Check whether the player is online
  let gameSocket = process.gameServer.world.getGameSocketByName(name);

  // If the player is not online we have to add the items to the gamefile
  if(gameSocket === null) {
    return this.__addItemsOffline(name, thing, callback);
  }

  // The player is online and we can add to the inbox
  gameSocket.player.containerManager.inbox.addThing(thing);
  callback(false);

}

MailboxHandler.prototype.__addItemsOffline = function(owner, thing, callback) {

  /*
   * Function MailboxHandler.__addItemsOffline
   * Writes a letter to a player that is offline by doing an atomic update
   */

  // Atomic update of the player gamefile
  process.gameServer.server.websocketServer.accountManager.atomicUpdate(owner, function(error, json) {

    if(error) {
      return callback(true);
    }

    // Update the players inbox
    json.inbox.push(thing);

    callback(false);

  });

}

MailboxHandler.prototype.__sendParcel = function(fromWhere, toWhere, player, thing) {

  /*
   * Function MailboxHandler.__sendParcel
   * Sub function for sending a parcel when adding to the mailbox
   */

  // Attempt to get the label from the parcel
  let label = this.__getLabel(thing);

  if(label === null) {
    return player.sendCancelMessage("You must add a label to your parcel.");
  }

  // Attempt to get the name of the recipient
  let recipient = label.getContent();
  if(recipient === "") {
    return player.sendCancelMessage("You must add the recipient to your label.");
  }

  // Freeze the thing until the I/O task is resolved
  thing.freeze();

  // Writing a parcel is an async task (may be I/O)
  this.writeParcel(recipient, thing, function(error) {

    // There was an error writing the letter: do nothing
    if(error) {
      thing.unfreeze();
      process.gameServer.world.sendMagicEffect(toWhere.position, CONST.EFFECT.MAGIC.POFF);
      return player.sendCancelMessage("A recipient with this name does not exist.");
    }

    process.gameServer.world.sendMagicEffect(toWhere.position, CONST.EFFECT.MAGIC.TELEPORT);
    thing.delete();

  });

}

MailboxHandler.prototype.__sendLetter = function(fromWhere, toWhere, player, thing) {

  /*
   * Function MailboxHandler.__sendLetter
   * Sub function for sending a letter when adding to the mailbox
   */

  let lines = thing.getContent().split("\n");
  let recipient = lines.slice(0, 2).join("");
  let isolatedContent = lines.slice(2).join("\n");

  if(recipient === "") {
    return player.sendCancelMessage("You must add the recipient to your letter.");
  }

  // Freeze the thing until the I/O task is resolved
  thing.freeze();

  // Sending a letter is an I/O task
  this.writeLetter(recipient, isolatedContent, function(error) {

    // There was an error writing the letter: do nothing
    if(error) {
      thing.unfreeze();
      process.gameServer.world.sendMagicEffect(toWhere.position, CONST.EFFECT.MAGIC.POFF);
      return player.sendCancelMessage("A recipient with this name does not exist.");
    }

    process.gameServer.world.sendMagicEffect(toWhere.position, CONST.EFFECT.MAGIC.TELEPORT);
    thing.delete();

  });

}

module.exports = MailboxHandler;