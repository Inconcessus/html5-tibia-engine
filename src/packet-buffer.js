const PacketBuffer = function() {

  /*
   * Class PacketBuffer
   * Buffer that collects packets and only flushes the buffer / concatenates the data to write a single message per frame
   *
   * API:
   *
   * @PacketBuffer.add(buffer) - adds a buffer to the main buffer
   * @PacketBuffer.flush() - flushes the outgoing buffer by emptying it and returning the concatenation of all buffers
   * @PacketBuffer.isEmpty() - Returns true if the buffer is empty
   * 
   */

  // Collect the buffers
  this.__buffers = new Array();

  // State variable that is updated when a new packet is received with the new time
  this.__lastPacketReceived = Date.now();

}

PacketBuffer.prototype.add = function(buffer) {

  /*
   * Function PacketBuffer.add
   * Buffer that collects packets and only flushes the buffer / concatenates the data to write a single message per frame
   */

  this.__buffers.push(buffer);
  this.__lastPacketReceived = Date.now();

}

PacketBuffer.prototype.flush = function() {

  /*
   * Function PacketBuffer.flush
   * Flushes and resets the buffer
   */

  let buffer = Buffer.concat(this.__buffers);
  this.__buffers = new Array();

  return buffer;

}

PacketBuffer.prototype.isEmpty = function() {

  /*
   * Function PacketBuffer.isEmpty
   * Returns true if there are no messages in the buffer
   */

  return this.__buffers.length === 0;

}

module.exports = PacketBuffer;
