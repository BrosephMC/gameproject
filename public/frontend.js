const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
const scoreEl = document.querySelector('#scoreEl')

const CANVAS_WIDTH = 1024
const CANVAS_HEIGHT = 576
const devicePixelRatio = window.devicePixelRatio || 1
canvas.width = CANVAS_WIDTH * devicePixelRatio
canvas.height = CANVAS_HEIGHT * devicePixelRatio
c.scale(devicePixelRatio, devicePixelRatio)

const frontEndPlayers = {}
const frontEndProjectiles = {}

const socket = io();

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
                color: backEndPlayer.color,
                username: backEndPlayer.username
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

            if( id === socket.id){
                // if player already exists
                // frontEndPlayers[id].x = backEndPlayer.x
                // frontEndPlayers[id].y = backEndPlayer.y
    
                const lastBackendInputIndex = playerInputs.findIndex((input) => {
                    return backEndPlayer.sequenceNumber === input.sequenceNumber
                })
    
                if(lastBackendInputIndex > -1){
                    playerInputs.splice(0, lastBackendInputIndex + 1)
                }
    
                playerInputs.forEach((input) => {
                    frontEndPlayers[id].target.x += input.dx
                    frontEndPlayers[id].target.y += input.dy
                })
            } 
            // else {
            //     // for all other players
            //     // frontEndPlayers[id].x = backEndPlayer.x
            //     // frontEndPlayers[id].y = backEndPlayer.y

            //     gsap.to(frontEndPlayers[id], {
            //         x: backEndPlayer.x,
            //         y: backEndPlayer.y,
            //         duration: 0.015,
            //         // duration: 0.1,
            //         ease: 'linear'
            //     })
            // }
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

            delete frontEndPlayers[id]
        }
    }
    // console.log(frontEndPlayers)
})

let animationId
function animate() {
    animationId = requestAnimationFrame(animate)
    // c.fillStyle = 'rgba(0, 0, 0, 0.5)'
    // c.fillRect(0, 0, canvas.width, canvas.height)
    c.clearRect(0, 0, canvas.width, canvas.height)

    for(const id in frontEndPlayers) {
        const frontEndPlayer = frontEndPlayers[id]
        if(frontEndPlayer.target){
            frontEndPlayers[id].x += 
                (frontEndPlayers[id].target.x - frontEndPlayers[id].x) * 0.5
            frontEndPlayers[id].y += 
                (frontEndPlayers[id].target.y - frontEndPlayers[id].y) * 0.5
        }
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

// looking for mouse movement
let mouseX = CANVAS_WIDTH / 2
let mouseY = CANVAS_HEIGHT / 2

document.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    // front end rotation test ############
    const {top, left} = canvas.getBoundingClientRect()
    frontEndPlayers[socket.id].angle = Math.atan2(
        (event.clientY - top) - frontEndPlayers[socket.id].y,
        (event.clientX - left) - frontEndPlayers[socket.id].x
    )
});

// key inputs
const SPEED = 5
const playerInputs = []
let sequenceNumber = 0
setInterval(() => {
    if(keys.w.pressed) {
        sequenceNumber++
        playerInputs.push({sequenceNumber: sequenceNumber, dx: 0, dy: -SPEED})
        frontEndPlayers[socket.id].y -= SPEED // client-side prediction
        socket.emit('keydown', {keycode: 'KeyW', sequenceNumber})
    }

    if(keys.a.pressed) {
        sequenceNumber++
        playerInputs.push({sequenceNumber: sequenceNumber, dx: -SPEED, dy: 0})
        frontEndPlayers[socket.id].x -= SPEED // client-side prediction
        socket.emit('keydown', {keycode: 'KeyA', sequenceNumber})
    }

    if(keys.s.pressed) {
        sequenceNumber++
        playerInputs.push({sequenceNumber: sequenceNumber, dx: 0, dy: SPEED})
        frontEndPlayers[socket.id].y += SPEED // client-side prediction
        socket.emit('keydown', {keycode: 'KeyS', sequenceNumber})
    }

    if(keys.d.pressed) {
        sequenceNumber++
        playerInputs.push({sequenceNumber: sequenceNumber, dx: SPEED, dy: 0})
        frontEndPlayers[socket.id].x += SPEED // client-side prediction
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

document.querySelector('#usernameForm').addEventListener('submit', (event) => {
    event.preventDefault()
    document.querySelector('#usernameForm').style.display = 'none'
    socket.emit('initGame', {
        width: canvas.width, 
        height: canvas.height,
        username: document.querySelector('#usernameInput').value
    }
    )
})