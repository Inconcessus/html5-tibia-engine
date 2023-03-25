const assert = require("assert");
const Container = requireModule("container");

function testContainerAddGoldWeight() {

  /*
   * Function testContainerAddGoldWeight
   * Tests adding 20 stacks of 100 gold ot the container
   */

  let container = process.gameServer.database.createThing(1988);

  for(let i = 0; i < 20; i++) {
    container.addThing(process.gameServer.database.createThing(2148).setCount(100), i);
  }

  assert(container.getWeight() === 21800);

}

function testContainerStackGold() {

  /*
   * Function testContainerStackGold
   * Tests adding two stacks of 50 gold together in a container
   */

  let container = process.gameServer.database.createThing(1988);

  container.addThing(process.gameServer.database.createThing(2148).setCount(50), 0);
  container.addThing(process.gameServer.database.createThing(2148).setCount(50), 0);

  assert(container.container.__slots[0].count === 100);

}

function testAddFirstEmpty() {

  let container = process.gameServer.database.createThing(1988);

  for(let i = 0; i < 20; i++) {
    container.addFirstEmpty(process.gameServer.database.createThing(2148).setCount(i));
  }

  for(let i = 0; i < 20; i++) {
    assert(container.container.__slots[i].count === i)
  }

}

function testAddNonPickupable() {

  let container = process.gameServer.database.createThing(1988);
  container.addThing(process.gameServer.database.createThing(1304), 0);

  assert(container.getNumberOfItems() === 0)

}

function testContainerStackOverflow() {

  /*
   * Function testContainerStackOverflow
   * Tests an overflow of 50 + 100 gold coins in a container
   */

  let container = process.gameServer.database.createThing(1988);

  container.addThing(process.gameServer.database.createThing(2148).setCount(50), 0);
  container.addThing(process.gameServer.database.createThing(2148).setCount(100), 0);

  assert(container.container.__slots[0].count === 100);
  assert(container.container.__slots[0].getWeight() === 1000);
  assert(container.container.__slots[1].count === 50);
  assert(container.container.__slots[1].getWeight() === 500);

  assert(container.getWeight() === 3300);

}

function testAddGoldAndPlatinum() {

  let container = process.gameServer.database.createThing(1988);

  for(let i = 1; i < 20; i++ ) {
    container.addThing(process.gameServer.database.createThing(2148).setCount(100), i);
  }

  // Second and third line are ignored
  container.addThing(process.gameServer.database.createThing(2148).setCount(90), 0);
  container.addThing(process.gameServer.database.createThing(2158), 0);
  container.addThing(process.gameServer.database.createThing(2148).setCount(15), 0);
  container.addThing(process.gameServer.database.createThing(2148).setCount(10), 0);

  assert(container.getWeight() === 21800);

}

function testContainerSuperOverflow() {

  /*
   * Function testContainerSuperOverflow
   * Tests continuous adding of 1 gold to the first container slot
   */

  let container = process.gameServer.database.createThing(1988);

  for(let i = 0; i < 119; i++) {
    container.addThing(process.gameServer.database.createThing(2148).setCount(1), 0);
  }

  assert(container.container.__slots[0].count === 100);

  for(let i = 1; i < 20; i++) {
    assert(container.container.__slots[i].count === 1);
  }

}

module.exports = [
  testContainerAddGoldWeight,
  testContainerStackGold,
  testContainerStackOverflow,
  testContainerSuperOverflow,
  testAddGoldAndPlatinum,
  testAddNonPickupable,
  testAddFirstEmpty
]