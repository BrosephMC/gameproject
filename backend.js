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
let ItemObjId = 0
const CANVAS_WIDTH = 1024
const CANVAS_HEIGHT = 576
const tick = 0.015

const SPACING = 30
const HEALTH_INCREASE_VALUE = 25

const GameState = Object.freeze({
    WAITING_ROOM: "waiting_room",
    PLAYING: "playing",
    PLAYING_COUNTDOWN: "playing_countdown",
    PLAYING_FINISHED: "playing_finished",
});

let currentGameState = GameState.WAITING_ROOM;
let countdownTimer = 60
let backEndHeaderText

// when user connects
io.on('connection', (socket) => {
    console.log(socket.id+' has connected')

    io.emit('updatePlayers', backEndPlayers)

    socket.on('click', () => {
        switch (currentGameState) {
        case GameState.PLAYING:

            if (backEndPlayers[socket.id].train.head == null) return
            switch(backEndItems[backEndPlayers[socket.id].train.head].type) {
                case 'rock':
                    console.log("you have a rock!")
                    const xValue = Math.cos(backEndPlayers[socket.id].angle)
                    const yValue = Math.sin(backEndPlayers[socket.id].angle)
                    backEndProjectiles[projectileId++] = {
                        x: backEndPlayers[socket.id].x + xValue * 15, // player's radius is 10
                        y: backEndPlayers[socket.id].y + yValue * 15,
                        velX: xValue * 20,
                        velY: yValue * 20,
                        damage: 20,
                        radius: 15,
                        owner: socket.id
                    }
                    break
                case 'heal':
                    console.log("you have healed!")
                    healPlayer(socket.id, 30)
                    break
                case 'bomb':
                    console.log("you blew up")
                    healPlayer(socket.id, -30)
                    const casualties = radiusDetection(backEndPlayers[socket.id], backEndPlayers, 50)
                    for(i in casualties) {
                        healPlayer(casualties[i], -20)
                    }
                    io.emit('spawnParticle', {
                        x: backEndPlayers[socket.id].x,
                        y: backEndPlayers[socket.id].y,
                        type: 'explosion',
                        radius: 30,
                        lifepsan: 120
                    })
                    break
                default:
                    console.log("It's the default case!")
                    break
            }
            popItem(backEndPlayers[socket.id].train)

        break;

        case GameState.WAITING_ROOM:

            backEndPlayers[socket.id].ready = !backEndPlayers[socket.id].ready
    
        break;
        
        default:
        // nothing for everything else
        break;

        }
    })


    socket.on('initPlayer', ({username, width, height}) => {
        const initMouseX = CANVAS_WIDTH / 2
        const initMouseY = CANVAS_HEIGHT / 2
        const initX = CANVAS_WIDTH * Math.random()
        const initY = CANVAS_HEIGHT * Math.random()
        const initAngle = Math.atan2(
            initMouseY - initY,
            initMouseX - initX
        )
        backEndPlayers[socket.id] = {
            x: initX,
            y: initY,
            color: `hsl(${360 * Math.random()}, 100%, 50%)`,
            sequenceNumber: 0,
            score: 0,
            username: username,
            angle: initAngle,
            mouseX: initMouseX,
            mouseY: initMouseY,
            speed: 3,
            radius: RADIUS,
            train: {head: null, tail: null, length: 0},
            health: 100,
            maxHealth: 100
        }

        // initCanvas
        backEndPlayers[socket.id].canvas = {
            width,
            height
        }
    })

    socket.on('disconnect', (reason) => {
        console.log(reason)
        if(backEndPlayers[socket.id]){
            deleteAllItems(backEndPlayers[socket.id].train)
            delete backEndPlayers[socket.id]
        }
        io.emit('updatePlayers', backEndPlayers)
    })

    //player rotation with mouse
    socket.on('moveMouse', ({angle, mouseX, mouseY}) => {
        backEndPlayers[socket.id].angle = angle
        backEndPlayers[socket.id].mouseX = mouseX
        backEndPlayers[socket.id].mouseY = mouseY
    })

    // spawn items debug
    socket.on('spawnItemsDebug', () => {
        backEndItems[ItemObjId++] = {
            x: CANVAS_WIDTH * Math.random(),
            y: CANVAS_HEIGHT * Math.random(),
            radius: 10,
            attachedToPlayer: null,
            type: 'rock'
        }
        backEndItems[ItemObjId++] = {
            x: CANVAS_WIDTH * Math.random(),
            y: CANVAS_HEIGHT * Math.random(),
            radius: 10,
            attachedToPlayer: null,
            type: 'heal'
        }
        backEndItems[ItemObjId++] = {
            x: CANVAS_WIDTH * Math.random(),
            y: CANVAS_HEIGHT * Math.random(),
            radius: 10,
            attachedToPlayer: null,
            type: 'health_increase'
        }
        backEndItems[ItemObjId++] = {
            x: CANVAS_WIDTH * Math.random(),
            y: CANVAS_HEIGHT * Math.random(),
            radius: 10,
            attachedToPlayer: null,
            type: 'bomb'
        }
    })
})

// collision detection function
function objIsColliding(obj, objList){
    for(const id in objList) {
        const dx = obj.x - objList[id].x
        const dy = obj.y - objList[id].y
        const radiusSum = obj.radius + objList[id].radius
        if (dx * dx + dy * dy < radiusSum * radiusSum) {
            return id
        }
    }
    return null
}

// returns all objects within a certain radius (includes executor)
function radiusDetection(obj, objList, radius) {
    outputList = []
    for(const id in objList) {
        const dx = obj.x - objList[id].x
        const dy = obj.y - objList[id].y
        const radiusSum = obj.radius + objList[id].radius + radius
        if (dx * dx + dy * dy < radiusSum * radiusSum) {
            outputList.push(id)
        }
    }
    return outputList
}

// backend ticker
setInterval(() => {

    switch(currentGameState) {

    case GameState.PLAYING:

        // update projectiles movement
        for(const id in backEndProjectiles){
            const projRadius = backEndProjectiles[id].radius
            backEndProjectiles[id].x += backEndProjectiles[id].velX
            backEndProjectiles[id].y += backEndProjectiles[id].velY

            if(backEndProjectiles[id].x < 0) backEndProjectiles[id].x = CANVAS_WIDTH - projRadius
            if(backEndProjectiles[id].x > CANVAS_WIDTH) backEndProjectiles[id].x = 0 + projRadius
            if(backEndProjectiles[id].y < 0) backEndProjectiles[id].y = CANVAS_HEIGHT - projRadius
            if(backEndProjectiles[id].y > CANVAS_HEIGHT) backEndProjectiles[id].y = 0 + projRadius

            backEndProjectiles[id].velX *= 0.96
            backEndProjectiles[id].velY *= 0.96
            if(Math.abs(backEndProjectiles[id].velX) <= 0.1 && Math.abs(backEndProjectiles[id].velY) <= 0.1) delete backEndProjectiles[id]
        }

        let numAlivePlayers = 0
        let lastPlayerId

        // update player movement
        for(const id in backEndPlayers) {
            if(backEndPlayers[id].health <= 0) backEndPlayers[id].eliminated = true;
            if(backEndPlayers[id].eliminated) continue;
            numAlivePlayers++

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

            // Projectile collision
            const colProjId = objIsColliding(backEndPlayers[id], backEndProjectiles)
            if(colProjId != null){
                healPlayer(id, -backEndProjectiles[colProjId].damage)
                delete backEndProjectiles[colProjId]
                console.log("collided with projecitle " + colProjId)
            }
            
            // Item collision
            const colId = objIsColliding(backEndPlayers[id], backEndItems)
            if(colId != null) {
                const otherPlayerId = backEndItems[colId].attachedToPlayer
                
                // blowup when stealing a bomb
                if(backEndItems[colId].type == 'bomb' && otherPlayerId != null && otherPlayerId != id) {
                    const itemX = backEndItems[colId].x
                    const itemY = backEndItems[colId].y
                    blowup(backEndPlayers[otherPlayerId].train, colId)
                    healPlayer(id, -90)
                    console.log("you blew up on item " + colId)
                    io.emit('spawnParticle', {
                        x: itemX,
                        y: itemY,
                        type: 'explosion',
                        radius: 30,
                        lifepsan: 120
                    })
                    console.log("emitted particle")
                } else {
                    appendItem(id, colId)
                    // console.log("collided with item " + colId)
                }
            }
            // console.log(backEndPlayers[id].train)

            // reset maxHealth for recalculation
            backEndPlayers[id].maxHealth = 100

            // update item train movement
            if(backEndPlayers[id].train.head != null) {
                let headId = backEndPlayers[id].train.head;
                let headItem = backEndItems[headId];

                // Calculate direction from head to player
                let dx = backEndPlayers[id].x - headItem.x;
                let dy = backEndPlayers[id].y - headItem.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > SPACING) {
                    let angle = Math.atan2(dy, dx);
                    headItem.x += Math.cos(angle) * (distance - SPACING);
                    headItem.y += Math.sin(angle) * (distance - SPACING);
                }

                // highlight head item
                headItem.highlighted = true; 

                // Move the rest of the train
                let prevId = headId;
                let prevX = headItem.x;
                let prevY = headItem.y;

                while (prevId !== null) {
                    let current = backEndPlayers[id].train[prevId];
                    let nextId = current.next;

                    // check for passive item effects
                    if(backEndItems[prevId].type == 'health_increase') {
                        backEndPlayers[id].maxHealth += HEALTH_INCREASE_VALUE
                    }

                    if (nextId !== null) {
                        let item = backEndItems[nextId];
                        item.highlighted = false;

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

            // clamp health if maxHealth is removed
            if(backEndPlayers[id].health >= backEndPlayers[id].maxHealth) {
                backEndPlayers[id].health = backEndPlayers[id].maxHealth
            }
            // console.log(backEndPlayers[id].train)

            lastPlayerId = id
        }

        backEndHeaderText = "";

        if(numAlivePlayers <= 1) {
            backEndHeaderText = backEndPlayers[lastPlayerId].username+" won the game!"
            currentGameState = GameState.PLAYING_FINISHED
            countdownTimer = 3
        }

    break;

    case GameState.WAITING_ROOM:
        let i = 0
        let readys = 0
        for(const id in backEndPlayers) {
            backEndPlayers[id].x = 100 + 100 * Math.floor(i / 5)
            backEndPlayers[id].y = 100 + 100 * (i % 5)
            i++
            if(backEndPlayers[id].ready) {readys++}
        }

        // if more than 2 players
        if (i >= 2) {
            countdownTimer -= tick // I think the seconds are a little too slow
        }

        if (readys >= 2 && readys == i && countdownTimer > 3) {
            countdownTimer = 1
        }

        // START THE GAME
        if(countdownTimer <= 0) {
            currentGameState = GameState.PLAYING_COUNTDOWN
            countdownTimer = 3

            for(const id in backEndPlayers) {
                // make everyone un ready
                backEndPlayers[id].ready = false;

                // spawn people in different locations
                backEndPlayers[id].x = CANVAS_WIDTH * Math.random()
                backEndPlayers[id].y = CANVAS_HEIGHT * Math.random()
            }

        }

        backEndHeaderText = "Timer: "+Math.ceil(countdownTimer)

    break;

    case GameState.PLAYING_COUNTDOWN:
        countdownTimer -= tick // I think the seconds are a little too slow

        if(countdownTimer <= 0) {
            currentGameState = GameState.PLAYING
        }

        backEndHeaderText = "Starting in... "+Math.ceil(countdownTimer)

    break;

    case GameState.PLAYING_FINISHED:
        countdownTimer -= tick // I think the seconds are a little too slow

        if(countdownTimer <= 0) {
            currentGameState = GameState.WAITING_ROOM
            countdownTimer = 60
            for(const id in backEndPlayers) {
                // make everyone un ready
                backEndPlayers[id].eliminated = false
                backEndPlayers[id].train = {head: null, tail: null, length: 0}
                backEndPlayers[id].health = 100
                backEndPlayers[id].maxHealth = 100
            }
            for(const id in backEndItems) {
                delete backEndItems[id]
            }
        }

    break;

    default:
    //nothing for everything else
    break;
    }

    io.emit('updatePlayers', backEndPlayers)
    io.emit('updateItems', backEndItems)
    io.emit('updateProjectiles', backEndProjectiles)

    io.emit('updateHeaderText', backEndHeaderText)

}, 15)

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})


// ***** Train Object *******

function appendItem(playerId, itemId) {
    const otherPlayerId = backEndItems[itemId].attachedToPlayer
    if(otherPlayerId == playerId) return
    const train = backEndPlayers[playerId].train

    // add health when picking up health_increase
    if(backEndItems[itemId].type == 'health_increase') {
        backEndPlayers[playerId].health += HEALTH_INCREASE_VALUE
    }
    
    let nextItem = null
    if(otherPlayerId != null) {
        const otherPlayerTrain = backEndPlayers[otherPlayerId].train
        nextItem = otherPlayerTrain[itemId].next

        //set new tail
        if(otherPlayerTrain[itemId].previous != null){
            otherPlayerTrain.tail = otherPlayerTrain[itemId].previous
            otherPlayerTrain[otherPlayerTrain.tail].next = null
        }

        // if head item is stolen
        if(otherPlayerTrain.head == itemId) {
            otherPlayerTrain.head = null
            otherPlayerTrain.tail = null
        }

        if(nextItem) {
            otherPlayerTrain[nextItem].previous = null
        }

        delete otherPlayerTrain[itemId]
        // otherPlayerTrain.length--
    }

    if(train.head == null || train.tail == null){
        train[itemId] = {
            next: null,
            previous: null
        }
        train.head = itemId
        train.tail = itemId
    } else {
        train[itemId] = {
            next: null,
            previous: train.tail
        }
        train[train.tail].next = itemId
        train.tail = itemId
    }
    // train.length++
    backEndItems[itemId].attachedToPlayer = playerId

    if(nextItem != null) {
        appendItem(playerId, nextItem)
    }  
}

function popItem(train) {
    if(train.head == null) return
    const temp = train.head
    if(train[train.head].next != null){
        train.head = train[train.head].next
        train[train.head].previous = null
        delete train[temp]
    } else {
        delete train[train.head]
        train.head = null
        train.tail = null
    }
    delete backEndItems[temp]
    // train.length--
    return
}

function deleteAllItems(train) {
    let i = train.head
    while(i != train.tail) {
        delete backEndItems[i]
        i = train[i].next
    }
    delete backEndItems[i]
    train = {head: null, tail: null, length: 0}
}

function blowup(train, itemId, init = false) {
    const current = train[itemId]

    // main item (bomb) only for first bomb
    if(!init){
        train.tail = current.previous
        if(itemId == train.head) {
            train.head = null
        } else {
            train[train.tail].next = null
        }
        delete backEndItems[itemId]
    }

    if(current.next != null){
        blowup(train, current.next, true)
    }

    if(backEndItems[itemId] != null){
        backEndItems[itemId].attachedToPlayer = null
        backEndItems[itemId].x += (30 * Math.random()) - 15
        backEndItems[itemId].y += (30 * Math.random()) - 15
    }
    delete train[itemId]
}

// ***** Other Functions *******

function healPlayer(playerId, value) {
    backEndPlayers[playerId].health += value
    if(backEndPlayers[playerId].health >= backEndPlayers[playerId].maxHealth) {
        backEndPlayers[playerId].health = backEndPlayers[playerId].maxHealth
    }
}