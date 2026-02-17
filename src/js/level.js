import { gameState, setEntities } from './state.js';
import { LEVEL_WIDTH, LEVEL_HEIGHT, TILE_SIZE } from './constants.js';
import { secureRandom } from './math.js';
import { Enemy, CaptainEnemy, ShieldBearer, HeavyGunner, KamikazeEnemy, SniperEnemy, FlyingEnemy, Boss, HelicopterBoss } from './classes/enemies.js';
import { BridgeBlock, PropaneTank, MechSuit, TrappedBeast } from './classes/items.js';

// --- LEVEL GENERATOR ---
export function generateLevel() {
    let newTiles = [];
    let newEntities = [];

    let difficulty = gameState.currentLevel;
    let biome = 'forest';
    if (difficulty >= 3) biome = 'city';
    if (difficulty >= 5) biome = 'volcano';

    // Update global level data for rendering
    gameState.levelData.biome = biome;
    gameState.levelData.difficulty = difficulty;

    // Scale Level Width with Difficulty
    // Start smaller (200) and grow to max (400) by level 5
    let dynamicWidth = 200;
    if (difficulty >= 2) dynamicWidth = 250;
    if (difficulty >= 3) dynamicWidth = 300;
    if (difficulty >= 4) dynamicWidth = 350;
    if (difficulty >= 5) dynamicWidth = 400;

    // Update Global for other systems - Wait, LEVEL_WIDTH is a const in constants.js.
    // I cannot reassign a const export.
    // I should probably make LEVEL_WIDTH a let in state.js or constants.js or just pass it around.
    // Or I can just ignore it if other files use the const.
    // BUT `tiles` array depends on it. And rendering loop depends on it.
    // I should modify `constants.js` to export a mutable configuration or use `gameState.levelData.width`.

    // For now, I will assume LEVEL_WIDTH in constants is a default/max, but I should really use the dynamic width.
    // Ideally refactor constants to mutable state or config.
    // Since `main.js` render loop uses `LEVEL_WIDTH` from constants (which was window.LEVEL_WIDTH), it will break if I don't update it.

    // I'll update `gameState.levelData.width` and use that in rendering if possible.
    gameState.levelData.width = dynamicWidth;

    let currentLevelWidth = dynamicWidth;

    let captainSpawned = false;

    // Helper: Spawn Enemy Squad
    function spawnSquad(x, y, forceCaptain = false) {
        let type = secureRandom();

        // Check if spawning location is "underground" (depth > 20)
        // Captains must always spawn on surface
        let isUnderground = (y > 20);

        // Force Captain Spawn if requested (Must be End Zone)
        // Removed random chance to prevent early spawns
        if ((forceCaptain && !captainSpawned)) {
             newEntities.push(new CaptainEnemy(x * TILE_SIZE, y * TILE_SIZE));
             captainSpawned = true;

             // Guards scale with difficulty
             if (difficulty >= 5) {
                 newEntities.push(new ShieldBearer((x-1) * TILE_SIZE, y * TILE_SIZE));
                 newEntities.push(new ShieldBearer((x+1) * TILE_SIZE, y * TILE_SIZE));
             } else if (difficulty >= 3) {
                 newEntities.push(new ShieldBearer((x-1) * TILE_SIZE, y * TILE_SIZE));
                 newEntities.push(new Enemy((x+1) * TILE_SIZE, y * TILE_SIZE));
             } else {
                 // Level 1-2: Just Grunts
                 newEntities.push(new Enemy((x-1) * TILE_SIZE, y * TILE_SIZE));
                 newEntities.push(new Enemy((x+1) * TILE_SIZE, y * TILE_SIZE));
             }
             return; // Squad spawned, exit
        }

        // Squad Composition based on Difficulty
        if (difficulty >= 5 && type < 0.25) {
             // Specialist Squad: 1 Shield + 2 Grunts
             newEntities.push(new ShieldBearer(x * TILE_SIZE, y * TILE_SIZE));
             newEntities.push(new Enemy((x-1) * TILE_SIZE, y * TILE_SIZE));
             newEntities.push(new Enemy((x+1) * TILE_SIZE, y * TILE_SIZE));
        } else if (difficulty >= 7 && type < 0.35) {
             // Heavy Squad: 1 Heavy + 1 Shield
             newEntities.push(new HeavyGunner(x * TILE_SIZE, (y-1) * TILE_SIZE));
             newEntities.push(new ShieldBearer((x+2) * TILE_SIZE, y * TILE_SIZE));
        } else if (difficulty >= 3 && type < 0.45) {
             // Suicide Squad: 3 Kamikazes
             newEntities.push(new KamikazeEnemy(x * TILE_SIZE, y * TILE_SIZE));
             newEntities.push(new KamikazeEnemy((x+1) * TILE_SIZE, y * TILE_SIZE));
             newEntities.push(new KamikazeEnemy((x-1) * TILE_SIZE, y * TILE_SIZE));
        } else {
             // Standard Patrol: 1-3 Grunts
             newEntities.push(new Enemy(x * TILE_SIZE, y * TILE_SIZE));
             if (difficulty >= 2) {
                 newEntities.push(new Enemy((x+1) * TILE_SIZE, y * TILE_SIZE));
                 if (secureRandom() < 0.5) newEntities.push(new Enemy((x-1) * TILE_SIZE, y * TILE_SIZE));
             } else {
                 // Level 1: Occasional second enemy
                 if (secureRandom() < 0.3) newEntities.push(new Enemy((x+1) * TILE_SIZE, y * TILE_SIZE));
             }
        }
    }

    // 1. Init Empty Grid
    for (let r = 0; r < LEVEL_HEIGHT; r++) {
        const row = new Array(currentLevelWidth);
        for (let c = 0; c < currentLevelWidth; c++) {
            row[c] = { type: 0 };
        }
        newTiles[r] = row;
    }

    // 2. Terrain Walker
    let currentHeight = 35; // Start lower in the map
    let checkpointInterval = Math.floor(currentLevelWidth / 6);
    let nextCheckpoint = checkpointInterval;
    let checkpointsPlaced = 0;
    let beastsPlaced = 0;
    let lastBeastX = -60;
    let lastEncounterX = 0;
    let surfaceMap = [];

    for (let x = 0; x < currentLevelWidth; x++) {

        // Level 20+: Boss Arena at the end
        if (difficulty >= 20 && x > currentLevelWidth - 40) {
            currentHeight = 12;

            // Wall at entrance of arena
            if (x === currentLevelWidth - 40) {
                for(let w=0; w<15; w++) { // High wall
                    if(12-w > 0) newTiles[12-w][x] = { type: 2 };
                }
            }
        }
        else if (x > 15) {
            // Roughness increases with difficulty
            let roughness = (difficulty <= 2) ? 0.1 : 0.2 + (difficulty * 0.05);
            if (secureRandom() < roughness) {
                currentHeight += secureRandom() > 0.5 ? -1 : 1;
            }
            if (currentHeight < 6) currentHeight = 6;
            if (currentHeight > LEVEL_HEIGHT - 10) currentHeight = LEVEL_HEIGHT - 10;

            // Pit Chance (More pits in later levels)
            let pitChance = (difficulty === 1) ? 0 : 0.005 + (difficulty * 0.01);
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

            // DECIDE RESCUE TYPE (Broforce: Often on high ground/cages)
            // Increase frequency (beastsPlaced < 8) and reduce distance check (30)
            if (beastsPlaced < 8 && (x - lastBeastX > 30) && secureRandom() < 0.08) {
                // Place directly on ground
                let groundY = currentHeight - 1;
                if (groundY > 0) {
                     newEntities.push(new TrappedBeast(x * TILE_SIZE, groundY * TILE_SIZE));
                     beastsPlaced++;
                     lastBeastX = x;
                     // Guard Squad
                     spawnSquad(x + 2, groundY);
                }
            }
        }
        else {
            currentHeight = 35;
        }

        surfaceMap[x] = currentHeight;

        // Fill Column
        for (let y = 0; y < LEVEL_HEIGHT; y++) {
            if (y >= currentHeight) {
                let type = 1; // Dirt
                if (x < 15 || (difficulty >= 20 && x > currentLevelWidth - 40)) type = 2; // Stone safe zones / Arena floor
                else if (y >= LEVEL_HEIGHT - 2) type = 2; // Bedrock
                newTiles[y][x] = { type: type };
            }
        }
    }

    // 3. PASS 2: UNDERGROUND TUNNEL NETWORK
    for (let x = 40; x < currentLevelWidth - 60; x += 40) {
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
                        if (ty >= 0 && ty < LEVEL_HEIGHT && tx >= 0 && tx < currentLevelWidth) {
                            newTiles[ty][tx] = { type: 0 };
                        }
                    }

                    // Enemies in tunnels (Ambush style)
                    if (secureRandom() < 0.1 && j > 5 && (j % 5 === 0)) {
                        let rand = secureRandom();
                        if (difficulty >= 3 && rand < 0.3) newEntities.push(new KamikazeEnemy(tx * TILE_SIZE, (tunnelY + 2) * TILE_SIZE));
                        else newEntities.push(new Enemy(tx * TILE_SIZE, (tunnelY + 2) * TILE_SIZE));
                    }

                    // Hostage Check (Hidden in caves)
                    if (beastsPlaced < 8 && (tx - lastBeastX > 30 || lastBeastX - tx > 30) && secureRandom() < 0.05) {
                        let beastY = tunnelY;
                        if (beastY > 0 && newTiles[beastY-1][tx].type !== 0) {
                            newTiles[beastY-1][tx] = { type: 1 };
                            newEntities.push(new TrappedBeast(tx * TILE_SIZE, (beastY + 1) * TILE_SIZE, beastY-1, tx));
                            beastsPlaced++;
                            lastBeastX = tx;
                            // Cave Guard
                            if (difficulty >= 5) newEntities.push(new HeavyGunner((tx+2) * TILE_SIZE, (beastY + 1) * TILE_SIZE));
                            else newEntities.push(new Enemy((tx+2) * TILE_SIZE, (beastY + 1) * TILE_SIZE));
                        }
                    }
                }
            }
        }
    }

    // 4. PASS 3: SURFACE OBJECTS & FLOATING ISLANDS
    checkpointsPlaced = 0;
    nextCheckpoint = Math.floor(currentLevelWidth / 6);
    lastEncounterX = 20;

    for (let x = 20; x < currentLevelWidth - 40; x++) {
        let y = surfaceMap[x];
        if (y >= LEVEL_HEIGHT) continue;

        // Checkpoints (Scarcer in hard levels)
        let cpReq = checkpointsPlaced < 5;
        if (difficulty >= 5 && checkpointsPlaced >= 3) cpReq = false;

        if (x >= nextCheckpoint && cpReq) {
            newTiles[y][x] = { type: 2 };
            newTiles[y-1][x] = { type: 5, active: false, id: checkpointsPlaced };
            nextCheckpoint += Math.floor(currentLevelWidth / (difficulty >= 5 ? 4 : 6));
            checkpointsPlaced++;

            // Checkpoints are safe zones, no enemies *directly* on them usually
            // Spawn Mech nearby occasionally
            if (difficulty >= 3 && secureRandom() < 0.3) {
                 newEntities.push(new MechSuit((x+2) * TILE_SIZE, (y-3) * TILE_SIZE));
            }
        }
        else if (secureRandom() < 0.03 + (difficulty*0.01)) {
            if (newTiles[y-1][x].type === 0) newEntities.push(new PropaneTank(x * TILE_SIZE, (y-1) * TILE_SIZE));
        }

        // ENEMY ENCOUNTERS (Clusters)
        // Spawn a squad every ~15-25 tiles, with some randomness
        let encounterDist = 30 - difficulty;
        if (encounterDist < 12) encounterDist = 12;

        // Force Captain near end of level if not spawned yet
        // Check if we are in the last 15% of the level (e.g. x > 340 for width 400)
        let isEndZone = (x > currentLevelWidth - 60);

        if (x - lastEncounterX > encounterDist || (isEndZone && !captainSpawned)) {
             let chance = (isEndZone && !captainSpawned) ? 1.0 : 0.4;
             if (secureRandom() < chance) {
                 spawnSquad(x, y-1, (isEndZone && !captainSpawned)); // Pass forceCaptain flag
                 lastEncounterX = x;
             }
        }

        // Occasional Sniper on high ground or random flyer
        if (secureRandom() < 0.02) {
             if (difficulty >= 3) newEntities.push(new SniperEnemy(x * TILE_SIZE, (y-1) * TILE_SIZE));
        }
        if (secureRandom() < 0.02 && difficulty >= 2) newEntities.push(new FlyingEnemy(x * TILE_SIZE, (y-5) * TILE_SIZE));
    }

    // 5. FINISH
    for(let y=0; y<LEVEL_HEIGHT; y++) {
        newTiles[y][0] = { type: 2 };
        newTiles[y][currentLevelWidth-1] = { type: 2 };
    }

    // Force Captain Spawn at End Zone (Building Top)
    if (!captainSpawned) {
        let capX = currentLevelWidth - 25;
        let capY = 10;
        // Find ground
        if (surfaceMap[capX]) capY = surfaceMap[capX];

        // Build Skyscraper
        for(let h=0; h<10; h++) {
            if(capY - h > 0) newTiles[capY-h][capX] = { type: 3 }; // Metal
        }
        // Platform
        newTiles[capY-10][capX-1] = { type: 3 };
        newTiles[capY-10][capX+1] = { type: 3 };

        spawnSquad(capX, capY - 11, true); // Force Spawn
    }

    // Boss Spawning Logic
    // No boss until level 10, then every 5 levels (10, 15, 20, 25...)
    if (difficulty >= 10 && difficulty % 5 === 0) {
         // Level 20+: Special Room Arena
         if (difficulty >= 20) {
             // Boss is in the arena at the end
             newEntities.push(new Boss((currentLevelWidth - 20) * TILE_SIZE, 8 * TILE_SIZE));

             // Traps/Turrets in arena?
             newEntities.push(new HeavyGunner((currentLevelWidth - 35) * TILE_SIZE, 8 * TILE_SIZE));
             newEntities.push(new HeavyGunner((currentLevelWidth - 5) * TILE_SIZE, 8 * TILE_SIZE));
         }
         else {
             // Spawn Boss in normal terrain (Last 30% of map)
             let spawnRangeStart = Math.floor(currentLevelWidth * 0.7);
             let bossX = spawnRangeStart + Math.floor(secureRandom() * (currentLevelWidth - spawnRangeStart - 5));

             // Find ground Y
             let bossY = 10;
             if (surfaceMap[bossX]) bossY = surfaceMap[bossX] - 5;

             // Safety check
             if (bossY > LEVEL_HEIGHT - 5) bossY = 10;

             let bossType = (difficulty >= 14 && difficulty % 2 === 0) ? 'heli' : 'ground';

             if (bossType === 'heli') {
                 newEntities.push(new HelicopterBoss(bossX * TILE_SIZE, (bossY - 10) * TILE_SIZE));
             } else {
                 newEntities.push(new Boss(bossX * TILE_SIZE, bossY * TILE_SIZE));
             }

             // Boss Entourage
             spawnSquad(bossX - 5, bossY);
             spawnSquad(bossX + 5, bossY);
         }
    }

    setEntities(newEntities);
    return newTiles;
}
