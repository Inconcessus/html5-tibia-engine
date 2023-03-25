let done = false;

module.exports = function useTrunk(player, tile, index, item) {

  // Only allowed when not moving
  if(player.isMoving()) {
    return true;
  }

  let middle = process.gameServer.world.getTileFromWorldPosition({"x": 65, "y": 110, "z": 8});
  let right = process.gameServer.world.getTileFromWorldPosition({"x": 66, "y": 110, "z": 8});

  if(!done) {
    if(right.isOccupiedAny()) {
      player.sendCancelMessage("Somehow the light does not dim.");
      return false;
    }
    let thing = middle.removeIndex(0xFF);
    let newThing = thing.replace(process.gameServer.database.createThing(1718));
    right.addTopThing(newThing);
  } else {
    let thing = right.removeIndex(0xFF);
    let newThing = thing.replace(process.gameServer.database.createThing(1719));
    middle.addTopThing(newThing);
  }

  done = !done;
  process.gameServer.world.sendMagicEffect(middle.position, CONST.EFFECT.MAGIC.POFF);

  return true;

}