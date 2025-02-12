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
const frontEndItems = {}

const socket = io();

// receive update from server
socket.on('updateProjectiles', (backEndProjectiles) => {
    for (const id in backEndProjectiles) {
        const backEndProjectile = backEndProjectiles[id]

        // if new backend projectile does not exist, make front end projectile
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

    // if backend projectile cannot be found, delete front end projectile
    for (const id in frontEndProjectiles) {
        if(!backEndProjectiles[id]) {
            delete frontEndProjectiles[id]
        }
    }
})

// receive update from server
socket.on('updateItems', (backEndItems) => {
    for (const id in backEndItems) {
        const backEndItem = backEndItems[id]

        // if new backend item does not exist, make front end item
        if (!frontEndItems[id]) {
            frontEndItems[id] = new Item({
                x: backEndItem.x, 
                y: backEndItem.y, 
                // default radius
                color: backEndItem.color, 
            })
        } else {
            // frontEndItems[id].x += backEndItems[id].velocity.x
            // frontEndItems[id].y += backEndItems[id].velocity.y
            frontEndItems[id].x = backEndItem.x
            frontEndItems[id].y = backEndItem.y
        }
    }

    // if backend item cannot be found, delete front end item
    for (const id in frontEndItems) {
        if(!backEndItems[id]) {
            delete frontEndItems[id]
        }
    }
    console.log(frontEndItems)
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
                angle: 0
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

            // if it's the client's own player
            if( id === socket.id){
                // frontEndPlayers[id].x = backEndPlayer.x
                // frontEndPlayers[id].y = backEndPlayer.y
    
                // const lastBackendInputIndex = playerInputs.findIndex((input) => {
                //     return backEndPlayer.sequenceNumber === input.sequenceNumber
                // })
    
                // if(lastBackendInputIndex > -1){
                //     playerInputs.splice(0, lastBackendInputIndex + 1)
                // }
    
                // playerInputs.forEach((input) => {
                //     frontEndPlayers[id].target.x += input.dx
                //     frontEndPlayers[id].target.y += input.dy
                // })
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

            delete frontEndPlayers[id]
        }
    }
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

    for(const id in frontEndItems) {
        const frontEndItem = frontEndItems[id]
        frontEndItem.draw()
    }
}

animate()

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

addEventListener('click', (event) => {
    const {top, left} = canvas.getBoundingClientRect()
    if(!frontEndPlayers[socket.id]) return

    const playerPosition = {
        x: frontEndPlayers[socket.id].x,
        y: frontEndPlayers[socket.id].y
    }
    const angle = Math.atan2(
        (event.clientY - top) - playerPosition.y,
        (event.clientX - left) - playerPosition.x
    )
    socket.emit('shoot', {
        x: playerPosition.x,
        y: playerPosition.y,
        angle
    })
})

// looking for mouse movement
let mouseX = CANVAS_WIDTH / 2
let mouseY = CANVAS_HEIGHT / 2

document.addEventListener("mousemove", (event) => {
    if(!frontEndPlayers[socket.id]) return
    
    const {top, left} = canvas.getBoundingClientRect()
    mouseX = event.clientX - left;
    mouseY = event.clientY - top;

    //angle rotation is client-side
    const angle = Math.atan2(
        mouseY - frontEndPlayers[socket.id].y,
        mouseX - frontEndPlayers[socket.id].x
    )
    frontEndPlayers[socket.id].angle = angle

    socket.emit('moveMouse', {angle, mouseX, mouseY})
});