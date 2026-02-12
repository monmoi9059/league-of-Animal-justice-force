// --- LEVEL GENERATOR ---
function generateLevel() {
    let newTiles = [];
    let newEntities = [];

    let difficulty = gameState.currentLevel;
    let biome = 'forest';
    if (difficulty >= 3) biome = 'city';
    if (difficulty >= 5) biome = 'volcano';

    // Update global level data for rendering
    gameState.levelData.biome = biome;
    gameState.levelData.difficulty = difficulty;

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
    let lastBeastX = -60;
    let surfaceMap = [];

    for (let x = 0; x < LEVEL_WIDTH; x++) {

        // Level 20+: Boss Arena at the end
        if (difficulty >= 20 && x > LEVEL_WIDTH - 40) {
            currentHeight = 12;

            // Wall at entrance of arena
            if (x === LEVEL_WIDTH - 40) {
                for(let w=0; w<15; w++) { // High wall
                    if(12-w > 0) newTiles[12-w][x] = { type: 2 };
                }
            }
        }
        else if (x > 15) {
            // Roughness increases with difficulty
            let roughness = 0.2 + (difficulty * 0.05);
            if (secureRandom() < roughness) {
                currentHeight += secureRandom() > 0.5 ? -1 : 1;
            }
            if (currentHeight < 6) currentHeight = 6;
            if (currentHeight > LEVEL_HEIGHT - 10) currentHeight = LEVEL_HEIGHT - 10;

            // Pit Chance (More pits in later levels)
            let pitChance = 0.02 + (difficulty * 0.01);
            if (secureRandom() < pitChance && x > 20) {
                for(let y=0; y<LEVEL_HEIGHT; y++) {
                    if(y >= 0 && y < LEVEL_HEIGHT) newTiles[y][x] = { type: 0 };
                }

                // Lava at bottom for Volcano
                if(biome === 'volcano') {
                     if(LEVEL_HEIGHT-1 < LEVEL_HEIGHT) newTiles[LEVEL_HEIGHT-1][x] = { type: 4, color: "#e74c3c" }; // Lava
                } else {
                     if(LEVEL_HEIGHT-1 < LEVEL_HEIGHT) newTiles[LEVEL_HEIGHT-1][x] = { type: 4, color: "#999" }; // Spikes
                }

                surfaceMap[x] = LEVEL_HEIGHT + 10;

                // Bridge?
                if (secureRandom() < 0.5) {
                    newEntities.push(new BridgeBlock(x * TILE_SIZE, (currentHeight-1) * TILE_SIZE));
                }

                continue;
            }

            // DECIDE RESCUE TYPE
            if (beastsPlaced < 5 && (x - lastBeastX > 50) && secureRandom() < 0.05) {
                if (secureRandom() < 0.5 && currentHeight > 6) {
                    let islandY = currentHeight - 4;
                    if (islandY > 2) {
                        newTiles[islandY][x] = { type: 1 }; // Anchor
                        newEntities.push(new TrappedBeast(x * TILE_SIZE, (islandY + 1) * TILE_SIZE, islandY, x));
                        beastsPlaced++;
                        lastBeastX = x;
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
                if (x < 15 || (difficulty >= 20 && x > LEVEL_WIDTH - 40)) type = 2; // Stone safe zones / Arena floor
                else if (y >= LEVEL_HEIGHT - 2) type = 2; // Bedrock
                newTiles[y][x] = { type: type };
            }
        }
    }

    // 3. PASS 2: UNDERGROUND TUNNEL NETWORK
    for (let x = 40; x < LEVEL_WIDTH - 60; x += 40) {
        if (secureRandom() < 0.7 && surfaceMap[x] < LEVEL_HEIGHT - 15) {
            let startY = surfaceMap[x];
            let bottomY = LEVEL_HEIGHT - 5;

            // 1. Vertical Ladder Shaft
            for (let y = startY; y < bottomY; y++) {
                if (y >= 0 && y < LEVEL_HEIGHT) newTiles[y][x] = { type: 6 };
            }

            // 2. Horizontal Tunnels
            let numTunnels = Math.floor(secureRandom() * 3) + 2;
            for (let i = 0; i < numTunnels; i++) {
                let tunnelY = startY + 10 + Math.floor(secureRandom() * (bottomY - startY - 15));
                let tunnelLen = 10 + Math.floor(secureRandom() * 15);
                let dir = secureRandom() > 0.5 ? 1 : -1;

                for (let j = 0; j < tunnelLen; j++) {
                    let tx = x + (j * dir);
                    for (let ty = tunnelY; ty < tunnelY + 3; ty++) {
                        if (ty >= 0 && ty < LEVEL_HEIGHT && tx >= 0 && tx < LEVEL_WIDTH) {
                            newTiles[ty][tx] = { type: 0 };
                        }
                    }

                    // Enemies in tunnels
                    if (secureRandom() < 0.05 && j > 5) {
                        let rand = secureRandom();
                        if (difficulty >= 3 && rand < 0.3) newEntities.push(new KamikazeEnemy(tx * TILE_SIZE, (tunnelY + 2) * TILE_SIZE));
                        else newEntities.push(new Enemy(tx * TILE_SIZE, (tunnelY + 2) * TILE_SIZE));
                    }

                    // Falling Block Trap
                    if (secureRandom() < 0.03 && j > 2) {
                        if (tunnelY > 0 && newTiles[tunnelY-1][tx].type !== 0) {
                            newEntities.push(new FallingBlock(tx * TILE_SIZE, tunnelY * TILE_SIZE));
                        }
                    }

                    // Hostage Check
                    if (beastsPlaced < 5 && (tx - lastBeastX > 50 || lastBeastX - tx > 50) && secureRandom() < 0.02) {
                        let beastY = tunnelY;
                        if (beastY > 0 && newTiles[beastY-1][tx].type !== 0) {
                            newTiles[beastY-1][tx] = { type: 1 };
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
    checkpointsPlaced = 0;
    nextCheckpoint = Math.floor(LEVEL_WIDTH / 6);

    for (let x = 20; x < LEVEL_WIDTH - 40; x++) {
        let y = surfaceMap[x];
        if (y >= LEVEL_HEIGHT) continue;

        // Checkpoints (Scarcer in hard levels)
        let cpReq = checkpointsPlaced < 5;
        if (difficulty >= 5 && checkpointsPlaced >= 3) cpReq = false;

        if (x >= nextCheckpoint && cpReq) {
            newTiles[y][x] = { type: 2 };
            newTiles[y-1][x] = { type: 5, active: false, id: checkpointsPlaced };
            nextCheckpoint += Math.floor(LEVEL_WIDTH / (difficulty >= 5 ? 4 : 6));
            checkpointsPlaced++;
            // Spawn Mech nearby occasionally
            if (difficulty >= 2 && secureRandom() < 0.3) {
                 newEntities.push(new MechSuit((x+2) * TILE_SIZE, (y-3) * TILE_SIZE));
            }
        }
        else if (secureRandom() < 0.1 && beastsPlaced < 5 && (x - lastBeastX > 50)) {
            let islandY = y - 7;
            if (islandY > 4) {
                if (newTiles[islandY+1][x].type === 0) {
                    newTiles[islandY][x] = { type: 1 };
                    newEntities.push(new TrappedBeast(x * TILE_SIZE, (islandY+1) * TILE_SIZE, islandY, x));
                    beastsPlaced++;
                    lastBeastX = x;
                }
            }
        }
        // Enemies & Hazards
        else if (secureRandom() < 0.03 + (difficulty*0.01)) {
            if (newTiles[y-1][x].type === 0) newEntities.push(new PropaneTank(x * TILE_SIZE, (y-1) * TILE_SIZE));
        }
        else if (secureRandom() < 0.04) {
             if (newTiles[y-1][x].type === 0) newEntities.push(new Mailman(x * TILE_SIZE, (y-1) * TILE_SIZE));
        }
        else if (secureRandom() < 0.06 + (difficulty*0.01)) {
             let r = secureRandom();
             if (difficulty >= 2 && r < 0.2) newEntities.push(new SniperEnemy(x * TILE_SIZE, (y-1) * TILE_SIZE));
             else if (difficulty >= 3 && r < 0.4) newEntities.push(new ShieldBearer(x * TILE_SIZE, (y-1) * TILE_SIZE));
             else if (difficulty >= 4 && r < 0.6) newEntities.push(new HeavyGunner(x * TILE_SIZE, (y-1) * TILE_SIZE - 10));
             else if (r < 0.8) newEntities.push(new KamikazeEnemy(x * TILE_SIZE, (y-1) * TILE_SIZE));
             else newEntities.push(new Enemy(x * TILE_SIZE, (y-1) * TILE_SIZE));
        }
        else if (secureRandom() < 0.04) newEntities.push(new FlyingEnemy(x * TILE_SIZE, (y-5) * TILE_SIZE));
    }

    // 5. FINISH
    for(let y=0; y<LEVEL_HEIGHT; y++) {
        newTiles[y][0] = { type: 2 };
        newTiles[y][LEVEL_WIDTH-1] = { type: 2 };
    }

    // Boss Spawning Logic
    if (difficulty < 20) {
         // Spawn Boss in normal terrain (Last 30% of map)
         let spawnRangeStart = Math.floor(LEVEL_WIDTH * 0.7);
         let bossX = spawnRangeStart + Math.floor(secureRandom() * (LEVEL_WIDTH - spawnRangeStart - 5));

         // Find ground Y
         let bossY = 10;
         if (surfaceMap[bossX]) bossY = surfaceMap[bossX] - 5;

         // Safety check
         if (bossY > LEVEL_HEIGHT - 5) bossY = 10;

         let bossType = (difficulty >= 4 && difficulty % 2 === 0) ? 'heli' : 'ground';

         if (bossType === 'heli') {
             newEntities.push(new HelicopterBoss(bossX * TILE_SIZE, (bossY - 10) * TILE_SIZE));
         } else {
             newEntities.push(new Boss(bossX * TILE_SIZE, bossY * TILE_SIZE));
         }

         // Spawn Defenders
         let numDefenders = 3 + Math.floor(difficulty * 0.5);
         for(let i=0; i<numDefenders; i++) {
             let dx = bossX + Math.floor((secureRandom()-0.5) * 30); // Nearby
             if (dx < 5) dx = 5; if (dx > LEVEL_WIDTH-5) dx = LEVEL_WIDTH-5;
             let dy = surfaceMap[dx] ? surfaceMap[dx] - 2 : 10;

             if (difficulty >= 5 && secureRandom() < 0.5) newEntities.push(new HeavyGunner(dx * TILE_SIZE, dy * TILE_SIZE));
             else if (difficulty >= 3) newEntities.push(new ShieldBearer(dx * TILE_SIZE, dy * TILE_SIZE));
             else newEntities.push(new Enemy(dx * TILE_SIZE, dy * TILE_SIZE));
         }

    } else {
         // Level 20+: Special Room
         // Boss is in the arena at the end
         newEntities.push(new Boss((LEVEL_WIDTH - 20) * TILE_SIZE, 8 * TILE_SIZE));

         // Traps/Turrets in arena?
         newEntities.push(new HeavyGunner((LEVEL_WIDTH - 35) * TILE_SIZE, 8 * TILE_SIZE));
         newEntities.push(new HeavyGunner((LEVEL_WIDTH - 5) * TILE_SIZE, 8 * TILE_SIZE));
    }

    entities = newEntities;
    return newTiles;
}
window.generateLevel = generateLevel;
