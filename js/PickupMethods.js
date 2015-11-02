var PickupMethods = PickupMethods || {};

PickupMethods.heal = function(pickup) {
  var target = pickup.pickup.parameters.target;

  target.health.hp += pickup.pickup.parameters.healAmount;

  if (target.health.hp > target.health.maxHP) {
    target.health.hp = target.health.maxHP;
  }

  target.health.changed = true;

  var geometry = pickup.drawable.mesh.geometry;
  var material = pickup.drawable.mesh.material;

  pickup.drawable.scene.remove(pickup.drawable.mesh);

  geometry.dispose();

  if (material.materials) {
    material.materials.forEach(function(mat) {
      mat.dispose();
    });
  }

  if (material.dispose) {
    material.dispose();
  }

  pickup.remove();
};

PickupMethods.increaseAmmo = function(pickup) {
  var target = pickup.pickup.parameters.target;
  var currentGun = pickup.pickup.parameters.gun;

  target.ammo.currentAmmo[currentGun] += pickup.pickup.parameters.ammoAmount;

  if (target.ammo.currentAmmo[currentGun] > target.ammo.maxAmmo[currentGun]) {
    target.ammo.currentAmmo[currentGun] = target.ammo.maxAmmo[currentGun];
  }

  var geometry = pickup.drawable.mesh.geometry;
  var material = pickup.drawable.mesh.material;

  pickup.drawable.scene.remove(pickup.drawable.mesh);

  geometry.dispose();

  if (material.materials) {
    material.materials.forEach(function(mat) {
      mat.dispose();
    });
  }

  if (material.dispose) {
    material.dispose();
  }

  pickup.remove();
};

module.exports = PickupMethods;

