global.Class = require('js-class');
global.THREE = require('three');
global.THREE.PointerLockControls = require('three-pointerlock');
global.Physijs = require('physijs-browserify')(THREE);
global.Stats = require('stats.js');
var EntityManager = require('tiny-ecs').EntityManager;

require('./RequestAnimationFrame.js');

require('./js/Game.js');
require('./js/ResourceManager.js');

Physijs.scripts.worker = '/libs/physi-worker.js';
Physijs.scripts.ammo = '/libs/ammo.js';

// purpose: function as a basic FPS game using an ECS (entity-component system) pattern
//
// requires: three.js, RequestAnimationFrame.js, three-fly-controls.js, stats.js, js-class.js, dat-gui.js
//
// author: Cornell Daly
//
// date: November 3, 2015
//
// additional notes: code is separated into multiple files

var game = null;

function init() {
  var gameOptions = {
    container: document.getElementById("container"),
    loadingContainer: document.getElementById("loadingContainer"),
    blocker: document.getElementById("blocker"),
    instructions: document.getElementById("instructions")
  };
  game = new Game(gameOptions);

  game.start();
}

init();

