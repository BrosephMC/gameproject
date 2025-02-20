const HEALTH_BAR_WIDTH = 30;
const HEALTH_BAR_HEIGHT = 4;

class Player {
  constructor({x, y, radius, color, username, angle, health, maxHealth}) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.username = username
    this.angle = angle
    this.health = health
    this.maxHealth = maxHealth
  }


  draw() {
    c.font = '12px sans-serif'
    c.fillStyle = 'white'
    c.fillText(this.username, this.x - (c.measureText(this.username).width / 2), this.y + 35)

    c.save()
    c.translate(this.x, this.y);
    c.rotate(this.angle);
    c.shadowColor = this.color
    c.shadowBlur = 20

    c.beginPath()

    c.moveTo(this.radius, 0)
    c.lineTo(-this.radius / 1.5, this.radius / 1.5)
    c.lineTo(-this.radius / 1.5, -this.radius / 1.5)
    c.closePath()
    c.fillStyle = this.color
    c.fill()
    c.restore()

    //Health Bar
    const HBPosX = this.x - (HEALTH_BAR_WIDTH / 2)
    const HBPosY = this.y + 15
    const healthLength = (this.health / this.maxHealth) * HEALTH_BAR_WIDTH

    // Background (empty health bar)
    c.fillStyle = "red";
    c.fillRect(HBPosX + healthLength, HBPosY, HEALTH_BAR_WIDTH - healthLength, HEALTH_BAR_HEIGHT);

    // Current health (filled portion)
    c.fillStyle = "#00ff00"
    c.fillRect(HBPosX, HBPosY, healthLength, HEALTH_BAR_HEIGHT);
  }
}
