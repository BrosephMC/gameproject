class Item {
    constructor({x, y, radius = 10, color = 'white'}) {
      this.x = x
      this.y = y
      this.radius = radius
      this.color = color
      // this.velocity = velocity
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
      // this.x = this.x + this.velocity.x
      // this.y = this.y + this.velocity.y
    }
  }