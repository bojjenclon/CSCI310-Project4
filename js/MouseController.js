MouseController = Class({
  constructor: function() {
    this.isDown = {
      left: false,
      right: false
    };

    this.wasPressed = {
      left: false,
      right: false
    };
  },

  update: function(dt) {
    this.wasPressed.left = false;
    this.wasPressed.right = false;
  }
}, {
  statics: {
    get instance() {
      if (!MouseController._instance) {
        MouseController._instance = new MouseController();
      }
      return MouseController._instance;
    }
  }
});

