class Particle {
    constructor({x, y, radius = 10, type = 'dummy', lifespan = 120}) {
      this.x = x
      this.y = y
      this.radius = radius
      this.type = type
      this.sprite = new Image()
      this.sprite.src = "assets/images/" + this.type + ".png"
      this.lifespan = lifespan
    }
  
    draw() {
      if(this.type == 'explosion') {
        c.lineWidth = 2;
        c.beginPath();
        c.strokeStyle = 'white';
        c.arc(this.x, this.y, 50, 0, Math.PI * 2); // radius manually copied from backend
        c.stroke();
        c.closePath();
      }

      c.drawImage(this.sprite, this.x-this.radius, this.y-this.radius, this.radius*2, this.radius*2)
    }
  }