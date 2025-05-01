const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
const scoreEl = document.querySelector('#scoreEl')

const CANVAS_WIDTH = 1280
const CANVAS_HEIGHT = 720
const devicePixelRatio = window.devicePixelRatio || 1
canvas.width = CANVAS_WIDTH * devicePixelRatio
canvas.height = CANVAS_HEIGHT * devicePixelRatio
c.scale(devicePixelRatio, devicePixelRatio)

const frontEndPlayers = {}
const frontEndProjectiles = {}
const frontEndItems = {}
const particles = {}
const splashTexts = {}
let particleId = 0
let splashTextId = 0
let frontEndHeaderText = ""
let readOnlyGameState = "waiting_room"

const socket = io();
let followPlayer = false
// const ZOOM_SCALE = 1.5
let ZOOM_SCALE = 1
let client = null

let playerSkins = [] // grabbed from the back end

const frontEndButtons = {
    left_button: new Button({
        x: CANVAS_WIDTH/2-110-32,
        y: CANVAS_HEIGHT-80,
        width: 64,
        height: 64,
        type: "left_button",
    }),
    right_button: new Button({
        x: CANVAS_WIDTH/2+110-32,
        y: CANVAS_HEIGHT-80,
        width: 64,
        height: 64,
        type: "right_button",
    }),
    ready_button: new Button({
        x: CANVAS_WIDTH/2-64,
        y: CANVAS_HEIGHT-80,
        width: 128,
        height: 64,
        type: "ready_button",
    }),
    title_image: new Button({
        x: CANVAS_WIDTH/2-384/2,
        y: 70, // changed later in code with bounce
        width: 384,
        height: 216,
        type: "titleScreen2",
    })
}

var sfx = {
    "pop": new Howl({
        src: "assets/sounds/pop.mp3",
    }),
    "explosion": new Howl({
        src: "assets/sounds/cannon-shot.mp3",
    }),
    "whoosh": new Howl({
        src: "assets/sounds/whoosh.mp3",
    }),
    "pluck_1": new Howl({
        src: "assets/sounds/pluck_1.mp3",
    }),
    "pluck_2": new Howl({
        src: "assets/sounds/pluck_2.mp3",
    }),
    "pluck_3": new Howl({
        src: "assets/sounds/pluck_3.mp3",
    }),
    "notify_on": new Howl({
        src: "assets/sounds/notify_on.mp3",
    }),
    "hit": new Howl({
        src: "assets/sounds/hit.mp3",
    }),
    "heal": new Howl({
        src: "assets/sounds/heal.mp3",
    }),
    "taser": new Howl({
        src: "assets/sounds/taser.mp3",
    }),
    "speed_boost": new Howl({
        src: "assets/sounds/speed_boost.mp3",
    }),
    "success": new Howl({
        src: "assets/sounds/success.mp3",
    }),
}

function playSound(soundId, volume, rate){
    sfx[soundId].volume(volume)
    sfx[soundId].rate(rate)
    sfx[soundId].play()
}

socket.on('playSound', ({soundId, volume, rate}) => {
    playSound(soundId, volume, rate)
})

socket.on('spawnParticle', (particle) => {
    particles[particleId++] = new Particle({
        x: particle.x,
        y: particle.y,
        radius: particle.radius,
        type: particle.type,
        lifespan: particle.lifespan,
        startTime: Date.now()
    })
})

socket.on('spawnSplashText', (splashText) => {
    splashTexts[splashTextId++] = new SplashText({
        attachedToPlayerId: splashText.attachedToPlayerId,
        x: splashText.x,
        y: splashText.y,
        text: splashText.text,
        color: splashText.color,
        lifespan: splashText.lifespan,
        startTime: Date.now()
    })
})

socket.on('updateHeaderText', (BackEndHeaderText) => {
    frontEndHeaderText = BackEndHeaderText
})

socket.on('updateReadOnlyGameState', (backEndGameState) => {
    readOnlyGameState = backEndGameState
})

socket.on('updatePlayerSkins', (backEndPlayerSkins) => {
    playerSkins = backEndPlayerSkins
})

// receive update from server
socket.on('updateProjectiles', (backEndProjectiles) => {
    for (const id in backEndProjectiles) {
        const backEndProjectile = backEndProjectiles[id]

        // if new backend projectile does not exist, make front end item
        if (!frontEndProjectiles[id]) {
            frontEndProjectiles[id] = new Projectile({
                x: backEndProjectile.x, 
                y: backEndProjectile.y,
                angle: backEndProjectile.angle,
                radius: backEndProjectile.radius,
                color: backEndProjectile.color, 
                type: backEndProjectile.type
            })
        } else {
            frontEndProjectiles[id].x = backEndProjectile.x
            frontEndProjectiles[id].y = backEndProjectile.y
            frontEndProjectiles[id].angle = backEndProjectile.angle
        }
    }

    // if backend item cannot be found, delete front end item
    for (const id in frontEndProjectiles) {
        if(!backEndProjectiles[id]) {
            delete frontEndProjectiles[id]
        }
    }
    // console.log(frontEndProjectiles)
})

// let serverTime = 0

// receive update from server
socket.on('updateItems', (backEndItems) => {
    // if(time < serverTime) {
    //     console.warn("Received an old update from the server. Ignoring it.")
    //     return
    // }
    // serverTime = time

    for (const id in backEndItems) {
        const backEndItem = backEndItems[id]

        // if new backend item does not exist, make front end item
        if (!frontEndItems[id]) {
            frontEndItems[id] = new Item({
                x: backEndItem.x, 
                y: backEndItem.y, 
                // default radius
                type: backEndItem.type
            })
        } else {
            // frontEndItems[id].x = backEndItem.x
            // frontEndItems[id].y = backEndItem.y
            frontEndItems[id].x += (backEndItem.x-frontEndItems[id].x) * 0.2
            frontEndItems[id].y += (backEndItem.y-frontEndItems[id].y) * 0.2
            frontEndItems[id].highlighted = backEndItem.highlighted
            if(frontEndItems[id].type != backEndItem.type){
                frontEndItems[id].type = backEndItem.type
                frontEndItems[id].updateSprite()
            }
            // console.log(frontEndItems[id].x)
        }
    }

    // if backend item cannot be found, delete front end item
    for (const id in frontEndItems) {
        if(!backEndItems[id]) {
            delete frontEndItems[id]
        }
    }
    // console.log(frontEndItems)
})

// receive update from server
socket.on('updatePlayers', (backEndPlayers) => {
    for (const id in backEndPlayers) {
        const backEndPlayer = backEndPlayers[id]

        // if new backend player does not exist, make front end player
        if (!frontEndPlayers[id]){
            frontEndPlayers[id] = new Player({
                x: backEndPlayer.x,
                y: backEndPlayer.y,
                radius: backEndPlayer.radius,
                color: backEndPlayer.color,
                username: backEndPlayer.username,
                angle: 0,
                health: 100,
                maxHealth: 100,
            })

            document.querySelector('#playerLabels').innerHTML += 
                `<div data-id="${id}" data-score="${backEndPlayer.score}">${backEndPlayer.username}: ${backEndPlayer.score}</div>`
        } else {
            document.querySelector(`div[data-id="${id}"]`).innerHTML = `${backEndPlayer.username}: ${backEndPlayer.score}`
            document.querySelector(`div[data-id="${id}"]`).setAttribute('data-score', backEndPlayer.score)

            // sorts the players divs
            const parentDiv = document.querySelector('#playerLabels')
            const childDivs = Array.from(parentDiv.querySelectorAll('div'))
            childDivs.sort((a, b) => {
                const scoreA = Number(a.getAttribute('data-score'))
                const scoreB = Number(b.getAttribute('data-score'))
                
                return scoreB - scoreA
            })

            // removes old elements
            childDivs.forEach(div => {
                parentDiv.removeChild(div)
            })
            // add sorted elements
            childDivs.forEach(div => {
                parentDiv.appendChild(div)
            })

            frontEndPlayers[id].target = {
                x: backEndPlayer.x,
                y: backEndPlayer.y
            }

            //update player rotation angle
            frontEndPlayers[id].angle = backEndPlayer.angle

            //update player stats
            frontEndPlayers[id].health = backEndPlayer.health
            frontEndPlayers[id].maxHealth = backEndPlayer.maxHealth
            frontEndPlayers[id].ready = backEndPlayer.ready
            frontEndPlayers[id].eliminated = backEndPlayer.eliminated
            frontEndPlayers[id].skindex = backEndPlayer.skindex
            frontEndPlayers[id].speed = backEndPlayer.speed
            frontEndPlayers[id].meleeAttackTime = backEndPlayer.meleeAttackTime

            // if it's the client's own player
            if(id === socket.id){
                frontEndPlayers[id].isClient = true
                client = frontEndPlayers[id]
            } else {
                frontEndPlayers[id].isClient = false
            }
        }
    }

    // if backend player cannot be found, delete front end player
    for (const id in frontEndPlayers) {
        if(!backEndPlayers[id]) {
            const divToDelete = document.querySelector(`div[data-id="${id}"]`)
            divToDelete.parentNode.removeChild(divToDelete)

            if (id == socket.id) {
                document.querySelector('#usernameForm').style.display = 'block'
            }

            if(frontEndPlayers[id].isClient){
                client = null
            }

            delete frontEndPlayers[id]

        }
    }
})

let camera = {
    x: 0,
    y: 0
};
const CAMERA_SMOOTHNESS = 0.2;

let animationId
function animate() {

    animationId = requestAnimationFrame(animate)

    c.clearRect(0, 0, canvas.width, canvas.height)

    if(followPlayer && client){
        c.save();
        c.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        c.scale(ZOOM_SCALE, ZOOM_SCALE);
        camera.x += (client.x - camera.x) * CAMERA_SMOOTHNESS;
        camera.y += (client.y - camera.y) * CAMERA_SMOOTHNESS;
        c.translate(-camera.x, -camera.y);

        c.beginPath();
        c.strokeStyle = 'white'
        c.lineWidth = 1
        c.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        c.stroke();
        c.closePath();
    }

    for(const id in frontEndItems) {
        const frontEndItem = frontEndItems[id]
        frontEndItem.draw()
    }

    for(const id in frontEndProjectiles) {
        const frontEndProjectile = frontEndProjectiles[id]
        frontEndProjectile.draw()
    }

    for(const id in frontEndPlayers) {
        const frontEndPlayer = frontEndPlayers[id]
        if(frontEndPlayer.target){
            frontEndPlayers[id].x += 
                (frontEndPlayers[id].target.x - frontEndPlayers[id].x) * 0.5
            frontEndPlayers[id].y += 
                (frontEndPlayers[id].target.y - frontEndPlayers[id].y) * 0.5
        }
        if(frontEndPlayer.isClient && readOnlyGameState == "waiting_room" && !frontEndPlayer.ready){
            frontEndPlayer.drawPlayerHighlight()
        }
        if(readOnlyGameState == "playing" && frontEndPlayer.isClient && frontEndPlayer.eliminated ){
            frontEndHeaderText = "You are eliminated! Wait until the round finishes."
        }
        frontEndPlayer.draw()

    }

    for(const id in particles) {
        particles[id].draw()

        if (Date.now() - particles[id].startTime >= particles[id].lifespan/60*1000) {
            delete particles[id];
        }
    }

    for(const id in splashTexts) {
        const attachedToPlayer = frontEndPlayers[splashTexts[id].attachedToPlayerId]
        if(attachedToPlayer){
            splashTexts[id].x = attachedToPlayer.x
            splashTexts[id].y = attachedToPlayer.y + 50
        }
        splashTexts[id].draw()

        if (Date.now() - splashTexts[id].startTime >= splashTexts[id].lifespan/60*1000) {
            delete splashTexts[id];
        }
        
    }

    if(followPlayer && client){
        c.restore();
    }

    if(readOnlyGameState == "waiting_room"){
        const pulse = 80 + Math.sin(Date.now() / 500) * 10;
        frontEndButtons["title_image"].y = pulse
        for(const id in frontEndButtons) {
            frontEndButtons[id].draw()
        }
    }

    if (frontEndHeaderText != "") {
        c.font = '16px sans-serif'
        c.fillStyle = 'white'
        if(frontEndHeaderText.split(" ")[1] <= 10) {c.fillStyle = 'orange'}
        c.fillText(frontEndHeaderText, CANVAS_WIDTH/2 - (c.measureText(frontEndHeaderText).width / 2), 50)
    }

}

animate()

document.querySelector('#usernameForm').addEventListener('submit', (event) => {
    event.preventDefault()
    document.querySelector('#usernameForm').style.display = 'none'
    socket.emit('initPlayer', {
        width: canvas.width, 
        height: canvas.height,
        username: document.querySelector('#usernameInput').value
    }
    )
})

document.addEventListener('click', (event) => {
    if(!frontEndPlayers[socket.id]) return
    socket.emit('click')

    if(readOnlyGameState == "waiting_room") {
        const {top, left} = canvas.getBoundingClientRect()
            mouseX = event.clientX - left;
            mouseY = event.clientY - top;

        for(const id in frontEndButtons){
            if(frontEndButtons[id].hover(mouseX, mouseY)){
                switch (frontEndButtons[id].type) {
                    case "left_button":
                        socket.emit('updateSkindex', {dir: 1, length: playerSkins.length});
                        playSound("pluck_1", 0.4, 1)
                    break;
                    case "right_button":
                        socket.emit('updateSkindex', {dir: 0, length: playerSkins.length});
                        playSound("pluck_1", 0.4, 1)
                    break;
                    case "ready_button":
                        socket.emit('readyUp');
                    break;
                    default:
                }
            }
        }
    }
})

// looking for mouse movement
let mouseX = CANVAS_WIDTH / 2
let mouseY = CANVAS_HEIGHT / 2

document.addEventListener("mousemove", (event) => {
    if(!frontEndPlayers[socket.id]) return
    
    const {top, left} = canvas.getBoundingClientRect()
    if(followPlayer && client){
        mouseX = (event.clientX - left - CANVAS_WIDTH / 2) / ZOOM_SCALE + client.x;
        mouseY = (event.clientY - top - CANVAS_HEIGHT / 2) / ZOOM_SCALE + client.y;
    } else {
        mouseX = event.clientX - left;
        mouseY = event.clientY - top;
    }

    //angle rotation is client-side
    const angle = Math.atan2(
        mouseY - frontEndPlayers[socket.id].y,
        mouseX - frontEndPlayers[socket.id].x
    )
    frontEndPlayers[socket.id].angle = angle

    socket.emit('moveMouse', {angle, mouseX, mouseY})
});

document.addEventListener('wheel', (event) => {  
    ZOOM_SCALE -= event.deltaY/250
    ZOOM_SCALE = Math.min(ZOOM_SCALE, 3)

    if (ZOOM_SCALE > 1) {
        followPlayer = true
    } else {
        followPlayer = false
        ZOOM_SCALE = 1
    }
  });

// spawn item debug
window.addEventListener('keydown', (event) => {
    if(!frontEndPlayers[socket.id]) return

    switch(event.code) {
        case 'Space':
            socket.emit('spawnItemsDebug')
            break
    }
})