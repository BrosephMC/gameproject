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
      // c.save()
      // c.beginPath()
      c.drawImage(this.sprite, this.x-this.radius, this.y-this.radius, this.radius*2, this.radius*2)
      // c.fill()
      // c.restore()
    }
  }