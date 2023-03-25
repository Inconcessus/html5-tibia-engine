const Condition = requireModule("condition");

module.exports = function exura(properties) {

  this.addCondition(Condition.prototype.HEALING, 5, 10);

  return 100;

}