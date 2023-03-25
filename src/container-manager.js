"use strict";

const DepotContainer = require("./depot");
const Equipment = require("./equipment");
const Keyring = require("./keyring");
const Thing = require("./thing");
const Inbox = require("./inbox");

const ContainerManager = function(player, depot, equipment, keyring, inbox) {

  /*
   * Class ContainerManager
   * Manager for all the containers that a player has opened (e.g., depot, backpacks, equipment, corpses)
   *
   * API:
   *
   * ContainerManager.getContainerFromId(cid) - Returns the container from a unique container identifier
   * ContainerManager.toggleContainer(container) - Toggles a container between opened/closed
   * ContainerManager.closeAll() - Closes all opened containers (e.g., when logging out)
   * ContainerManager.checkContainer(container) - Checks whether a single container can still be opened by the player (e.g., after container move)
   * ContainerManager.checkContainers() - Checks whether all containers can still be opened by the player (e.g., after player move)
   *
   */

  // Must circular reference the player
  this.__player = player;

  this.__openedContainers = new Set();

  // Depots and equipments are owned by individual players
  this.depot = new DepotContainer(this.DEPOT, depot);
  this.equipment = new Equipment(this.EQUIPMENT, player, equipment);
  this.keyring = new Keyring(this.KEYRING, player, keyring);
  this.inbox = new Inbox(player, inbox);

}

ContainerManager.prototype.MAXIMUM_OPENED_CONTAINERS = 5;
ContainerManager.prototype.EQUIPMENT = 0x00;
ContainerManager.prototype.DEPOT = 0x01;
ContainerManager.prototype.KEYRING = 0x02;

ContainerManager.prototype.getContainerFromId = function(cid) {

  /*
   * Function Player.getContainerFromId
   * Returns the container that is referenced by a unique identifier
   */

  // Simple mapping of the container identifier
  switch(cid) {
    case this.DEPOT: return (this.depot.isClosed() ? null : this.depot);
    case this.EQUIPMENT: return this.equipment;
    case this.KEYRING: return this.keyring;
    default: return this.__findContainer(cid);
  }

}

ContainerManager.prototype.toggleContainer = function(container) {

  /*
   * Function ContainerManager.toggleContainer
   * Toggles a container between open and closed
   */

  // Either open or close it
  if(this.__openedContainers.has(container)) {
    return this.closeContainer(container);
  }

  if(container.isDepot() && this.__openedContainers.has(this.depot)) {
    return this.closeContainer(this.depot);
  }

  return this.__openContainer(container);

}

ContainerManager.prototype.closeAll = function() {

  /*
   * Function ContainerManager.closeAll
   * Closes all the containers that are opened by the player
   */

  this.__openedContainers.forEach(container => this.closeContainer(container));

}

ContainerManager.prototype.checkContainer = function(container) {

  /*
   * Function ContainerManager.checkContainer
   * Confirms whether a player can still see a container and keep it open
   */

  // Walk up a nested container chain to get the parent tile or character
  let parentThing = container.getTopParent();

  // The parent is the player and can always remain opened
  if(parentThing === this.__player) {
    return;
  }

  // If the parent is a depot but the depot is closed we need to eliminate the container
  if(parentThing === this.depot && !this.depot.isClosed()) {
    return this.closeContainer(container);
  }

  // The container is on a tile and not besides the player anymore
  if(!this.__player.isBesidesThing(parentThing)) {
    return this.closeContainer(container);
  }

}

ContainerManager.prototype.checkContainers = function() {

  /*
   * Function ContainerManager.checkContainers
   * Goes over all the containers to check whether they can still be opened by the character
   */

  this.__openedContainers.forEach(this.checkContainer, this);

}

ContainerManager.prototype.closeContainer = function(container) {

  /*
   * Function ContainerManager.closeContainer
   * Closes a container and writes it to disk
   */

  // Guard
  if(!this.__openedContainers.has(container)) {
    return;
  }

  // Deference the container in a circular way
  this.__openedContainers.delete(container);

  // Close the container
  if(container === this.depot) {
    this.depot.openAtPosition(null);
    this.__player.closeContainer(this.depot.container);
  } else {
    this.__player.closeContainer(container.container);
  }

}

ContainerManager.prototype.__findContainer = function(cid) { 

  /*
   * Function ContainerManager.__findContainer
   * Finds a container by completing a linear search in all opened containers
   */

  // Confirm that the player has the container opened
  for(let container of this.__openedContainers) {

    // Ignore the depot if it is opened
    if(container === this.depot || container === this.keyring) {
      continue;
    }

    // Found!
    if(container.hasIdentifier(cid)) {
      return container;
    }

  }

  // The container was not found
  return null;

}

ContainerManager.prototype.openKeyring = function() {

  // Open the depot at the position
  if(this.__openedContainers.has(this.keyring)) {
    this.__openedContainers.delete(this.keyring);
    return this.__player.closeContainer(this.keyring.container);
  }

  this.__openedContainers.add(this.keyring);
  this.__player.openContainer(1987, "Keyring", this.keyring.container);

}

ContainerManager.prototype.__openContainer = function(container) {

  /*
   * Function ContainerManager.__openContainer
   * Writes packet to open a container
   */

  // Already opened..?
  if(this.__openedContainers.has(container)) {
    return;
  }

  // A maximum of N containers can be referenced
  if(this.__openedContainers.size >= this.MAXIMUM_OPENED_CONTAINERS) {
    return this.__player.sendCancelMessage("You cannot open any more containers.");
  }

  // Sanity check for opening two depots
  if(container.isDepot() && !this.depot.isClosed()) {
    return this.__player.sendCancelMessage("You already have another locker opened.");
  }

  // Open the depot or a simple container
  if(!container.isDepot()) {
    this.__openedContainers.add(container);
    return this.__player.openContainer(container.id, container.getName(), container.container);
  }

  // Open the depot at the position
  this.__openedContainers.add(this.depot);
  this.depot.openAtPosition(container.getPosition());
  this.__player.openContainer(container.id, "Depot", this.depot.container);

}

module.exports = ContainerManager;