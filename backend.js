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
const TICK = 0.015 // I think the seconds are a little too slow
const DEFAULT_COUNTDOWN = 3 // 3
const DEFAULT_LONG_COUNTDOWN = 60 // 60
const SPACING = 30
const HEALTH_INCREASE_VALUE = 25
const DEFAULT_MAX_HEALTH = 100 // 100
const ITEM_SPAWN_DELAY = 120
const ITEM_SPAWN_LONG_DELAY = 480
const ITEM_CAP_PP_SHORT = 8
const ITEM_CAP_PP_LONG = 30
let spawnItemTimer = ITEM_SPAWN_DELAY

const testingMode = false;

const GameState = Object.freeze({
    WAITING_ROOM: "waiting_room",
    PLAYING: "playing",
    PLAYING_COUNTDOWN: "playing_countdown",
    PLAYING_FINISHED: "playing_finished",
});

const itemsList = [
    'heal',
    'health_increase',
    'bomb',
    'rock',
]

const itemWeightsList = [
    1,
    1,
    1,
    3,
]

let addedWeights = itemWeightsList
for(i = 1; i < addedWeights.length; i++) {addedWeights[i] = addedWeights[i] + addedWeights[i-1]}

let currentGameState = GameState.WAITING_ROOM;
let countdownTimer = DEFAULT_LONG_COUNTDOWN
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
                    io.emit('playSound', {
                        soundId: "whoosh", 
                        volume: 0.5, 
                        rate: 1
                    })
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
                        lifespan: 90
                    })
                    io.emit('playSound', {
                        soundId: "explosion", 
                        volume: 1, 
                        rate: 1.1
                    })
                    break
                default:
                    console.log("It's the default case!")
                    break
            }
            popItem(backEndPlayers[socket.id].train)

        break;

        case GameState.WAITING_ROOM:
    
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
        let spawnEliminated = true
        if(currentGameState == GameState.WAITING_ROOM) {spawnEliminated = false;}

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
            health: DEFAULT_MAX_HEALTH,
            maxHealth: DEFAULT_MAX_HEALTH,
            eliminated: spawnEliminated,
            skindex: 0,
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

    // change skin
    socket.on('updateSkindex', ({dir, length}) => {
        if(dir == 1){
            backEndPlayers[socket.id].skindex = (backEndPlayers[socket.id].skindex - 1 + length) % length;
        } else {
            backEndPlayers[socket.id].skindex = (backEndPlayers[socket.id].skindex + 1) % length;
        }
    })

    // ready up
    socket.on('readyUp', () => {
        console.log("ready")
        if(currentGameState == GameState.WAITING_ROOM){
            backEndPlayers[socket.id].ready = !backEndPlayers[socket.id].ready
            io.emit('playSound', {
                soundId: "pop", 
                volume: 0.2, 
                rate: 0.5 + backEndPlayers[socket.id].ready*0.5
            })
        }
    })

    // spawn items debug
    socket.on('spawnItemsDebug', () => {
        if(testingMode){
            spawnRandomItem();
        }
    })
})

function spawnRandomItem() {
    const randomNumber = Math.random() * addedWeights[addedWeights.length-1]
    let newNumber = null

    // find index from random number
    for(i = 0; i < addedWeights.length; i++){
        if(randomNumber <= addedWeights[i]){
            newNumber = i
            break
        }
    }

    backEndItems[ItemObjId++] = {
        x: CANVAS_WIDTH * Math.random(),
        y: CANVAS_HEIGHT * Math.random(),
        radius: 10,
        attachedToPlayer: null,
        type: itemsList[newNumber]
    }
}

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
        if(objList[id].eliminated) {continue}
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

        // spawn items
        spawnItemTimer = (spawnItemTimer > -1024) ? spawnItemTimer-1 : spawnItemTimer;

        // might be too inefficient: O(n) for items and players
        // make timers on a separate 'thread'?
        const numOfItems = Object.keys(backEndItems).length
        const numOfPlayers = Object.keys(backEndPlayers).length
        if(spawnItemTimer <= 0 && numOfItems < numOfPlayers * ITEM_CAP_PP_LONG){
            if(numOfItems < numOfPlayers * ITEM_CAP_PP_SHORT) {
                spawnRandomItem()
                spawnItemTimer = ITEM_SPAWN_DELAY
            } else {
                if(spawnItemTimer <= ITEM_SPAWN_DELAY - ITEM_SPAWN_LONG_DELAY){
                    spawnRandomItem()
                    spawnItemTimer = ITEM_SPAWN_DELAY
                }
            }
        }

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

            // player elimination
            if(!backEndPlayers[id].eliminated && backEndPlayers[id].health <= 0){
                backEndPlayers[id].eliminated = true;
                if(backEndPlayers[id].train.head != null){
                    blowup(backEndPlayers[id].train, backEndPlayers[id].train.head, false, false)
                }
            } 
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
                        lifespan: 90
                    })
                    io.emit('playSound', {
                        soundId: "explosion", 
                        volume: 1, 
                        rate: 1.1
                    })
                    console.log("emitted particle")
                } else {
                    appendItem(id, colId)
                    // console.log("collided with item " + colId)
                }
            }
            // console.log(backEndPlayers[id].train)

            // reset maxHealth for recalculation
            backEndPlayers[id].maxHealth = DEFAULT_MAX_HEALTH

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

        if(!testingMode && numAlivePlayers <= 1) {
            backEndHeaderText = backEndPlayers[lastPlayerId].username+" won the game!"
            currentGameState = GameState.PLAYING_FINISHED
            countdownTimer = DEFAULT_COUNTDOWN
        } else
        if(testingMode && numAlivePlayers <= 0) {
            currentGameState = GameState.PLAYING_FINISHED
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
            countdownTimer -= TICK
        }
        if (i == 0) {
            countdownTimer = DEFAULT_LONG_COUNTDOWN
        }

        if (readys >= 2 && readys == i && countdownTimer > 3) {
            countdownTimer = 1
        }

        // START THE GAME
        if(countdownTimer <= 0 || (testingMode && readys >= 1)) {
            currentGameState = GameState.PLAYING_COUNTDOWN
            countdownTimer = DEFAULT_COUNTDOWN

            for(const id in backEndPlayers) {
                // make everyone un ready
                backEndPlayers[id].ready = false;

                // spawn people in different locations
                backEndPlayers[id].x = CANVAS_WIDTH * Math.random()
                backEndPlayers[id].y = CANVAS_HEIGHT * Math.random()

                spawnRandomItem()
                spawnRandomItem()
            }
        }

        backEndHeaderText = "Timer: "+Math.ceil(countdownTimer)

    break;

    case GameState.PLAYING_COUNTDOWN:
        countdownTimer -= TICK

        if(countdownTimer <= 0 || testingMode) {
            currentGameState = GameState.PLAYING
        }

        backEndHeaderText = "Starting in... "+Math.ceil(countdownTimer)

    break;

    case GameState.PLAYING_FINISHED:
        countdownTimer -= TICK

        if(countdownTimer <= 0 || testingMode) {
            currentGameState = GameState.WAITING_ROOM
            countdownTimer = DEFAULT_LONG_COUNTDOWN
            for(const id in backEndPlayers) {
                // make everyone reset
                backEndPlayers[id].eliminated = false
                backEndPlayers[id].train = {head: null, tail: null, length: 0}
                backEndPlayers[id].health = DEFAULT_MAX_HEALTH
                backEndPlayers[id].maxHealth = DEFAULT_MAX_HEALTH
            }
            for(const id in backEndItems) {delete backEndItems[id]}
            for(const id in backEndProjectiles) {delete backEndProjectiles[id]}
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
    io.emit('updateReadOnlyGameState', currentGameState)

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
    backEndItems[itemId].attachedToPlayer = playerId

    if(nextItem != null) {
        appendItem(playerId, nextItem)
    }  
    io.emit('playSound', {
        soundId: "pop", 
        volume: 0.1, 
        rate: 1.1
    })
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

function blowup(train, itemId, init = false, deleteItem = true) {
    const current = train[itemId]

    // main item (bomb) only for first bomb
    if(!init){
        train.tail = current.previous
        if(itemId == train.head) {
            train.head = null
        } else {
            train[train.tail].next = null
        }
        if(deleteItem) {delete backEndItems[itemId]}
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