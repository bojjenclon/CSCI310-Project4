var Utils = Utils || {};

Utils.randomRange = function(min, max) {
  return Math.random() * (max - min) + min;
};

module.exports = Utils;

