const Position = requireModule("position");

module.exports = function statue(time) {

  /*
   * Function statue
   * Example callback implement when time changes
   */

  if(time !== "08:30") {
    return;
  }

  let position = new Position(87, 108, 8);

  let effects = new Array(
    CONST.EFFECT.MAGIC.SOUND_GREEN,
    CONST.EFFECT.MAGIC.SOUND_RED,
    CONST.EFFECT.MAGIC.SOUND_YELLOW,
    CONST.EFFECT.MAGIC.SOUND_PURPLE,
    CONST.EFFECT.MAGIC.SOUND_BLUE,
    CONST.EFFECT.MAGIC.SOUND_WHITE
  );

  let thing = process.gameServer.database.createThing(2747);

  process.gameServer.world.sendMagicEffect(position, effects.random());
  process.gameServer.world.getTileFromWorldPosition(position).addTopThing(thing);


}