Game = Class({
  constructor: function(options) {
    this.container = options.container;
    this.loadingContainer = options.loadingContainer;
    this.blocker = options.blocker;
    this.instructions = options.instructions;

    this.stats = null;

    this.clock = null;

    this.renderer = null;
    this.scene = null;
    this.camera = null;

    this.paused = true;

    this.controlsEnabled = false;
    this.controls = null;
  },

  start: function(runImmediately) {
    if (runImmediately === undefined || runImmediately === null) {
      runImmediately = true;
    }

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keyup', this.onKeyUp);
    window.onkeydown = this.onKeyDown; // prevent spacebar from scrolling the page

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

    // Put in a camera
    var aspectRatio = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 1000);
    this.scene.add(this.camera);

    /* Camera Controller */
    this.controls = new THREE.PointerLockControls(this.camera);
    this.scene.add(this.controls.getObject());

    var m = new Physijs.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({
      color: 0xff0000
    }));
    this.scene.add(m);

    this.clock = new THREE.Clock();

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
    if (!this.paused) {
      var dt = this.clock.getDelta();

      if (dt > 0.5) {
        dt = 0.5;
      }

      this.controls.update(dt);

      this.scene.simulate();
    }
    else {
      this.clock.getDelta();
    }

    this.renderer.render(this.scene, this.camera);
    this.stats.update();

    requestAnimationFrame(this.update.bind(this));
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

    // if 'c' is pressed, toggle the fly controls
    if (keyCode === Game.KEY_CODES.c && this.guiMenu.cameraFocus === 'none') {
      this.controlsEnabled = !this.controlsEnabled;
      this.flyControls.setEnabled(this.controlsEnabled);
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
      space: 32
    }
  }
});

