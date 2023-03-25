module.exports = function talkScriptHumphrey() {

  /*
   * Function talkScriptHumphrey
   * Definitions for NPC talkScriptHumphrey
   */

  // Reference the base state (a base state is required)
  this.__baseTalkState = this.__talkState = baseTalkState;

  //this.on("enter", function(creature) {
  //  this.internalCreatureSay("Hello " + creature.name + ".", CONST.COLOR.YELLOW);
  //}.bind(this));

  this.on("focus", function(player) {
    this.internalCreatureSay("Hello " + player.name + ".", CONST.COLOR.YELLOW);
  }.bind(this));

  this.on("defocus", function(player, message) {
    this.internalCreatureSay("Goodbye " + player.name + ".", CONST.COLOR.YELLOW);
  }.bind(this));

  this.on("exit", function(player) {
    this.internalCreatureSay("Okay then! Hmph!", CONST.COLOR.YELLOW);
  });

  this.on("regreet", function(player) {
    this.internalCreatureSay("I'm listening.. " + player.name, CONST.COLOR.YELLOW);
  });

  this.on("idle", function(player) {
    this.internalCreatureSay("I don't have time for this.", CONST.COLOR.YELLOW);
  });

  this.on("busy", function(player) {
    this.internalCreatureSay("Wait! I'm busy.", CONST.COLOR.YELLOW);
  }.bind(this));

}

function baseTalkState(player, message) {

  /*
   * Function baseTalkState
   * The base state of the NPC. It will respond to the following keywords
   */

  switch(message) {
    case "temple":
      this.internalCreatureSay("This old temple is the heart of the town. I have worked here for years.", CONST.COLOR.YELLOW);
      break;
    case "name":
      this.internalCreatureSay("My name is Humphrey.", CONST.COLOR.YELLOW);
      break;
    case "job":
      this.internalCreatureSay("I am the steward of this temple.", CONST.COLOR.YELLOW);
      break;
    case "humphrey":
      this.internalCreatureSay("My parents liked it.", CONST.COLOR.YELLOW);
      break;
    case "mystic flame":
      this.internalCreatureSay("The flame has been burning for as long as I have been here. It cannot be quenched by water. \n And it burns brightly too, but does not sting to the touch. \n You can try it. You will feel a warmth but not get burnt. It is sitting atop of that stone. \n You may have guessed, but the temple was in fact built around it.", CONST.COLOR.YELLOW);
      break;
    case "quest":
      this.internalCreatureSay("Such adventures are not for me. You should ask around in town.", CONST.COLOR.YELLOW);
      break;
    case "blessing":
      this.internalCreatureSay("Do you wish to be blessed here?", CONST.COLOR.YELLOW);
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
    case "yes":
      this.internalCreatureSay("By the spirits of old, I bless thee. Your soul is bound to my temple.", CONST.COLOR.YELLOW);
      process.gameServer.world.sendMagicEffect(player.position, CONST.EFFECT.MAGIC.MAGIC_BLUE);
      this.setTalkState(baseTalkState);
      break;
    case "no":
      this.internalCreatureSay("Ok.", CONST.COLOR.YELLOW);
      this.setTalkState(baseTalkState);
      break;
    default:
      this.setTalkState(baseTalkState);
      break;
  }

}