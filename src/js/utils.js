import { damageNumbers, particles, debris, tiles, gameState, players, entities } from './state.js';
import { Particle, RockChunk, SmokeParticle, SparkParticle } from './classes/particles.js';
import { secureRandom } from './math.js';
import { soundManager } from './sound.js';
import { LEVEL_HEIGHT, LEVEL_WIDTH, TILE_SIZE, ASSETS, CHARACTERS } from './constants.js';

export function spawnDamageNumber(x, y, amount, color="white") {
    damageNumbers.push({ x: x, y: y, text: amount, life: 60, vy: -2, color: color });
}

export function spawnExplosion(x, y, color, scale=1) {
    for(let i=0; i<10*scale; i++) particles.push(new Particle(x, y, color));
    for(let i=0; i<5*scale; i++) particles.push(new SmokeParticle(x, y));
    for(let i=0; i<5*scale; i++) particles.push(new SparkParticle(x, y));
    shakeCamera(5 * scale);
}

export function spawnDebris(x, y, color) {
    // Spawn more, smaller chunks for better "shattering" effect
    for(let i=0; i<8; i++) {
        let chunk = new RockChunk(x + secureRandom()*20, y + secureRandom()*20, color);
        chunk.size = secureRandom() * 4 + 2; // Smaller chunks (2-6px)
        debris.push(chunk);
    }
}

export function destroyRadius(cx, cy, r) {
    const levelWidth = gameState.levelData.width || LEVEL_WIDTH;
    for(let y = cy - r; y <= cy + r; y++) {
        for(let x = cx - r; x <= cx + r; x++) {
            if(y>=0 && y<LEVEL_HEIGHT && x>=0 && x<levelWidth) {
                let t = tiles[y][x];
                if(t) {
                    if (t.type === 1) {
                        spawnDebris(x*TILE_SIZE, y*TILE_SIZE, ASSETS.dirtLight);
                        tiles[y][x] = { type: 0 };
                        if(soundManager) soundManager.play('brick_break');
                    }
                    // Metal (Type 3) is tough but breakable by explosions (radius > 1)
                    else if (t.type === 3 && r >= 2) {
                        spawnDebris(x*TILE_SIZE, y*TILE_SIZE, "#7f8c8d");
                        tiles[y][x] = { type: 0 };
                        if(soundManager) soundManager.play('brick_break');
                    }
                }
            }
        }
    }
}

export function shakeCamera(amount) {
    gameState.shake = amount;
    if(amount > 10) gameState.hitStop = 3;
}

export function createExplosion(x, y, radius, damage) {
    // Visuals
    spawnExplosion(x, y, "orange", radius);
    if(soundManager) soundManager.play('explosion');

    // Terrain Destruction
    let c = Math.floor(x / TILE_SIZE);
    let r = Math.floor(y / TILE_SIZE);
    destroyRadius(c, r, radius);

    // Entity Damage (Players)
    if (players) {
        for (let p of players) {
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

export function unlockCharacter(sourcePlayer) {
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
            localStorage.setItem('loajf_unlocked', gameState.globalUnlocked);

            // Switch source player to the new character
            if (sourcePlayer) {
                // globalUnlocked is now the count, so index is globalUnlocked - 1
                sourcePlayer.setCharacter(CHARACTERS[gameState.globalUnlocked - 1].id);
                // Reset health or give invincibility on unlock? Usually good practice.
                sourcePlayer.health = 3;
                sourcePlayer.invincible = 60;
            }

            spawnDamageNumber(px, py - 40, "NEW HERO!", "gold");
            // Maybe visual effect?
            spawnExplosion(px, py, "gold", 2);
            if(soundManager) soundManager.play('powerup');
        } else {
            spawnDamageNumber(px, py - 40, "MAX ROSTER!", "gold");
        }
    } else {
        let needed = requiredTotal - currentTotal;
        spawnDamageNumber(px, py - 40, `${needed} MORE`, "cyan");
    }
}
