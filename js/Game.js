Game = Class({
  constructor: function(options) {
    this.container = options.container;
    this.loadingContainer = options.loadingContainer;
    this.blocker = options.blocker;
    this.instructions = options.instructions;

    this.stats = null;

    this.prevTime = performance.now();

    this.renderer = null;
    this.scene = null;
    this.camera = null;

    this.paused = true;

    this.controlsEnabled = false;
    this.controls = null;

    this.systems = [];
  },

  start: function(runImmediately) {
    if (runImmediately === undefined || runImmediately === null) {
      runImmediately = true;
    }

    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    window.onkeydown = this.onKeyDown.bind(this); // prevent spacebar from scrolling the page
    window.addEventListener('mouseup', this.onMouseUp.bind(this));

    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    /* Stats.js Setup */
    this.stats = new Stats();
    this.stats.setMode(0);

    this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.left = '10px';
    this.stats.domElement.style.top = '10px';

    document.body.appendChild(this.stats.domElement);

    // Create a new Three.js scene
    this.scene = new Physijs.Scene();
    this.scene.setGravity(new THREE.Vector3(0, -9.8, 0));

    // Put in a camera
    var aspectRatio = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 1000);
    this.scene.add(this.camera);

    /* Camera Controller */
    this.controls = new PointerLockControls({
      camera: this.camera,
      minimumY: 5
    });
    this.scene.add(this.controls.getObject());

    this.clock = new THREE.Clock();

    /* Create Entities */

    var m = new Physijs.BoxMesh(
      new THREE.BoxGeometry(10, 10, 10),
      Physijs.createMaterial(new THREE.MeshBasicMaterial({
        color: 0x0000ff
      }), 0.5, 0.6), 0);
    m.position.set(0, -10, -200);
    this.scene.add(m);

    /* Setup Systems */

    this.systems.push(new MovementSystem(EntityFactory.instance.entities));
    this.systems.push(new ExpirableSystem(EntityFactory.instance.entities));

    // hide loading indicator and show instructions
    this.loadingContainer.style.visibility = "hidden";
    this.blocker.style.visibility = "visible";
    this.instructions.style.visibility = "visible";

    // ensure the user is at the top of the page
    document.body.scrollTop = document.documentElement.scrollTop = 0;

    this.initPointerLock();

    if (runImmediately) {
      this.run();
    }
  },

  run: function() {
    requestAnimationFrame(this.update.bind(this));
  },

  update: function() {
    requestAnimationFrame(this.update.bind(this));

    var time = performance.now();
    var dt = (time - this.prevTime) / 1000;

    if (!this.paused) {
      if (dt > 0.5) {
        dt = 0.5;
      }

      this.controls.update(dt);

      this.systems.forEach(function(system) {
        system.update(dt);
      });

      this.scene.simulate();
    }

    this.renderer.render(this.scene, this.camera);
    this.stats.update();

    this.prevTime = time;
  },

  onResize: function(e) {
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.camera.aspect = (window.innerWidth / window.innerHeight);
    this.camera.updateProjectionMatrix();
  },

  onKeyDown: function(e) {
    var keyCode = ('which' in event) ? event.which : event.keyCode;

    return (keyCode !== Game.KEY_CODES.space);
  },

  onKeyUp: function(e) {
    var keyCode = ('which' in event) ? event.which : event.keyCode;

    if (keyCode === Game.KEY_CODES.e) {
      var direction = new THREE.Vector3();
      this.controls.getDirection(direction);

      EntityFactory.instance.makeBullet({
        scene: this.scene,
        position: this.controls.getObject().position.clone(),
        rotation: this.controls.getObject().rotation.clone(),
        direction: direction,
        velocity: 100
      });
    }
  },

  onMouseUp: function(e) {
    if (this.paused) {
      return;
    }

    var direction = new THREE.Vector3();
    this.controls.getDirection(direction);

    EntityFactory.instance.makeBullet({
      scene: this.scene,
      position: this.controls.getObject().position.clone(),
      rotation: this.controls.getObject().rotation.clone(),
      direction: direction,
      velocity: 15
    });
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

          this.paused = false;

        }
        else {

          this.controls.enabled = false;

          this.blocker.style.display = '-webkit-box';
          this.blocker.style.display = '-moz-box';
          this.blocker.style.display = 'box';

          this.instructions.style.display = '';

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
      c: 67,
      space: 32,
      e: 69
    }
  }
});

