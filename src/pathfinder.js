"use strict";

const BinaryHeap = require("./binary-heap");

const Pathfinder = function() {

  /*
   * Class Pathfinder
   * A* algorithm using a binary heap to find monster pathing
   */

  this.__dirtyNodes = new Array();

}

Pathfinder.prototype.ADJACENT = 0x00;
Pathfinder.prototype.EXACT = 0x01;

Pathfinder.prototype.search = function(creature, from, to, mode) {

  /*
   * Function Pathfinder.search
   * Searches connection from tile to tile
   */

  // Clean all the dirty nodes
  this.__dirtyNodes.forEach(tile => tile.cleanPathfinding());
  this.__dirtyNodes = new Array(from);

  from.__h = this.heuristic(from, to);

  // Create a new binary heap to help with pathfinding priority queue
  let openHeap = new BinaryHeap();

  // Add the first tile to the heap
  openHeap.push(from);

  // Find path in the open heap
  while(openHeap.size() > 0) {

    // Get the current node
    let currentNode = openHeap.pop();

    // Found the end of the traversal: must be adjacent to end
    if(mode === this.ADJACENT) {
      if(to.neighbours.includes(currentNode)) {
        return this.pathTo(currentNode);
      }
    } else if(mode === this.EXACT) {
      if(currentNode === to) {
        return this.pathTo(currentNode);
      }
    }

    // Set the current node to closed: no need to revisit
    currentNode.__closed = true;

    // Each tile references its neighbours: check them for cost
    for(let i = 0; i < currentNode.neighbours.length; i++) {

      let neighbourNode = currentNode.neighbours[i];

      // Node was already closed or is not walkable (or occupied)
      if(neighbourNode.__closed || creature.isTileOccupied(neighbourNode)) {
        continue;
      }

      // Add a penalty to diagonal movement (only done when absolutely necessary)
      let penalty = currentNode.position.isDiagonal(neighbourNode.position) ? 3 : 1;

      // Add the cost of the current node
      let gScore = currentNode.__g + penalty * neighbourNode.getCost(currentNode);
      let visited = neighbourNode.__visited;

      // Not yet visited or better (lower) cost score
      if(!visited || gScore < neighbourNode.__g) {

        // Update the node information
        neighbourNode.__visited = true;
        neighbourNode.__parent = currentNode;
        neighbourNode.__h = neighbourNode.__h || this.heuristic(neighbourNode, to);
        neighbourNode.__g = gScore;
        neighbourNode.__f = neighbourNode.__g + neighbourNode.__h;

        // Reference so we can clean it later
        this.__dirtyNodes.push(neighbourNode);

        // Either rescore or add to the heap!
        if(!visited) {
          openHeap.push(neighbourNode);
        } else {
          openHeap.rescoreElement(neighbourNode);
        }

      }

    }

  }

  // No path found
  return new Array();

}

Pathfinder.prototype.heuristic = function(from, to) {

  /*
   * Function World.heuristic
   * Manhattan heuristic to help A* search: can add other types too
   */

  return from.position.manhattanDistance(to.position);

}

Pathfinder.prototype.pathTo = function(tile) {

  /*
   * Function pathTo
   * Returns the path to a node following an A* path
   */

  let path = new Array();

  while(tile.__parent) {
    path.push(tile);
    tile = tile.__parent;
  }

  return path;

}

module.exports = Pathfinder;