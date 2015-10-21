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
    bullet.drawable.mesh.position.copy(options.position);
    bullet.drawable.mesh.rotation.copy(options.rotation);
    bullet.drawable.scene.add(bullet.drawable.mesh);

    bullet.drawable.mesh.setDamping(0.9, 0);

    bullet.drawable.mesh.addEventListener('collision', function(other_object, relative_velocity, relative_rotation, contact_normal) {

    });

    if (options.position) {
      bullet.position.x = options.position.x;
      bullet.position.y = options.position.y;
      bullet.position.z = options.position.z;
    }

    var vel = new THREE.Vector3(options.velocity, options.velocity, options.velocity);
    vel.multiply(options.direction);

    bullet.drawable.mesh.applyCentralImpulse(vel);

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
    }
  }
});

