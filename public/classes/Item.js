typeMap = {
  dummy: 'dimGray',
  rock: 'white',
  heal: 'crimson'
}

class Item {
    constructor({x, y, radius = 10, type = 'dummy'}) {
      this.x = x
      this.y = y
      this.radius = radius
      this.type = type
    }
  
    draw() {
      c.save()
      c.shadowColor = typeMap[this.type]
      c.shadowBlur = 20
      c.beginPath()
      c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
      c.fillStyle = typeMap[this.type]
      c.fill()
      c.restore()
    }
  
    update() {
      this.draw()
      // this.x = this.x + this.velocity.x
      // this.y = this.y + this.velocity.y
    }
  }