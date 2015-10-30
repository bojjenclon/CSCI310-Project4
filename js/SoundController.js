Sound = Class({
  constructor: function(options) {
    this.context = options.context;
    this.source = this.context.createBufferSource();
    this.volume = this.context.createGain();
    this.panner = this.context.createPanner();

    this.volume.connect(this.panner);
    this.panner.connect(options.mainVolume);

    this.source.loop = options.loop || false;

    var self = this;

    var request = new XMLHttpRequest();
    request.open("GET", options.path, true);
    request.responseType = "arraybuffer";
    request.onload = function(e) {
      self.context.decodeAudioData(this.response, function onSuccess(buffer) {
        self.buffer = buffer;

        self.source.buffer = self.buffer;

        if (options.callback) {
          options.callback(self);
        }
      }, function onFailure() {
        alert("Decoding the audio buffer failed");
      });
    };
    request.send();
  },

  setPosition: function(position) {
    this.panner.setPosition(position.x, position.y, position.z);
  },

  setVelocity: function(velocity) {
    this.panner.setVelocity(velocity.x, velocity.y, velocity.z);
  },

  setOrientation: function(orientation) {
    this.panner.setOrientation(orientation.x, orientation.y, orientation.z);
  },

  play: function(startTime) {
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.volume);
    this.source.start(startTime || 0);
  }
});

SoundController = Class({
  constructor: function(options) {
    this.context = options.context;

    this.mainVolume = this.context.createGain();
    this.mainVolume.connect(this.context.destination);

    this.following = options.following;

    this.sounds = {};
  },

  update: function(dt) {
    var position = new THREE.Vector3().setFromMatrixPosition(this.following.matrixWorld);
    this.setListenerPosition(position);

    var orientation = new THREE.Vector3(0, 0, 1);
    orientation.applyProjection(this.following.matrix);
    orientation.normalize();

    var up = new THREE.Vector3(0, -1, 0);
    up.applyProjection(this.following.matrix);
    up.normalize();

    this.setListenerOrientation(orientation, up);
  },

  loadSound: function(path, callback) {
    if (path in this.sounds) {
      throw new Error("The sound located at " + path + " is already loaded");
    }

    this.sounds[path] = new Sound({
      context: this.context,
      mainVolume: this.mainVolume,
      path: path,
      callback: callback
    });
  },

  getSound: function(path) {
    if (path in this.sounds) {
      return this.sounds[path];
    }

    throw new Error("The sound located at " + path + " is not loaded");
  },

  setListenerPosition: function(position) {
    this.context.listener.setPosition(position.x, position.y, position.z);
  },

  setListenerOrientation: function(orientation, up) {
    this.context.listener.setOrientation(orientation.x, orientation.y, orientation.z, up.x, up.y, up.z);
  }
});

