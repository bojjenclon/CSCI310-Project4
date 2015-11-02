var Utils = Utils || {};

Utils.randomRange = function(min, max) {
  return Math.random() * (max - min) + min;
};

Utils.damageShield = function(entity, damage) {
  var difference = 0;

  if (entity.shield.currentValue < damage) {
    difference = damage - entity.shield.currentValue;
  }

  entity.shield.currentValue -= damage;

  if (entity.shield.currentValue <= 0) {
    entity.shield.currentValue = 0;
    entity.shield.enabled = false;
  }

  entity.shield.timer = 0;
  entity.shield.changed = true;

  if (difference > 0) {
    entity.health.hp -= difference;
    entity.health.changed = true;

    entity.shield.enabled = false;
  }
};

module.exports = Utils;

