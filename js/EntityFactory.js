var EntityManager = require('tiny-ecs').EntityManager;
var C = require('./Components.js');
var b3 = require('./../b3core.0.1.0.js');

EntityFactory = Class({
  constructor: function() {
    this.entities = new EntityManager();
  },

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

    player.identifier.type = Globals.ENTITY_TYPES.player;

    player.drawable.scene = options.scene;

    player.drawable.mesh = new Physijs.BoxMesh(
      new THREE.BoxGeometry(2, 8, 2),
      Physijs.createMaterial(new THREE.MeshBasicMaterial({
        color: 0xffff00
      }), 0.9, 0.01), 73);
    player.drawable.mesh.entity = player;

    player.drawable.mesh.position.copy(options.position);
    //player.drawable.mesh.rotation.copy(options.rotation);

    player.drawable.mesh._physijs.collision_type = EntityFactory.COLLISION_TYPES.player;
    player.drawable.mesh._physijs.collision_masks = EntityFactory.COLLISION_TYPES.obstacle | EntityFactory.COLLISION_TYPES.enemy | EntityFactory.COLLISION_TYPES.enemyBullet;

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

    player.position.x = options.position.x;
    player.position.y = options.position.y;
    player.position.z = options.position.z;

    player.cameraFollow.controls = options.controls;
    player.cameraFollow.object = options.controlsObject;
    player.cameraFollow.offset = options.cameraOffset;

    player.shootDelay.delayTheshold = 0.5;

    return player;
  },

  makeEnemy: function(options) {
    var enemy = this.entities.createEntity();

    enemy.addTag("enemy");

    enemy.addComponent(C.Identifier);
    enemy.addComponent(C.Position);
    enemy.addComponent(C.Velocity);
    enemy.addComponent(C.Drawable);
    enemy.addComponent(C.Health);
    enemy.addComponent(C.AI);

    enemy.identifier.type = Globals.ENTITY_TYPES.enemy;

    enemy.drawable.scene = options.scene;

    enemy.drawable.mesh = new Physijs.BoxMesh(
      new THREE.BoxGeometry(10, 10, 10),
      Physijs.createMaterial(new THREE.MeshPhongMaterial({
        color: 0x0000ff
      }), 0.9, 0.1), 81);
    enemy.drawable.mesh.entity = enemy;

    enemy.drawable.mesh._physijs.collision_type = EntityFactory.COLLISION_TYPES.enemy;
    enemy.drawable.mesh._physijs.collision_masks = EntityFactory.COLLISION_TYPES.obstacle | EntityFactory.COLLISION_TYPES.player | EntityFactory.COLLISION_TYPES.playerBullet;

    enemy.drawable.mesh.position.copy(options.position);
    //enemy.drawable.mesh.rotation.copy(options.rotation);

    enemy.drawable.scene.add(enemy.drawable.mesh);

    enemy.drawable.mesh.setDamping(0.99, 0);

    enemy.position.x = options.position.x;
    enemy.position.y = options.position.y;
    enemy.position.z = options.position.z;

    enemy.health.healthBar = new THREE.Mesh(
      new THREE.BoxGeometry(10, 1.5, 0.5),
      new THREE.MeshBasicMaterial({
        color: 0x00ff00
      }));
    enemy.health.healthBar.position.set(0, 7, 0);
    enemy.drawable.mesh.add(enemy.health.healthBar);

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

      if (angle <= 0.02) {
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

      if (distance < 0.5) {
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

    enemy.ai.tree = new b3.BehaviorTree();
    enemy.ai.tree.root = new b3.Sequence({
      children: [
        new b3.Sequence({
          children: [
            new FaceNode({
              facing: options.aiTarget
            }),
            new FollowNode({
              following: options.aiTarget
            })
          ]
        })
      ]
    });

    enemy.ai.target = enemy;
    enemy.ai.blackboard = new b3.Blackboard();
  },

  makeBullet: function(options) {
    ResourceManager.instance.loadModel('models/potato.json', function(model) {
      var bullet = this.entities.createEntity();

      bullet.addTag("bullet");

      bullet.addComponent(C.Identifier);
      bullet.addComponent(C.Position);
      bullet.addComponent(C.Drawable);
      bullet.addComponent(C.Bullet);
      bullet.addComponent(C.Expirable);
      bullet.addComponent(C.OneTimeHit);

      bullet.identifier.type = Globals.ENTITY_TYPES.bullet;

      bullet.drawable.scene = options.scene;

      bullet.drawable.mesh = new Physijs.ConvexMesh(
        model.geometry,
        Physijs.createMaterial(model.material, 0.7, 0.01),
        0.3);
      bullet.drawable.mesh.entity = bullet;

      bullet.drawable.mesh._physijs.collision_type = EntityFactory.COLLISION_TYPES.playerBullet;
      bullet.drawable.mesh._physijs.collision_masks = EntityFactory.COLLISION_TYPES.obstacle | EntityFactory.COLLISION_TYPES.enemy | EntityFactory.COLLISION_TYPES.playerBullet | EntityFactory.COLLISION_TYPES.enemyBullet;

      bullet.drawable.mesh.position.copy(options.position);
      bullet.drawable.mesh.rotation.copy(options.rotation);
      bullet.drawable.mesh.scale.copy(options.scale);

      bullet.drawable.scene.add(bullet.drawable.mesh);

      bullet.drawable.mesh.setDamping(0.1, 0);

      bullet.drawable.mesh.addEventListener('collision', function(other_object, relative_velocity, relative_rotation, contact_normal) {
        if (other_object.entity.identifier.type === Globals.ENTITY_TYPES.enemy && bullet.bullet.touchedGround === false && bullet.oneTimeHit.alreadyHit.indexOf(other_object.uuid) < 0) {
          other_object.entity.addComponent(C.Hurt);
          other_object.entity.hurt.originalColor = other_object.material.color;

          other_object.entity.health.hp--;
          other_object.entity.health.changed = true;

          bullet.oneTimeHit.alreadyHit.push(other_object.uuid);
        }
        else if (other_object.entity.identifier.type === Globals.ENTITY_TYPES.ground) {
          bullet.bullet.touchedGround = true;
        }
      }.bind(this));

      if (options.position) {
        bullet.position.x = options.position.x;
        bullet.position.y = options.position.y;
        bullet.position.z = options.position.z;
      }

      var vel = new THREE.Vector3(options.velocity, options.velocity, options.velocity);
      vel.multiply(options.direction);
      //var vel = new THREE.Vector3(0, 0, -options.velocity).applyMatrix4(options.rotationMatrix);
      bullet.drawable.mesh.applyCentralImpulse(vel);
      //console.log(vel, options.direction, options.position);

      bullet.expirable.maxAge = 5;
    }.bind(this));
  },

  makeGround: function(options) {
    var ground = this.entities.createEntity();

    ground.addComponent(C.Identifier);
    ground.addComponent(C.Position);
    ground.addComponent(C.Drawable);

    ground.identifier.type = Globals.ENTITY_TYPES.ground;

    ground.drawable.scene = options.scene;

    ground.drawable.mesh = new Physijs.BoxMesh(
      new THREE.BoxGeometry(500, 1, 500),
      new THREE.MeshBasicMaterial({
        color: 0x00dd00
      }), 0);
    ground.drawable.mesh.entity = ground;

    ground.drawable.mesh._physijs.collision_type = EntityFactory.COLLISION_TYPES.obstacle;
    ground.drawable.mesh._physijs.collision_masks = EntityFactory.COLLISION_TYPES.player | EntityFactory.COLLISION_TYPES.enemy | EntityFactory.COLLISION_TYPES.playerBullet | EntityFactory.COLLISION_TYPES.enemyBullet;

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
      enemy: 70
    }
  }
});

