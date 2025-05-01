class Projectile {
    constructor({x, y, angle = 0, type = 'dummy', radius = 5, color = 'white'}) {
      this.x = x
      this.y = y
      this.angle = angle
      this.radius = radius
      this.color = color
      this.type = type
      this.sprite = new Image()
      this.sprite.src = "assets/images/" + this.type + ".png"
    }
  
    draw() {
      c.save()
      c.shadowColor = this.color
      c.shadowBlur = 20
      if (this.type == null || this.type == 'dummy'){
        c.beginPath()
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
        c.fillStyle = this.color
        c.fill()
      } else {
        c.translate(this.x, this.y);
        c.rotate(this.angle/2);
        c.beginPath();
        c.moveTo(this.radius, 0)
        c.drawImage(this.sprite, -this.radius, -this.radius, this.radius*2, this.radius*2)
      }
      c.closePath()
      c.restore()
    }
  }