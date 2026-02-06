
const TILE_SIZE = 40;
const LEVEL_WIDTH = 400;
const LEVEL_HEIGHT = 60;
const CHARACTERS = [{id:'pug', name:'IRON MUTT'}]; // Stub

// Stubs for classes used in generateLevel
class TrappedBeast { constructor() {} }
class PropaneTank { constructor(x, y) {} }
class Mailman { constructor(x, y) {} }
class Enemy { constructor(x, y) {} }
class FlyingEnemy { constructor(x, y) {} }
class Boss { constructor(x, y) {} }

let entities = [];

// Copy of generateLevel function from loajf.html
function generateLevel() {
    let newTiles = [];
    let newEntities = [];

    // 1. Init Empty Grid
    for (let r = 0; r < LEVEL_HEIGHT; r++) {
        newTiles[r] = new Array(LEVEL_WIDTH).fill(null).map(() => ({ type: 0 }));
    }

    // 2. Terrain Walker
    let currentHeight = 10;
    let checkpointInterval = Math.floor(LEVEL_WIDTH / 6);
    let nextCheckpoint = checkpointInterval;
    let checkpointsPlaced = 0;
    let beastsPlaced = 0;
    let lastBeastX = -60; // Initialize far back so first beast can spawn early
    let surfaceMap = []; // Keep track of surface Y for each X

    for (let x = 0; x < LEVEL_WIDTH; x++) {

        if (x > LEVEL_WIDTH - 40) {
            currentHeight = 12; // Boss Arena
        }
        else if (x > 15) {
            if (Math.random() < 0.2) {
                currentHeight += Math.random() > 0.5 ? -1 : 1;
            }
            if (currentHeight < 6) currentHeight = 6;
            if (currentHeight > LEVEL_HEIGHT - 10) currentHeight = LEVEL_HEIGHT - 10;

            // Pit Chance
            if (Math.random() < 0.05 && x > 20) {
                for(let y=0; y<LEVEL_HEIGHT; y++) {
                    if(y >= 0 && y < LEVEL_HEIGHT) newTiles[y][x] = { type: 0 };
                }
                if(LEVEL_HEIGHT-1 < LEVEL_HEIGHT) newTiles[LEVEL_HEIGHT-1][x] = { type: 4, color: "#999" };
                surfaceMap[x] = LEVEL_HEIGHT + 10;
                continue;
            }

            // DECIDE RESCUE TYPE
            // Added Spacing Check: x - lastBeastX > 50 (2000 pixels)
            if (beastsPlaced < 5 && (x - lastBeastX > 50) && Math.random() < 0.05) {
                // FLOATING ISLAND (Underground bunkers moved to Pass 3 to avoid overwrite issues)
                if (Math.random() < 0.5 && currentHeight > 6) {
                    let islandY = currentHeight - 4;
                    if (islandY > 2) {
                        newTiles[islandY][x] = { type: 1 }; // Anchor
                        newEntities.push(new TrappedBeast(x * TILE_SIZE, (islandY + 1) * TILE_SIZE, islandY, x));
                        beastsPlaced++;
                        lastBeastX = x; // Update last position
                    }
                }
            }
        }
        else {
            currentHeight = 10;
        }

        surfaceMap[x] = currentHeight;

        // Fill Column
        for (let y = 0; y < LEVEL_HEIGHT; y++) {
            if (y >= currentHeight) {
                let type = 1; // Dirt
                if (x < 15 || x > LEVEL_WIDTH - 40) type = 2; // Stone safe zones
                else if (y >= LEVEL_HEIGHT - 2) type = 2; // Bedrock
                newTiles[y][x] = { type: type };
            }
        }
    }

    // 3. PASS 2: UNDERGROUND TUNNEL NETWORK
    // We create frequent vertical shafts connected to horizontal tunnels

    // Create Shafts and Tunnels
    for (let x = 40; x < LEVEL_WIDTH - 60; x += 40) { // Every 40 tiles roughly
        if (Math.random() < 0.7 && surfaceMap[x] < LEVEL_HEIGHT - 15) {
            let startY = surfaceMap[x];
            let bottomY = LEVEL_HEIGHT - 5;

            // 1. Vertical Ladder Shaft (Surface to Bottom)
            for (let y = startY; y < bottomY; y++) {
                if (y >= 0 && y < LEVEL_HEIGHT) newTiles[y][x] = { type: 6 }; // Ladder
            }

            // 2. Horizontal Tunnels branching off
            let numTunnels = Math.floor(Math.random() * 3) + 2; // 2 to 4 tunnels
            for (let i = 0; i < numTunnels; i++) {
                let tunnelY = startY + 10 + Math.floor(Math.random() * (bottomY - startY - 15));
                let tunnelLen = 10 + Math.floor(Math.random() * 15);
                let dir = Math.random() > 0.5 ? 1 : -1;

                for (let j = 0; j < tunnelLen; j++) {
                    let tx = x + (j * dir);
                    // Carve 3-high corridor
                    for (let ty = tunnelY; ty < tunnelY + 3; ty++) {
                        if (ty >= 0 && ty < LEVEL_HEIGHT && tx >= 0 && tx < LEVEL_WIDTH) {
                            newTiles[ty][tx] = { type: 0 }; // Air
                        }
                    }

                    // Populate Tunnel
                    if (Math.random() < 0.05 && j > 5) {
                         // Enemy
                         newEntities.push(new Enemy(tx * TILE_SIZE, (tunnelY + 2) * TILE_SIZE));
                    }

                    // Hostage Check (Hanging from ceiling of tunnel)
                    if (beastsPlaced < 5 && (tx - lastBeastX > 50 || lastBeastX - tx > 50) && Math.random() < 0.02) {
                        let beastY = tunnelY; // Top of tunnel
                        if (beastY > 0 && newTiles[beastY-1][tx].type !== 0) { // Ensure attached to ceiling
                            newTiles[beastY-1][tx] = { type: 1 }; // Dirt anchor
                            newEntities.push(new TrappedBeast(tx * TILE_SIZE, (beastY + 1) * TILE_SIZE, beastY-1, tx));
                            beastsPlaced++;
                            lastBeastX = tx;
                        }
                    }
                }
            }
        }
    }

    // 4. PASS 3: SURFACE OBJECTS & FLOATING ISLANDS
    // let checkpointsPlaced = 0; // Removed redeclaration
    // let nextCheckpoint = Math.floor(LEVEL_WIDTH / 6); // Removed redeclaration

    // Reset iterator for surface pass
    checkpointsPlaced = 0;
    nextCheckpoint = Math.floor(LEVEL_WIDTH / 6);

    for (let x = 20; x < LEVEL_WIDTH - 40; x++) {
        let y = surfaceMap[x];
        if (y >= LEVEL_HEIGHT) continue; // Skip pits

        // Checkpoints
        if (x >= nextCheckpoint && checkpointsPlaced < 5) {
            newTiles[y][x] = { type: 2 };
            newTiles[y-1][x] = { type: 5, active: false, id: checkpointsPlaced };
            nextCheckpoint += Math.floor(LEVEL_WIDTH / 6);
            checkpointsPlaced++;
        }
        // Floating Islands (Remaining Hostages)
        else if (Math.random() < 0.1 && beastsPlaced < 5 && (x - lastBeastX > 50)) {
            let islandY = y - 7;
            if (islandY > 4) {
                // Ensure spawn space is AIR
                if (newTiles[islandY+1][x].type === 0) {
                    newTiles[islandY][x] = { type: 1 }; // Anchor
                    newEntities.push(new TrappedBeast(x * TILE_SIZE, (islandY+1) * TILE_SIZE, islandY, x));
                    beastsPlaced++;
                    lastBeastX = x;
                }
            }
        }
        // Enemies
        else if (Math.random() < 0.03) {
            if (newTiles[y-1][x].type === 0) newEntities.push(new PropaneTank(x * TILE_SIZE, (y-1) * TILE_SIZE));
        }
        else if (Math.random() < 0.04) {
             if (newTiles[y-1][x].type === 0) newEntities.push(new Mailman(x * TILE_SIZE, (y-1) * TILE_SIZE));
        }
        else if (Math.random() < 0.05) {
             if (newTiles[y-1][x].type === 0) newEntities.push(new Enemy(x * TILE_SIZE, (y-1) * TILE_SIZE));
        }
        else if (Math.random() < 0.04) newEntities.push(new FlyingEnemy(x * TILE_SIZE, (y-5) * TILE_SIZE));
    }

    // 5. FINISH
    // Walls
    for(let y=0; y<LEVEL_HEIGHT; y++) {
        newTiles[y][0] = { type: 2 };
        newTiles[y][LEVEL_WIDTH-1] = { type: 2 };
    }
    // Boss
    newEntities.push(new Boss((LEVEL_WIDTH - 20) * TILE_SIZE, 8 * TILE_SIZE));

    entities = newEntities;
    return newTiles;
}

// Verification Logic
let ladderCount = 0;
let airCount = 0;
let runs = 10;

console.log(`Starting stats verification with ${runs} runs...`);

for (let i = 0; i < runs; i++) {
    let tiles = generateLevel();

    for (let r=0; r<LEVEL_HEIGHT; r++) {
        for (let c=0; c<LEVEL_WIDTH; c++) {
            if (tiles[r][c].type === 6) ladderCount++;
            if (tiles[r][c].type === 0 && r > 20) airCount++; // Rough underground air count
        }
    }
}

console.log(`Average Ladders: ${ladderCount/runs}`);
console.log(`Average Underground Air: ${airCount/runs}`);
