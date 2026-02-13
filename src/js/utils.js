function secureRandom() {
    try {
        const array = new Uint32Array(1);
        // Fallback for secure random
        let cryptoObj = window.crypto || window.msCrypto;
        if (cryptoObj && cryptoObj.getRandomValues) {
             cryptoObj.getRandomValues(array);
             return array[0] / 4294967296;
        }
        return Math.random();
    } catch (e) {
        return Math.random();
    }
}

function spawnDamageNumber(x, y, amount, color="white") {
    damageNumbers.push({ x: x, y: y, text: amount, life: 60, vy: -2, color: color });
}
function spawnExplosion(x, y, color, scale=1) {
    for(let i=0; i<8*scale; i++) particles.push(new Particle(x, y, color));
}
function spawnDebris(x, y, color) {
    // Spawn more, smaller chunks for better "shattering" effect
    for(let i=0; i<6; i++) {
        let chunk = new RockChunk(x + secureRandom()*20, y + secureRandom()*20, color);
        chunk.size = secureRandom() * 4 + 2; // Smaller chunks (2-6px)
        debris.push(chunk);
    }
}
function destroyRadius(cx, cy, r) {
    for(let y = cy - r; y <= cy + r; y++) {
        for(let x = cx - r; x <= cx + r; x++) {
            if(y>=0 && y<LEVEL_HEIGHT && x>=0 && x<LEVEL_WIDTH) {
                if(tiles[y] && tiles[y][x] && tiles[y][x].type === 1) {
                    spawnDebris(x*TILE_SIZE, y*TILE_SIZE, C.dirtLight);
                    tiles[y][x] = { type: 0 };
                    if(window.soundManager) window.soundManager.play('brick_break');
                }
            }
        }
    }
}
function shakeCamera(amount) {
    gameState.shake = amount;
    if(amount > 10) gameState.hitStop = 3;
}

function createExplosion(x, y, radius, damage) {
    // Visuals
    spawnExplosion(x, y, "orange", radius);
    if(window.soundManager) window.soundManager.play('explosion');

    // Terrain Destruction
    let c = Math.floor(x / TILE_SIZE);
    let r = Math.floor(y / TILE_SIZE);
    destroyRadius(c, r, radius);

    // Entity Damage (Players)
    if (window.players) {
        for (let p of window.players) {
            if (p.health > 0) {
                let dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
                if (dist < (radius * TILE_SIZE) + 20) {
                    p.takeDamage(damage);
                }
            }
        }
    }

    // Entity Damage (Enemies)
    for(let i=0; i<entities.length; i++) {
        let e = entities[i];
        if (e.hp > 0) {
            let dist = Math.sqrt(Math.pow(e.x - x, 2) + Math.pow(e.y - y, 2));
            if (dist < (radius * TILE_SIZE) + 20) {
                 if(e.takeDamage) e.takeDamage(damage, x);
            }
        }
    }
}

function unlockCharacter(sourcePlayer) {
    let px = sourcePlayer ? sourcePlayer.x : 0;
    let py = sourcePlayer ? sourcePlayer.y : 0;

    // Check threshold: Linear progression (+2 per hero) instead of exponential
    // We add 1 to current rescues because this function is called before the increment in TrappedBeast
    let currentTotal = gameState.rescues + 1;
    // Formula: 2 * i - 1 for i >= 1. For i=0, it's 0.
    let requiredTotal = (gameState.globalUnlocked === 0) ? 0 : (2 * gameState.globalUnlocked - 1);

    if (currentTotal >= requiredTotal) {
        if (gameState.globalUnlocked < CHARACTERS.length) {
            gameState.globalUnlocked++;
            gameState.unlockedCount = gameState.globalUnlocked;
            spawnDamageNumber(px, py - 40, "NEW HERO!", "gold");
            // Maybe visual effect?
            spawnExplosion(px, py, "gold", 2);
            if(window.soundManager) window.soundManager.play('powerup');
        } else {
            spawnDamageNumber(px, py - 40, "MAX ROSTER!", "gold");
        }
    } else {
        let needed = requiredTotal - currentTotal;
        spawnDamageNumber(px, py - 40, `${needed} MORE`, "cyan");
    }
}
