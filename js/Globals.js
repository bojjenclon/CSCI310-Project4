Globals = Class({
  constructor: function() {
    this.hudElement = null;
    this.scoreElement = null;
    this.score = 0;
    this.reloadingElement = null;
    this.reloadImg = null;
  }
}, {
  statics: {
    get instance() {
      if (!Globals._instance) {
        Globals._instance = new Globals();
      }
      return Globals._instance;
    }
  }
});

