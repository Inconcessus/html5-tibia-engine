module.exports = function sarah() {

  /*
   * Definitions for NPC Sarah
   * All events are emitters when the character engages with the NPC
   */

  // Reference the base state (a base state is required)
  this.__baseTalkState = this.__talkState = baseTalkState;

  // Defaults
  this.on("focus", player => this.internalCreatureSay("Good to see you here, %s.".format(player.name), CONST.COLOR.YELLOW));
  this.on("defocus", player => this.internalCreatureSay("Safe climb down!", CONST.COLOR.YELLOW));
  this.on("exit", player => this.internalCreatureSay("Pff.", CONST.COLOR.YELLOW));
  this.on("regreet", player => this.internalCreatureSay("Yes, sweety?", CONST.COLOR.YELLOW));
  this.on("idle", player => this.internalCreatureSay("Excuse me..", CONST.COLOR.YELLOW));
  this.on("busy", player => this.internalCreatureSay("One moment darling.", CONST.COLOR.YELLOW));

}

function baseTalkState(player, message) {

  /*
   * Function baseTalkState
   * The base state of the NPC. It will respond to the following keywords
   */

  switch(message) {
    case "name":
      this.internalCreatureSay("My name is Sarah.", CONST.COLOR.YELLOW);
      break;
    case "sarah":
      this.internalCreatureSay("That's me!", CONST.COLOR.YELLOW);
      this.sayEmote("❤", CONST.COLOR.RED);
      break;
    case "miller":
      this.internalCreatureSay("Miller is my dad. Look down there and you may see him!", CONST.COLOR.YELLOW);
      break;
  }

}