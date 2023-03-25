const Condition = requireModule("condition");

module.exports = function morph(properties) {

  this.addCondition(Condition.prototype.MORPH, 1, 100, {"id": 74});

  return 100;

}