Globals = Class({
  constructor: function() {
    this.dt = 0;
    this.playerAlive = true;

    this.hudElement = null;

    this.healthElement = null;
    this.shieldElement = null;
    this.ammoElement = null;

    this.scoreElement = null;
    this.score = 0;

    this.reloadingElement = null;
    this.reloadImg = null;

    this.weaponSelectorElement = null;
    this.weaponNameElement = null;
    this.weaponIconElement = null;

    this.waveElement = null;

    this.overlayElement = null;

    this.sound = null;

    this.currentWave = 0;
  }
}, {
  statics: {
    get instance() {
      if (!Globals._instance) {
        Globals._instance = new Globals();
      }
      return Globals._instance;
    },

    DIR: "./",

    ENTITY_TYPES: {
      player: 0,
      enemy: 1,

      ground: 2,
      obstacle: 3,

      bullet: 4,

      pickup: 5
    }
  }
});

