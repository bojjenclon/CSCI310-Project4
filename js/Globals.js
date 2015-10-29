Globals = Class({
  constructor: function() {
    this.dt = 0;

    this.hudElement = null;

    this.healthElement = null;

    this.scoreElement = null;
    this.score = 0;

    this.reloadingElement = null;
    this.reloadImg = null;

    this.overlayElement = null;
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

      bullet: 4
    }
  }
});

