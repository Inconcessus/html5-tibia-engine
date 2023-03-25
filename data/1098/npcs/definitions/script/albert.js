module.exports = function talkScriptAlbert() {

  /*
   * Function talkScriptAlbert
   * Definitions for NPC Albert
   */

  // Reference the base state (a base state is required)
  this.__baseTalkState = this.__talkState = baseTalkState;

  this.on("focus", function(player) {

    if(process.gameServer.world.clock.isMorning()) {
      this.internalCreatureSay("Good morning %s! Did you catch the surise?".format(player.name), CONST.COLOR.YELLOW);
    } else if(process.gameServer.world.clock.isNight()) {
      this.internalCreatureSay("Beautiful night eh, %s?".format(player.name), CONST.COLOR.YELLOW);
    } else {
      this.internalCreatureSay("Good day %s!".format(player.name), CONST.COLOR.YELLOW);
    }

  }.bind(this));

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
    case "trade":
      this.internalCreatureSay("Have a browse!", CONST.COLOR.YELLOW);
      this.openTradeWindow(player);
      break;
  }

}
