module.exports = Hurt;

function Hurt() {
  this.timer = 0;
  this.invulnerabilityFrames = 1;

  this.hurtColor = new THREE.Color(0xdd0000);
  this.originalColor = 0xffffff;
}

