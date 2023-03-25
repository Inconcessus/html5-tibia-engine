let { fieldScene, millScene } = require("./scene/miller.js");

module.exports = function talkScriptMiller() {

  /*
   * Function talkScriptMiller
   * Response definitions for NPC Miller
   */

  process.gameServer.world.clock.on("time", function() {

    if(process.gameServer.world.clock.at("06:00")) {
      this.setScene(fieldScene);
    }

    if(process.gameServer.world.clock.at("18:00")) {
      this.setScene(millScene);
    }

  }.bind(this));

  // Reference the base state (a base state is required)
  this.__baseTalkState = this.__talkState = baseTalkState;

  this.on("focus", function(player) {

    if(process.gameServer.world.clock.isMorning()) {
      this.internalCreatureSay("G'morn, %s!".format(player.name), CONST.COLOR.YELLOW);
    } else if(process.gameServer.world.clock.isNight()) {
      this.internalCreatureSay("G'night, %s!".format(player.name), CONST.COLOR.YELLOW);
    } else {
      this.internalCreatureSay("G'day, %s!".format(player.name), CONST.COLOR.YELLOW);
    }

  }.bind(this));

  this.on("defocus", function(player, message) {
    this.internalCreatureSay("See you around, %s! Don't get hit by the blades of my windmill!".format(player.name), CONST.COLOR.YELLOW);
  }.bind(this));

  this.on("exit", function(player) {
    this.internalCreatureSay("As the wind blows..", CONST.COLOR.YELLOW);
  });

  this.on("regreet", function(player) {
    this.internalCreatureSay("Make it snappy!", CONST.COLOR.YELLOW);
  });

  this.on("idle", function(player) {
    this.internalCreatureSay("Back to work then..", CONST.COLOR.YELLOW);
  });

  this.on("busy", function(player) {
    this.internalCreatureSay("On moment, %s.".format(player.name), CONST.COLOR.YELLOW);
  }.bind(this));

}

function baseTalkState(player, message) {

  /*
   * Function baseTalkState
   * The base state of the NPC. It will respond to the following keywords
   */

  switch(message) {
    case "trade":
      this.internalCreatureSay("I don't have much for sale..", CONST.COLOR.YELLOW);
      this.openTradeWindow(player);
      return 
    case "mill":
    case "windmill":
      this.internalCreatureSay("The windmill is not operational right now. Perhaps come back later!", CONST.COLOR.YELLOW);
      break;
    case "wheat":
      this.internalCreatureSay("Somebody has got to feed the town!", CONST.COLOR.YELLOW);
      break;
    case "town":
      this.internalCreatureSay("You know a town, where people live?", CONST.COLOR.YELLOW);
      break;
  }

}
