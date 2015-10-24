module.exports = Health;

function Health() {
  this.hp = 3;
  this.maxHP = 3;

  this.healthBar = null;

  this.changed = false;
}

