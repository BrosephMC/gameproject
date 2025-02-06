class Player {
  constructor({x, y, radius, color, username, angle}) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.username = username
    this.angle = angle
  }

  draw() {
    c.font = '12px sans-serif'
    c.fillStyle = 'white'
    c.fillText(this.username, this.x - 10, this.y + 20)

    c.save()
    c.translate(this.x, this.y);
    c.rotate(this.angle);
    c.shadowColor = this.color
    c.shadowBlur = 20

    // c.beginPath()
    // c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
    // c.fillStyle = this.color
    // c.fill()
    // c.restore()

    c.beginPath()

    // collision cirlce - start
    // c.fillStyle = 'black'
    // c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
    // c.closePath()
    // c.fill()
    // c.beginPath()
    // collision circle - end

    c.moveTo(this.radius, 0)
    c.lineTo(-this.radius / 1.5, this.radius / 1.5)
    c.lineTo(-this.radius / 1.5, -this.radius / 1.5)
    c.closePath()
    c.fillStyle = this.color
    c.fill()
    c.restore()
  }
}
