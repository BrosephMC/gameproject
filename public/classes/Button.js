class Button {
    constructor({x, y, width, height, type = 'dummy'}) {
      this.x = x
      this.y = y
      this.width = width
      this.height = height
      this.type = type
      this.sprite = new Image()
      this.sprite.src = "assets/images/" + this.type + ".png"
    }
  
    draw() {
      if(this.sprite){
        c.drawImage(this.sprite, this.x, this.y, this.width, this.height)
      }
    }

    hover(mouseX, mouseY) {
      return (
        mouseX >= this.x &&
        mouseX <= this.x + this.width &&
        mouseY >= this.y &&
        mouseY <= this.y + this.height
      );
    }
  }