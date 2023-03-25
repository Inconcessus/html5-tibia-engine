const ActionManager = require("./action");
const Item = require("./item");
const Position = require("./position");

const CutsceneManager = function(npc) {

  /*
   * Class CutsceneManager
   *
   * Manager for NPC scenes that follow particular instructions. E.g., this class handles scene configuration
   * that allows NPC characters to play in pre-defined cutscenes
   *
   */

  // Reference the parent NPC
  this.npc = npc;

  this.actions = new ActionManager();
  this.actions.add(this.__handleScene);

  // Parameters for playing scenes
  this.__currentSceneAction = null;
  this.__scheduledActions = new Array();
  this.__sceneTimeout = 0;

}

CutsceneManager.prototype.DEFAULT_TIMEOUT = 10;

CutsceneManager.prototype.setScene = function(definitions) {

  /*
   * Function CutsceneManager.setScene
   * Sets the NPC state to that of the scene identified by an index
   */

  // Creatures in a scene must be explicitly active even when they are in a sector alone
  process.gameServer.world.explicitActive.add(this.npc);

  // Set up the scheduled actions
  this.__scheduledActions = JSON.parse(JSON.stringify(definitions));

}

CutsceneManager.prototype.isScene = function() {

  /*
   * Function CutsceneManager.isScene
   * Returns whether the NPC is in a scene
   */

  return this.__scheduledActions.length > 0 || this.__currentSceneAction !== null;

}

CutsceneManager.prototype.currentSceneAction = function() {

  /*
   * Function NPC.currentSceneAction
   * Handles the current scheduled action
   */

  // Action is locked: do nothing
  if(!this.actions.has(this.__handleScene)) {
    return;
  }

  // The NPC is acting in a scene: get the next scheduled action (or the same)
  if(this.__currentSceneAction === null) {
    this.__scheduleNextAction();
  }

  return this.__handleScene(this.__currentSceneAction);

}

CutsceneManager.prototype.__scheduleNextAction = function() {

  /*
   * Function NPC.__scheduleNextAction
   * Schedules the next action
   */

  this.__currentSceneAction = this.__scheduledActions.shift();
  this.__sceneTimeout = 0;

}

CutsceneManager.prototype.__abortScene = function() {

  /*
   * Function NPC.__abortScene
   * Aborts the currently running scene because the timeout has been exceeded
   */

  // Reset actions
  this.__sceneTimeout = 0;
  this.__currentSceneAction = null;
  this.__scheduledActions = new Array();
  
  // Teleport to the start position
  process.gameServer.world.teleportCreature(this.npc, this.npc.spawnPosition);
  process.gameServer.world.sendMagicEffect(this.npc.spawnPosition, CONST.EFFECT.MAGIC.TELEPORT);

  this.npc.emit("abort");

} 

CutsceneManager.prototype.__getcurrentSceneActionTimeout = function() {

  /*
   * Function NPC.__getcurrentSceneActionTimeout
   * Returns the timeout for the current scene (default is 10)
   */

  return this.__currentSceneAction.timeout || this.DEFAULT_TIMEOUT;

}

CutsceneManager.prototype.__completeAction = function() {

  /*
   * Function NPC.__completeAction
   * Completes the current action
   */

  this.__currentSceneAction = null;

  // The NPC is longer in a scene
  if(!this.isScene()) {
    process.gameServer.world.explicitActive.delete(this.npc);
  }

}

CutsceneManager.prototype.__handleScene = function(action) {

  /*
   * Function NPC.__handleScene
   * Handles an action of the NPC
   */

  // Lock the NPC for the coming action time (either slowness for walking)
  if(action.mode === "move") {
    let tile = process.gameServer.world.getTileFromWorldPosition(action.position);
    this.actions.lock(this.__handleScene, this.npc.getStepDuration(tile.getFriction()));
  } else {
    this.actions.lock(this.__handleScene, this.__currentSceneAction.duration || 0);
  }

  // The timeout was exceeded and something went wrong in the scene: reset it
  if(this.__sceneTimeout++ > this.__getcurrentSceneActionTimeout()) {
    return this.__abortScene();
  }

  // Get the type of the scheduled action
  switch(action.mode) {

    // Random wander action is requested
    case 0x00:
      return this.__completeAction();

    // An item add was requested
    case "add":
      let tile = process.gameServer.world.getTileFromWorldPosition(action.position);
      let thing = process.gameServer.database.createThing(action.item).setCount(action.count);
      if(action.actionId) thing.setActionId(action.actionId);
      tile.addTopThing(thing)
      return this.__completeAction();

    // Face direction
    case "face":
      this.npc.setDirection(action.direction);
      return this.__completeAction();

    // Action is idle: stand still for some time
    case "idle":
      return this.__completeAction();

    // Sets the NPC anchor to a new position around which they wander
    case "anchor":
      this.npc.spawnPosition = Position.prototype.fromLiteral(action.position);
      return this.__completeAction();

    // Teleports the NPC e.g., up stairs
    case "teleport":
      process.gameServer.world.teleportCreature(this.npc, action.position);
      return this.__completeAction();

    // The scheduled action is to speak
    case "emote":
      this.npc.sayEmote(action.message, CONST.COLOR.YELLOW);
      return this.__completeAction();

    // The scheduled action is to speak
    case "talk":
      this.npc.internalCreatureSay(action.message, CONST.COLOR.YELLOW);
      return this.__completeAction();

    // Scheduled action is a magic effect
    case "spell": {
      process.gameServer.world.sendMagicEffect(action.position, action.effect);
      return this.__completeAction();
    }

    // The scheduled action is to move to a position
    case "move": {

      // We have made our target goal: complete the action!
      if(this.npc.position.equals(action.position)) {
        return this.__completeAction();
      }

      // Do exact pathfinding to the destination tile
      let path = process.gameServer.world.findPath(
        this.npc,
        this.npc.position,
        action.position,
        process.gameServer.world.pathfinder.EXACT
      );

      // The path is not accesible
      if(path.length === 0) {
        return null;
      }

      // Return the next position
      return process.gameServer.world.moveCreature(this.npc, path.pop().position);

    }

  }

}

module.exports = CutsceneManager;