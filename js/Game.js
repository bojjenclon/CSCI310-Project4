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
    this.renderer.setClearColor(0xffffff, 1);
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

    /* Setup Crosshair */

    this.crosshair.style.left = ((window.innerWidth / 2) - 32) + 'px';
    this.crosshair.style.top = ((window.innerHeight / 2) - 32) + 'px';

    /*var crosshairTex = ResourceManager.instance.getTexture('gfx/crossHair.png');
    var crosshairSpr = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: crosshairTex
      }));
    crosshairSpr.position.set(0, 0.5, -5);
    this.controls.getObject().add(crosshairSpr);*/

    /*var geometry = new THREE.TubeGeometry(
      new THREE.LineCurve(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -10)), //path
      20, //segments
      2, //radius
      8, //radiusSegments
      false //closed
    );

    var t = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide
    }));

    t.position.set(1, 1, -2);

    this.controls.getObject().add(t);*/

    var ground = new Physijs.BoxMesh(
      new THREE.BoxGeometry(500, 1, 500),
      new THREE.MeshBasicMaterial({
        color: 0xdcdcdc
      }), 0);
    ground._physijs.collision_type = EntityFactory.COLLISION_TYPES.obstacle;
    ground._physijs.collision_masks = EntityFactory.COLLISION_TYPES.player | EntityFactory.COLLISION_TYPES.playerBullet | EntityFactory.COLLISION_TYPES.enemyBullet;
    this.scene.add(ground);

    /* Create Entities */

    this.player = EntityFactory.instance.makePlayer({
      scene: this.scene,
      position: new THREE.Vector3(0, 5, 0),
      controls: this.controls,
      object: this.controls.getObject()
    });

    var m = new Physijs.BoxMesh(
      new THREE.BoxGeometry(10, 10, 10),
      Physijs.createMaterial(new THREE.MeshBasicMaterial({
        color: 0x0000ff
      }), 0.5, 0.6), 0);
    m._physijs.collision_type = EntityFactory.COLLISION_TYPES.enemy;
    m._physijs.collision_masks = EntityFactory.COLLISION_TYPES.obstacle | EntityFactory.COLLISION_TYPES.player | EntityFactory.COLLISION_TYPES.playerBullet;
    m.position.set(0, 6, -200);
    this.scene.add(m);

    /* Setup Systems */

    this.systems.push(new CameraRotationSystem(EntityFactory.instance.entities));
    this.systems.push(new PlayerInputSystem(EntityFactory.instance.entities));
    this.systems.push(new MovementSystem(EntityFactory.instance.entities));
    this.systems.push(new ExpirableSystem(EntityFactory.instance.entities));
    this.systems.push(new CameraFollowSystem(EntityFactory.instance.entities, this.renderer.domElement));

    this.postPhysicsSystems.push(new PhysicsUpdateSystem(EntityFactory.instance.entities));

    // hide loading indicator and show instructions
    this.loadingContainer.style.visibility = "hidden";
    this.blocker.style.visibility = "visible";
    this.instructions.style.visibility = "visible";
    this.crosshair.style.display = 'block';

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

      //this.controls.update(dt);

      this.systems.forEach(function(system) {
        system.update(dt);
      });

      this.scene.simulate();

      this.postPhysicsSystems.forEach(function(system) {
        system.update(dt);
      });
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
        rotationMatrix: new THREE.Matrix4().extractRotation(this.controls.getObject().matrix),
        velocity: 5
      });
    }
  },

  onMouseUp: function(e) {
    if (this.paused) {
      return;
    }

    if (e.button === 0) {
      var direction = new THREE.Vector3();
      this.controls.getDirection(direction);

      EntityFactory.instance.makeBullet({
        scene: this.scene,
        position: this.controls.getObject().position.clone(),
        rotation: this.controls.getObject().rotation.clone(),
        direction: direction,
        rotationMatrix: new THREE.Matrix4().extractRotation(this.controls.getObject().matrix),
        velocity: 5
      });
    }
    else if (e.button === 2) {
      var direction = new THREE.Vector3();
      this.controls.getDirection(direction);

      EntityFactory.instance.makeBullet({
        scene: this.scene,
        position: this.controls.getObject().position.clone(),
        rotation: this.controls.getObject().rotation.clone(),
        direction: direction,
        velocity: 1
      });
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
      space: 32,
      e: 69,
      w: 87
    }
  }
});

