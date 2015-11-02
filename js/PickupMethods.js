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

module.exports = PickupMethods;

