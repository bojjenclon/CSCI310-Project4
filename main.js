global.Class = require('js-class');
global.THREE = require('three');
global.THREEx = require('./js/THREEx.KeyboardState.js');
global.Physijs = require('physijs-browserify')(THREE);
global.Stats = require('stats.js');
global.Howler = require('howler');

require('hamsterjs');

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
require('./js/SoundController.js');

Physijs.scripts.worker = './libs/physijsWorker.js';
Physijs.scripts.ammo = './ammo.js';

// purpose: function as a basic FPS game using an ECS (entity-component system) pattern
//
// requires: RequestAnimationFrame.js, three.js, three-pointerlockcontrols.js, stats.js, js-class.js, physijs, tiny-ecs, Hamster.js
//           ./js/*, /js/components/*
//
// author: Cornell Daly
//
// date: November 3, 2015
//
// additional notes: code is separated into multiple files/folders

var game = null;

function init() {
  Globals.instance.hudLeftElement = document.getElementById("hudLeft");
  Globals.instance.hudRightElement = document.getElementById("hudRight");

  Globals.instance.healthElement = document.getElementById("health");
  Globals.instance.ammoElement = document.getElementById("ammo");
  Globals.instance.scoreElement = document.getElementById("score");

  Globals.instance.reloadingElement = document.getElementById("reloading");
  Globals.instance.reloadImg = new SuperGif({
    gif: document.getElementById("reloadImg")
  });
  Globals.instance.reloadImg.load();

  Globals.instance.weaponSelectorElement = document.getElementById("weaponSelector");
  Globals.instance.weaponNameElement = document.getElementById("weaponName");
  Globals.instance.weaponIconElement = document.getElementById("weaponIcon");

  Globals.instance.overlayElement = document.getElementById("overlay");

  var gameOptions = {
    container: document.getElementById("container"),
    loadingContainer: document.getElementById("loadingContainer"),
    blocker: document.getElementById("blocker"),
    instructions: document.getElementById("instructions"),
    modelsToPreload: [
      "models/potato.json",
      "models/potatoCannon.json",
      "models/character.json",
      "models/fry.json"
    ],
    soundsToPreload: [
      "sfx/arrowlessBow.mp3",
      "sfx/hitSplat.wav",
      "sfx/hurt1.mp3",
      "sfx/hurt2.mp3",
      "sfx/hurt3.mp3"
    ],
    texturesToPreload: [
      'gfx/brick-floor-tileable_COLOR.jpg',
      'gfx/brick-floor-tileable_DISP.jpg',
      'gfx/brick-floor-tileable_SPEC.jpg',
      'gfx/smoketex.jpg',
      'gfx/potatoIcon.png',
      'gfx/frenchFriesIcon.png'
    ]
  };
  game = new Game(gameOptions);

  game.start();
}

init();

