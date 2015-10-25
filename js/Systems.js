var C = require('./Components.js');

PlayerInputSystem = Class({
  constructor: function(entities) {
    this.entities = entities;

    this.keyboard = new THREEx.KeyboardState();
    this.jumped = false;
  },

  update: function(dt) {
    var players = this.entities.queryTag("player");

    players.forEach(function(entity) {
      var velocity = new THREE.Vector3(entity.velocity.x, entity.velocity.y, entity.velocity.z);
      var dv = new THREE.Vector3(); // delta velocity

      if (this.keyboard.pressed("w")) {
        dv.z = -PlayerInputSystem.MOVE_SPEED;
      }
      else if (this.keyboard.pressed("s")) {
        dv.z = PlayerInputSystem.MOVE_SPEED;
      }

      if (this.keyboard.pressed("a")) {
        dv.x = -PlayerInputSystem.MOVE_SPEED;
      }
      else if (this.keyboard.pressed("d")) {
        dv.x = PlayerInputSystem.MOVE_SPEED;
      }

      if (this.keyboard.pressed("space") && entity.jump.canJump) {
        dv.y = PlayerInputSystem.JUMP_FORCE;
        entity.jump.canJump = false;
      }

      dv = dv.applyMatrix4(entity.velocity.rotationMatrix);

      velocity.add(dv);

      entity.velocity.x = velocity.x;
      entity.velocity.y = velocity.y;
      entity.velocity.z = velocity.z;

      if (entity.shootDelay.canShoot) {
        if (MouseController.instance.wasPressed.left) {
          var direction = new THREE.Vector3();
          entity.cameraFollow.controls.getDirection(direction);

          EntityFactory.instance.makeBullet({
            scene: entity.drawable.scene,
            position: entity.cameraFollow.object.position.clone(),
            rotation: entity.cameraFollow.object.rotation.clone(),
            scale: new THREE.Vector3(0.5, 0.5, 0.5),
            direction: direction,
            rotationMatrix: entity.velocity.rotationMatrix,
            velocity: 35,
            owner: 'player'
          });

          entity.shootDelay.canShoot = false;

          Globals.instance.reloadImg.move_to(0);
          Globals.instance.reloadImg.play();
          Globals.instance.reloadingElement.style.visibility = "visible";
        }
        else if (MouseController.instance.wasPressed.right) {
          var direction = new THREE.Vector3();
          entity.cameraFollow.controls.getDirection(direction);

          EntityFactory.instance.makeBullet({
            scene: entity.drawable.scene,
            position: entity.cameraFollow.object.position.clone(),
            rotation: entity.cameraFollow.object.rotation.clone(),
            scale: new THREE.Vector3(0.5, 0.5, 0.5),
            direction: direction,
            rotationMatrix: entity.velocity.rotationMatrix,
            velocity: 6,
            owner: 'player'
          });

          entity.shootDelay.canShoot = false;

          Globals.instance.reloadImg.move_to(0);
          Globals.instance.reloadImg.play();
          Globals.instance.reloadingElement.style.visibility = "visible";
        }
      }
    }.bind(this));
  }
}, {
  statics: {
    MOVE_SPEED: 50,
    JUMP_FORCE: 2500
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
        entity.drawable.mesh.applyCentralImpulse(velocity);
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
      if (entity.velocity.rotationMatrix === null) {
        return;
      }

      var offset = entity.cameraFollow.offset.clone();
      offset = offset.applyMatrix4(entity.velocity.rotationMatrix);

      entity.cameraFollow.object.position.x = entity.position.x + offset.x;
      entity.cameraFollow.object.position.y = entity.position.y + offset.y;
      entity.cameraFollow.object.position.z = entity.position.z + offset.z;

      entity.drawable.mesh.rotation.x = entity.cameraFollow.object.rotation.x;
      entity.drawable.mesh.rotation.y = entity.cameraFollow.object.rotation.y;
      entity.drawable.mesh.rotation.z = entity.cameraFollow.object.rotation.z;
    });
  }
});

ShootDelaySystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var shooters = this.entities.queryComponents([C.ShootDelay]);

    shooters.forEach(function(entity) {
      if (entity.shootDelay.canShoot === false) {
        entity.shootDelay.timer += dt;

        if (entity.shootDelay.timer > entity.shootDelay.delayTheshold) {
          entity.shootDelay.canShoot = true;
          entity.shootDelay.timer = 0;

          Globals.instance.reloadImg.pause();
          Globals.instance.reloadingElement.style.visibility = "hidden";
        }
      }
    });
  }
});

HurtSystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var hurtables = this.entities.queryComponents([C.Hurt, C.Drawable]);

    hurtables.forEach(function(entity) {
      entity.hurt.timer += dt;

      if (entity.hurt.timer < entity.hurt.invulnerabilityFrames) {
        entity.drawable.mesh.material.color = entity.hurt.hurtColor;

        if (entity.hasTag("player")) {
          Globals.instance.overlayElement.style.backgroundColor = "#bb0000";
          Globals.instance.overlayElement.style.visibility = "visible";
        }
      }
      else {
        entity.drawable.mesh.material.color = entity.hurt.originalColor;

        entity.removeComponent(C.Hurt);

        if (entity.hasTag("player")) {
          Globals.instance.overlayElement.style.visibility = "hidden";
        }
      }
    });
  }
});

PlayerHealthSystem = Class({
  constructor: function(entities) {
    this.entities = entities;

    this.keyboard = new THREEx.KeyboardState();
    this.jumped = false;
  },

  update: function(dt) {
    var players = this.entities.queryTag("player");

    players.forEach(function(entity) {
      if (entity.health.changed === false) {
        return;
      }

      var percent = entity.health.hp / entity.health.maxHP;
      var percentRounded = Math.round(percent * 100);

      var healthElement = Globals.instance.healthElement;
      var color = new THREE.Color(1 - percent, percent, 0);

      healthElement.innerHTML = percentRounded + "%";
      healthElement.style.color = "#" + color.getHexString();
    });
  }
});

HealthBarSystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var mortals = this.entities.queryComponents([C.Health]);

    mortals.forEach(function(entity) {
      if (entity.health.healthBar === null || entity.health.changed === false) {
        return;
      }

      var percent = entity.health.hp / entity.health.maxHP;

      entity.health.healthBar.scale.x = percent;
      entity.health.healthBar.material.color = new THREE.Color(1 - percent, percent, 0);

      entity.health.changed = false;
    });
  }
});

DeathSystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var mortals = this.entities.queryComponents([C.Health]);

    mortals.forEach(function(entity) {
      if (entity.health.hp <= 0) {
        if (entity.hasComponent(C.Drawable)) {
          if (entity.drawable.mesh._physijs.collision_type === EntityFactory.COLLISION_TYPES.enemy) {
            Globals.instance.score++;

            Globals.instance.scoreElement.innerHTML = Globals.instance.score;
          }

          entity.drawable.scene.remove(entity.drawable.mesh);
        }

        entity.remove();
      }
    });
  }
});

AISystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var singularities = this.entities.queryComponents([C.AI]);

    singularities.forEach(function(entity) {
      if (entity.ai.tree === null || entity.ai.target === null || entity.ai.blackboard === null) {
        return;
      }

      entity.ai.tree.tick(entity.ai.target, entity.ai.blackboard);
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

