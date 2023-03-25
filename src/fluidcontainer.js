"use strict";

const Item = require("./item");
const Condition = require("./condition");

const FluidContainer = function(id) {

  /*
   * Class FluidContainer
   * Container for items that can contain a fluid
   */

  // Inherit from container
  Item.call(this, id);

  // Count means the fluid type for fluid containers
  this.count = 0;

}

FluidContainer.prototype = Object.create(Item.prototype);
FluidContainer.prototype.constructor = FluidContainer;

// The fluid types
FluidContainer.prototype.FLUID_TYPES = new Object({
  "NONE": 0,
  "WATER": 1,
  "BLOOD": 2,
  "BEER": 3,
  "SLIME": 4,
  "LEMONADE": 5,
  "MILK": 6,
  "MANA": 7,
  "WATER2": 9,
  "HEALTH": 10,
  "OIL": 11,
  "SLIME2": 12,
  "URINE": 13,
  "COCONUTMILK": 14,
  "WINE": 15,
  "MUD": 19,
  "FRUITJUICE": 21,
  "LAVA": 26,
  "RUM": 27
});

FluidContainer.prototype.handleUseWith = function(player, item, tile, index) {

  /*
   * Function FluidContainer.handleUseWith
   * Callback fired when the fluid container is used with something
   */

  // The container is not filled
  if(this.isEmpty()) {
    return this.__handleFill(player, item, tile, index);
  }

  // Drinking?
  if(tile.getPlayer() === player) {

    player.internalCreatureSay(this.__getDrinkText(), CONST.COLOR.YELLOW);

    // Add drunk condition to the player
    if(this.isAlcohol()) {
      player.addCondition(Condition.prototype.DRUNK, 1, 500, null);
    }

    // Drinking slime is a bad idea..
    if(this.isSlime()) {
      player.addCondition(Condition.prototype.POISONED, 10, 20, null);
    }

    // Drinking lava..? Why would you do that
    if(this.isLava()) {
      player.addCondition(Condition.prototype.BURNING, 5, 50, null);
    }

    return this.__empty();

  }

  // Not besides?
  if(!player.isBesidesThing(tile)) {
    return player.sendCancelMessage("You have to move closer.");
  }

  let useWithItem = tile.peekIndex(0xFF);

  if(useWithItem !== null && useWithItem instanceof FluidContainer) {
    if(useWithItem.isEmpty()) {
      return this.__swapLiquid(useWithItem);
    } else {
      return player.sendCancelMessage("This container is already full.");
    }
  }

  // The tile is occupied and blocked by solid objects
  if(tile.isOccupied()) {
    return player.sendCancelMessage("You cannot empty this fluid container here.");
  }

  this.__createSplash(tile);

  return this.__empty();

}

FluidContainer.prototype.isOil = function() {

  return this.count === this.FLUID_TYPES.OIL;

}

FluidContainer.prototype.isLava = function() {

  return this.count === this.FLUID_TYPES.LAVA;

}

FluidContainer.prototype.isSlime = function() {

  return this.count === this.FLUID_TYPES.SLIME;

}

FluidContainer.prototype.isAlcohol = function() {

  /*
   * Function FluidContainer.isAlcohol
   * Returns true if the fluid being consumed is alcoholic
   */

  return this.count === this.FLUID_TYPES.BEER ||
         this.count === this.FLUID_TYPES.WINE ||
         this.count === this.FLUID_TYPES.RUM;

}

FluidContainer.prototype.__empty = function() {

  /*
   * Function FluidContainer.__empty
   * Callback fired when the fluid container is used with something
   */

  this.setFluidType(this.FLUID_TYPES.NONE);
  let thing = process.gameServer.database.createThing(this.id);

  this.replace(thing);

}

FluidContainer.prototype.isEmpty = function() {

  /*
   * Function FluidContainer.isEmpty
   * Returns true if the fluid container is empty
   */

  return this.count === this.FLUID_TYPES.NONE;

}

FluidContainer.prototype.__handleFill = function(player, item, tile, index) {

  /*
   * Function FluidContainer.__handleFill
   * Handles filling of a fluid container after using it with another tile or item
   */

  // Get the item from the top stack position
  let useWithItem = tile.getTopItem();

  // Nothing: cannot be used
  if(useWithItem === null) {
    if(!tile.getPrototype().properties.fluidSource) {
      return player.sendCancelMessage("You cannot use this item here.");
    } 
    useWithItem = tile;
  }

  // If the player is using it with another container that has liquid
  if(useWithItem.constructor === FluidContainer && !useWithItem.isEmpty()) {
    return useWithItem.__swapLiquid(this);
  }

  // Fetch the prototype
  let fluidSource = useWithItem.getAttribute("fluidSource");

  // Fill the fluid container
  if(fluidSource === null) {
    return;
  }

  let thing = process.gameServer.database.createThing(this.id);
  thing.setFluidType(this.__mapString(fluidSource));
  this.replace(thing);

}

FluidContainer.prototype.__swapLiquid = function(item) {

  /*
   * Function FluidContainer.__swapLiquid
   * Swaps liquid between this and a new item
   */

  // Create a new item of the appropriate type
  let other = process.gameServer.database.createThing(item.id);
  other.setFluidType(this.count);
  item.replace(other);

  // And clear itself with count is zero
  let itself = process.gameServer.database.createThing(this.id);
  itself.setFluidType(this.FLUID_TYPES.NONE);
  this.replace(itself);

}

FluidContainer.prototype.__createSplash = function(tile) {

  /*
   * Function FluidContainer.__createSplash
   * Callback fired when the fluid container is used with something
   */

  // The splash identifier is 2016
  let splash = process.gameServer.database.createThing(2016);
  splash.setFluidType(this.count);
  splash.scheduleDecay();

  tile.addThing(splash, 0);

}

FluidContainer.prototype.__mapString = function(string) {

  /*
   * Function FluidContainer.__mapString
   * Maps item definition string to the proper fill type
   */

  switch(string) {
    case "blood": return this.FLUID_TYPES.BLOOD;
    case "water": return this.FLUID_TYPES.WATER;
    case "slime": return this.FLUID_TYPES.SLIME;
    default: return this.FLUID_TYPES.NONE;
  }

}

FluidContainer.prototype.__getDrinkText = function() {

  /*
   * Function FluidContainer.__getDrinkText
   * Returns the text when something is drank from the container
   */

  switch(this.count) {
    case this.FLUID_TYPES.WATER: return "Gulp..";
    case this.FLUID_TYPES.SLIME: return "Ugh!";
    default: return "Ahhh..";
  }

}

module.exports = FluidContainer;