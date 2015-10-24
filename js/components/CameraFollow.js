module.exports = CameraFollow;

function CameraFollow() {
  this.controls = null;
  this.object = null;
  this.offset = new THREE.Vector3();
}

