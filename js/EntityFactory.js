var EntityManager = require('tiny-ecs').EntityManager;
var C = require('./Components.js');
var b3 = require('./../b3core.0.1.0.js');

EntityFactory = Class({
  constructor: function() {
    this.entities = new EntityManager();
  },

  makePlayer: function(options) {
    var player = this.entities.createEntity();

    ResourceManager.instance.loadModel('models/character.json', function(model) {
      player.addTag("player");

      player.addComponent(C.Identifier);
      player.addComponent(C.Position);
      player.addComponent(C.Velocity);
      player.addComponent(C.Jump);
      player.addComponent(C.Drawable);
      player.addComponent(C.CameraFollow);
      player.addComponent(C.ShootDelay);
      player.addComponent(C.Health);
      player.addComponent(C.Gun);

      player.identifier.type = Globals.ENTITY_TYPES.player;

      player.drawable.scene = options.scene;

      player.drawable.mesh = new Physijs.CapsuleMesh(
        model.geometry,
        Physijs.createMaterial(new THREE.MeshBasicMaterial({
          color: 0xffff00
        }), 0.9, 0.01), EntityFactory.MASS.player);
      player.drawable.mesh.entity = player;

      player.drawable.mesh.position.copy(options.position);
      //player.drawable.mesh.rotation.copy(options.rotation);

      player.drawable.mesh._physijs.collision_type = EntityFactory.COLLISION_TYPES.player;
      player.drawable.mesh._physijs.collision_masks = (
        EntityFactory.COLLISION_TYPES.obstacle |
        EntityFactory.COLLISION_TYPES.enemy |
        EntityFactory.COLLISION_TYPES.enemyBullet);

      player.drawable.scene.add(player.drawable.mesh);

      player.drawable.mesh.setDamping(0.99, 0);
      player.drawable.mesh.setAngularFactor(new THREE.Vector3(0, 0, 0));

      player.drawable.mesh.addEventListener('collision', function(other_object, relative_velocity, relative_rotation, contact_normal) {
        if (contact_normal.y < 0 && other_object.entity.identifier.type === Globals.ENTITY_TYPES.ground) {
          player.jump.canJump = true;
        }

        if (other_object.entity.identifier.type === Globals.ENTITY_TYPES.enemy && player.hasComponent(C.Hurt) === false) {
          player.addComponent(C.Hurt);
          player.hurt.originalColor = player.drawable.mesh.material.color;

          player.health.hp--;
          player.health.changed = true;
        }
      });

      player.health.hp = player.health.maxHP = options.hp || 20;

      player.position.x = options.position.x;
      player.position.y = options.position.y;
      player.position.z = options.position.z;

      player.velocity.rotationMatrix = new THREE.Matrix4().extractRotation(player.drawable.mesh.matrix);

      player.cameraFollow.controls = options.controls;
      player.cameraFollow.object = options.controlsObject;
      player.cameraFollow.offset = options.cameraOffset;

      player.shootDelay.delayTheshold = 1.5;

      this.makeGun({
        parent: player.drawable.mesh,
        cameraControls: options.controls,
        offset: options.gunOffset,
        callback: function(gun) {
          player.gun.entity = gun;
          player.gun.mesh = gun.drawable.mesh;
        }
      });
    }.bind(this));

    return player;
  },

  makeEnemy: function(options) {
    ResourceManager.instance.loadModel('models/character.json', function(model) {
      var enemy = this.entities.createEntity();

      enemy.addTag("enemy");

      enemy.addComponent(C.Identifier);
      enemy.addComponent(C.Position);
      enemy.addComponent(C.Velocity);
      enemy.addComponent(C.Drawable);
      enemy.addComponent(C.Health);
      enemy.addComponent(C.ShootDelay);
      enemy.addComponent(C.AI);

      enemy.identifier.type = Globals.ENTITY_TYPES.enemy;

      enemy.drawable.scene = options.scene;

      enemy.drawable.mesh = new Physijs.CapsuleMesh(
        model.geometry,
        Physijs.createMaterial(new THREE.MeshPhongMaterial({
          color: 0x0000ff
        }), 0.9, 0.1), EntityFactory.MASS.enemy);
      enemy.drawable.mesh.entity = enemy;

      enemy.drawable.mesh._physijs.collision_type = EntityFactory.COLLISION_TYPES.enemy;
      enemy.drawable.mesh._physijs.collision_masks = (
        EntityFactory.COLLISION_TYPES.obstacle |
        EntityFactory.COLLISION_TYPES.player |
        EntityFactory.COLLISION_TYPES.enemy |
        EntityFactory.COLLISION_TYPES.playerBullet |
        EntityFactory.COLLISION_TYPES.enemyBullet);

      enemy.drawable.mesh.position.copy(options.position);
      //enemy.drawable.mesh.rotation.copy(options.rotation);

      enemy.drawable.scene.add(enemy.drawable.mesh);

      enemy.drawable.mesh.setDamping(0.99, 0);
      enemy.drawable.mesh.setAngularFactor(new THREE.Vector3(0, 1, 0));

      enemy.position.x = options.position.x;
      enemy.position.y = options.position.y;
      enemy.position.z = options.position.z;

      enemy.velocity.rotationMatrix = new THREE.Matrix4().extractRotation(enemy.drawable.mesh.matrix);

      enemy.health.hp = enemy.health.maxHP = options.hp || 15;
      enemy.health.healthBar = new THREE.Mesh(
        new THREE.BoxGeometry(14, 1.5, 0.5),
        new THREE.MeshBasicMaterial({
          color: 0x00ff00
        }));
      enemy.health.healthBar.position.set(0, 25, 0);
      enemy.drawable.mesh.add(enemy.health.healthBar);

      enemy.shootDelay.delayTheshold = 1.5;

      var FaceNode = b3.Class(b3.Action);
      FaceNode.prototype.name = 'FaceNode';
      FaceNode.prototype.parameters = {
        'facing': null
      };

      FaceNode.prototype.__Action_initialize = FaceNode.prototype.initialize;
      FaceNode.prototype.initialize = function(settings) {
        settings = settings || {};

        this.__Action_initialize();

        this.facing = settings.facing;
      };

      FaceNode.prototype.tick = function(tick) {
        if (this.facing._manager === null || this.facing._manager === undefined) {
          return b3.FAILURE;
        }

        // http://forum.unity3d.com/threads/making-an-object-rotate-to-face-another.1211/
        // http://answers.unity3d.com/questions/503934/chow-to-check-if-an-object-is-facing-another.html

        var parentPos = tick.target.drawable.mesh.position.clone();
        var followingPos = this.facing.drawable.mesh.position.clone();

        parentPos.y = 0;
        followingPos.y = 0;

        var posDif = parentPos.clone();
        posDif.sub(followingPos);

        var direction = new THREE.Vector3(0, 0, -1);
        var rotation = new THREE.Euler(0, 0, 0, "YXZ");
        rotation.set(tick.target.drawable.mesh.rotation.x, tick.target.drawable.mesh.rotation.y, 0);

        var forward = new THREE.Vector3();
        forward.copy(direction).applyEuler(rotation);

        var angle = forward.angleTo(posDif);

        if (angle <= 0.1) {
          return b3.SUCCESS;
        }

        var lookAtMatrix = new THREE.Matrix4();
        lookAtMatrix.lookAt(followingPos, parentPos, new THREE.Vector3(0, 1, 0));

        var parentRotation = new THREE.Quaternion().setFromEuler(tick.target.drawable.mesh.rotation);
        var targetRotation = new THREE.Quaternion().setFromRotationMatrix(lookAtMatrix);

        var str = Math.min(3 * Globals.instance.dt, 5);

        parentRotation.slerp(targetRotation, str);

        tick.target.drawable.mesh.rotation.setFromQuaternion(parentRotation);
        tick.target.drawable.mesh.__dirtyRotation = true;

        return b3.RUNNING;
      };

      var RandomChildNode = b3.Class(b3.Composite);
      RandomChildNode.prototype.name = 'RandomChildNode';

      RandomChildNode.prototype.__Composite_initialize = RandomChildNode.prototype.initialize;
      RandomChildNode.prototype.initialize = function(settings) {
        settings = settings || {};

        this.__Composite_initialize(settings);

        this.chance = settings.chance;
      };

      RandomChildNode.prototype.tick = function(tick) {
        //var chance = 1 / this.children.length;

        for (var i = 0; i < this.children.length; i++) {
          if (Math.random() <= this.chance[i]) {
            var status = this.children[i]._execute(tick);

            if (status !== b3.SUCCESS) {
              return status;
            }
          }
        }

        return b3.SUCCESS;
      };

      var FollowNode = b3.Class(b3.Action);
      FollowNode.prototype.name = 'FollowNode';
      FollowNode.prototype.parameters = {
        'following': null
      };

      FollowNode.prototype.__Action_initialize = FollowNode.prototype.initialize;
      FollowNode.prototype.initialize = function(settings) {
        settings = settings || {};

        this.__Action_initialize();

        this.following = settings.following;
      };

      FollowNode.prototype.tick = function(tick) {
        if (this.following._manager === null || this.following._manager === undefined) {
          return b3.FAILURE;
        }

        var parentPos = tick.target.drawable.mesh.position.clone();
        var followingPos = this.following.drawable.mesh.position.clone();

        var distance = parentPos.distanceTo(followingPos);

        if (distance < 50) {
          return b3.SUCCESS;
        }

        var difference = new THREE.Vector3();
        difference.subVectors(followingPos, parentPos);

        var normal = difference.normalize();
        var velocity = new THREE.Vector3(tick.target.velocity.x, tick.target.velocity.y, tick.target.velocity.z);
        var dv = new THREE.Vector3(EntityFactory.MOVE_SPEED.enemy * normal.x, 0, EntityFactory.MOVE_SPEED.enemy * normal.z);

        velocity.add(dv);

        tick.target.velocity.x = velocity.x;
        tick.target.velocity.y = velocity.y;
        tick.target.velocity.z = velocity.z;

        return b3.RUNNING;
      };

      var ShootNode = b3.Class(b3.Action);
      ShootNode.prototype.name = 'ShootNode';
      ShootNode.prototype.parameters = {
        'shootingAt': null
      };

      ShootNode.prototype.__Action_initialize = ShootNode.prototype.initialize;
      ShootNode.prototype.initialize = function(settings) {
        settings = settings || {};

        this.__Action_initialize();

        this.shootingAt = settings.shootingAt;
        this.bulletSpeed = settings.bulletSpeed;
      };

      ShootNode.prototype.tick = function(tick) {
        if (this.shootingAt._manager === null || this.shootingAt._manager === undefined) {
          return b3.FAILURE;
        }
        else if (tick.target.shootDelay.canShoot === false) {
          return b3.FAILURE;
        }

        var parentPos = tick.target.drawable.mesh.position.clone();
        var followingPos = this.shootingAt.drawable.mesh.position.clone();

        var spawnLocation = parentPos.clone();
        var spawnOffset = new THREE.Vector3(0, 10, 20);
        spawnOffset.applyMatrix4(tick.target.velocity.rotationMatrix);
        spawnLocation.add(spawnOffset);

        var followingVel = new THREE.Vector3(this.shootingAt.velocity.x, this.shootingAt.velocity.y, this.shootingAt.velocity.z);
        followingVel.multiplyScalar(Globals.instance.dt);
        var predictedPos = followingPos.clone();
        predictedPos.add(followingVel);

        /*var positionOffset = parentPos.clone().sub(followingPos);
        predictedPos.add(positionOffset);*/

        var rotation = new THREE.Euler(0, 0, 0, "YXZ");
        rotation.set(tick.target.drawable.mesh.rotation.x, tick.target.drawable.mesh.rotation.y, 0);

        var forward = new THREE.Vector3(0, 0, 1);
        forward.applyEuler(rotation);

        var distance = spawnLocation.distanceTo(followingPos);

        var velocity = this.bulletSpeed;

        // I have no clue why this works
        //var velOffset = (Math.PI / 2) - (velocity / 250);
        //var velOffset = 1.3 + (velocity / 1000);
        var velOffset = 1 + (velocity / 100);
        forward.y += distance / ((velocity - (velocity * velOffset * EntityFactory.MASS.bullet)) * velocity);

        EntityFactory.instance.makePotato({
          scene: tick.target.drawable.scene,
          position: spawnLocation,
          rotation: tick.target.drawable.mesh.rotation.clone(),
          direction: forward,
          velocity: velocity,
          owner: 'enemy'
        });

        tick.target.shootDelay.canShoot = false;

        return b3.SUCCESS;
      };

      enemy.ai.tree = new b3.BehaviorTree();
      enemy.ai.tree.root = new b3.Sequence({
        children: [
          new b3.Sequence({
            children: [
              new FaceNode({
                facing: options.aiTarget
              }),
              new RandomChildNode({
                children: [
                  new FollowNode({
                    following: options.aiTarget
                  }),
                  new ShootNode({
                    shootingAt: options.aiTarget,
                    bulletSpeed: options.bulletSpeed
                  })
                ],
                chance: [
                  0.9,
                  0.1
                ]
              })
            ]
          })
        ]
      });

      enemy.ai.target = enemy;
      enemy.ai.blackboard = new b3.Blackboard();
    }.bind(this));
  },

  makeGun: function(options) {
    ResourceManager.instance.loadModel('models/potatoCannon.json', function(model) {
      var gun = this.entities.createEntity();

      gun.addComponent(C.Position);
      gun.addComponent(C.Drawable);

      gun.drawable.scene = options.parent;
      gun.drawable.mesh = new THREE.Mesh(
        model.geometry,
        model.material.clone());

      gun.drawable.mesh.position.copy(options.offset);

      gun.drawable.scene.add(gun.drawable.mesh);

      if (options.cameraControls) {
        gun.addComponent(C.CameraPitch);

        gun.cameraPitch.controls = options.cameraControls;
        //gun.cameraPitch.offset = 90 * Math.PI / 180;
      }

      if (options.callback) {
        options.callback(gun);
      }
    }.bind(this));
  },

  makePotato: function(options) {
    ResourceManager.instance.loadModel('models/potato.json', function(model) {
      var potato = this.entities.createEntity();

      potato.addTag("bullet");
      potato.addTag("potato");

      potato.addComponent(C.Identifier);
      potato.addComponent(C.Position);
      potato.addComponent(C.Velocity);
      potato.addComponent(C.Drawable);
      potato.addComponent(C.Bullet);
      potato.addComponent(C.Expirable);
      potato.addComponent(C.OneTimeHit);
      potato.addComponent(C.Steaming);

      potato.identifier.type = Globals.ENTITY_TYPES.bullet;
      potato.bullet.owner = options.owner;

      potato.velocity.doMove = false;

      potato.drawable.scene = options.scene;

      potato.drawable.mesh = new Physijs.CapsuleMesh(
        model.geometry,
        Physijs.createMaterial(model.material.clone(), 0.7, 0.01),
        0.3);
      potato.drawable.mesh.entity = potato;

      // potatos are "hot" when created, so tint them red
      potato.drawable.mesh.material.materials.forEach(function(mat) {
        mat.color.setHex(0xE34D4D);
      });

      if (options.owner === 'player') {
        potato.drawable.mesh._physijs.collision_type = EntityFactory.COLLISION_TYPES.playerBullet;
      }
      else {
        potato.drawable.mesh._physijs.collision_type = EntityFactory.COLLISION_TYPES.enemyBullet;
      }

      potato.drawable.mesh._physijs.collision_masks = (
        EntityFactory.COLLISION_TYPES.obstacle |
        EntityFactory.COLLISION_TYPES.enemy |
        EntityFactory.COLLISION_TYPES.player |
        EntityFactory.COLLISION_TYPES.playerBullet |
        EntityFactory.COLLISION_TYPES.enemyBullet);

      potato.drawable.mesh.position.copy(options.position);
      potato.drawable.mesh.rotation.copy(options.rotation);
      if (options.scale) {
        potato.drawable.mesh.scale.copy(options.scale);
      }

      potato.drawable.scene.add(potato.drawable.mesh);

      potato.drawable.mesh.setDamping(0.1, 0);

      potato.drawable.mesh.addEventListener('collision', function(other_object, relative_velocity, relative_rotation, contact_normal) {
        if (potato.bullet.isHot === false) {
          return;
        }

        var hitPlayer = potato.bullet.owner === 'enemy' && other_object.entity.identifier.type === Globals.ENTITY_TYPES.player;
        var hitEnemy = potato.bullet.owner === 'player' && other_object.entity.identifier.type === Globals.ENTITY_TYPES.enemy;

        if ((hitPlayer || hitEnemy) && other_object.entity.hasComponent(C.Hurt) === false && potato.oneTimeHit.alreadyHit.indexOf(other_object.uuid) < 0) {
          other_object.entity.addComponent(C.Hurt);
          other_object.entity.hurt.originalColor = other_object.material.color.clone();

          other_object.entity.health.hp -= 5;
          other_object.entity.health.changed = true;

          potato.oneTimeHit.alreadyHit.push(other_object.uuid);
        }
        else if (other_object.entity.identifier.type === Globals.ENTITY_TYPES.ground) {
          potato.bullet.touchedGround = true;
        }
        else if (potato.bullet.owner === 'player' && other_object.entity.identifier.type === Globals.ENTITY_TYPES.bullet && other_object.entity.bullet.owner === 'enemy' && potato.oneTimeHit.alreadyHit.indexOf(other_object.uuid) < 0) {
          Globals.instance.score += 5;

          Globals.instance.scoreElement.innerHTML = Globals.instance.score;

          potato.oneTimeHit.alreadyHit.push(other_object.uuid);
        }

        var soundPos = new THREE.Vector3().setFromMatrixPosition(potato.drawable.mesh.matrixWorld);
        var soundVel = new THREE.Vector3(potato.velocity.x * Globals.instance.dt, potato.velocity.y * Globals.instance.dt, potato.velocity.z * Globals.instance.dt);
        var soundForward = new THREE.Vector3(0, 0, 1);
        soundForward.applyProjection(potato.drawable.mesh.matrixWorld);
        soundForward.normalize();

        var sound = Globals.instance.sound.getSound(Globals.DIR + 'sfx/hitSplat.wav');
        sound.setPosition(soundPos);
        sound.setVelocity(vel);
        sound.setOrientation(soundForward);
        sound.play();

        potato.bullet.isHot = false;

        // the potato is now "cold," so tint it blue
        potato.drawable.mesh.material.materials.forEach(function(mat) {
          mat.color.setHex(0x45B7DE);
        });
      }.bind(this));

      potato.position.x = options.position.x;
      potato.position.y = options.position.y;
      potato.position.z = options.position.z;

      var vel = new THREE.Vector3(options.velocity, options.velocity, options.velocity);
      vel.multiply(options.direction);
      potato.drawable.mesh.applyCentralImpulse(vel);

      potato.expirable.maxAge = 6;

      potato.steaming.parent = potato.drawable.mesh;
      potato.steaming.particles = new THREE.Geometry();
      for (var i = 0; i < 25; i++) {
        var particle = new THREE.Vector3(
          Math.random() * Utils.randomRange(-2, 2),
          Math.random() * 20,
          Math.random() * Utils.randomRange(-2, 2));
        potato.steaming.particles.vertices.push(particle);
      }

      var smokeTexture = ResourceManager.instance.getTexture(Globals.DIR + '/gfx/smoketex.jpg');
      var smokeMaterial = new THREE.PointCloudMaterial({
        map: smokeTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        size: 2,
        color: 0x111111
      });

      potato.steaming.system = new THREE.PointCloud(potato.steaming.particles, smokeMaterial);
      potato.steaming.system.sortParticles = true;

      potato.steaming.container = new THREE.Gyroscope();
      potato.steaming.container.add(potato.steaming.system);
      potato.drawable.mesh.add(potato.steaming.container);

      if (options.callback) {
        options.callback(potato);
      }
    }.bind(this));
  },

  makeFry: function(options) {
    ResourceManager.instance.loadModel('models/fry.json', function(model) {
      var fry = this.entities.createEntity();

      fry.addTag("bullet");
      fry.addTag("fry");

      fry.addComponent(C.Identifier);
      fry.addComponent(C.Position);
      fry.addComponent(C.Drawable);
      fry.addComponent(C.Bullet);
      fry.addComponent(C.Expirable);
      fry.addComponent(C.OneTimeHit);
      fry.addComponent(C.Steaming);

      fry.identifier.type = Globals.ENTITY_TYPES.bullet;
      fry.bullet.owner = options.owner;

      fry.drawable.scene = options.scene;

      fry.drawable.mesh = new Physijs.BoxMesh(
        model.geometry,
        Physijs.createMaterial(model.material.clone(), 0.7, 0.01),
        0.002);
      fry.drawable.mesh.entity = fry;

      // fries are "hot" when created, so tint them red
      fry.drawable.mesh.material.materials.forEach(function(mat) {
        mat.color.setHex(0xE34D4D);
      });

      if (options.owner === 'player') {
        fry.drawable.mesh._physijs.collision_type = EntityFactory.COLLISION_TYPES.playerBullet;
      }
      else {
        fry.drawable.mesh._physijs.collision_type = EntityFactory.COLLISION_TYPES.enemyBullet;
      }

      fry.drawable.mesh._physijs.collision_masks = (
        EntityFactory.COLLISION_TYPES.obstacle |
        EntityFactory.COLLISION_TYPES.enemy |
        EntityFactory.COLLISION_TYPES.player |
        EntityFactory.COLLISION_TYPES.playerBullet |
        EntityFactory.COLLISION_TYPES.enemyBullet);

      fry.drawable.mesh.position.copy(options.position);
      fry.drawable.mesh.rotation.copy(options.rotation);
      if (options.scale) {
        fry.drawable.mesh.scale.copy(options.scale);
      }

      fry.drawable.scene.add(fry.drawable.mesh);

      fry.drawable.mesh.setDamping(0.1, 0);

      fry.drawable.mesh.addEventListener('collision', function(other_object, relative_velocity, relative_rotation, contact_normal) {
        if (fry.bullet.isHot === false) {
          return;
        }

        var hitPlayer = fry.bullet.owner === 'enemy' && other_object.entity.identifier.type === Globals.ENTITY_TYPES.player;
        var hitEnemy = fry.bullet.owner === 'player' && other_object.entity.identifier.type === Globals.ENTITY_TYPES.enemy;

        if ((hitPlayer || hitEnemy) && other_object.entity.hasComponent(C.Hurt) === false && fry.oneTimeHit.alreadyHit.indexOf(other_object.uuid) < 0) {
          other_object.entity.addComponent(C.Hurt);
          other_object.entity.hurt.originalColor = other_object.material.color.clone();

          other_object.entity.health.hp -= 1;
          other_object.entity.health.changed = true;

          fry.oneTimeHit.alreadyHit.push(other_object.uuid);
        }
        else if (other_object.entity.identifier.type === Globals.ENTITY_TYPES.ground) {
          fry.bullet.touchedGround = true;
        }
        else if (fry.bullet.owner === 'player' && other_object.entity.identifier.type === Globals.ENTITY_TYPES.bullet && other_object.entity.bullet.owner === 'enemy' && fry.oneTimeHit.alreadyHit.indexOf(other_object.uuid) < 0) {
          Globals.instance.score += 5;

          Globals.instance.scoreElement.innerHTML = Globals.instance.score;

          fry.oneTimeHit.alreadyHit.push(other_object.uuid);
        }

        fry.bullet.isHot = other_object.entity.hasTag("fry");

        if (fry.bullet.isHot === false) {
          // the fry is now "cold," so tint it blue
          fry.drawable.mesh.material.materials.forEach(function(mat) {
            mat.color.setHex(0x45B7DE);
          });
        }
      }.bind(this));

      fry.position.x = options.position.x;
      fry.position.y = options.position.y;
      fry.position.z = options.position.z;

      var vel = new THREE.Vector3(options.velocity, options.velocity, options.velocity);
      vel.multiply(options.direction);
      fry.drawable.mesh.applyCentralImpulse(vel);

      fry.expirable.maxAge = 6;

      fry.steaming.parent = fry.drawable.mesh;
      fry.steaming.particles = new THREE.Geometry();
      for (var i = 0; i < 25; i++) {
        var particle = new THREE.Vector3(
          Math.random() * Utils.randomRange(-2, 2),
          Math.random() * 20,
          Math.random() * Utils.randomRange(-2, 2));
        fry.steaming.particles.vertices.push(particle);
      }

      var smokeTexture = ResourceManager.instance.getTexture(Globals.DIR + '/gfx/smoketex.jpg');
      var smokeMaterial = new THREE.PointCloudMaterial({
        map: smokeTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        size: 2,
        color: 0x111111
      });

      fry.steaming.system = new THREE.PointCloud(fry.steaming.particles, smokeMaterial);
      fry.steaming.system.sortParticles = true;

      fry.steaming.container = new THREE.Gyroscope();
      fry.steaming.container.add(fry.steaming.system);
      fry.drawable.mesh.add(fry.steaming.container);

      if (options.callback) {
        options.callback(fry);
      }
    }.bind(this));
  },

  makeGround: function(options) {
    var ground = this.entities.createEntity();

    ground.addComponent(C.Identifier);
    ground.addComponent(C.Position);
    ground.addComponent(C.Drawable);

    ground.identifier.type = Globals.ENTITY_TYPES.ground;

    ground.drawable.scene = options.scene;

    var mainTex = ResourceManager.instance.getTexture('gfx/brick-floor-tileable_COLOR.jpg');
    mainTex.wrapS = mainTex.wrapT = THREE.RepeatWrapping;
    var diffuseTex = ResourceManager.instance.getTexture('gfx/brick-floor-tileable_DISP.jpg');
    diffuseTex.wrapS = mainTex.wrapT = THREE.RepeatWrapping;
    var specularTex = ResourceManager.instance.getTexture('gfx/brick-floor-tileable_SPEC.jpg');
    specularTex.wrapS = mainTex.wrapT = THREE.RepeatWrapping;

    ground.drawable.mesh = new Physijs.BoxMesh(
      new THREE.BoxGeometry(options.width, 1, options.height),
      new THREE.MeshPhongMaterial({
        map: ResourceManager.instance.getTexture('gfx/brick-floor-tileable_COLOR.jpg'),
        displacementMap: ResourceManager.instance.getTexture('gfx/brick-floor-tileable_DISP.jpg'),
        specularMap: ResourceManager.instance.getTexture('gfx/brick-floor-tileable_SPEC.jpg')
          //color: 0x00ff00
      }), 0);
    ground.drawable.mesh.entity = ground;

    ground.drawable.mesh._physijs.collision_type = EntityFactory.COLLISION_TYPES.obstacle;
    ground.drawable.mesh._physijs.collision_masks = (
      EntityFactory.COLLISION_TYPES.obstacle |
      EntityFactory.COLLISION_TYPES.player |
      EntityFactory.COLLISION_TYPES.enemy |
      EntityFactory.COLLISION_TYPES.playerBullet |
      EntityFactory.COLLISION_TYPES.enemyBullet);

    ground.drawable.scene.add(ground.drawable.mesh);
  }
}, {
  statics: {
    get instance() {
      if (!EntityFactory._instance) {
        EntityFactory._instance = new EntityFactory();
      }
      return EntityFactory._instance;
    },

    COLLISION_TYPES: {
      nothing: 0, // collide with nothing

      obstacle: 1 << 0,
      player: 1 << 2,
      enemy: 1 << 3,

      playerBullet: 1 << 4,
      enemyBullet: 1 << 5
    },

    MOVE_SPEED: {
      enemy: 160
    },

    MASS: {
      player: 73,
      enemy: 81,
      bullet: 0.3
    }
  }
});

