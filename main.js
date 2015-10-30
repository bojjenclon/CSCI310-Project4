global.Class = require('js-class');
global.THREE = require('three');
global.THREEx = require('./js/THREEx.KeyboardState.js');
global.Physijs = require('physijs-browserify')(THREE);
global.Stats = require('stats.js');

require('./RequestAnimationFrame.js');
require('./rubbable.js');
global.SuperGif = require('./libgif.js');

global.Utils = require('./js/Utils.js');

require('./js/Game.js');
require('./js/Globals.js');
require('./js/ResourceManager.js');
require('./js/PointerLockControls.js');
require('./js/EntityFactory.js');
require('./js/Systems.js');
require('./js/MouseController.js');

Physijs.scripts.worker = './libs/physijsWorker.js';
Physijs.scripts.ammo = './ammo.js';

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
  Globals.instance.hudElement = document.getElementById("hud");

  Globals.instance.healthElement = document.getElementById("health");
  Globals.instance.scoreElement = document.getElementById("score");

  Globals.instance.reloadingElement = document.getElementById("reloading");
  Globals.instance.reloadImg = new SuperGif({
    gif: document.getElementById("reloadImg")
  });
  Globals.instance.reloadImg.load();

  Globals.instance.overlayElement = document.getElementById("overlay");

  var gameOptions = {
    container: document.getElementById("container"),
    loadingContainer: document.getElementById("loadingContainer"),
    blocker: document.getElementById("blocker"),
    instructions: document.getElementById("instructions"),
    crosshair: document.getElementById("crosshair"),
    modelsToPreload: [
      "models/potato.json",
      "models/potatoCannon.json",
      "models/character.json",
      "models/fry.json"
    ]
  };
  game = new Game(gameOptions);

  game.start();
}

init();

