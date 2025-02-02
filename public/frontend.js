const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
const scoreEl = document.querySelector('#scoreEl')


const devicePixelRatio = window.devicePixelRatio || 1
canvas.width = innerWidth * devicePixelRatio
canvas.height = innerHeight * devicePixelRatio

const frontEndPlayers = {}
const frontEndProjectiles = {}

const socket = io();

socket.on('connect', () => {
    socket.emit('initCanvas', {
        width: canvas.width, 
        height: canvas.height,
        devicePixelRatio
    })
})

// receive update from server
socket.on('updateProjectiles', (backEndProjectiles) => {
    for (const id in backEndProjectiles) {
        const backEndProjectile = backEndProjectiles[id]

        if (!frontEndProjectiles[id]) {
            frontEndProjectiles[id] = new Projectile({
                x: backEndProjectile.x, 
                y: backEndProjectile.y, 
                radius: 5, 
                color: frontEndPlayers[backEndProjectile.playerId]?.color, 
                velocity: backEndProjectile.velocity
            })
        } else {
            frontEndProjectiles[id].x += backEndProjectiles[id].velocity.x
            frontEndProjectiles[id].y += backEndProjectiles[id].velocity.y
        }
    }

    // if backend player cannot be found, delete front end player
    for (const id in frontEndProjectiles) {
        if(!backEndProjectiles[id]) {
            delete frontEndProjectiles[id]
        }
    }
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
                radius: 10,
                color: backEndPlayer.color
            })
        } else {
            if( id === socket.id){
                // if player already exists
                frontEndPlayers[id].x = backEndPlayer.x
                frontEndPlayers[id].y = backEndPlayer.y
    
                const lastBackendInputIndex = playerInputs.findIndex((input) => {
                    return backEndPlayer.sequenceNumber === input.sequenceNumber
                })
    
                if(lastBackendInputIndex > -1){
                    playerInputs.splice(0, lastBackendInputIndex + 1)
                }
    
                playerInputs.forEach((input) => {
                    frontEndPlayers[id].x += input.dx
                    frontEndPlayers[id].y += input.dy
                })
            } else {
                // for all other players
                // frontEndPlayers[id].x = backEndPlayer.x
                // frontEndPlayers[id].y = backEndPlayer.y

                gsap.to(frontEndPlayers[id], {
                    x: backEndPlayer.x,
                    y: backEndPlayer.y,
                    duration: 0.015,
                    // duration: 0.1,
                    ease: 'linear'
                })
            }
        }
    }
    // if backend player cannot be found, delete front end player
    for (const id in frontEndPlayers) {
        if(!backEndPlayers[id]) {
            delete frontEndPlayers[id]
        }
    }
    // console.log(frontEndPlayers)
})

let animationId
function animate() {
    animationId = requestAnimationFrame(animate)
    c.fillStyle = 'rgba(0, 0, 0, 0.5)'
    c.fillRect(0, 0, canvas.width, canvas.height)

    for(const id in frontEndPlayers) {
        const frontEndPlayer = frontEndPlayers[id]
        frontEndPlayer.draw()
    }

    for(const id in frontEndProjectiles) {
        const frontEndProjectile = frontEndProjectiles[id]
        frontEndProjectile.draw()
    }

    // for(let i = frontEndProjectiles.length - 1; i >= 0; i--) {
    //     const frontEndProjectile = frontEndProjectiles[i]
    //     frontEndProjectile.update()
    // }
}

animate()

const keys = {
    w: {
        pressed: false
    },
    a: {
        pressed: false
    },
    s: {
        pressed: false
    },
    d: {
        pressed: false
    }
}

const SPEED = 10
const playerInputs = []
let sequenceNumber = 0
setInterval(() => {
    if(keys.w.pressed) {
        sequenceNumber++
        playerInputs.push({sequenceNumber: sequenceNumber, dx: 0, dy: -SPEED})
        frontEndPlayers[socket.id].y -= SPEED
        socket.emit('keydown', {keycode: 'KeyW', sequenceNumber})
    }

    if(keys.a.pressed) {
        sequenceNumber++
        playerInputs.push({sequenceNumber: sequenceNumber, dx: -SPEED, dy: 0})
        frontEndPlayers[socket.id].x -= SPEED
        socket.emit('keydown', {keycode: 'KeyA', sequenceNumber})
    }

    if(keys.s.pressed) {
        sequenceNumber++
        playerInputs.push({sequenceNumber: sequenceNumber, dx: 0, dy: SPEED})
        frontEndPlayers[socket.id].y += SPEED
        socket.emit('keydown', {keycode: 'KeyS', sequenceNumber})
    }

    if(keys.d.pressed) {
        sequenceNumber++
        playerInputs.push({sequenceNumber: sequenceNumber, dx: SPEED, dy: 0})
        frontEndPlayers[socket.id].x += SPEED
        socket.emit('keydown', {keycode: 'KeyD', sequenceNumber})
    }
}, 15)

window.addEventListener('keydown', (event) => {
    if(!frontEndPlayers[socket.id]) return

    switch(event.code) {
        case 'KeyW':
            keys.w.pressed = true
            break

        case 'KeyA':
            keys.a.pressed = true
            break

        case 'KeyS': 
            keys.s.pressed = true
            break

        case 'KeyD':
            keys.d.pressed = true
            break
    }
})

window.addEventListener('keyup', (event) => {
    if(!frontEndPlayers[socket.id]) return

    switch(event.code) {
        case 'KeyW':
            keys.w.pressed = false
            break

        case 'KeyA':
            keys.a.pressed = false
            break

        case 'KeyS': 
            keys.s.pressed = false
            break

        case 'KeyD':
            keys.d.pressed = false
            break
    }
})