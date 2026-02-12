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
    for(let i=0; i<3; i++) debris.push(new RockChunk(x, y, color));
}
function destroyRadius(cx, cy, r) {
    for(let y = cy - r; y <= cy + r; y++) {
        for(let x = cx - r; x <= cx + r; x++) {
            if(y>=0 && y<LEVEL_HEIGHT && x>=0 && x<LEVEL_WIDTH) {
                if(tiles[y] && tiles[y][x] && tiles[y][x].type === 1) {
                    spawnDebris(x*TILE_SIZE, y*TILE_SIZE, C.dirtLight);
                    tiles[y][x] = { type: 0 };
                }
            }
        }
    }
}
function shakeCamera(amount) {
    gameState.shake = amount;
    if(amount > 10) gameState.hitStop = 3;
}
