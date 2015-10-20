ResourceManager = Class({
  constructor: function() {
    this.textures = {};
  },

  getTexture: function(path, callback) {
    if (path === null || path === undefined) {
      return null;
    }
    else if (path in this.textures) {
      return this.textures[path];
    }

    this.textures[path] = THREE.ImageUtils.loadTexture(path, undefined, callback);

    return this.textures[path];
  },
}, {
  statics: {
    get instance() {
      if (!ResourceManager._instance) {
        ResourceManager._instance = new ResourceManager();
      }
      return ResourceManager._instance;
    }
  }
});

