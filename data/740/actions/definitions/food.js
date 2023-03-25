const Condition = requireModule("condition");

// Add this to the item definitions?
const lookup = new Object({
  "2362": {"ticks": 5, "sound": "Crunch."}, // carrot
  "2666": {"ticks": 15, "sound": "Munch."}, // meat
  "2667": {"ticks": 12, "sound": "Munch."}, // fish
  "2668": {"ticks": 10, "sound": "Mmmm."}, // salmon
  "2669": {"ticks": 17, "sound": "Munch."}, // northern pike
  "2670": {"ticks": 4, "sound": "Gulp."}, // shrimp
  "2671": {"ticks": 30, "sound": "Chomp."}, // ham
  "2672": {"ticks": 60, "sound": "Chomp."}, // dragon ham
  "2673": {"ticks": 5, "sound": "Yum."}, // pear
  "2674": {"ticks": 6, "sound": "Yum."}, // red apple
  "2675": {"ticks": 13, "sound": "Yum."}, // orange
  "2676": {"ticks": 8, "sound": "Yum."}, // banana
  "2677": {"ticks": 1, "sound": "Yum."}, // blueberry
  "2678": {"ticks": 18, "sound": "Slurp."}, // coconut
  "2679": {"ticks": 1, "sound": "Yum."}, // cherry
  "2680": {"ticks": 2, "sound": "Yum."}, // strawberry
  "2681": {"ticks": 9, "sound": "Yum."}, // grapes
  "2682": {"ticks": 20, "sound": "Yum."}, // melon
  "2683": {"ticks": 17, "sound": "Munch."}, // pumpkin
  "2684": {"ticks": 5, "sound": "Crunch."}, // carrot
  "2685": {"ticks": 6, "sound": "Munch."}, // tomato
  "2686": {"ticks": 9, "sound": "Crunch."}, // corncob
  "2687": {"ticks": 2, "sound": "Crunch."}, // cookie
  "2688": {"ticks": 2, "sound": "Munch."}, // candy cane
  "2689": {"ticks": 10, "sound": "Crunch."}, // bread
  "2690": {"ticks": 3, "sound": "Crunch."}, // roll
  "2691": {"ticks": 8, "sound": "Crunch."}, // brown bread
  "2695": {"ticks": 6, "sound": "Gulp."}, // egg
  "2696": {"ticks": 9, "sound": "Smack."}, // cheese
  "2787": {"ticks": 9, "sound": "Munch."}, // white mushroom
  "2788": {"ticks": 4, "sound": "Munch."}, // red mushroom
  "2789": {"ticks": 22, "sound": "Munch."}, // brown mushroom
  "2790": {"ticks": 30, "sound": "Munch."}, // orange mushroom
  "2791": {"ticks": 9, "sound": "Munch."}, // wood mushroom
  "2792": {"ticks": 6, "sound": "Munch."}, // dark mushroom
  "2793": {"ticks": 12, "sound": "Munch."}, // some mushrooms
  "2794": {"ticks": 3, "sound": "Munch."}, // some mushrooms
  "2795": {"ticks": 36, "sound": "Munch."}, // fire mushroom
  "2796": {"ticks": 5, "sound": "Munch."} // green mushroom
})

module.exports = function playerEatFood(player, thing, index, item) {

  /*
   * Function playerEatFood
   * Writes a little text message and removes one of the item
   */

  // Does not exist
  if(!lookup.hasOwnProperty(item.id)) {
    return false;
  }

  let { ticks, sound } = lookup[item.id];

  // Extend the sated condition
  if(player.isSated(ticks)) {
    return player.sendCancelMessage("You are sated.");
  }

  // Extend the sated condition
  player.extendCondition(Condition.prototype.SATED, ticks, 600, null);

  player.sayEmote(sound, CONST.COLOR.ORANGE);

  // Refactor
  thing.removeIndex(index, 1);

}