module.exports = ShootDelay;

function ShootDelay() {
  this.canShoot = true;

  this.timer = 0;
  this.delayTheshold = 0.2;
}

