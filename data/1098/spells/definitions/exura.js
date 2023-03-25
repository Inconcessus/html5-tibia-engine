module.exports = function exura(properties) {

  process.gameServer.world.sendMagicEffect(
    this.position,
    CONST.EFFECT.MAGIC.SOUND_WHITE
  );

  return 10;

}