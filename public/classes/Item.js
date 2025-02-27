typeMap = {
  dummy: 'DimGray',
  rock: 'White',
  heal: 'LawnGreen',
  health_increase: 'Green',
  bomb: 'Red'
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

      // label
      c.shadowColor = 'rgb(0, 0, 0)';
      c.shadowOffsetX = 2;
      c.shadowOffsetY = 2;
      c.shadowBlur = 3;
      c.font = '12px sans-serif'
      c.fillStyle = 'white'
      c.fillText(this.type, this.x - (c.measureText(this.type).width / 2), this.y)
      c.shadowColor = 'rgb(0, 0, 0, 0)';
    }
  
    update() {
      this.draw()
    }
  }