"use strict";

const PacketReader = require("./packet-reader");

function NetworkManager() {

  /*
   * Class NetworkManager
   * Accepts all the incoming network messages and delegates to the appropriate handlers
   *
   * API:
   *
   * @NetworkManager.writeOutgoingBuffer(socket) - writes the outgoing buffered messages to the socket
   * @NetworkManager.readIncomingBuffer(socket) - reads the incoming buffered messages from the socket
   * @NetworkManager.getDataDetails() - returns the number of bytes written/read by the server
   *
   */

  // State variables
  this.__bytesRecv = 0;
  this.__bytesSent = 0;

}

NetworkManager.prototype.getDataDetails = function(gameSocket) {

  /*
   * Function WebsocketServer.getDataDetails
   * Gets the data details (received & sent) from the network manager
   */

  return new Object({
    "received": this.__bytesRecv,
    "sent": this.__bytesSent
  });

}

NetworkManager.prototype.writeOutgoingBuffer = function(gameSocket) {

  /*
   * Function WebsocketServer.writeOutgoingBuffer
   * Flushes the outgoing network buffer to the client
   */

  // Ignore if the socket was already destroyed
  if(gameSocket.socket.destroyed) {
    return;
  }

  // No messages
  if(gameSocket.outgoingBuffer.isEmpty()) {
    return;
  }

  let message = gameSocket.outgoingBuffer.flush();
  this.__bytesSent += message.length;

  gameSocket.socket.send(message);

}

NetworkManager.prototype.handleIO = function(gameSocket) {

  this.readIncomingBuffer(gameSocket);
  this.writeOutgoingBuffer(gameSocket);

}

NetworkManager.prototype.readIncomingBuffer = function(gameSocket) {

  /*
   * Function GameServer.readIncomingBuffer
   * Flushes the incoming network message buffer
   */

  // Read the incoming buffer
  let buffer = gameSocket.incomingBuffer.flush();

  // Block excessively large inputs by the users
  if(buffer.length > CONFIG.SERVER.MAX_PACKET_SIZE) {
    return gameSocket.close();
  }

  // Class to easily read a buffer sequentially
  let packet = new PacketReader(buffer);

  // Append the number of bytes received by the server
  this.__bytesRecv += packet.buffer.length;

  // Keep parsing the incoming buffer
  while(packet.isReadable()) {

    // Prevent reading the incoming buffer if the socket was destroyed
    if(gameSocket.socket.destroyed) {
      return;
    }

    // Parsing client packets is very dangerous so wrap in a try/catch. Should probably verify length of packets!
    try {
      this.__readPacket(gameSocket, packet);
    } catch(exception) {
      console.trace(exception);
      return gameSocket.close();
    }

  }

}

NetworkManager.prototype.__readPacket = function(gameSocket, packet) {

  /*
   * Function NetworkManager.__readPacket
   * Reads a single packet from the passed buffer
   */

  // Read the opcode of the packet
  let opcode = packet.readUInt8();

  // The packet operational code
  switch(opcode) {

    // Cancel target packet is requested (esc key)
    case PacketReader.prototype.opcodes.BUY_OFFER.code: {
       return gameSocket.player.handleBuyOffer(packet.readBuyOffer());
    }

    // Cancel target packet is requested (esc key)
    case PacketReader.prototype.opcodes.TARGET_CANCEL.code: {
       return gameSocket.player.setTarget(null);
    }

    // Adding friend packet is received
    case PacketReader.prototype.opcodes.ADD_FRIEND.code: {
      return gameSocket.player.friendlist.add(packet.readString());
    }

    // Remove friend packet is received
    case PacketReader.prototype.opcodes.REMOVE_FRIEND.code: {
      return gameSocket.player.friendlist.remove(packet.readString());
    }

    // Packet that requests looking at an item
    case PacketReader.prototype.opcodes.ITEM_LOOK_ALL.code: {
      return process.gameServer.world.packetHandler.handleItemLook(gameSocket.player, packet.readPositionAndIndex(gameSocket.player));
    }

    // An outfit change is requested
    case PacketReader.prototype.opcodes.ITEM_USE_ALL.code: {
      return process.gameServer.world.packetHandler.handleItemUse(gameSocket.player, packet.readPositionAndIndex(gameSocket.player));
    }

    // An outfit change is requested
    case PacketReader.prototype.opcodes.ITEM_USE_WITH.code: {
      return gameSocket.player.handleActionUseWith(packet.readItemUseWith(gameSocket.player));
    }

    case PacketReader.prototype.opcodes.CHANGE_OUTFIT.code: {
      return gameSocket.player.changeOutfit(packet.readOutfit());
    }

    case PacketReader.prototype.opcodes.LEAVE_CHANNEL.code: {
      return process.gameServer.world.channelManager.leaveChannel(gameSocket.player, packet.readUInt8());
    }

    case PacketReader.prototype.opcodes.JOIN_CHANNEL.code: {
      return process.gameServer.world.channelManager.joinChannel(gameSocket.player, packet.readUInt8());
    }

    // A spell was casted by the player
    case PacketReader.prototype.opcodes.CAST_SPELL.code: {
      return gameSocket.player.spellbook.handleSpell(packet.readUInt16());
    }

    // An item move was requested
    case PacketReader.prototype.opcodes.MOVE_ITEM_ALL.code: {
      return process.gameServer.world.packetHandler.moveItem(gameSocket.player, packet.readMoveItem(gameSocket.player));
    }

    case PacketReader.prototype.opcodes.PLAYER_TURN.code: {
      return gameSocket.player.setDirection(packet.readUInt8());
    }

    case PacketReader.prototype.opcodes.CONTAINER_CLOSE.code: {
      return process.gameServer.world.packetHandler.handleContainerClose(gameSocket.player, packet.readUInt32());
    }

    case PacketReader.prototype.opcodes.OPEN_KEYRING.code: {
      return gameSocket.player.containerManager.openKeyring();
    }

    case PacketReader.prototype.opcodes.TARGET_CREATURE.code: {
      return process.gameServer.world.packetHandler.handleTargetCreature(gameSocket.player, packet.readUInt32());
    }

    case PacketReader.prototype.opcodes.CLIENT_USE_TILE.code: {
      return process.gameServer.world.packetHandler.handleTileUse(gameSocket.player, packet.readWorldPosition());
    }

    // A string is sent by the player
    case PacketReader.prototype.opcodes.CLIENT_MESSAGE.code: {
      return process.gameServer.world.packetHandler.handlePlayerSay(gameSocket.player, packet.readClientMessage());
    }

    case PacketReader.prototype.opcodes.REQUEST_LOGOUT.code: {
      return process.gameServer.world.packetHandler.handleLogout(gameSocket);
    }

    // A private message is received
    case PacketReader.prototype.opcodes.SEND_PRIVATE_MESSAGE.code: {
      return process.gameServer.world.channelManager.handleSendPrivateMessage(gameSocket.player, packet.readPrivateMessage());
    }

    // All player movement operations (8 directions)
    case PacketReader.prototype.opcodes.MOVE_NORTH.code:
    case PacketReader.prototype.opcodes.MOVE_EAST.code:
    case PacketReader.prototype.opcodes.MOVE_SOUTH.code:
    case PacketReader.prototype.opcodes.MOVE_WEST.code:
    case PacketReader.prototype.opcodes.MOVE_NORTHEAST.code:
    case PacketReader.prototype.opcodes.MOVE_NORTHWEST.code:
    case PacketReader.prototype.opcodes.MOVE_SOUTHEAST.code:
    case PacketReader.prototype.opcodes.MOVE_SOUTHWEST.code:
      return process.gameServer.world.packetHandler.handleMovement(gameSocket.player, opcode);

    // Unknown opcode sent: close the socket immediately
    default: {
      return gameSocket.close();
    }

  }

}

module.exports = NetworkManager;
