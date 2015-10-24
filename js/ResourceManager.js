Model = Class({
  constructor: function(options) {
    this.geometry = options.geometry;
    this.material = options.material;
  }
});

ResourceManager = Class({
  constructor: function() {
    this.loadingManager = new THREE.LoadingManager();

    this.jsonLoader = new THREE.JSONLoader(this.loadingManager);

    this.textures = {};
    this.models = {};
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

  loadModel: function(path, callback) {
    if (path === null || path === undefined) {
      return;
    }
    else if (path in this.models) {
      callback(this.models[path]);

      return;
    }

    this.jsonLoader.load(path, function(geometry, materials) {
      var material = new THREE.MeshFaceMaterial(materials);

      var model = new Model({
        geometry: geometry,
        material: material
      });
      this.models[path] = model;

      callback(model);
    }.bind(this));
  }
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

