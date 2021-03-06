var EntityManager = require('tiny-ecs').EntityManager;
var b3 = require('./../b3core.0.1.0.js');
var Utils = require('./Utils.js');
var C = require('./Components.js');
var PickupMethods = require('./PickupMethods.js');

/*
 * Helper singleton class for quickly constructing entities. Most functions take in a key-value list of options.
 * Each function adds necessary components to the relevant entity and sets up said components properties.
 */
EntityFactory = Class({
  constructor: function() {
    this.entities = new EntityManager();
  },

  /*
   * Creates the player entity. There should only ever be one of these at any given time.
   * Requires a position, scene, and pointerlock objects to be passed in.
   * Optional parameters include starting max health.
   */
  makePlayer: function(options) {
    var player = this.entities.createEntity();

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
    player.addComponent(C.Ammo);
    player.addComponent(C.Shield);

    player.identifier.type = Globals.ENTITY_TYPES.player;

    var model = ResourceManager.instance.getModel('models/character.json').clone();

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
      EntityFactory.COLLISION_TYPES.enemyBullet |
      EntityFactory.COLLISION_TYPES.pickup);

    player.drawable.scene.add(player.drawable.mesh);

    player.drawable.mesh.setDamping(0.99, 0);
    player.drawable.mesh.setAngularFactor(new THREE.Vector3(0, 0, 0));

    player.drawable.mesh.addEventListener('collision', function(other_object, relative_velocity, relative_rotation, contact_normal) {
      if (contact_normal.y < 0 && other_object.entity.identifier.type === Globals.ENTITY_TYPES.ground) {
        player.jump.canJump = true;
      }

      if (other_object.entity.identifier.type === Globals.ENTITY_TYPES.enemy && player.hasComponent(C.Hurt) === false) {
        if (other_object.entity.hasComponent(C.Shield) && player.shield.enabled && other_object.player.currentValue >= 1) {
          Utils.damageShield(player, 1);
        }
        else {
          player.addComponent(C.Hurt);
          player.hurt.originalColor = player.drawable.mesh.material.color;

          player.health.hp--;
          player.health.changed = true;
        }
      }
      else if (other_object.entity.identifier.type === Globals.ENTITY_TYPES.bullet && other_object.entity.bullet.owner === 'enemy' && player.shield.enabled === false) {
        var hitSounds = [
          "sfx/hurt1.mp3",
          "sfx/hurt2.mp3",
          "sfx/hurt3.mp3"
        ];

        var soundPos = new THREE.Vector3().setFromMatrixPosition(player.drawable.mesh.matrixWorld);
        var soundVel = new THREE.Vector3(player.velocity.x, player.velocity.y, player.velocity.z);
        var soundDir = new THREE.Vector3();
        player.cameraFollow.controls.getDirection(soundDir);
        var soundIndex = Math.floor(Utils.randomRange(0, hitSounds.length));

        var sound = Globals.instance.sound.getSound(hitSounds[soundIndex]);
        sound.setPosition(soundPos);
        sound.setVelocity(soundVel);
        sound.setOrientation(soundDir);
        sound.play();
      }
    });

    player.health.hp = player.health.maxHP = options.hp || 20;
    player.health.changed = true;

    player.shield.changed = true;

    player.position.x = options.position.x;
    player.position.y = options.position.y;
    player.position.z = options.position.z;

    player.velocity.rotationMatrix = new THREE.Matrix4().extractRotation(player.drawable.mesh.matrix);

    player.cameraFollow.controls = options.controls;
    player.cameraFollow.object = options.controlsObject;
    player.cameraFollow.offset = options.cameraOffset;

    player.shootDelay.delayTheshold = 1.5;

    var gun = this.makeGun({
      parent: player.drawable.mesh,
      cameraControls: options.controls,
      offset: options.gunOffset
    });

    player.gun.entity = gun;
    player.gun.mesh = gun.drawable.mesh;
    player.gun.type = Game.GUN_TYPES.potatoCannon;

    player.ammo.currentAmmo[Game.GUN_TYPES.potatoCannon] = 54;
    player.ammo.currentAmmo[Game.GUN_TYPES.scatterFries] = 76;

    player.ammo.maxAmmo[Game.GUN_TYPES.potatoCannon] = 54;
    player.ammo.maxAmmo[Game.GUN_TYPES.scatterFries] = 76;

    Globals.instance.ammoElement.innerHTML = (player.ammo.currentAmmo[player.gun.type] + ' / ' + player.ammo.maxAmmo[player.gun.type]);
    Globals.instance.weaponNameElement.innerHTML = Game.GUN_NAMES[player.gun.type];
    Globals.instance.weaponIconElement.src = Game.GUN_ICONS[player.gun.type];

    return player;
  },

  /*
   * Creates an enemy entity. The enemy's AI is also setup in this function.
   * Requires a position, scene, a bullet speed/velocity, an AI target, a maxmimum shooting distance, and a maximum following leash distance.
   * Optional parameters include starting max health and the enemy's initial rotation.
   */
  makeEnemy: function(options) {
    var enemy = this.entities.createEntity();

    enemy.addTag("enemy");

    enemy.addComponent(C.Identifier);
    enemy.addComponent(C.Position);
    enemy.addComponent(C.Velocity);
    enemy.addComponent(C.Drawable);
    enemy.addComponent(C.Health);
    enemy.addComponent(C.ShootDelay);
    enemy.addComponent(C.DropsPickup);
    enemy.addComponent(C.AI);

    enemy.identifier.type = Globals.ENTITY_TYPES.enemy;

    var model = ResourceManager.instance.getModel('models/character.json').clone();

    enemy.drawable.scene = options.scene;

    var color = options.color || 0x0000ff;

    enemy.drawable.mesh = new Physijs.CapsuleMesh(
      model.geometry,
      Physijs.createMaterial(new THREE.MeshPhongMaterial({
        color: color
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
    if (options.rotation) {
      enemy.drawable.mesh.rotation.copy(options.rotation);
    }

    enemy.drawable.scene.add(enemy.drawable.mesh);

    enemy.drawable.mesh.setDamping(0.99, 0);
    enemy.drawable.mesh.setAngularFactor(new THREE.Vector3(0, 1, 0));

    enemy.drawable.mesh.addEventListener('collision', function(other_object, relative_velocity, relative_rotation, contact_normal) {
      if (other_object.entity.identifier.type === Globals.ENTITY_TYPES.bullet && other_object.entity.bullet.owner === 'player' && enemy.hasComponent(C.Hurt) === false) {
        var hitSounds = [
          "sfx/hurt1.mp3",
          "sfx/hurt2.mp3",
          "sfx/hurt3.mp3"
        ];

        var soundPos = new THREE.Vector3().setFromMatrixPosition(enemy.drawable.mesh.matrixWorld);
        var soundVel = new THREE.Vector3(enemy.velocity.x, enemy.velocity.y, enemy.velocity.z);
        var soundIndex = Math.floor(Utils.randomRange(0, hitSounds.length));

        var direction = new THREE.Vector3(0, 0, -1);
        var rotation = new THREE.Euler(0, 0, 0, "YXZ");
        rotation.set(enemy.drawable.mesh.rotation.x, enemy.drawable.mesh.rotation.y, 0);

        var forward = new THREE.Vector3();
        forward.copy(direction).applyEuler(rotation);

        var sound = Globals.instance.sound.getSound(hitSounds[soundIndex]);
        sound.setPosition(soundPos);
        sound.setVelocity(soundVel);
        sound.setOrientation(forward);
        sound.play();
      }
    });

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

    enemy.dropsPickup.dropTypes = ["Health", "Ammo"];
    enemy.dropsPickup.dropChance = 0.6;

    options.bulletSpeed = THREE.Math.clamp(options.bulletSpeed, EntityFactory.MIN_BULLET_SPEED.enemy, EntityFactory.MAX_BULLET_SPEED.enemy);
    options.shootDistance = Math.max(options.shootDistance, options.leashDistance);

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

      var posDif = parentPos.clone();
      posDif.sub(followingPos);

      var forward = new THREE.Vector3(0, 0, -1);
      forward.applyMatrix4(tick.target.velocity.rotationMatrix);

      var angle = forward.angleTo(posDif) * 180 / Math.PI;

      if (Math.abs(angle) <= 10) {
        return b3.SUCCESS;
      }

      var lookAtMatrix = new THREE.Matrix4();
      lookAtMatrix.lookAt(followingPos, parentPos, new THREE.Vector3(0, 1, 0));

      var parentRotation = new THREE.Quaternion().setFromEuler(tick.target.drawable.mesh.rotation);
      var targetRotation = new THREE.Quaternion().setFromRotationMatrix(lookAtMatrix);

      var str = Math.min(Globals.instance.dt, 0.5);

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
      this.leashDistance = settings.leashDistance;
    };

    FollowNode.prototype.tick = function(tick) {
      if (this.following._manager === null || this.following._manager === undefined) {
        return b3.FAILURE;
      }

      var parentPos = tick.target.drawable.mesh.position.clone();
      var followingPos = this.following.drawable.mesh.position.clone();

      var distance = parentPos.distanceTo(followingPos);

      if (distance < this.leashDistance) {
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
      this.shootDistance = settings.shootDistance;
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

      // the number of frames to "look ahead"
      // this is used to lead the shot, making it easier to hit a moving target (in this case, the player)
      var futureFrames = (EntityFactory.MAX_BULLET_SPEED.enemy - this.bulletSpeed) / 3.5;
      futureFrames = THREE.Math.clamp(futureFrames, 2, 15);

      var followingVel = new THREE.Vector3(this.shootingAt.velocity.x, this.shootingAt.velocity.y, this.shootingAt.velocity.z);
      followingVel.multiplyScalar(Globals.instance.dt * futureFrames);
      var predictedPos = followingPos.clone();
      predictedPos.add(followingVel);

      var posDif = spawnLocation.clone();
      posDif.sub(predictedPos);

      var distance = posDif.length();

      if (distance > this.shootDistance) {
        return b3.FAILURE;
      }

      var lookAtMatrix = new THREE.Matrix4();
      lookAtMatrix.lookAt(predictedPos, spawnLocation, new THREE.Vector3(0, 1, 0));

      var forward = new THREE.Vector3(0, 0, -1);
      forward.applyMatrix4(lookAtMatrix);

      var velocity = -this.bulletSpeed;

      // I have no clue why this works, but it seems to generate an arc fairly consistently
      var velOffset = 1 - (velocity / 100);
      forward.y -= distance / ((velocity - (velocity * velOffset * EntityFactory.MASS.bullet)) * velocity);
      forward.normalize();

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
                  following: options.aiTarget,
                  leashDistance: options.leashDistance
                }),
                new ShootNode({
                  shootingAt: options.aiTarget,
                  bulletSpeed: options.bulletSpeed,
                  shootDistance: options.shootDistance
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

    return enemy;
  },

  /*
   * Creates a gun entity. Gun's are meant to be "attached" to an existing entity.
   * Requires a position and a parent.
   * Optional parameters include a pointerlock controls object to make the gun follow the camera's pitch.
   */
  makeGun: function(options) {
    var gun = this.entities.createEntity();

    gun.addComponent(C.Identifier);
    gun.addComponent(C.Position);
    gun.addComponent(C.Drawable);

    gun.identifier.type = Globals.ENTITY_TYPES.gun;

    var model = ResourceManager.instance.getModel('models/potatoCannon.json').clone();

    gun.drawable.scene = options.parent;
    gun.drawable.mesh = new THREE.Mesh(
      model.geometry,
      model.material);

    gun.drawable.mesh.position.copy(options.offset);

    gun.drawable.scene.add(gun.drawable.mesh);

    if (options.cameraControls) {
      gun.addComponent(C.CameraPitch);

      gun.cameraPitch.controls = options.cameraControls;
    }

    return gun;
  },

  /*
   * Creates a potato entity. Potatoes are a form of bullet.
   * Requires an owner (generally enemy or player), a position, a scene, and a velocity.
   * Optional parameters include the potato's rotation and scale.
   */
  makePotato: function(options) {
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

    var model = ResourceManager.instance.getModel('models/potato.json').clone();

    potato.drawable.scene = options.scene;

    potato.drawable.mesh = new Physijs.CapsuleMesh(
      model.geometry,
      Physijs.createMaterial(model.material, 0.7, 0.01),
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
    if (options.rotation) {
      potato.drawable.mesh.rotation.copy(options.rotation);
    }
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

      if ((hitPlayer || hitEnemy) && potato.oneTimeHit.alreadyHit.indexOf(other_object.uuid) < 0) {
        if (other_object.entity.hasComponent(C.Shield) && other_object.entity.shield.enabled && other_object.entity.shield.currentValue >= EntityFactory.BULLET_DAMAGE.potato) {
          Utils.damageShield(other_object.entity, EntityFactory.BULLET_DAMAGE.potato);
        }
        else {
          other_object.entity.addComponent(C.Hurt);
          other_object.entity.hurt.originalColor = other_object.material.color.clone();

          other_object.entity.health.hp -= EntityFactory.BULLET_DAMAGE.potato;
          other_object.entity.health.changed = true;

          potato.oneTimeHit.alreadyHit.push(other_object.uuid);
        }
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

      var sound = Globals.instance.sound.getSound('sfx/hitSplat.wav');
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

    var smokeTexture = ResourceManager.instance.getTexture('gfx/smoketex.jpg');
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

    return potato;
  },

  /*
   * Creates a fry entity. Fries are a form of bullet.
   * Requires an owner (generally enemy or player), a position, a scene, and a velocity.
   * Optional parameters include the fry's rotation and scale.
   */
  makeFry: function(options) {
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

    var model = ResourceManager.instance.getModel('models/fry.json').clone();

    fry.drawable.scene = options.scene;

    fry.drawable.mesh = new Physijs.BoxMesh(
      model.geometry,
      Physijs.createMaterial(model.material, 0.7, 0.01),
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
    if (options.rotation) {
      fry.drawable.mesh.rotation.copy(options.rotation);
    }
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

      if ((hitPlayer || hitEnemy) && fry.oneTimeHit.alreadyHit.indexOf(other_object.uuid) < 0) {
        other_object.entity.addComponent(C.Hurt);
        other_object.entity.hurt.originalColor = other_object.material.color.clone();

        other_object.entity.health.hp -= EntityFactory.BULLET_DAMAGE.fry;
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

    var smokeTexture = ResourceManager.instance.getTexture('gfx/smoketex.jpg');
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

    return fry;
  },

  /*
   * Creates a heatlh pickup entity.
   * Requires a scene and a position.
   */
  makeHealthPickup: function(options) {
    var pickup = this.entities.createEntity();

    pickup.addTag("pickup");

    pickup.addComponent(C.Identifier);
    pickup.addComponent(C.Position);
    pickup.addComponent(C.Drawable);
    pickup.addComponent(C.Expirable);
    pickup.addComponent(C.Pickup);

    pickup.identifier.type = Globals.ENTITY_TYPES.pickup;

    var model = ResourceManager.instance.getModel('models/pickupBox.json').clone();

    pickup.drawable.scene = options.scene;

    pickup.drawable.mesh = new Physijs.BoxMesh(
      model.geometry,
      Physijs.createMaterial(model.material, 0.7, 0.01),
      1.2);
    pickup.drawable.mesh.entity = pickup;

    pickup.drawable.mesh.material.materials.forEach(function(mat) {
      mat.color.setHex(0xdd1100);
    });

    pickup.drawable.mesh._physijs.collision_type = EntityFactory.COLLISION_TYPES.pickup;
    pickup.drawable.mesh._physijs.collision_masks = (
      EntityFactory.COLLISION_TYPES.obstacle |
      EntityFactory.COLLISION_TYPES.player |
      EntityFactory.COLLISION_TYPES.pickup);

    pickup.drawable.mesh.position.copy(options.position);
    if (options.rotation) {
      pickup.drawable.mesh.rotation.copy(options.rotation);
    }
    if (options.scale) {
      pickup.drawable.mesh.scale.copy(options.scale);
    }

    pickup.drawable.scene.add(pickup.drawable.mesh);

    pickup.drawable.mesh.addEventListener('collision', function(other_object, relative_velocity, relative_rotation, contact_normal) {
      if (other_object.entity.identifier.type === Globals.ENTITY_TYPES.player) {
        pickup.pickup.parameters.target = other_object.entity;

        pickup.pickup.method(pickup);
      }
    }.bind(this));

    pickup.expirable.maxAge = 15;

    pickup.pickup.method = PickupMethods.heal;
    pickup.pickup.parameters = {
      healAmount: 5
    };
  },

  /*
   * Creates an ammo pickup entity.
   * Requires a scene and a position.
   */
  makeAmmoPickup: function(options) {
    var pickup = this.entities.createEntity();

    pickup.addTag("pickup");

    pickup.addComponent(C.Identifier);
    pickup.addComponent(C.Position);
    pickup.addComponent(C.Drawable);
    pickup.addComponent(C.Expirable);
    pickup.addComponent(C.Pickup);

    pickup.identifier.type = Globals.ENTITY_TYPES.pickup;

    var model = ResourceManager.instance.getModel('models/pickupBox.json').clone();

    pickup.drawable.scene = options.scene;

    pickup.drawable.mesh = new Physijs.BoxMesh(
      model.geometry,
      Physijs.createMaterial(model.material, 0.7, 0.01),
      1.2);
    pickup.drawable.mesh.entity = pickup;

    pickup.drawable.mesh.material.materials.forEach(function(mat) {
      mat.color.setHex(0xddcc00);
    });

    pickup.drawable.mesh._physijs.collision_type = EntityFactory.COLLISION_TYPES.pickup;
    pickup.drawable.mesh._physijs.collision_masks = (
      EntityFactory.COLLISION_TYPES.obstacle |
      EntityFactory.COLLISION_TYPES.player |
      EntityFactory.COLLISION_TYPES.pickup);

    pickup.drawable.mesh.position.copy(options.position);
    if (options.rotation) {
      pickup.drawable.mesh.rotation.copy(options.rotation);
    }
    if (options.scale) {
      pickup.drawable.mesh.scale.copy(options.scale);
    }

    pickup.drawable.scene.add(pickup.drawable.mesh);

    pickup.drawable.mesh.addEventListener('collision', function(other_object, relative_velocity, relative_rotation, contact_normal) {
      if (other_object.entity.identifier.type === Globals.ENTITY_TYPES.player) {
        pickup.pickup.parameters.target = other_object.entity;
        pickup.pickup.parameters.gun = other_object.entity.gun.type;

        pickup.pickup.method(pickup);

        Globals.instance.ammoElement.innerHTML = (other_object.entity.ammo.currentAmmo[other_object.entity.gun.type] + ' / ' + other_object.entity.ammo.maxAmmo[other_object.entity.gun.type]);
      }
    }.bind(this));

    pickup.expirable.maxAge = 15;

    pickup.pickup.method = PickupMethods.increaseAmmo;
    pickup.pickup.parameters = {
      ammoAmount: 10
    };
  },

  /*
   * Creates a ground pickup entity. There generally will only be one of these in the scene.
   * Requires a scene, a position, a width, and a height.
   */
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
        map: mainTex,
        displacementMap: diffuseTex,
        specularMap: specularTex
      }), 0);
    ground.drawable.mesh.entity = ground;

    ground.drawable.mesh._physijs.collision_type = EntityFactory.COLLISION_TYPES.obstacle;
    ground.drawable.mesh._physijs.collision_masks = (
      EntityFactory.COLLISION_TYPES.obstacle |
      EntityFactory.COLLISION_TYPES.player |
      EntityFactory.COLLISION_TYPES.enemy |
      EntityFactory.COLLISION_TYPES.playerBullet |
      EntityFactory.COLLISION_TYPES.enemyBullet |
      EntityFactory.COLLISION_TYPES.pickup);

    ground.drawable.scene.add(ground.drawable.mesh);
  },

  /*
   * Creates a sky wall entity. These are used to encase the scene in a sky.
   * Requires a scene, a position, a width, and a height.
   */
  makeSkyWall: function(options) {
    var skyWall = this.entities.createEntity();

    skyWall.addComponent(C.Identifier);
    skyWall.addComponent(C.Position);
    skyWall.addComponent(C.Drawable);

    skyWall.identifier.type = Globals.ENTITY_TYPES.obstacle;

    skyWall.drawable.scene = options.scene;

    var mainTex = ResourceManager.instance.getTexture('gfx/skyTex2.jpg');
    mainTex.wrapS = mainTex.wrapT = THREE.RepeatWrapping;
    mainTex.minFilter = THREE.LinearMipMapLinearFilter;
    mainTex.magFilter = THREE.LinearFilter;

    skyWall.drawable.mesh = new Physijs.BoxMesh(
      new THREE.BoxGeometry(options.width, 1, options.height),
      new THREE.MeshPhongMaterial({
        map: mainTex,
        side: THREE.DoubleSide
      }), 0);
    skyWall.drawable.mesh.entity = skyWall;

    if (options.position) {
      skyWall.drawable.mesh.position.copy(options.position);
    }
    if (options.rotation) {
      skyWall.drawable.mesh.rotation.copy(options.rotation);
    }

    skyWall.drawable.mesh._physijs.collision_type = EntityFactory.COLLISION_TYPES.obstacle;
    skyWall.drawable.mesh._physijs.collision_masks = (
      EntityFactory.COLLISION_TYPES.obstacle |
      EntityFactory.COLLISION_TYPES.player |
      EntityFactory.COLLISION_TYPES.enemy |
      EntityFactory.COLLISION_TYPES.playerBullet |
      EntityFactory.COLLISION_TYPES.enemyBullet |
      EntityFactory.COLLISION_TYPES.pickup);

    skyWall.drawable.scene.add(skyWall.drawable.mesh);
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
      enemyBullet: 1 << 5,

      pickup: 1 << 6
    },

    MOVE_SPEED: {
      enemy: 275
    },

    MASS: {
      player: 73,
      enemy: 81,
      bullet: 0.3
    },

    BULLET_DAMAGE: {
      potato: 7,
      fry: 3
    },

    MIN_BULLET_SPEED: {
      enemy: 25
    },

    MAX_BULLET_SPEED: {
      enemy: 75
    },

    MIN_LEASH_DISTANCE: {
      enemy: 50
    },

    MAX_LEASH_DISTANCE: {
      enemy: 250
    },

    MIN_SHOOT_DISTANCE: {
      enemy: 50
    },

    MAX_SHOOT_DISTANCE: {
      enemy: 250
    },

    MIN_START_HP: {
      enemy: 10
    },

    MAX_START_HP: {
      enemy: 25
    }
  }
});

