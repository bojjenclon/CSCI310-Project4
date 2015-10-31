PointerLockControls = Class({
  constructor: function(options) {
    this.camera = options.camera;
    this.camera.rotation.set(0, 0, 0);

    this.pitchObject = new THREE.Object3D();
    this.pitchObject.add(this.camera);

    this.yawObject = new THREE.Object3D();
    this.yawObject.position.y = 10;
    this.yawObject.add(this.pitchObject);

    this.enabled = false;

    document.addEventListener('mousemove', this.onMouseMove.bind(this), false);
  },

  onMouseMove: function(event) {
    if (this.enabled === false) {
      return;
    }

    var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    this.yawObject.rotation.y -= movementX * 0.002;
    this.pitchObject.rotation.x -= movementY * 0.002;

    this.pitchObject.rotation.x = Math.max(-PointerLockControls.PI_2, Math.min(PointerLockControls.PI_2, this.pitchObject.rotation.x));
  },

  getObject: function() {
    return this.yawObject;
  },

  getDirection: function() {
    // assumes the camera itself is not rotated
    var direction = new THREE.Vector3(0, 0, -1);
    var rotation = new THREE.Euler(0, 0, 0, "YXZ");

    return function(v) {
      rotation.set(this.pitchObject.rotation.x, this.yawObject.rotation.y, 0);

      v.copy(direction).applyEuler(rotation);

      return v;
    };
  }()

}, {
  statics: {
    PI_2: Math.PI / 2
  }
});

