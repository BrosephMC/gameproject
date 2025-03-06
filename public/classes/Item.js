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
      this.sprite = new Image()
      this.sprite.src = "assets/images/" + this.type + ".png"
    }
  
    draw() {
      c.save()
      // c.shadowColor = typeMap[this.type]
      // c.shadowBlur = 20
      c.beginPath()
      // c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
      c.drawImage(this.sprite, this.x-this.radius, this.y-this.radius, this.radius*2, this.radius*2)
      c.fillStyle = typeMap[this.type]
      c.fill()
      c.restore()

      if(this.highlighted){
        // label
        c.shadowColor = 'rgb(0, 0, 0)';
        c.shadowOffsetX = 2;
        c.shadowOffsetY = 2;
        c.shadowBlur = 3;
        c.font = '12px sans-serif'
        c.fillStyle = 'white'
        c.fillText(this.type, this.x - (c.measureText(this.type).width / 2), this.y-this.radius-5)
        c.shadowColor = 'rgb(0, 0, 0, 0)';
      }
    }
  
    update() {
      this.draw()
    }
  }