const explosionSprite = new Image()
explosionSprite.src = "assets/images/explosion.png"

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
      c.beginPath()
      c.drawImage(this.sprite, this.x-this.radius, this.y-this.radius, this.radius*2, this.radius*2)
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
  }