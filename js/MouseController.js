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

    this.canScrollWheel = true;
    this.__scrollWheelDelay = 0;
  },

  update: function(dt) {
    this.wasPressed.left = false;
    this.wasPressed.right = false;

    if (this.canScrollWheel === false) {
      this.__scrollWheelDelay += dt;

      if (this.__scrollWheelDelay > MouseController.SCROLL_WHEEL_DELAY_THRESHOLD) {
        this.canScrollWheel = true;
        this.__scrollWheelDelay = 0;
      }
    }
  }
}, {
  statics: {
    get instance() {
      if (!MouseController._instance) {
        MouseController._instance = new MouseController();
      }
      return MouseController._instance;
    },

    SCROLL_WHEEL_DELAY_THRESHOLD: 0.5
  }
});

