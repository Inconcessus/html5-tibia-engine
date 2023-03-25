module.exports = function beamEnergy() {

  /*
   * Function beamEnergy
   * Creature energy beam function
   */

  let source = this;

  for(let i = 0; i < 5; i++) {

    let position = this.__getSpellPosition(0, -i);
    
    process.gameServer.world.sendMagicEffect(
      position,
      CONST.EFFECT.MAGIC.ENERGYHIT
    );
    
    let tile = process.gameServer.world.getTileFromWorldPosition(position);
    
    if(tile === null) {
      continue;
    }

    tile.players.forEach(function(player) {

      let damage = Number.prototype.random(0, 3);

      process.gameServer.world.__damageEntity(source, player, damage, CONST.COLOR.LIGHTBLUE);

    });

  }

  return 50;

}