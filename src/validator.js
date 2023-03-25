"use strict";

const { Validator } = require("jsonschema");
const fs = require("fs");

const DataValidator = function() {

  /*
   * Class DataValidator
   * Validates NPC and monster data on server start
   */

  // JSON schema lib
  this.validator = new Validator();

  // We use JSON schemas to define proper definitions for monsters and NPCs
  this.npcSchema = JSON.parse(fs.readFileSync(getDataFile("npcs", "schema.json")));
  this.monsterSchema = JSON.parse(fs.readFileSync(getDataFile("monsters", "schema.json")));

}

DataValidator.prototype.validateMonster = function(name, monster) {

  /*
   * Function Validator.validateMonster
   * Validates Monster data on load
   */

  if(!CONFIG.SERVER.VALIDATE) {
    return;
  }

  let validated = this.validator.validate(monster, this.monsterSchema);

  if(!validated.valid) {
    throw new Error("Schema validation failed for: %s: %s".format(name, validated.errors.join("\n")));
  }

}

DataValidator.prototype.validateNPC = function(filename, npc) {

  /*
   * Function Validator.validateNPC
   * Validates NPC data on load
   */

  if(!CONFIG.SERVER.VALIDATE) {
    return;
  }

  let validated = this.validator.validate(npc, this.npcSchema);

  if(!validated.valid) {
    throw new Error("Schema validation failed for: %s: %s".format(filename, validated.errors.join("\n")));
  }

}

module.exports = DataValidator;