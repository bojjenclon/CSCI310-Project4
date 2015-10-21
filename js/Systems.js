var C = require('./Components.js');

MovementSystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var moveables = this.entities.queryComponents([C.Position, C.Velocity]);

    moveables.forEach(function(entity) {
      if (entity.hasComponent(C.Drawable)) {
        entity.drawable.mesh.applyCentralImpulse(entity.velocity, new THREE.Vector3());

        entity.position.x = entity.drawable.mesh.position.x;
        entity.position.y = entity.drawable.mesh.position.y;
        entity.position.z = entity.drawable.mesh.position.z;
      }
      else {
        entity.position.x += entity.velocity.x * dt;
        entity.position.y += entity.velocity.y * dt;
        entity.position.z += entity.velocity.z * dt;
      }

      entity.velocity.x *= 0.95;
      entity.velocity.y *= 0.95;
      entity.velocity.z *= 0.95;
    });
  }
});

ExpirableSystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var expirables = this.entities.queryComponents([C.Expirable]);

    expirables.forEach(function(entity) {
      entity.expirable.age += dt;

      if (entity.expirable.age >= entity.expirable.maxAge) {
        if (entity.hasComponent(C.Drawable)) {
          entity.drawable.scene.remove(entity.drawable.mesh);
        }

        entity.remove();
      }
    });
  }
});

BulletSystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var bullets = this.entities.queryTag("bullet");

    bullets.forEach(function(entity) {
      entity.position.x += entity.velocity.x;
      entity.position.y += entity.velocity.y;
      entity.position.z += entity.velocity.z;
    });
  }
});

