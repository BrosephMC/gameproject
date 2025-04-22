class Projectile {
    constructor({x, y, velX, velY, radius = 5, color = 'white'}) {
      this.x = x
      this.y = y
      this.velX = velX
      this.velY = velY
      this.radius = radius
      this.color = color
    }
  
    draw() {
      c.save()
      c.shadowColor = this.color
      c.shadowBlur = 20
      c.beginPath()
      c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
      c.fillStyle = this.color
      c.fill()
      c.restore()
    }
  
    // update() {
    //   this.draw()
    //   this.x = this.x + this.velX
    //   this.y = this.y + this.velY
    // }
  }