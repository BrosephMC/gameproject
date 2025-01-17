const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
const scoreEl = document.querySelector('#scoreEl')
canvas.width = innerWidth
canvas.height = innerHeight

const x = canvas.width / 2
const y = canvas.height / 2
// const player = new Player(x, y, 10, 'blue')
const players = {}

const socket = io();

// receive update from server
socket.on('updatePlayers', (backendPlayers) => {
    for (const id in backendPlayers) {
        const backendPlayer = backendPlayers[id]

        // if new backend player does not exist, make front end player
        if (!players[id]){
            players[id] = new Player(backendPlayer.x, backendPlayer.y, 10, 'white')
        }
    }
    // if backend player cannot be found, delete front end player
    for (const id in players) {
        if(!backendPlayers[id]) {
            delete players[id]
        }
    }
    console.log(players)
})

let animationId
function animate() {
    animationId = requestAnimationFrame(animate)
    c.fillStyle = 'rgba(0, 0, 0, 0.1)'
    c.fillRect(0, 0, canvas.width, canvas.height)

    for(const id in players) {
        const player = players[id]
        player.draw()
    }
}

animate()