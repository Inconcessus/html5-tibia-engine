"use strict";

const Container = require("./container.js");
const FluidContainer = require("./fluidcontainer");

const Corpse = function(id, size) {

  /*
   * Class Corpse
   * Wrapper for monster corpses that contain loot
   */

  // Inherits from container
  Container.call(this, id, size);

}

Corpse.prototype = Object.create(Container.prototype);
Corpse.prototype.constructor = Corpse;

Corpse.prototype.getFluidType = function() {

  /*
   * Function Corpse.getFluidType
   * Returns the fluid type of the corpse
   */

  // Add mappings here
  switch(this.getAttribute("corpseType")) {
    case "blood": return FluidContainer.prototype.FLUID_TYPES.BLOOD;
    case "venom": return FluidContainer.prototype.FLUID_TYPES.SLIME;
    default: return FluidContainer.prototype.FLUID_TYPES.BLOOD;
  }

}

Corpse.prototype.addLoot = function(loot) {

  /*
   * Function Corpse.addLoot
   * Adds loot to the corpse container
   */

  // Invalid: too much loot for the container size..
  if(loot.length > this.getSize()) {
    return;
  }

  // Add each entry in the loot table
  loot.forEach(function(thing) {

    // Check the probability
    if(Math.random() > thing.probability) {
      return;
    }

    let item = process.gameServer.database.createThing(thing.id);

    // Set the random between minimum and maximum
    if(thing.min && thing.max) {
      item.setCount(Number.prototype.random(thing.min, thing.max));
    }

    // Push the loot to the container
    this.addFirstEmpty(item);

  }, this);

}

module.exports = Corpse;