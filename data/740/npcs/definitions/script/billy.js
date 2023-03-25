module.exports = function talkScriptBilly() {

  /*
   * Function talkScriptBilly
   * Definitions for NPC Billy
   */

  // Reference the base state (a base state is required)
  this.__baseTalkState = this.__talkState = baseTalkState;

  this.on("focus", player => this.privateSay(player, "Hello, %s!".format(player.name), CONST.COLOR.YELLOW));
  this.on("enter", player => this.privateSay(player, "Oh, it's you again.. %s".format(player.name), CONST.COLOR.YELLOW));
  this.on("defocus", player => this.internalCreatureSay("See you around, %s.".format(player.name), CONST.COLOR.YELLOW));
  this.on("exit", player => this.internalCreatureSay("Youths these days..", CONST.COLOR.YELLOW));
  this.on("regreet", player => this.internalCreatureSay("Can I help you, %s?".format(player.name), CONST.COLOR.YELLOW));
  this.on("idle", player => this.internalCreatureSay("Not really a talker, huh.", CONST.COLOR.YELLOW));
  this.on("busy", player => this.internalCreatureSay("One moment please!", CONST.COLOR.YELLOW));

}

function baseTalkState(player, message) {

  /*
   * Function baseTalkState
   * The base state of the NPC. It will respond to the following keywords
   */

  switch(message) {
    case "house":
      this.internalCreatureSay("Do you want to own my house?", CONST.COLOR.YELLOW);
      this.setTalkState(confirmTalkState);
      break;
  }

}

function confirmTalkState(player, message) {

  switch(message) {
    case "yes":
      process.gameServer.database.getHouse(1).setOwner(player);
      this.internalCreatureSay("Alrighty, you can have it!", CONST.COLOR.YELLOW);
      this.setTalkState(baseTalkState);
      break;
    case "no":
      this.internalCreatureSay("It is free you know..", CONST.COLOR.YELLOW);
      this.setTalkState(baseTalkState);
      break;
  }

}