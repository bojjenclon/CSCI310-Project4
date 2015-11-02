var THREEx = require('./THREEx.KeyboardState.js');
var C = require('./Components.js');
var Utils = require('./Utils.js');

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

      if (MouseController.instance.isDown.right) {
        if (entity.shield.currentValue > 0) {
          entity.shield.enabled = true;
        }
      }
      else if (MouseController.instance.wasPressed.right) {
        entity.shield.timer = 0;
        entity.shield.enabled = false;
      }

      if (MouseController.instance.wasPressed.left) {
        if (entity.shootDelay.canShoot && entity.shield.enabled === false) {
          if (entity.gun.type === Game.GUN_TYPES.potatoCannon && entity.ammo.currentAmmo[Game.GUN_TYPES.potatoCannon] > 0) {
            var direction = new THREE.Vector3();
            entity.cameraFollow.controls.getDirection(direction);

            var gunPos = new THREE.Vector3().setFromMatrixPosition(entity.gun.mesh.matrixWorld);
            var bulletPos = gunPos.clone();
            var bulletOffset = new THREE.Vector3(0, 0.4, -25);

            var rotationMatrix = entity.velocity.rotationMatrix.clone();
            var yMatrix = new THREE.Matrix4().extractRotation(entity.cameraFollow.controls.pitchObject.matrix);
            rotationMatrix.multiply(yMatrix);

            bulletOffset.applyMatrix4(rotationMatrix);
            bulletPos.add(bulletOffset);

            var bulletRot = entity.cameraFollow.object.rotation.clone();

            EntityFactory.instance.makePotato({
              scene: entity.drawable.scene,
              position: bulletPos,
              rotation: bulletRot,
              direction: direction,
              rotationMatrix: entity.velocity.rotationMatrix,
              velocity: 35,
              owner: 'player'
            });

            entity.shootDelay.canShoot = false;

            Globals.instance.reloadImg.move_to(0);
            Globals.instance.reloadImg.play();
            Globals.instance.reloadingElement.style.visibility = "visible";

            entity.ammo.currentAmmo[entity.gun.type] -= 1;
            Globals.instance.ammoElement.innerHTML = (entity.ammo.currentAmmo[entity.gun.type] + ' / ' + entity.ammo.maxAmmo[entity.gun.type]);

            var sound = Globals.instance.sound.getSound('sfx/arrowlessBow.mp3');
            sound.setPosition(gunPos);
            sound.setVelocity(velocity);
            sound.setOrientation(direction);
            sound.play();
          }
          else if (entity.gun.type === Game.GUN_TYPES.scatterFries && entity.ammo.currentAmmo[Game.GUN_TYPES.scatterFries] > 0) {
            var baseDirection = new THREE.Vector3();
            entity.cameraFollow.controls.getDirection(baseDirection);

            var basePos = new THREE.Vector3().setFromMatrixPosition(entity.gun.mesh.matrixWorld);

            var rotationMatrix = entity.velocity.rotationMatrix.clone();
            var yMatrix = new THREE.Matrix4().extractRotation(entity.cameraFollow.controls.pitchObject.matrix);
            rotationMatrix.multiply(yMatrix);

            var bulletRot = entity.cameraFollow.object.rotation.clone();

            var numFries = Math.round(Utils.randomRange(4, 9));
            if (numFries > entity.ammo.currentAmmo[Game.GUN_TYPES.scatterFries]) {
              numFries = entity.ammo.currentAmmo[Game.GUN_TYPES.scatterFries];
            }
            for (var i = 0; i < numFries; i++) {
              var bulletPos = basePos.clone();
              var bulletOffset = new THREE.Vector3(Utils.randomRange(-1, 1), Utils.randomRange(-1, 1), -30);

              bulletOffset.applyMatrix4(rotationMatrix);
              bulletPos.add(bulletOffset);

              var piOver2 = Math.PI / 2;

              bulletRot.x += Utils.randomRange(-piOver2, piOver2);
              bulletRot.z += Utils.randomRange(-piOver2, piOver2);

              var bulletDirection = baseDirection.clone();
              bulletDirection.x += Utils.randomRange(-0.1, 0.1);
              bulletDirection.y += Utils.randomRange(-0.1, 0.2);
              bulletDirection.z += Utils.randomRange(-0.1, 0.1);

              EntityFactory.instance.makeFry({
                scene: entity.drawable.scene,
                position: bulletPos,
                rotation: bulletRot,
                direction: bulletDirection,
                rotationMatrix: entity.velocity.rotationMatrix,
                velocity: 0.5,
                owner: 'player'
              });
            }

            entity.shootDelay.canShoot = false;

            Globals.instance.reloadImg.move_to(0);
            Globals.instance.reloadImg.play();
            Globals.instance.reloadingElement.style.visibility = "visible";

            entity.ammo.currentAmmo[entity.gun.type] -= numFries;
            Globals.instance.ammoElement.innerHTML = (entity.ammo.currentAmmo[entity.gun.type] + ' / ' + entity.ammo.maxAmmo[entity.gun.type]);

            var sound = Globals.instance.sound.getSound('sfx/arrowlessBow.mp3');
            sound.setPosition(basePos);
            sound.setVelocity(velocity);
            sound.setOrientation(baseDirection);
            sound.play();
          }
        }
      }
    }.bind(this));
  }
}, {
  statics: {
    MOVE_SPEED: 175,
    JUMP_FORCE: 4000
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

      if (entity.velocity.doMove === false) {
        return;
      }

      if (entity.hasComponent(C.Drawable)) {
        entity.drawable.mesh.applyCentralImpulse(velocity);
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
          var geometry = entity.drawable.mesh.geometry;
          var material = entity.drawable.mesh.material;

          entity.drawable.scene.remove(entity.drawable.mesh);

          geometry.dispose();

          if (material.materials) {
            material.materials.forEach(function(mat) {
              mat.dispose();
            });
          }

          if (material.dispose) {
            material.dispose();
          }
        }

        entity.remove();
      }
    });
  }
});

CameraFollowSystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var follows = this.entities.queryComponents([C.CameraFollow, C.Position, C.Velocity]);

    if (follows.length > 1) {
      throw new Error("The camera can only follow one object at a time!");
    }

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

        if (entity.hasTag("player") && entity.shield.enabled === false) {
          Globals.instance.overlayElement.style.visibility = "hidden";
        }
      }
    });
  }
});

ShieldSystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var shieldables = this.entities.queryComponents([C.Shield, C.Drawable]);

    shieldables.forEach(function(entity) {
      if (entity.shield.enabled) {
        if (entity.hasTag("player")) {
          Globals.instance.overlayElement.style.backgroundColor = "#0000cc";
          Globals.instance.overlayElement.style.visibility = "visible";
        }
      }
      else {
        if (entity.shield.currentValue < entity.shield.maxValue) {
          if (entity.shield.timer < entity.shield.rechargeDelay) {
            entity.shield.timer += dt;
          }
          else {
            entity.shield.currentValue += entity.shield.rechargeRate;

            if (entity.shield.currentValue > entity.shield.maxValue) {
              entity.shield.currentValue = entity.shield.maxValue;
            }

            entity.shield.changed = true;
          }
        }

        if (entity.hasTag("player") && entity.hasComponent(C.Hurt) === false) {
          Globals.instance.overlayElement.style.visibility = "hidden";
        }
      }
    });
  }
});

PlayerHealthSystem = Class({
  constructor: function(entities) {
    this.entities = entities;
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

      if (entity.health.hp <= 0) {
        Globals.instance.playerAlive = false;
      }

      entity.health.changed = false;
    });
  }
});

PlayerShieldSystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var players = this.entities.queryTag("player");

    players.forEach(function(entity) {
      if (entity.shield.changed === false) {
        return;
      }

      var percent = entity.shield.currentValue / entity.shield.maxValue;
      var percentRounded = Math.round(percent * 100);

      var shieldElement = Globals.instance.shieldElement;
      var color = new THREE.Color(1 - percent, 0, percent);

      shieldElement.innerHTML = percentRounded + "%";
      shieldElement.style.color = "#" + color.getHexString();

      entity.shield.changed = false;
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
          var geometry, material;

          if (entity.drawable.mesh._physijs.collision_type === EntityFactory.COLLISION_TYPES.enemy) {
            Globals.instance.score += 10;

            Globals.instance.scoreElement.innerHTML = Globals.instance.score;
          }

          if (entity.health.healthBar) {
            geometry = entity.health.healthBar.geometry;
            material = entity.health.healthBar.material;

            entity.drawable.mesh.remove(entity.health.healthBar);

            geometry.dispose();

            if (material.materials) {
              material.materials.forEach(function(mat) {
                mat.dispose();
              });
            }

            if (material.dispose) {
              material.dispose();
            }
          }

          geometry = entity.drawable.mesh.geometry;
          material = entity.drawable.mesh.material;

          entity.drawable.scene.remove(entity.drawable.mesh);

          geometry.dispose();

          if (material.materials) {
            material.materials.forEach(function(mat) {
              mat.dispose();
            });
          }

          if (material.dispose) {
            material.dispose();
          }
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

SteamUpdateSystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var steaming = this.entities.queryComponents([C.Steaming]);

    steaming.forEach(function(entity) {
      var particles = entity.steaming.particles;

      var particleCount = particles.vertices.length;
      while (particleCount--) {
        var particle = particles.vertices[particleCount];
        particle.y += dt * 50;

        if (particle.y >= 5 + Utils.randomRange(-2, 4)) {
          particle.y = Math.random();
          particle.x = Math.random() * Utils.randomRange(-2, 2);
          particle.z = Math.random() * Utils.randomRange(-2, 2);
        }
      }

      particles.verticesNeedUpdate = true;
    });
  }
});

SteamRemovalSystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var steaming = this.entities.queryComponents([C.Steaming, C.Bullet, C.Drawable]);

    steaming.forEach(function(entity) {
      if (entity.bullet.isHot === false) {
        var geometry = entity.steaming.particles;
        var material = entity.steaming.system.material;

        entity.drawable.mesh.remove(entity.steaming.container);

        geometry.dispose();

        if (material.materials) {
          material.materials.forEach(function(mat) {
            mat.dispose();
          });
        }

        if (material.dispose) {
          material.dispose();
        }
      }
    });
  }
});

CameraPitchSystem = Class({
  constructor: function(entities) {
    this.entities = entities;
  },

  update: function(dt) {
    var pitchables = this.entities.queryComponents([C.CameraPitch, C.Drawable]);

    pitchables.forEach(function(entity) {
      entity.drawable.mesh.rotation.x = entity.cameraPitch.controls.pitchObject.rotation.x + entity.cameraPitch.offset;
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

      entity.velocity.rotationMatrix = new THREE.Matrix4().extractRotation(entity.drawable.mesh.matrix);
    });
  }
});

