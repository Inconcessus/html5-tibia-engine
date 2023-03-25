const Condition = requireModule("condition");

module.exports = function exura(properties) {

  if(!this.addCondition(Condition.prototype.INVISIBLE, 100, 1)) {
    return 0;
  }

  return 50;

}