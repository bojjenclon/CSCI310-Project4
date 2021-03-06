/*
 * Exports all known components for easier use in modules that require the use of components
 */

module.exports = {
  Identifier: require('./components/Identifier.js'),
  Position: require('./components/Position.js'),
  Velocity: require('./components/Velocity.js'),
  Jump: require('./components/Jump.js'),
  Drawable: require('./components/Drawable.js'),
  Expirable: require('./components/Expirable.js'),
  CameraFollow: require('./components/CameraFollow.js'),
  ShootDelay: require('./components/ShootDelay.js'),
  OneTimeHit: require('./components/OneTimeHit.js'),
  Hurt: require('./components/Hurt.js'),
  Health: require('./components/Health.js'),
  Bullet: require('./components/Bullet.js'),
  AI: require('./components/Ai.js'),
  Steaming: require('./components/Steaming.js'),
  CameraPitch: require('./components/CameraPitch.js'),
  Gun: require('./components/Gun.js'),
  Ammo: require('./components/Ammo.js'),
  Shield: require('./components/Shield.js'),
  Pickup: require('./components/Pickup.js'),
  DropsPickup: require('./components/DropsPickup.js')
};

