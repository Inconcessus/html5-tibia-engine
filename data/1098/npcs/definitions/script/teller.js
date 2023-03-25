module.exports = function sarah() {

  /*
   * Definitions for NPC Sarah
   * All events are emitters when the character engages with the NPC
   */

  // Reference the base state (a base state is required)
  this.__baseTalkState = this.__talkState = baseTalkState;

  // Defaults
  this.on("focus", player => this.internalCreatureSay("Welcome, %s.".format(player.name), CONST.COLOR.YELLOW));
  this.on("defocus", player => this.internalCreatureSay("Goodbye.", CONST.COLOR.YELLOW));
  this.on("exit", player => this.sayEmote("!?", CONST.COLOR.YELLOW));
  this.on("regreet", player => this.internalCreatureSay("Tell me what you need, %s".format(player.name), CONST.COLOR.YELLOW));
  this.on("idle", player => this.internalCreatureSay("Hello?", CONST.COLOR.YELLOW));
  this.on("busy", player => this.internalCreatureSay("I'll help you next, %s!".format(player.name), CONST.COLOR.YELLOW));

}

function baseTalkState(player, message) {

  /*
   * Function baseTalkState
   * The base state of the NPC. It will respond to the following keywords
   */

  switch(message) {
    case "name":
      this.internalCreatureSay("Name's Teller. Bet you can guess why!", CONST.COLOR.YELLOW);
      break;
    case "teller":
      this.internalCreatureSay("Yep! I'm Borne's banker! Head up stairs if you need to access your locker.", CONST.COLOR.YELLOW);
      this.sayEmote("💰", CONST.COLOR.RED);
      break;
  }

}