const Position = requireModule("position");

module.exports = function statue(time) {

  /*
   * Function statue
   * Example callback implement when time changes
   */

  //if(time !== "06:05") {
  //  return;
  //}

  let position = new Position(134, 116, 5);

  let effects = new Array(
    CONST.EFFECT.MAGIC.SOUND_GREEN,
    CONST.EFFECT.MAGIC.SOUND_RED,
    CONST.EFFECT.MAGIC.SOUND_YELLOW,
    CONST.EFFECT.MAGIC.SOUND_PURPLE,
    CONST.EFFECT.MAGIC.SOUND_BLUE,
    CONST.EFFECT.MAGIC.SOUND_WHITE
  );

  process.gameServer.world.sendMagicEffect(position, effects.random());

}