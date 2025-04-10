const DEFAULT_MAX_HEALTH = 100
const DEFAULT_HEALTH_BAR_WIDTH = 30;
const HEALTH_BAR_HEIGHT = 4;

class Player {
  constructor({x, y, radius, color, username, angle, health, maxHealth, ready, eliminated, skindex = 0}) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.username = username
    this.angle = angle
    this.health = health
    this.maxHealth = maxHealth
    this.ready = ready
    this.eliminated = eliminated
    this.skindex = skindex
    this.sprite = new Image()
    this.sprite.src = "assets/images/dummy.png"
  }

  draw() {
    c.font = '12px sans-serif'
    c.fillStyle = 'white'
    if(this.eliminated) {c.fillStyle = 'gray'}
    c.fillText(this.username, this.x - (c.measureText(this.username).width / 2), this.y + 35)

    // shadow
    // c.shadowColor = this.color
    // c.shadowBlur = 20
    // if(this.eliminated) {c.shadowColor = 'black'}

    // start drawing
    c.save()
    c.translate(this.x, this.y);
    c.rotate(this.angle);
    c.beginPath();
    c.moveTo(this.radius, 0)

    // draw player
    if(!this.eliminated){
      if(playerSkins[this.skindex].includes("TRI_")){
        c.fillStyle = playerSkins[this.skindex].split('_')[1];
        c.lineTo(-this.radius / 1.5, this.radius / 1.5)
        c.lineTo(-this.radius / 1.5, -this.radius / 1.5)
      } else {
        this.sprite.src = "assets/images/"+playerSkins[this.skindex]+".png"
        c.drawImage(this.sprite, -this.radius, -this.radius, this.radius*2, this.radius*2)
      }
    }
    c.closePath()

    c.fill()
    c.restore()

    if(!this.eliminated && readOnlyGameState != "waiting_room"){
      //Health Bar
      const healthBarWidth = (this.maxHealth / 100) * DEFAULT_HEALTH_BAR_WIDTH
      const HBPosX = this.x - (healthBarWidth / 2)
      const HBPosY = this.y + 15
      const healthLength = (this.health / this.maxHealth) * healthBarWidth
      
      // Background (empty health bar)
      c.fillStyle = "red";
      c.fillRect(HBPosX + healthLength, HBPosY, healthBarWidth - healthLength, HEALTH_BAR_HEIGHT);
      
      // Current health (filled portion)
      c.fillStyle = "#00ff00"
      c.fillRect(HBPosX, HBPosY, healthLength, HEALTH_BAR_HEIGHT);
    }
    
    // ready indicator
    if(this.ready == true) {
      c.fillStyle = 'white'
      c.fillText("Ready!", this.x + 25, this.y + this.radius/2)
    }

    // debugging text
    // c.fillText("health:"+ this.health, this.x - (c.measureText(this.username).width / 2), this.y + 45)
    // c.fillText("maxHealth:"+ this.maxHealth, this.x - (c.measureText(this.username).width / 2), this.y + 55)
    // c.fillText("x:"+ Math.floor(this.x), this.x - (c.measureText(Math.floor(this.x)).width / 2), this.y + 65)
    // c.fillText("y:"+ Math.floor(this.y), this.x - (c.measureText(Math.floor(this.y)).width / 2), this.y + 75)
    // c.fillText("skindex:"+ this.skindex, this.x - (c.measureText(this.skindex).width / 2), this.y + 85)
  }

  drawPlayerHighlight(){
    // ring
    const pulse = 10 + Math.sin(Date.now() / 200) * 3; // Pulse radius
    c.strokeStyle = 'white'
    c.lineWidth = 1;
    c.beginPath()
    c.arc(this.x, this.y, this.radius + pulse, 0, Math.PI * 2);
    c.stroke();
    c.closePath();
  }
}
