class Particle {
    constructor({x, y, startTime, radius = 10, type = 'dummy', lifespan = 120}) {
      this.x = x
      this.y = y
      this.radius = radius
      this.type = type
      this.sprite = new Image()
      this.sprite.src = "assets/images/" + this.type + ".png"
      this.lifespan = lifespan
      this.startTime = startTime
    }
  
    draw() {
      // if(this.type == 'explosion') {
        // c.lineWidth = 2;
        // c.beginPath();
        // c.strokeStyle = 'white';
        // c.arc(this.x, this.y, 50, 0, Math.PI * 2); // radius manually copied from backend
        // c.stroke();
        // c.closePath();
        const totalTime_ms = this.lifespan/60*1000
        const progress = (totalTime_ms - (Date.now() - this.startTime)) / totalTime_ms
        c.globalAlpha = Math.max(0, progress);
        c.drawImage(this.sprite, this.x-this.radius, this.y-this.radius, this.radius*2, this.radius*2)
        c.globalAlpha = 1.0;
      // } else {
      //   c.drawImage(this.sprite, this.x-this.radius, this.y-this.radius, this.radius*2, this.radius*2)
      // }

    }
  }