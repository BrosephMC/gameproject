class Projectile {
    constructor({x, y, radius = 5, color = 'white', velX, velY}) {
      this.x = x
      this.y = y
      this.radius = radius
      this.color = color
      this.velX = velX
      this.velY = velY
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
  
    update() {
      this.draw()
      this.x = this.x + this.velX
      this.y = this.y + this.velY
    }
  }