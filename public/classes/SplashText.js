class SplashText {
    constructor({attachedToPlayerId, x = 0, y = 0, text, color = 'yellow', lifespan = 60}) {
      this.attachedToPlayerId = attachedToPlayerId
      this.x = x
      this.y = y
      this.text = text
      this.color = color
      this.lifespan = lifespan
      this.totalLifespan = lifespan
    }
  
    draw() {
      const progress = this.lifespan / this.totalLifespan;
      const size = 8 + (1 - progress) * 6; // from 10px to 14px
  
      c.font = `${size}px sans-serif`;
      c.fillStyle = this.color;
      c.globalAlpha = Math.max(0, progress);
      c.fillText(this.text, this.x - c.measureText(this.text).width / 2, this.y);
      c.globalAlpha = 1.0;
    }
  }