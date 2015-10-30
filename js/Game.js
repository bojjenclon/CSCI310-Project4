Game = Class({
  constructor: function(options) {
    this.container = options.container;
    this.loadingContainer = options.loadingContainer;
    this.blocker = options.blocker;
    this.instructions = options.instructions;
    this.crosshair = options.crosshair;

    this.stats = null;

    this.prevTime = performance.now();

    this.renderer = null;
    this.scene = null;
    this.camera = null;

    this.paused = true;

    this.controlsEnabled = false;
    this.controls = null;

    this.systems = [];
    this.postPhysicsSystems = [];

    this.modelsToPreload = options.modelsToPreload;
    this.percentModelsLoaded = 0;

    this.systemsDelay = 0;
  },

  start: function(runImmediately) {
    if (runImmediately === undefined || runImmediately === null) {
      runImmediately = true;
    }

    window.addEventListener('resize', this.onResize.bind(this));
    window.onkeydown = this.onKeyDown.bind(this); // prevent spacebar from scrolling the page
    window.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));

    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    //this.renderer.setClearColor(0xffffff, 1);
    this.renderer.setClearColor(0xbc00bc, 1);
    this.container.appendChild(this.renderer.domElement);

    /* Stats.js Setup */
    this.stats = new Stats();
    this.stats.setMode(0);

    this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.left = '10px';
    this.stats.domElement.style.bottom = '10px';

    document.body.appendChild(this.stats.domElement);

    // Create a new Three.js scene
    this.scene = new Physijs.Scene();
    this.scene.setGravity(new THREE.Vector3(0, -32, 0));

    // Put in a camera
    var aspectRatio = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 1000);
    this.scene.add(this.camera);

    /* Camera Controller */
    this.controls = new PointerLockControls({
      camera: this.camera
    });
    this.scene.add(this.controls.getObject());

    /* Setup Crosshair */

    this.crosshair.style.left = ((window.innerWidth / 2) - 32) + 'px';
    this.crosshair.style.top = ((window.innerHeight / 2) - 32) + 'px';

    var ambientLight = new THREE.AmbientLight(0xcbcbcb);
    this.scene.add(ambientLight);

    var dirLight = new THREE.DirectionalLight(0xdcdcdc, 0.5);
    this.scene.add(dirLight);

    /* Create Entities */

    EntityFactory.instance.makeGround({
      scene: this.scene,
      width: 2000,
      height: 2000
    });

    this.player = EntityFactory.instance.makePlayer({
      scene: this.scene,
      position: new THREE.Vector3(0, 30, 0),
      controls: this.controls,
      controlsObject: this.controls.getObject(),
      cameraOffset: new THREE.Vector3(0, 10, 0), // 10, 10, 25
      gunOffset: new THREE.Vector3(6, 4, 0),
      hp: 20
    });

    EntityFactory.instance.makeEnemy({
      scene: this.scene,
      position: new THREE.Vector3(0, 30, -200),
      aiTarget: this.player,
      bulletSpeed: Math.random() * (60 - 15) + 15,
      hp: 15
    });

    EntityFactory.instance.makeEnemy({
      scene: this.scene,
      position: new THREE.Vector3(-100, 30, -150),
      aiTarget: this.player,
      bulletSpeed: Math.random() * (60 - 15) + 15,
      hp: 15
    });

    /* Setup Systems */

    this.systems.push(new PlayerInputSystem(EntityFactory.instance.entities));
    this.systems.push(new AISystem(EntityFactory.instance.entities));
    this.systems.push(new MovementSystem(EntityFactory.instance.entities));
    this.systems.push(new ExpirableSystem(EntityFactory.instance.entities));
    this.systems.push(new CameraPitchSystem(EntityFactory.instance.entities));
    this.systems.push(new ShootDelaySystem(EntityFactory.instance.entities));
    this.systems.push(new HurtSystem(EntityFactory.instance.entities));
    this.systems.push(new PlayerHealthSystem(EntityFactory.instance.entities));
    this.systems.push(new HealthBarSystem(EntityFactory.instance.entities));
    this.systems.push(new DeathSystem(EntityFactory.instance.entities));
    this.systems.push(new SteamRemovalSystem(EntityFactory.instance.entities));
    this.systems.push(new SteamUpdateSystem(EntityFactory.instance.entities));

    this.postPhysicsSystems.push(new PhysicsUpdateSystem(EntityFactory.instance.entities));
    this.postPhysicsSystems.push(new CameraFollowSystem(EntityFactory.instance.entities));

    this.loadModels();
  },

  loadModels: function() {
    this.modelsToPreload.forEach(function(model) {
      ResourceManager.instance.loadModel(model, this.modelLoaded.bind(this));
    }.bind(this));
  },

  modelLoaded: function(model) {
    var percentPerModel = 100.0 / this.modelsToPreload.length;
    this.percentModelsLoaded += percentPerModel;

    if (this.percentModelsLoaded > 99.0) {
      // hide loading indicator and show instructions
      this.loadingContainer.style.visibility = "hidden";
      this.blocker.style.visibility = "visible";
      this.instructions.style.visibility = "visible";
      Globals.instance.hudElement.style.display = 'block';
      //this.crosshair.style.display = 'block';

      // ensure the user is at the top of the page
      document.body.scrollTop = document.documentElement.scrollTop = 0;

      this.update(false);

      this.initPointerLock();

      this.update(true);
    }
  },

  update: function(animationFrame) {
    if (animationFrame) {
      requestAnimationFrame(this.update.bind(this));
    }

    var time = performance.now();
    var dt = (time - this.prevTime) / 1000;
    Globals.instance.dt = dt;

    if (!this.paused) {
      if (dt > 0.05) {
        dt = 0.05;
      }

      this.systems.forEach(function(system) {
        system.update(dt);
      });

      this.scene.simulate(dt);

      this.postPhysicsSystems.forEach(function(system) {
        system.update(dt);
      });

      MouseController.instance.update(dt);
    }

    this.renderer.render(this.scene, this.camera);
    this.stats.update();

    this.prevTime = time;
  },

  onResize: function(e) {
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.camera.aspect = (window.innerWidth / window.innerHeight);
    this.camera.updateProjectionMatrix();

    this.crosshair.style.left = ((window.innerWidth / 2) - 32) + 'px';
    this.crosshair.style.top = ((window.innerHeight / 2) - 32) + 'px';
  },

  onKeyDown: function(e) {
    var keyCode = ('which' in event) ? event.which : event.keyCode;

    return (keyCode !== Game.KEY_CODES.space);
  },

  onMouseDown: function(e) {
    if (this.paused) {
      return;
    }

    if (e.button === 0) {
      MouseController.instance.isDown.left = true;
    }
    else if (e.button === 2) {
      MouseController.instance.isDown.right = true;
    }
  },

  onMouseUp: function(e) {
    if (this.paused) {
      return;
    }

    if (e.button === 0) {
      MouseController.instance.isDown.left = false;
      MouseController.instance.wasPressed.left = true;
    }
    else if (e.button === 2) {
      MouseController.instance.isDown.right = false;
      MouseController.instance.wasPressed.right = true;
    }
  },

  initPointerLock: function() {
    var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

    if (havePointerLock) {

      var element = document.body;

      var pointerlockchange = function(event) {

        if (document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element) {

          this.controlsEnabled = true;
          this.controls.enabled = true;

          this.blocker.style.display = 'none';

          if (Globals.instance.reloadingElement.style.visibility === 'visible') {
            Globals.instance.reloadImg.play();
          }

          this.paused = false;

        }
        else {

          this.controls.enabled = false;

          this.blocker.style.display = '-webkit-box';
          this.blocker.style.display = '-moz-box';
          this.blocker.style.display = 'box';

          this.instructions.style.display = '';

          if (Globals.instance.reloadImg.get_playing()) {
            Globals.instance.reloadImg.pause();
          }

          this.paused = true;

        }

      }.bind(this);

      var pointerlockerror = function(event) {

        this.instructions.style.display = '';

      }.bind(this);

      // Hook pointer lock state change events
      document.addEventListener('pointerlockchange', pointerlockchange, false);
      document.addEventListener('mozpointerlockchange', pointerlockchange, false);
      document.addEventListener('webkitpointerlockchange', pointerlockchange, false);

      document.addEventListener('pointerlockerror', pointerlockerror, false);
      document.addEventListener('mozpointerlockerror', pointerlockerror, false);
      document.addEventListener('webkitpointerlockerror', pointerlockerror, false);

      this.instructions.addEventListener('click', function(event) {

        this.instructions.style.display = 'none';

        // Ask the browser to lock the pointer
        element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;

        if (/Firefox/i.test(navigator.userAgent)) {

          var fullscreenchange = function(event) {

            if (document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element) {

              document.removeEventListener('fullscreenchange', fullscreenchange);
              document.removeEventListener('mozfullscreenchange', fullscreenchange);

              element.requestPointerLock();
            }

          };

          document.addEventListener('fullscreenchange', fullscreenchange, false);
          document.addEventListener('mozfullscreenchange', fullscreenchange, false);

          element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;

          element.requestFullscreen();

        }
        else {

          element.requestPointerLock();

        }

      }.bind(this), false);

    }
    else {

      this.instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';

    }
  }
}, {
  statics: {
    KEY_CODES: {
      space: 32
    }
  }
});

