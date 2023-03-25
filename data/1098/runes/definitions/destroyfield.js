const Position = requireModule("position");

module.exports = function destroyField(source, target) {

  /*
   * function suddenDeath
   * Code that handles the sudden death rune
   */

  let item = target.peekItem(0xFF);

  if(item === null) {
    return process.gameServer.world.sendMagicEffect(source.position, CONST.EFFECT.MAGIC.POFF);
  }

  if(!item.getPrototype().isMagicField()) {
    return process.gameServer.world.sendMagicEffect(source.position, CONST.EFFECT.MAGIC.POFF);
  }

  item.remove();

  process.gameServer.world.sendMagicEffect(target.position, CONST.EFFECT.MAGIC.POFF);

  return true;

}
