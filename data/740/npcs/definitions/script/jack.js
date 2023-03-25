let storyScene = require("./scene/jack-story");

module.exports = function talkScriptHumphrey() {

  /*
   * Function talkScriptHumphrey
   * Definitions for NPC talkScriptHumphrey
   */

  // Reference the base state (a base state is required)
  this.__baseTalkState = this.__talkState = baseTalkState;

  this.on("focus", player => this.internalCreatureSay("Ahoy " + player.name + "!", CONST.COLOR.YELLOW));
  this.on("defocus", player => this.internalCreatureSay("Safe travels, " + player.name + ".", CONST.COLOR.YELLOW));
  this.on("exit", player => this.internalCreatureSay("Whatever.", CONST.COLOR.YELLOW));
  this.on("regreet", player => this.internalCreatureSay("Go on.." + player.name, CONST.COLOR.YELLOW));
  this.on("idle", player => this.internalCreatureSay("Back to work!", CONST.COLOR.YELLOW));
  this.on("busy", player =>  this.internalCreatureSay("Wait a minute!", CONST.COLOR.YELLOW));

}

function baseTalkState(player, message) {

  /*
   * Function baseTalkState
   * The base state of the NPC. It will respond to the following keywords
   */

  switch(message) {
    case "jack":
      this.internalCreatureSay("Not a pirate, I swear! It is quite a standard name for a sailor.", CONST.COLOR.YELLOW);
      break;
    case "job":
      this.internalCreatureSay("I am a sailor. And a merchant for that matter.", CONST.COLOR.YELLOW);
      break;
    case "story":
      this.internalCreatureSay("Do you want to hear a story?", CONST.COLOR.YELLOW);
      this.setTalkState(secondTalkState);
      break;
    case "boat":
      this.internalCreatureSay("I would not go as far to say that it is a boat. But it sure is a raft. And a good one at that!", CONST.COLOR.YELLOW);
      this.setTalkState(firstTalkState);
      break;
    case "travel":
      this.internalCreatureSay("Do you want to travel to Venore or Carlin?", CONST.COLOR.YELLOW);
      this.setTalkState(firstTalkState);
      break;
  }

}

function firstTalkState(player, message) {

  /*
   * Function firstTalkState
   * The first state of the NPC. It will respond to the following keywords if this state is active
   */

  switch(message) {
    case "Venore":
      this.internalCreatureSay("Venore is a beautiful place!", CONST.COLOR.YELLOW);
      this.setTalkState(baseTalkState);
      break;
    case "Carlin":
      this.internalCreatureSay("Carlin huh.. I wonder..", CONST.COLOR.YELLOW);
      this.setTalkState(baseTalkState);
      break;
    default:
      this.internalCreatureSay("I do not know that destination..", CONST.COLOR.YELLOW);
      this.setTalkState(baseTalkState);
      break;
  }

}


function secondTalkState(player, message) {

  switch(message) {
    case "yes":
      this.setScene(storyScene);
      break;
    case "no":
      this.internalCreatureSay("Then not.", CONST.COLOR.YELLOW);
      this.setTalkState(baseTalkState);
      break;
    default:
      this.internalCreatureSay("I guess not..", CONST.COLOR.YELLOW);
      this.setTalkState(baseTalkState);
      break;
  }

}
