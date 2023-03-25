const { keyScene } = require("./scene/marrow");

module.exports = function talkScriptMarrow() {

  /*
   * Function talkScriptMarrow
   * Definitions for NPC Marrow
   */

  // Reference the base state (a base state is required)
  this.__baseTalkState = this.__talkState = baseTalkState;

  this.on("enter", player => this.privateSay(player, "Wipe your feet before coming in, %s!".format(player.name), CONST.COLOR.YELLOW));
  this.on("focus", player => this.internalCreatureSay("Oi, %s!".format(player.name), CONST.COLOR.YELLOW));
  this.on("defocus", player => this.internalCreatureSay("Be safe out there, %s".format(player.name), CONST.COLOR.YELLOW));
  this.on("exit", player => this.internalCreatureSay("Selfish.", CONST.COLOR.YELLOW));
  this.on("regreet", player => this.internalCreatureSay("Hmm?", CONST.COLOR.YELLOW));
  this.on("idle", player => this.internalCreatureSay("You are wasting my time.", CONST.COLOR.YELLOW));
  this.on("busy", player => this.internalCreatureSay("Hold your horses there, %s. I'm busy here.".format(player.name), CONST.COLOR.YELLOW));

}

function baseTalkState(player, message) {

  /*
   * Function baseTalkState
   * The base state of the NPC. It will respond to the following keywords
   */

  switch(message) {
    case "spell":
      this.internalCreatureSay("Learn this!", CONST.COLOR.YELLOW);
      return player.spellbook.addAvailableSpell(4);
    case "trade":
      this.internalCreatureSay("Here are my wares.", CONST.COLOR.YELLOW);
      this.openTradeWindow(player);
      break;
    case "cellar infestation":
    case "infestation":
      this.internalCreatureSay("We have a little rat problem down there in the cellar.", CONST.COLOR.YELLOW);
      break;
    case "closed":
    case "door":
    case "cellar":
      this.internalCreatureSay("The cellar door is locked and you'll need a key to open it.", CONST.COLOR.YELLOW);
      break;
    case "key":
      this.internalCreatureSay("Are you looking for the key to the cellar?", CONST.COLOR.YELLOW);
      this.setTalkState(keyTalkState);
      break;
  }

}

function keyTalkState(player, message) {

  switch(message) {
    case "no":
      this.internalCreatureSay("Ok let me know if I can do something for you.", CONST.COLOR.YELLOW);
      this.setTalkState(baseTalkState);
      break;
    case "yes":
      this.setScene(keyScene);
      break;
  }

}