const Condition = requireModule("condition");

module.exports = function cureBurning() {

  /*
   * Function cureBurning
   * Spell to cure the burning condition from the player
   */

  // Not burning
  if(!this.conditions.has(Condition.prototype.BURNING)) {
    return 0;
  }
 
  this.conditions.removeCondition(Condition.prototype.BURNING);
  process.gameServer.world.sendMagicEffect(this.position, CONST.EFFECT.MAGIC.MAGIC_BLUE);

  // Return cooldown
  return 1000;

}