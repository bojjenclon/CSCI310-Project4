Model = Class({
  constructor: function(options) {
    this.geometry = options.geometry;
    this.material = options.material;
  },

  clone: function() {
    return new Model({
      geometry: this.geometry.clone(),
      material: this.material.clone()
    });
  }
});

ResourceManager = Class({
  constructor: function() {
    this.loadingManager = new THREE.LoadingManager();

    this.jsonLoader = new THREE.JSONLoader(this.loadingManager);

    this.textures = {};
    this.models = {};
  },

  loadTexture: function(path, options) {
    options = options || {};
    var crossOrigin = options.crossOrigin || false;

    if (crossOrigin === false) {
      path = Globals.DIR + path;
    }

    if (path in this.textures) {
      throw new Error("The texture located at " + path + " is already loaded");
    }

    this.textures[path] = THREE.ImageUtils.loadTexture(path, undefined, options.callback, function(e) {
      console.log(e);
    });
  },

  getTexture: function(path, options) {
    options = options || {};
    var crossOrigin = options.crossOrigin || false;

    if (crossOrigin === false) {
      path = Globals.DIR + path;
    }

    if (path in this.textures) {
      return this.textures[path];
    }

    throw new Error("The texture located at " + path + " is not loaded");
  },

  loadModel: function(path, options) {
    options = options || {};
    var crossOrigin = options.crossOrigin || false;

    if (crossOrigin === false) {
      path = Globals.DIR + path;
    }

    if (path in this.models) {
      throw new Error("The model located at " + path + " is already loaded");
    }

    this.jsonLoader.load(path, function(geometry, materials) {
      var material = new THREE.MeshFaceMaterial(materials);

      var model = new Model({
        geometry: geometry,
        material: material
      });
      this.models[path] = model;

      if (options.callback) {
        options.callback(model);
      }
    }.bind(this));
  },

  getModel: function(path, options) {
    options = options || {};
    var crossOrigin = options.crossOrigin || false;

    if (crossOrigin === false) {
      path = Globals.DIR + path;
    }

    if (path in this.models) {
      return this.models[path];
    }

    throw new Error("The model located at " + path + " is not loaded");
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

