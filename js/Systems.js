var C = require('./Components.js');

PlayerInputSystem = Class({
  constructor: function(entities, domElement) {
    this.entities = entities;

    this.keyboard = new THREEx.KeyboardState(domElement);
  },

  update: function(dt) {
    var players = this.entities.queryTag("player");

    players.forEach(function(entity) {
      var velocity = new THREE.Vector3(entity.velocity.x, entity.velocity.y, entity.velocity.z);
      var dv = new THREE.Vector3(); // delta velocity

      if (this.keyboard.pressed("w")) {
        dv.z = -8;
      }
      else if (this.keyboard.pressed("s")) {
        dv.z = 8;
      }

      if (this.keyboard.pressed("a")) {
        dv.x = -8;
      }
      else if (this.keyboard.pressed("d")) {
        dv.x = 8;
      }

      if (entity.velocity.rotationMatrix !== null) {
        var rotationMatrix = new THREE.Matrix4().extractRotation(entity.cameraFollow.object.matrix);
        dv = dv.applyMatrix4(rotationMatrix);
      }

      velocity.add(dv);

      entity.velocity.x = velocity.x;
      entity.velocity.y = velocity.y;
      entity.velocity.z = velocity.z;
    }.bind(this));
  }
});

MovementSystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var moveables = this.entities.queryComponents([C.Position, C.Velocity]);

    moveables.forEach(function(entity) {
      var velocity = new THREE.Vector3(entity.velocity.x, entity.velocity.y, entity.velocity.z);

      if (entity.hasComponent(C.Drawable)) {
        entity.drawable.mesh.applyCentralImpulse(velocity, new THREE.Vector3());
        //entity.drawable.mesh.setLinearVelocity(entity.velocity);
      }
      else {
        entity.position.x += velocity.x * dt;
        entity.position.y += velocity.y * dt;
        entity.position.z += velocity.z * dt;
      }
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

CameraRotationSystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var follows = this.entities.queryComponents([C.CameraFollow, C.Velocity]);

    follows.forEach(function(entity) {
      entity.velocity.rotationMatrix = new THREE.Matrix4().extractRotation(entity.cameraFollow.object.matrix);
    });
  }
});

CameraFollowSystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var follows = this.entities.queryComponents([C.CameraFollow, C.Position, C.Velocity]);

    /*if (follows.length > 1) {
      throw new Error("The camera can only follow one object at a time!");
    }*/

    follows.forEach(function(entity) {
      entity.cameraFollow.object.position.x = entity.position.x;
      entity.cameraFollow.object.position.y = entity.position.y;
      entity.cameraFollow.object.position.z = entity.position.z;
    });
  }
});

PhysicsUpdateSystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var moveables = this.entities.queryComponents([C.Position, C.Velocity, C.Drawable]);

    moveables.forEach(function(entity) {
      entity.position.x = entity.drawable.mesh.position.x;
      entity.position.y = entity.drawable.mesh.position.y;
      entity.position.z = entity.drawable.mesh.position.z;

      entity.velocity.x = entity.drawable.mesh.getLinearVelocity().x;
      entity.velocity.y = entity.drawable.mesh.getLinearVelocity().y;
      entity.velocity.z = entity.drawable.mesh.getLinearVelocity().z;
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

