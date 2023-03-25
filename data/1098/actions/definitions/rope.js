const PacketHandler = requireModule("packet-handler");

function useOnHole(player, tile) {

  /*
   * Function useOnHole
   * Script called when a rope is used on a hole
   */

  // Get the tile below the current hole
  let down = process.gameServer.world.getTileFromWorldPosition(tile.position.down());

  if(down === null) {
    return true;
  }
 
  // Must be an item down there
  let item = down.getTopItem();

  if(item === null) {
    return true;
  }

  if(!item.isMoveable()) {
    return true;
  }

  if(item.getAttribute("floorchange") !== null) {
    return true;
  }

  // The tile south of the hole must be available
  let up = process.gameServer.world.getTileFromWorldPosition(tile.position.south());

  if(up === null) {
    return true;
  }

  // Delegate the move event
  PacketHandler.prototype.__moveItem(player, down, 0xFF, up, 0xFF, 0);
  
  return true;

}

module.exports = function useRope(player, item, tile) {

  /*
   * Function useRope
   * Script called when a rope is used
   */

  // Only allowed when not moving
  if(player.isMoving()) {
    return true;
  }

  // Not besides the hole
  if(!player.besides(tile)) {
    return;
  }

  // These are holes
  if(tile.getFloorChange() === "down") {
    return useOnHole(player, tile);
  }

  // If the tile being used has a rope hole: teleport the player up!
  if(tile.id === 384) {
    process.gameServer.world.teleportCreature(player, tile.position.ladder());
    player.__moveLock.lock(player.getSlowness());
  }

  return true;

}