// --- SYSTEM FUNCTIONS ---

function updateUI() {
    if (!player) return;
    let hearts = "❤".repeat(Math.max(0, player.health));
    document.getElementById('healthDisplay').innerText = hearts;
    document.getElementById('scoreDisplay').innerText = gameState.score;
    document.getElementById('rescueDisplay').innerText = gameState.rescues;
    document.getElementById('livesDisplay').innerText = gameState.lives;
    let charName = player.charData ? player.charData.name : "UNKNOWN";
    document.getElementById('charName').innerText = charName;
    if(player.charData) document.getElementById('charName').style.color = player.charData.cSkin;
}

function winGame() {
    gameState.running = false;
    document.getElementById('ovTitle').innerText = "MISSION COMPLETE";
    document.getElementById('ovTitle').style.color = "gold";
    document.getElementById('ovMsg').innerText = "The Minivan has arrived!";
    document.getElementById('gameOverOverlay').style.display = 'flex';
}

function endGame() {
    gameState.running = false;
    document.getElementById('ovTitle').innerText = "MISSION FAILED";
    document.getElementById('ovTitle').style.color = "red";
    document.getElementById('ovMsg').innerText = "Out of lives. The pound awaits.";
    document.getElementById('gameOverOverlay').style.display = 'flex';
}

// FRAMERATE CAP

function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;

    if (deltaTime < INTERVAL) {
        requestAnimationFrame(loop);
        return;
    }
    lastTime = timestamp - (deltaTime % INTERVAL);

    // DEBUG UPDATE
    try {
        if (debugHUD) {
            debugHUD.textContent =
                `State: ${gameState.screen}\n` +
                `Run: ${gameState.running}\n` +
                `Frame: ${gameState.frame}\n` +
                `Ents: ${entities.length}\n` +
                `Tiles: ${tiles.length}\n` +
                `Player: ${player ? Math.round(player.x) + ',' + Math.round(player.y) : 'N/A'}\n` +
                `RectInt: ${typeof rectIntersect}\n` +
                `FPS: ${Math.round(1000/deltaTime)}`;
        }
    } catch(e) {}

    // 1. UPDATE LOOP (Logic)
    try {
        if(gameState.screen === 'MENU' || gameState.screen === 'ROSTER') {
            // No logic update needed for menus in this simple game
        } else if (gameState.running) {
            if(gameState.hitStop > 0) {
                gameState.hitStop--;
            } else {
                gameState.frame++;
                if(player) player.update();

                if(shootCooldown > 0) shootCooldown--;
                if(specialCooldown > 0) specialCooldown--;

                if((keys['z'] || keys['j']) && shootCooldown <= 0) {
                    let isDown = keys['arrowdown'] || keys['s'];
                    if(player) player.shoot(false, isDown);
                    shootCooldown = 15;
                }
                if((keys['x'] || keys['k']) && specialCooldown <= 0 && player) { player.shoot(true, false); specialCooldown = 120; }

                entities = entities.filter(e => (e.hp > 0) || (e.life > 0));
                entities.forEach(e => e.update());

                particles = particles.filter(p => p.life > 0); particles.forEach(p => p.update());
                damageNumbers = damageNumbers.filter(d => d.life > 0);
                damageNumbers.forEach(d => { d.y += d.vy; d.life--; });
                debris = debris.filter(d => d.life > 0); debris.forEach(d => d.update());
            }

            if (player) {
                let targetX = player.x - canvas.width * 0.3; if(targetX < 0) targetX = 0;
                if(gameState.bossActive) { let bossArenaX = (LEVEL_WIDTH - 25) * TILE_SIZE; if(targetX < bossArenaX) targetX = bossArenaX; }
                gameState.cameraX += (targetX - gameState.cameraX) * 0.1;
                let targetY = player.y - canvas.height * 0.5; if (targetY < 0) targetY = 0;
                gameState.cameraY += (targetY - gameState.cameraY) * 0.1;
            }

            let sx = (secureRandom()-0.5) * gameState.shake;
            let sy = (secureRandom()-0.5) * gameState.shake;
            gameState.shake *= 0.9;
        }
    } catch(e) {
        console.error("Game Loop Update Error:", e);
        // Explicitly call onerror to show in overlay
        window.onerror(e.message, "loajf.html (Update Loop)", 0, 0, e);
    }

    // 2. DRAW LOOP (Rendering)
    try {
        if(gameState.screen === 'MENU') {
            drawMenu();
        } else if(gameState.screen === 'ROSTER') {
            drawRoster();
        } else {
            // GAME DRAW
            let sx = (secureRandom()-0.5) * gameState.shake;
            let sy = (secureRandom()-0.5) * gameState.shake;

            ctx.setTransform(1, 0, 0, 1, 0, 0); // Safety reset
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawBackground(ctx, gameState.cameraX + sx, gameState.cameraY + sy);

            ctx.save();
            ctx.translate(-gameState.cameraX + sx, -gameState.cameraY + sy);

            let startCol = Math.floor(gameState.cameraX / TILE_SIZE); let endCol = startCol + (canvas.width / TILE_SIZE) + 4;
            let startRow = Math.floor(gameState.cameraY / TILE_SIZE); let endRow = startRow + (canvas.height / TILE_SIZE) + 4;

            for(let r=startRow; r<endRow && r<LEVEL_HEIGHT; r++) {
                for(let c=startCol; c<endCol && c<LEVEL_WIDTH; c++) {
                    if(tiles && tiles[r] && tiles[r][c] && tiles[r][c].type !== 0) {
                        let t = tiles[r][c]; let tx = c*TILE_SIZE; let ty = r*TILE_SIZE;

                        if(t.type === 6) {
                            ctx.fillStyle = C.ladder;
                            ctx.fillRect(tx + 10, ty, 5, TILE_SIZE);
                            ctx.fillRect(tx + 25, ty, 5, TILE_SIZE);
                            for(let i=0; i<4; i++) ctx.fillRect(tx+10, ty + (i*10) + 2, 20, 4);
                        }
                        else if(t.type === 5) {
                            ctx.fillStyle = t.active ? "#00ff41" : "#555";
                            ctx.shadowBlur = 20; ctx.shadowColor = ctx.fillStyle;
                            ctx.fillRect(tx+15, ty+10, 5, 30);
                            ctx.beginPath(); ctx.moveTo(tx+20, ty+10); ctx.lineTo(tx+35, ty+15); ctx.lineTo(tx+20, ty+20); ctx.fill();
                            ctx.shadowBlur = 0; ctx.fillStyle = "#333"; ctx.fillRect(tx+5, ty+35, 30, 5);
                        }
                        else if(t.type === 4) {
                            let grd = ctx.createLinearGradient(tx, ty, tx, ty+TILE_SIZE);
                            grd.addColorStop(0, "#ccc"); grd.addColorStop(1, "#555"); ctx.fillStyle = grd;
                            ctx.beginPath(); ctx.moveTo(tx, ty+TILE_SIZE); ctx.lineTo(tx+10, ty); ctx.lineTo(tx+20, ty+TILE_SIZE); ctx.lineTo(tx+30, ty); ctx.lineTo(tx+40, ty+TILE_SIZE); ctx.fill();
                        }
                        else if (t.type === 1) {
                            ctx.fillStyle = C.dirtBase; ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                            ctx.fillStyle = C.dirtLight; ctx.fillRect(tx + 5, ty + 5, 10, 10); ctx.fillRect(tx + 25, ty + 20, 8, 8);
                            if(r > 0 && tiles[r-1][c].type === 0) { ctx.fillStyle = C.grassTop; ctx.fillRect(tx, ty, TILE_SIZE, 8); }
                        }
                        else if (t.type === 2) {
                            ctx.fillStyle = C.stoneBase; ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                            ctx.strokeStyle = C.stoneLight; ctx.lineWidth = 2; ctx.beginPath();
                            ctx.moveTo(tx, ty+20); ctx.lineTo(tx+TILE_SIZE, ty+20);
                            ctx.stroke();
                        }
                        else if (t.type === 9) {
                            ctx.fillStyle = "gold"; ctx.shadowBlur=30; ctx.shadowColor="gold";
                            ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE); ctx.shadowBlur=0;
                            ctx.fillStyle = "#000"; ctx.font = "10px Arial"; ctx.fillText("VAN", tx+5, ty+25);
                        }
                    }
                }
            }

            debris.forEach(d => d.draw(ctx));
            entities.forEach(e => e.draw(ctx, 0, 0));
            if(player) player.draw(ctx, 0, 0);
            particles.forEach(p => p.draw(ctx));

            ctx.font = "900 20px 'Segoe UI'";
            ctx.lineWidth = 3;
            damageNumbers.forEach(d => {
                ctx.fillStyle = d.color; ctx.strokeStyle = "black";
                ctx.strokeText(d.text, d.x, d.y); ctx.fillText(d.text, d.x, d.y);
            });

            ctx.restore();

            var grd = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 200, canvas.width/2, canvas.height/2, 600);
            grd.addColorStop(0, "transparent"); grd.addColorStop(1, "rgba(0,0,0,0.6)");
            ctx.fillStyle = grd; ctx.fillRect(0,0,canvas.width, canvas.height);
        }

    } catch(e) {
        console.error("Game Loop Draw Error:", e);
        // Visual crash indicator
        ctx.fillStyle = "#ff00ff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        window.onerror(e.message, "loajf.html (Draw Loop)", 0, 0, e);
    }

    requestAnimationFrame(loop);
}

// MAIN INIT FUNCTION
function init() {
    console.log("INIT() CALLED");
    lastTime = 0;

    // Set to MENU initially
    gameState.screen = 'MENU';
    gameState.running = false;

    // Show Menu UI, Hide Game UI
    document.getElementById('menuOverlay').style.display = 'flex';
    document.getElementById('rosterOverlay').style.display = 'none';
    document.getElementById('gameUI').style.display = 'none';
    document.getElementById('bossHealthContainer').style.display = 'none';
    document.getElementById('gameOverOverlay').style.display = 'none';
}

// Start actual gameplay
window.startGame = function() {
    console.log("STARTGAME() CALLED");
    try {
        if (typeof rectIntersect !== 'function') throw new Error("CRITICAL: rectIntersect function missing!");

        tiles = generateLevel();
        console.log("LEVEL GENERATED. TILES:", tiles.length);
        particles = [];
        damageNumbers = [];
        debris = [];
        gameState.spawnPoint = { x: 100, y: 0 };
        gameState.checkpointsHit = 0;
        gameState.score = 0;
        gameState.rescues = 0;
        gameState.lives = 3;
        gameState.bossActive = false;
        gameState.screen = 'GAME';
        gameState.running = true;

        // Select random unlocked hero
        player = new Player();
        let rnd = Math.floor(secureRandom() * globalUnlocked);
        player.setCharacter(CHARACTERS[rnd].id);

        // Switch UI
        document.getElementById('menuOverlay').style.display = 'none';
        document.getElementById('gameUI').style.display = 'flex';

        // Reset Time so we don't jump
        lastTime = 0;
    } catch (e) {
        console.error("Error starting game:", e);
        // Force error overlay
        window.onerror(e.message, "loajf.html (startGame)", 0, 0, e);
        // Fallback
        gameState.screen = 'MENU';
        document.getElementById('menuOverlay').style.display = 'flex';
        document.getElementById('gameUI').style.display = 'none';
    }
}

// Return to menu
window.returnToBase = function() {
    init();
}

// Restart level (keep unlocks)
window.resetGame = function() {
    window.startGame();
};

window.viewRoster = function() {
    gameState.screen = 'ROSTER';
    document.getElementById('menuOverlay').style.display = 'none';
    document.getElementById('rosterOverlay').style.display = 'flex';
};

window.returnToMenu = function() {
    gameState.screen = 'MENU';
    document.getElementById('rosterOverlay').style.display = 'none';
    document.getElementById('menuOverlay').style.display = 'flex';
};

// Start App
init();
requestAnimationFrame(loop);
