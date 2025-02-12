const express = require('express')
const app = express()

// socket.io setup
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 })

const port = 3000;

app.use(express.static('public'))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

const backEndPlayers = {}
const backEndProjectiles = {}
const backEndItems = {}

const SPEED = 5
const RADIUS = 10
let projectileId = 0
let itemId = 0
const CANVAS_WIDTH = 1024
const CANVAS_HEIGHT = 576

const SPACING = 30

// when user connects
io.on('connection', (socket) => {
    console.log(socket.id+' has connected')

    io.emit('updatePlayers', backEndPlayers)

    socket.on('shoot', ({x, y, angle}) => {
        projectileId++

        const velocity = {
          x: Math.cos(angle) * 5,
          y: Math.sin(angle) * 5
        }

        backEndProjectiles[projectileId] = {
            x,
            y,
            velocity,
            playerId: socket.id,
            radius: RADIUS
        }
    })

    socket.on('initGame', ({username, width, height}) => {
        backEndPlayers[socket.id] = {
            x: 1024 * Math.random(),
            y: 576 * Math.random(),
            color: `hsl(${360 * Math.random()}, 100%, 50%)`,
            sequenceNumber: 0,
            score: 0,
            username: username,
            angle: 0,
            mouseX: CANVAS_WIDTH / 2,
            mouseY: CANVAS_HEIGHT / 2,
            speed: 3,
            radius: RADIUS,
            train: {head: null, tail: null, length: 0}
        }

        // spawn items
        for(let i = 0; i < 3; i++){
            backEndItems[itemId++] = {
                x: 1024 * Math.random(),
                y: 576 * Math.random(),
                color: 'yellow',
                radius: 10,
                attachedToPlayer: null
            }
        }

        // initCanvas
        backEndPlayers[socket.id].canvas = {
            width,
            height
        }
    })

    socket.on('disconnect', (reason) => {
        console.log(reason)
        delete backEndPlayers[socket.id]
        io.emit('updatePlayers', backEndPlayers)
    })

    //player rotation with mouse
    socket.on('moveMouse', ({angle, mouseX, mouseY}) => {
        backEndPlayers[socket.id].angle = angle
        backEndPlayers[socket.id].mouseX = mouseX
        backEndPlayers[socket.id].mouseY = mouseY
    })
})

// collision detection function
function objIsColliding(obj, objList){
    for(const id in objList){
        const distance = Math.hypot(
            obj.x - objList[id].x, 
            obj.y - objList[id].y
        )

        if (distance < obj.radius + objList[id].radius) {
            return id
        }
    }
    return null
}

// backend ticker
setInterval(() => {

    // update projectile positions
    for(const id in backEndProjectiles) {
        backEndProjectiles[id].x += backEndProjectiles[id].velocity.x
        backEndProjectiles[id].y += backEndProjectiles[id].velocity.y

        // delete projectiles when going out of bounds
        const PROJECTILE_RADIUS = backEndProjectiles[id].radius
        if (
            backEndProjectiles[id].x - PROJECTILE_RADIUS >=
            backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.width ||
            backEndProjectiles[id].x + PROJECTILE_RADIUS <= 0 ||
            backEndProjectiles[id].y - PROJECTILE_RADIUS >=
            backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.height ||
            backEndProjectiles[id].y + PROJECTILE_RADIUS <= 0
        ) {
            delete backEndProjectiles[id]
            continue
        }

        for (const playerId in backEndPlayers) {
            const backEndPlayer = backEndPlayers[playerId]

            const DISTANCE = Math.hypot(
                backEndProjectiles[id].x - backEndPlayer.x, 
                backEndProjectiles[id].y - backEndPlayer.y
            )

            // collision detection
            if (
                //DISTANCE < backEndProjectiles[id].radius + backEndPlayer[id].radius &&
                DISTANCE < PROJECTILE_RADIUS + backEndPlayer.radius &&
                backEndProjectiles[id].playerId !== playerId
            ) {
                if(backEndPlayers[backEndProjectiles[id].playerId]){
                    backEndPlayers[backEndProjectiles[id].playerId].score++
                }
                delete backEndProjectiles[id]
                delete backEndPlayers[playerId]
                break
            }

            // console.log(DISTANCE)
        }
    }

    // update player movement
    for(const id in backEndPlayers) {
        let dx = backEndPlayers[id].mouseX - backEndPlayers[id].x
        let dy = backEndPlayers[id].mouseY - backEndPlayers[id].y
        let distance = Math.sqrt(dx * dx + dy * dy)

        let speedDivisor
        if(distance > 20) {
            speedDivisor = distance
        } else {
            speedDivisor = 30
        }

        if (distance > backEndPlayers[id].speed) {
            backEndPlayers[id].x += (dx / speedDivisor) * backEndPlayers[id].speed
            backEndPlayers[id].y += (dy / speedDivisor) * backEndPlayers[id].speed
        }

        const playerSides = {
            left: backEndPlayers[id].x - backEndPlayers[id].radius,
            right: backEndPlayers[id].x + backEndPlayers[id].radius,
            top: backEndPlayers[id].y - backEndPlayers[id].radius,
            bottom: backEndPlayers[id].y + backEndPlayers[id].radius
        }

        if(playerSides.left < 0){
            backEndPlayers[id].x = backEndPlayers[id].radius
        }
        if(playerSides.right > CANVAS_WIDTH){
            backEndPlayers[id].x = CANVAS_WIDTH - backEndPlayers[id].radius
        }
        if(playerSides.top < 0){
            backEndPlayers[id].y = backEndPlayers[id].radius
        }
        if(playerSides.bottom > CANVAS_HEIGHT){
            backEndPlayers[id].y = CANVAS_HEIGHT - backEndPlayers[id].radius
        }
        
        // Item collision
        colId = objIsColliding(backEndPlayers[id], backEndItems)
        if(colId != null) {
            appendItem(id, backEndPlayers[id].train, colId)
            console.log("collided with " + colId)
        }
        console.log(backEndPlayers[id].train)

        // update item train movement
        // MAKE CODE BETTER **************************************************
        for(itemId in backEndPlayers[id].train){
            if(backEndPlayers[id].train.head == null) {
                continue
            }

            let headId = backEndPlayers[id].train.head;
            let headItem = backEndItems[headId];

            if (headItem) {
                // Calculate direction from head to player
                let dx = backEndPlayers[id].x - headItem.x;
                let dy = backEndPlayers[id].y - headItem.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > SPACING) {
                    let angle = Math.atan2(dy, dx);
                    headItem.x += Math.cos(angle) * (distance - SPACING);
                    headItem.y += Math.sin(angle) * (distance - SPACING);
                }
            }

            // Move the rest of the train
            let prevId = headId;
            let prevX = headItem.x;
            let prevY = headItem.y;

            while (prevId !== null) {
                let current = backEndPlayers[id].train[prevId];
                let nextId = current.next;

                if (nextId !== null) {
                    let item = backEndItems[nextId];

                    // Move towards the previous train segment while maintaining spacing
                    let dx = prevX - item.x;
                    let dy = prevY - item.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance > SPACING) {
                        let angle = Math.atan2(dy, dx);
                        item.x += Math.cos(angle) * (distance - SPACING);
                        item.y += Math.sin(angle) * (distance - SPACING);
                    }

                    prevX = item.x;
                    prevY = item.y;
                }

                prevId = nextId;
            }
        }

    }

    io.emit('updateProjectiles', backEndProjectiles)
    io.emit('updatePlayers', backEndPlayers)
    io.emit('updateItems', backEndItems)

}, 15)

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})


// ***** Train Object *******

function appendItem(playerId, train, itemId) {
    if(backEndItems[itemId].attachedToPlayer == playerId) return
    if(train.head == null || train.tail == null){
        train[itemId] = {
            next: null,
            previous: null
        }
        train.head = itemId
        train.tail = itemId
    } else {
        train[colId] = {
            next: null,
            previous: train.tail
        }
        train[train.tail].next = colId
        train.tail = colId
    }
    train.length++
    backEndItems[itemId].attachedToPlayer = playerId
}

function popItem(train) {
    const temp = train.tail
    train.tail = train[train.tail].previous
    train[train.tail].next = null
    delete train[temp]
    return temp
}