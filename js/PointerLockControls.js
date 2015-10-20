PointerLockControls = Class({
  constructor: function(options) {
    this.camera = options.camera;
    this.camera.rotation.set(0, 0, 0);

    this.pitchObject = new THREE.Object3D();
    this.pitchObject.add(this.camera);

    this.yawObject = new THREE.Object3D();
    this.yawObject.position.y = 10;
    this.yawObject.add(this.pitchObject);

    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;

    this.isOnObject = false;
    this.canJump = false;

    this.prevTime = performance.now();

    this.velocity = new THREE.Vector3();

    this.enabled = false;

    document.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    document.addEventListener('keydown', this.onKeyDown.bind(this), false);
    document.addEventListener('keyup', this.onKeyUp.bind(this), false);
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

  onKeyDown: function(event) {
    switch (event.keyCode) {
      case 38: // up
      case 87: // w
        this.moveForward = true;
        break;

      case 37: // left
      case 65: // a
        this.moveLeft = true;
        break;

      case 40: // down
      case 83: // s
        this.moveBackward = true;
        break;

      case 39: // right
      case 68: // d
        this.moveRight = true;
        break;

      case 32: // space
        if (this.canJump === true) {
          this.velocity.y += 350;
        }

        this.canJump = false;

        break;

      default:
        break;
    }
  },

  onKeyUp: function(event) {
    switch (event.keyCode) {
      case 38: // up
      case 87: // w
        this.moveForward = false;
        break;

      case 37: // left
      case 65: // a
        this.moveLeft = false;
        break;

      case 40: // down
      case 83: // s
        this.moveBackward = false;
        break;

      case 39: // right
      case 68: // d
        this.moveRight = false;
        break;

      default:
        break;
    }
  },

  getObject: function() {
    return this.yawObject;
  },

  isOnObject: function(bool) {
    this.isOnObject = bool;
    this.canJump = bool;
  },

  getDirection: function() {
    // assumes the camera itself is not rotated
    var direction = new THREE.Vector3(0, 0, -1);
    var rotation = new THREE.Euler(0, 0, 0, "YXZ");

    return function(v) {
      rotation.set(this.pitchObject.rotation.x, this.yawObject.rotation.y, 0);

      v.copy(direction).applyEuler(rotation);

      return v;
    }.bind(this);
  },

  update: function() {

    if (this.enabled === false) {
      return;
    }

    var time = performance.now();
    var delta = (time - this.prevTime) / 1000;

    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;

    this.velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

    if (this.moveForward) this.velocity.z -= 400.0 * delta;
    if (this.moveBackward) this.velocity.z += 400.0 * delta;

    if (this.moveLeft) this.velocity.x -= 400.0 * delta;
    if (this.moveRight) this.velocity.x += 400.0 * delta;

    if (this.isOnObject === true) {
      this.velocity.y = Math.max(0, this.velocity.y);
    }

    this.yawObject.translateX(this.velocity.x * delta);
    this.yawObject.translateY(this.velocity.y * delta);
    this.yawObject.translateZ(this.velocity.z * delta);

    if (this.yawObject.position.y < 10) {
      this.velocity.y = 0;
      this.yawObject.position.y = 10;

      this.canJump = true;
    }

    this.prevTime = time;
  }
}, {
  statics: {
    PI_2: Math.PI / 2
  }
});

