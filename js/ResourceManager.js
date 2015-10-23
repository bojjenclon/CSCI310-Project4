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
      /*var model = this.models[path];
      var mesh = new THREE.Mesh(model.geometry, model.material);

      if (callback) {
        callback(mesh);
      }*/
      callback(this.models[path]);

      return;
    }

    this.jsonLoader.load(path, function(geometry, materials) {
      /*for (var i in materials) {
        var mat = materials[i];
        mat.map = this.getTexture('gfx/' + mat.mapDiffuse);
        //mat.side = THREE.DoubleSide;
      }*/

      var material = new THREE.MeshFaceMaterial(materials);
      /*var mesh = new THREE.Mesh(geometry, material);

      this.models[path] = {
        geometry: geometry,
        material: material
      };

      if (callback) {
        callback(mesh);
      }*/
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

