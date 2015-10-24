Globals = Class({
  constructor: function() {
    this.hud = null;
    this.score = null;
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

