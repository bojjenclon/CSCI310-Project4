var EntityManager = require('tiny-ecs').EntityManager;
var C = require('./Components.js');

EntityFactory = Class({
  constructor: function() {
    this.entities = new EntityManager();
  },

  makePlayer: function(options) {
    var player = this.entities.createEntity();

    player.addTag("player");

    player.addComponent(C.Position);
    player.addComponent(C.Velocity);
    player.addComponent(C.Drawable);
    player.addComponent(C.CameraFollow);

    player.drawable.scene = options.scene;
    player.drawable.mesh = new Physijs.BoxMesh(
      new THREE.BoxGeometry(2, 5, 2),
      Physijs.createMaterial(new THREE.MeshBasicMaterial({
        color: 0xffff00
      }), 0.9, 0.1));
    player.drawable.mesh.position.copy(options.position);
    //player.drawable.mesh.rotation.copy(options.rotation);

    player.drawable.mesh._physijs.collision_type = EntityFactory.COLLISION_TYPES.player;
    player.drawable.mesh._physijs.collision_masks = EntityFactory.COLLISION_TYPES.obstacle | EntityFactory.COLLISION_TYPES.enemy | EntityFactory.COLLISION_TYPES.enemyBullet;

    player.drawable.scene.add(player.drawable.mesh);

    player.drawable.mesh.setDamping(0.99, 0);

    player.position.x = options.position.x;
    player.position.y = options.position.y;
    player.position.z = options.position.z;

    player.cameraFollow.controls = options.controls;
    player.cameraFollow.object = options.object;

    return player;
  },

  makeBullet: function(options) {
    var bullet = this.entities.createEntity();

    bullet.addTag("bullet");

    bullet.addComponent(C.Position);
    bullet.addComponent(C.Drawable);
    bullet.addComponent(C.Expirable);

    bullet.drawable.scene = options.scene;
    bullet.drawable.mesh = new Physijs.SphereMesh(
      new THREE.SphereGeometry(0.2),
      Physijs.createMaterial(new THREE.MeshBasicMaterial({
        color: 0x00ff00
      }), 0.7, 0.9));

    bullet.drawable.mesh._physijs.collision_type = EntityFactory.COLLISION_TYPES.playerBullet;
    bullet.drawable.mesh._physijs.collision_masks = EntityFactory.COLLISION_TYPES.obstacle | EntityFactory.COLLISION_TYPES.enemy;

    bullet.drawable.mesh.position.copy(options.position);
    bullet.drawable.mesh.rotation.copy(options.rotation);
    bullet.drawable.scene.add(bullet.drawable.mesh);

    bullet.drawable.mesh.setDamping(0.1, 0);

    /*bullet.drawable.mesh.addEventListener('collision', function(other_object, relative_velocity, relative_rotation, contact_normal) {
      console.log(other_object);
    });*/

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

    return bullet;
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
    }
  }
});

