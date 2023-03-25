module.exports = function playMusic(player, tile, item) {

  process.gameServer.world.sendMagicEffect(tile.position, CONST.EFFECT.MAGIC.SOUND_GREEN);

}
