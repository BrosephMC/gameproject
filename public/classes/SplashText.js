class SplashText {
    constructor({attachedToPlayerId, startTime, x = 0, y = 0, text, color = 'yellow', lifespan = 60}) {
      this.attachedToPlayerId = attachedToPlayerId
      this.x = x
      this.y = y
      this.text = text
      this.color = color
      this.lifespan = lifespan
      this.startTime = startTime
    }
  
    draw() {
      // const progress = this.lifespan / this.totalLifespan;
      const totalTime_ms = this.lifespan/60*1000
      const progress = (totalTime_ms - (Date.now() - this.startTime)) / totalTime_ms
      const size = 8 + (1 - progress) * 6; // from 10px to 14px
  
      c.font = `${size}px sans-serif`;
      c.fillStyle = this.color;
      c.globalAlpha = Math.max(0, progress);
      c.fillText(this.text, this.x - c.measureText(this.text).width / 2, this.y);
      c.globalAlpha = 1.0;
    }
  }