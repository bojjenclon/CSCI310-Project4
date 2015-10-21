global.Class = require('js-class');
global.THREE = require('three');
global.Physijs = require('physijs-browserify')(THREE);
global.Stats = require('stats.js');

require('./RequestAnimationFrame.js');

require('./js/Game.js');
require('./js/ResourceManager.js');
require('./js/PointerLockControls.js');
require('./js/EntityFactory.js');
require('./js/Systems.js');

Physijs.scripts.worker = '/libs/physi-worker.js';
Physijs.scripts.ammo = '/libs/ammo.js';

// purpose: function as a basic FPS game using an ECS (entity-component system) pattern
//
// requires: RequestAnimationFrame.js, three.js, three-pointerlockcontrols.js, stats.js, js-class.js, physijs, tiny-ecs
//           Game.js, ResourceManager.js
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

