const PathfindNode = function() {

  this.__parent = null;
  this.__closed = false;
  this.__visited = false;
  this.__f = 0;
  this.__g = 0;
  this.__h = 0;

}

PathfindNode.prototype.clean = function() {

  this.__parent = null;
  this.__closed = false;
  this.__visited = false;
  this.__f = 0;
  this.__g = 0;
  this.__h = 0;

}

module.exports = PathfindNode;