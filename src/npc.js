"use strict";

const Creature = require("./creature");
const CutsceneManager = require("./scene");
const Position = require("./position");
const PacketWriter = require("./packet-writer");
const GenericLock = require("./generic-lock");

const NPC = function(data) {

  /*
   * Function NPC
   * Container for non-playable characters that can be interacted with
   *
   * API:
   * 
   * @NPC.isSpeaking() - returns true if the NPC has a focus
   *
   */

  // A NPC inherits from creature
  Creature.call(this, data.creatureStatistics);

  this.type = Creature.prototype.TYPE.NPC;

  // Keep some state in the NPC
  this.greetings = data.greetings;
  this.farewells = data.farewells;
  this.hearingRange = data.hearingRange;
  this.wanderRange = data.wanderRange;
  this.speakSlowness = data.speakSlowness;
  this.trade = data.trade;

  // Add the available actions for NPCs
  this.actions.add(this.handleActionMove);
  this.actions.add(this.handleActionAttack);

  if(data.hasOwnProperty("sayings")) {
    this.sayings = data.sayings;
    this.actions.add(this.handleActionSpeak);
  }

  // The handler for NPC cutscenes
  this.cutsceneManager = new CutsceneManager(this);

  // The character the NPC is currently focused and interacting with
  this.__focus = null;
  
  // These talkstates will need to be overwritten in the NPC definition --> otherwise the NPC will only respond to greetings or goodbyes
  this.__talkState = Function.prototype;
  this.__baseTalkState = Function.prototype;

  // NPC idle event triggered when the player is idle
  this.__focusIdleEvent = new GenericLock();
  this.__focusIdleEvent.on("unlock", this.__handlePlayerIdle.bind(this));
  this.__focusMovementEvent = null;
  this.__focusLogoutEvent = null;

  this.behaviour = {
    "openDoors": true,
    "ignoreCharacters": true
  }

  this.script = data.script;

  // If there is a script we must attach it to the NPC
  if(data.script) {
    this.__loadScript(data.script);
  }

  this.__seenCreatures = new WeakSet();

}

// Inherit from creature
NPC.prototype = Object.create(Creature.prototype);
NPC.prototype.constructor = NPC;

NPC.prototype.IDLE_TIMEOUT = 500;
NPC.prototype.FOCUS_RANGE = 5;

NPC.prototype.setTarget = function(target) {

  /*
   * Function Creature.setTarget
   * Sets the target of the creature
   */

  this.__target = target;

}

NPC.prototype.internalCreatureSay = function(message, color) {

  if(this.isSpeaking()) {
    this.__focusIdleEvent.lock(message.length * 5);
  }

  this.broadcastFloor(new PacketWriter(PacketWriter.prototype.opcodes.CREATURE_SAY).writeCreatureSay(this, message, color));

}

NPC.prototype.openTradeWindow = function(player) {

  /*
   * Function Player.openTradeWindow
   * Opens trade window with a friendly NPC
   */

  // No trades are available
  if(this.trade.length === 0) {
    return this.internalCreatureSay("I have nothing to trade.", CONST.COLOR.MAYABLUE);
  }

  // Show the trade window and reset the NPC state completely
  player.write(new PacketWriter(PacketWriter.prototype.opcodes.TRADE_OFFER).writeTrade(this));

  this.__resetState();

}

NPC.prototype.wander = function() {

  /*
   * Function NPC.wander
   * Returns a random position around the creature
   */

  let random = this.position.random();

  if(!this.spawnPosition.isWithinRangeOf(random, this.wanderRange)) {
    return null;
  }

  return process.gameServer.world.getTileFromWorldPosition(random);

}

NPC.prototype.getReturnScene = function(scene) {

  /*
   * Function NPC.getReturnScene
   * Returns the return scene of a NPC to teleport it to the start position
   */

  return new Object({
    "mode": "move",
    "timeout": 10,
    "position": this.spawnPosition
  });

}

NPC.prototype.isAttacking = function() {

  /*
   * Function NPC.isAttacking
   * Returns true if the NPC is attacking a creature
   */

  return this.__target !== null;

}

NPC.prototype.isSpeakingTo = function(target) {

  /*
   * Function NPC.isSpeakingTo
   * Returns true if the NPC is speaking to the passed target
   */

  return this.__focus === target;

}

NPC.prototype.isSpeaking = function() {

  /*
   * Function NPC.isSpeaking
   * Returns true if the NPC is focused and speaking to a player
   */

  return this.__focus !== null;

}

NPC.prototype.getTradeItem = function(index) {

  /*
   * Function NPC.getTradeItem
   * Returns the trade item for a particular index
   */

  if(index < 0 || index >= this.trade.length) {
    return null;
  }

  return this.trade[index];

}

NPC.prototype.isScene = function() {

  /*
   * Function cutsceneManager.isScene
   * Returns whether the NPC is in a scene by delegating to the cutsceneManager
   */

  return this.cutsceneManager.isScene();

}

NPC.prototype.handleActionMove = function() {

  /*
   * Function Creature.handleActionMove
   * Cooldown function that handles the creature movement
   */

  // Let the creature decide its next strategic move
  let tile = this.__getNextMoveAction();

  // Invalid tile was returned: do nothing
  if(tile === null || tile.id === 0) {
    return;
  }

  // Occupied: do nothing
  if(this.isTileOccupied(tile)) {
    return;
  }

  // Delegate to move the creature
  process.gameServer.world.moveCreature(this, tile.position);

  let lockDuration = this.getStepDuration(tile.getFriction());

  // Lock this function for a number of frames plus some to make the NPC idle on a tile
  this.actions.lock(this.handleActionMove, 2 * lockDuration);

}

NPC.prototype.getPrototype = function() {

}

NPC.prototype.handleActionSpeak = function() {

  /*
   * Function NPC.handleActionSpeak
   * Handles speaking action of the NPC
   */

  if(Math.random() > (1 - this.sayings.chance)) {
    this.internalCreatureSay(this.sayings.texts.random(), CONST.COLOR.YELLOW);
  }

  // Lock the action
  this.lockAction(this.handleActionSpeak, this.sayings.slowness);

}

NPC.prototype.handleActionAttack = function() {

  /*
   * Function World.handleActionAttack
   * Handles attack action
   */

  // No targer or not besides target: do nothing
  if(!this.hasTarget()) { 
    return
  }

  let target = this.getTarget();

  if(!this.isBesidesTarget()) {
    return;
  }

  if(!this.position.inLineOfSight(target.position)) {
    return;
  }

  this.lockAction(this.handleActionAttack, this.attackSlowness);

  process.gameServer.world.handleCombat(this);

}

NPC.prototype.handleResponse = function(player, keyword) {

  /*
   * Function NPC.handleResponse
   * Handles an incoming keyword from a particular player
   */

  if(!this.script) {
    return;
  }

  // The NPC is busy attacking a creature and will not respond to keywords
  if(this.isAttacking()) {
    return;
  }

  // Accept incoming greetins from anyone
  if(this.__isGreeting(keyword)) {
    return this.__handleGreeting(player);
  }

  // The current target is not speaking 
  if(!this.isSpeakingTo(player)) {
    return;
  }

  // Confirm the message is a goodbye
  if(this.__isGoodbye(keyword)) {
    return this.__handleGoodbye();
  }

  // Got a new message from the focus: extend the idle timeout
  this.__focusIdleEvent.lock(this.IDLE_TIMEOUT);

  // Call the configured function in the talkstate of the NPC
  let duration = this.__talkState.call(this, player, keyword);

}

NPC.prototype.setTalkState = function(state) {

  /*
   * Function NPC.setTalkState
   * Sets the current NPC talk state to a particular callback function that needs to be implemented
   */

  // Set the current NPC response state 
  this.__talkState = state;

}

NPC.prototype.isTileOccupied = function(tile) {

  /*
   * Function NPC.isTileOccupied
   * Function evaluated for a tile whether it is occupied for the NPC or not
   */

  if(tile === null) {
    return true;
  }

  // If the tile is blocking then definitely
  if(tile.isBlockSolid()) {
    return true;
  }

  // The tile items contain a block solid (e.g., a wall or a door that can be opened)
  if(tile.itemStack.isBlockNPC()) {
    return true;
  }

  //  Only occupied by characters when not in a scene
  if(!this.isScene() && tile.isOccupiedCharacters()) {
    return true;
  }

  return false;

}

NPC.prototype.setScene = function(scene) {

  /*
   * Function NPC.setScene
   * Sets the NPC state to that of the scene
   */

  // Block is already in a scene
  if(this.isScene()) {
    return;
  }

  // Scenes makes the NPC drop everything and play the cutscene
  if(this.isSpeaking()) {
    this.__resetState();
  }

  // Set up the scheduled actions
  this.cutsceneManager.setScene(scene);

}

NPC.prototype.getRandomBlabber = function() {

  /*
   * Function NPC.getRandomBlabber
   * Returns a random saying from the NPC
   */

  return this.sayings.random();

}

NPC.prototype.__extendFocus = function() {

  /*
   * Function NPC.__extendFocus
   * Player keeps chatting so extend the focus
   */

  // Extend the idle event because the player has regreeted
  this.__focusIdleEvent.lock(this.IDLE_TIMEOUT);

  this.emit("regreet", this.__focus);

}

NPC.prototype.__loadScript = function(script) {

  /*
   * Function NPC.__loadScript
   * Loads the NPC script definitions from disk
   */

  require(getDataFile("npcs", "definitions", "script", script)).call(this);

}

NPC.prototype.__getNextMoveAction = function() {

  /*
   * Function NPC.__getNextMoveAction
   * Returns the next move action of a NPC
   */

  // If the monster does not have a target: aimlessly wanted
  if(this.__target === null) {
    return this.wander();
  }

  // Not moving when besides the target
  if(this.isBesidesTarget()) {
    return null;
  }

  // Use A* to find path to target
  return this.__getPathToTarget();

}

NPC.prototype.__rejectFocus = function(target) {

  /*
   * Function NPC.__rejectFocus
   * Rejects the focus of another player
   */

  this.emit("busy", this.__focus, target);

}

NPC.prototype.__acceptFocus = function(target) {

  /*
   * Function NPC.__acceptFocus
   * Accepts the current passed target as the NPCs focus
   */

  // Set the state
  this.__focus = target;

  // Set to face the target
  this.__setFaceFocus();

  // Subscribe to player events
  this.__focusMovementEvent = target.on("move", this.__handleGreetingMove.bind(this));
  this.__focusLogoutEvent = target.on("logout", this.__handleGoodbye.bind(this));

  // Set up an idle event --> the NPC drops focus after some timeout has passed
  this.__focusIdleEvent.lock(this.IDLE_TIMEOUT);

  // Emit focus event that custom NPC scripts can subscribe to
  this.emit("focus", target);

}

NPC.prototype.__setFaceFocus = function() {

  /*
   * Function NPC.__setFaceFocus
   * Player keeps chatting so extend the focus
   */

  this.setDirection(this.position.getFacingDirection(this.__focus.position));

}

NPC.prototype.__handleGreeting = function(target) {

  /*
   * Function NPC.__handleGreeting
   * Sets current focus on the target
   */

  // If the NPC is not already focused
  if(!this.isSpeaking()) {
    return this.__acceptFocus(target);
  }

  // Already speaking to the player
  if(this.isSpeakingTo(target)) {
    return this.__extendFocus();
  }

  // Already chatting with another player
  return this.__rejectFocus(target);

}

NPC.prototype.__resetFocus = function() {

  /*
   * Function NPC.__resetFocus
   * Resets the focus of the NPC and cleans up remaining events
   */

  if(!this.isSpeaking()) {
    return;
  }

  // Clean up the focus functions
  this.__focus.off("logout", this.__focusLogoutEvent);
  this.__focus.off("move", this.__focusMovementEvent);
  this.__focus = null;

}

NPC.prototype.__handleOffended = function() {

  /*
   * Function __handleOffended
   * Fired when the player exists the NPC range without saying goodbye
   */

  // Offended because player moved away without saying bye
  this.emit("exit", this.__focus);

  // Reset the NPC to its original state
  this.__resetState();

}

NPC.prototype.__resetState = function() {

  /*
   * Function NPC.__resetState
   * Resets the NPC to its initial state
   */

  // Unsubscribe to focus movement event emitter
  this.__resetFocus();

  // Reset the NPC to the base state variable
  this.__talkState = this.__baseTalkState;

  // Cancel any remaining idle events too
  this.__focusIdleEvent.cancel();

}

NPC.prototype.__handleGreetingMove = function() {

  /*
   * Function NPC.__handleGreetingMove
   * Callback that is fired when the 
   */

  // Always face the focus
  this.__setFaceFocus();

  // Do nothing if still within focus range
  if(!this.isWithinRangeOf(this.__focus, this.FOCUS_RANGE)) {
    return this.__handleOffended();
  }

}

NPC.prototype.__handleGoodbye = function() {

  /*
   * Function NPC.__handleGoodbye
   * defocuses the NPC from the current target
   */

  // Emit the event for subscribes to subscribe to
  this.emit("defocus", this.__focus);

  // Reset the NPC to the default state
  this.__resetState();

}

NPC.prototype.__handlePlayerIdle = function() {

  /*
   * Function NPC.__handlePlayerIdle
   * Sets the idle status of the NPC
   */

  this.emit("idle");

  // Reset the focus and state
  this.__resetState();

}


NPC.prototype.__isGoodbye = function(string) {

  /*
   * Function NPC.__isGoodbye
   * Returns whether a text is a goodbye message
   */

  return this.farewells.includes(string);

}

NPC.prototype.__isGreeting = function(string) {

  /*
   * Function NPC.__isGreeting
   * Returns whether a text is a greeting message
   */

  return this.greetings.includes(string);

}

module.exports = NPC;
