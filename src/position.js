"use strict";

const Position = function(x, y, z) {

  /*
   * Class Position
   * Container for a position (x, y, z) in Cartesian coordinates in the gameworld
   *
   * API:
   *
   * Position.inLineOfSight - returns true if this position is in line of sight of another position
   * Position.fromLiteral - returns a Position class from an object literal representation
   * Position.getSquare(size) - returns an array of positions that represent a square with a size
   * Position.getRadius(radius) - returns an array of positions that represent a circle with a radius
   * Position.toString - represents the Position class as a string
   * Position.copy - returns a memory copy of the Position
   * Position.equals(position) - returns true if the two positions are equal
   * Position.add(position) - adds a Position to another Position
   * Position.subtract(position) - subtracts a Position to another Position
   * 
   * Position.north - returns north of current position
   * Position.east - returns east of current position
   * Position.south - returns south of current position
   * Position.west - returns west of current position
   * Position.northeast - returns northeast of current position
   * Position.southeast - returns southeast of current position
   * Position.southwest - returns southwest of current position
   * Position.northwest- returns northwest of current position
   * Position.up - returns up of current position
   * Position.down - returns down of current position
   * Position.ladder - returns position when going up a ladder (up and south)
   *
   */

  // Save the three components
  this.x = x;
  this.y = y;
  this.z = z;

}

Position.prototype.NORTH = 0x00;
Position.prototype.EAST = 0x01;
Position.prototype.SOUTH = 0x02;
Position.prototype.WEST = 0x03;

Position.prototype.isSameFloor = function(other) {

  /*
   * Function Position.isSameFloor
   * Returns true if the two positions are on the same floor with identical z-coordinates
   */

  return this.z === other.z;

}

Position.prototype.inLineOfSight = function(other) {

  /*
   * Function Position.inLineOfSight
   * Returns true if the other passed position is in the line of sight
   */

  // Always true if two characters are adjacent
  if(this.besides(other)) {
    return true;
  }

  // The positions must be on the same floor
  if(this.z !== other.z) {
    return false;
  }

  // Linear interpolate between the coordinates
  let xLerp = other.x - this.x;
  let yLerp = other.y - this.y;
  let z = this.z;

  // Determine the number of interpolation steps to make
  let steps = Math.max(Math.abs(xLerp), Math.abs(yLerp)) + 1;

  // Linear interpolation
  for(let i = 0; i < steps; i++) {

    let fraction = i / (steps - 1);
    let x = this.x + Math.round(fraction * xLerp);
    let y = this.y + Math.round(fraction * yLerp);

    let tile = process.gameServer.world.getTileFromWorldPosition(new Position(x, y, z));

    if(tile === null) {
      continue;
    }

    // Found a tile that blocks projectiles
    if(tile.itemStack.isBlockProjectile()) {
      return false;
    }

  }

  // No collision were detected
  return true;

}

Position.prototype.fromLiteral = function(position) {

  /*
   * Function Position.fromLiteral
   * Returns a new Position class from a literal position object {x, y, z}
   */

  return new Position(position.x, position.y, position.z);

}

Position.prototype.getSquare = function(size) {

  /*
   * Function Position.getSquare
   * Returns the relative positions in a square of size { s } around { 0, 0 }
   */

  switch(size) {
    case 1: return this.__square1;
    case 2: return this.__square2;
    case 3: return this.__square3;
    default: return new Array();
  }

}

Position.prototype.getRadius = function(radius) {

  /*
   * Function Position.getRadius
   * Returns the relative positions in a circle of size { r } around { 0, 0 }
   */

  switch(radius) {
    case 2: return this.__radius2;
    case 3: return this.__radius3;
    case 4: return this.__radius4;
    case 5: return this.__radius5;
    default: return new Array();
  }

}

Position.prototype.toString = function() {

  /*
   * Function Position.toString
   * Returns the position representation to string
   */

  return "%s, %s, %s".format(this.x, this.y, this.z);

}

Position.prototype.copy = function() {

  /*
   * Function Position.copy
   * Memory copy of the position vector
   */

  return new Position(this.x, this.y, this.z);

}

Position.prototype.equals = function(position) {

  /*
   * Function Position.equals
   * Returns true if two positions are equal
   */

  return this.x === position.x && this.y === position.y && this.z === position.z;

}

Position.prototype.add = function(position) {

  /*
   * Function Position.add
   * Adds two position vectors to one another
   */

  return new Position(this.x + position.x, this.y + position.y, this.z + position.z);

}

Position.prototype.subtract = function(position) {

  /*
   * Function Position.subtract
   * Subtracts one position vector from another
   */

  return new Position(this.x - position.x, this.y - position.y, this.z - position.z);

}

Position.prototype.getFacingDirection = function(position) {

  /*
   * Function Position.getFacingDirection
   * Returns the face direction to another position based on the angle
   */

  // Calculate the angle between the positions
  let angle = Math.atan2(this.y - position.y, this.x - position.x) / Math.PI;

  // Determine the quadrant and thus the look direction
  if(angle >= -0.75 && angle < -0.25) {
    return this.SOUTH;
  } else if(angle >= -0.25 && angle < 0.25) {
    return this.WEST;
  } else if(angle >= 0.25 && angle < 0.75) {
    return this.NORTH;
  } else {
    return this.EAST;
  }

}

Position.prototype.west = function() {

  /*
   * Function Position.west
   * Returns position west of this position
   */

  return new Position(this.x - 1, this.y, this.z);

}

Position.prototype.north = function() {

  /*
   * Function Position.north
   * Returns position north of this position
   */

  return new Position(this.x, this.y - 1, this.z);

}

Position.prototype.east = function() {

  /*
   * Function Position.east
   * Returns position east of this position
   */

  return new Position(this.x + 1, this.y, this.z);

}

Position.prototype.south = function() {

  /*
   * Function Position.south
   * Returns position south of this position
   */

  return new Position(this.x, this.y + 1, this.z);

}

Position.prototype.up = function() {

  /*
   * Function Position.up
   * Returns up position
   */

  return new Position(this.x, this.y, this.z + 1);

}

Position.prototype.down = function() {

  /*
   * Function Position.down
   * Returns up position
   */

  return new Position(this.x, this.y, this.z - 1);

}

Position.prototype.northwest = function() {

  /*
   * Function Position.northwest
   * Returns northwest position
   */

  return new Position(this.x - 1, this.y - 1, this.z);

}

Position.prototype.northeast = function() {

  /*
   * Function Position.northeast
   * Returns northeast position
   */

  return new Position(this.x + 1, this.y - 1, this.z);

}

Position.prototype.southeast = function() {

  /*
   * Function Position.southeast
   * Returns southeast position
   */

  return new Position(this.x + 1, this.y + 1, this.z);

}

Position.prototype.southwest = function() {

  /*
   * Function Position.southwest
   * Returns southwest position
   */

  return new Position(this.x - 1, this.y + 1, this.z);

}

Position.prototype.ladderNorth = function() {

  return this.north().up();

}

Position.prototype.ladder = function() {

  /*
   * Function Position.ladder
   * Returns the position after clicking a ladder which is up and south
   */

  return this.south().up();

}

Position.prototype.random = function() {

  /*
   * Function Position.random
   * Returns a random NESW position around the current position
   */

  // Draw a random sample
  switch(Number.prototype.random(0, 3)) {
    case 0: return this.north();
    case 1: return this.east();
    case 2: return this.south();
    case 3: return this.west();
  }

}

Position.prototype.isDiagonal = function(position) {

  /*
   * Function Position.isDiagonal
   * Returns true when a position is diagonal to another position
   */

  return (Math.abs(this.x - position.x) & Math.abs(this.y - position.y)) === 1;

}

Position.prototype.toJSON = function() {

  /*
   * Function Position.toJSON
   * Serializes the position as a buffer and implements the JSON Stringify interface
   */

  return new Object({
    "x": this.x,
    "y": this.y,
    "z": this.z
  });

}

Position.prototype.manhattanDistance = function(position) {

  /*
   * Function Position.manhattanDistance
   * Returns the Manhattan distance between two positions
   */

  return Math.abs(this.x - position.x) + Math.abs(this.y - position.y);

}

Position.prototype.pythagoreanDistance = function(position) {

  /*
   * Function Position.pythagoreanDistance
   * Returns the 2D Pythagorean distance between two positions (ceiled)
   */

  return Math.ceil(Math.sqrt(Math.pow((this.x - position.x), 2) + Math.pow((this.y - position.y), 2)));

}

Position.prototype.isWithinRangeOf = function(position, range) {

  /*
   * Function Position.isWithinRangeOf
   * Returns true if the other passed position is within a certain range
   */

  if(this.z !== position.z) {
    return false;
  }

  // Pythagorean distance
  return this.pythagoreanDistance(position) < range;

}

Position.prototype.besides = function(position) {

  /*
   * Function WorldPosition.besides
   * Returns true if one position is besides another position
   */

  // Never besides
  if(this.z !== position.z) {
    return false;
  }

  // The same tile equals true
  if(this.equals(position)) {
    return true;
  }

  // Otherwise a difference of one means besides
  return Math.max(Math.abs(this.x - position.x), Math.abs(this.y - position.y)) === 1;

}

Position.prototype.isReachable = function(position) {

  /*
   * Function Position.isReachable
   * Returns true if one position is reachable from another
   */

  // Must be within viewing range and on the same floor
  return this.z === position.z && Math.abs(this.x - position.x) < 8 && Math.abs(this.y - position.y) < 6;

}

Position.prototype.__getSquare = function(size) {

  /*
   * Function Position.__getSquare
   * Internal function that generates positions within a circle around 0, 0
   */

  let positions = new Array();

  for(let x = -size; x <= size; x++) {
    for(let y = -size; y <= size; y++) {
      positions.push(new Position(x, y, 0));
    }
  }

  return positions;

}

Position.prototype.__getRadius = function(radius) {

  /*
   * Function Position.__getRadius
   * Internal function that generates positions within a circle around 0, 0
   */

  let positions = new Array();

  for(let x = -radius; x <= radius; x++) {
    for(let y = -radius; y <= radius; y++) {

      // Only include what is inside the circle
      if((x * x + y * y) > (radius * radius)) {
        continue;
      }

      positions.push(new Position(x, y, 0));

    }
  }
  
  return positions;

}

// Cache radius positions so we do not have to generate them every time they are requested
Position.prototype.__radius2 = Position.prototype.__getRadius(2);
Position.prototype.__radius3 = Position.prototype.__getRadius(3);
Position.prototype.__radius4 = Position.prototype.__getRadius(4);
Position.prototype.__radius5 = Position.prototype.__getRadius(5);

Position.prototype.__square1 = Position.prototype.__getSquare(1);
Position.prototype.__square2 = Position.prototype.__getSquare(2);
Position.prototype.__square3 = Position.prototype.__getSquare(3);

module.exports = Position;
