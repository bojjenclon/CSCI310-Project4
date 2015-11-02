module.exports = Shield;

function Shield() {
  this.currentValue = 100;
  this.maxValue = 100;

  this.rechargeRate = 0.1;

  this.timer = 0;
  this.rechargeDelay = 1.5;

  this.enabled = false;
  this.changed = false;
}

