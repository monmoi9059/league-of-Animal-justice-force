import { INTERVAL, CANVAS, CTX, TILE_SIZE, LEVEL_WIDTH, LEVEL_HEIGHT, CHARACTERS, DEBUG_HUD } from './constants.js';
import { gameState, entities, setEntities, players, setPlayers, particles, setParticles, damageNumbers, setDamageNumbers, debris, setDebris, setTiles, tiles, player, setPlayer, lastTime, setLastTime, playerKeys } from './state.js';
import { updateUI } from './ui.js';
import { winGame, endGame } from './game-flow.js';
import { SoundManager, soundManager } from './sound.js';
import { initInput, inputConfig, pollGamepad } from './input.js';
import { generateLevel } from './level.js';
import { drawMenu, drawRoster, drawGame, drawBackground } from './render.js';
import { spawnExplosion } from './utils.js';
import { secureRandom } from './math.js';
import { setupErrorHandler } from './errorhandler.js';
import { Player } from './classes/player.js';
import { Helicopter } from './classes/items.js';

// --- MAIN INIT FUNCTION ---
function init() {
    console.log("INIT() CALLED");
    setLastTime(0);

    if (!soundManager.initialized) {
        // Init happens on user interaction usually, but let's ensure instance is there.
        // soundManager is exported instance.
    }

    // Resize setup
    window.addEventListener('resize', handleResize);
    handleResize();

    // Sound Toggle
    const soundBtn = document.getElementById('soundToggle');
    if (soundBtn) {
        // Remove old listeners to prevent duplicates if init called multiple times
        let newBtn = soundBtn.cloneNode(true);
        soundBtn.parentNode.replaceChild(newBtn, soundBtn);
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent touch-through
            if (soundManager) {
                const muted = soundManager.toggleMute();
                newBtn.innerText = muted ? "🔇" : "🔊";
                // Ensure init on interaction
                soundManager.init();
            }
        });
        // Set initial state
        if (soundManager) {
             newBtn.innerText = soundManager.muted ? "🔇" : "🔊";
        }
    }

    // Set to MENU initially
    gameState.screen = 'MENU';
    gameState.running = false;
    gameState.currentLevel = 1;

    // Show Menu UI, Hide Game UI
    document.getElementById('menuOverlay').style.display = 'flex';
    document.getElementById('rosterOverlay').style.display = 'none';
    if(document.getElementById('lobbyOverlay')) document.getElementById('lobbyOverlay').style.display = 'none';
    document.getElementById('gameUI').style.display = 'none';
    document.getElementById('bossHealthContainer').style.display = 'none';
    document.getElementById('gameOverOverlay').style.display = 'none';
    document.getElementById('levelCompleteOverlay').style.display = 'none';
}

// RESIZE HANDLING
function handleResize() {
    if (CANVAS) {
        CANVAS.width = window.innerWidth;
        CANVAS.height = window.innerHeight;
        // Redraw menu if active, as it's static
        if (gameState.screen === 'MENU') drawMenu();
        if (gameState.screen === 'ROSTER') drawRoster();
    }
}

// LOBBY LOGIC
window.enterLobby = function() {
    gameState.screen = 'LOBBY';
    document.getElementById('menuOverlay').style.display = 'none';
    document.getElementById('lobbyOverlay').style.display = 'flex';

    // Reset inputs - Assuming inputConfig is mutable array
    for(let i=0; i<4; i++) inputConfig[i] = null;

    updateLobbyUI();
};

window.lobbyLoop = function() {
    // This function is not called by the loop?
    // In original code, it was called? No, it was defined.
    // Ah, it should be called in the main loop if screen is LOBBY.
    // The original main loop had:
    // if(gameState.screen === 'MENU' || gameState.screen === 'ROSTER') {}
    // It didn't explicitly call lobbyLoop in the loop provided in the prompt?
    // Let me check the original loop.
    // The original loop:
    // if(gameState.screen === 'MENU' || gameState.screen === 'ROSTER') {}
    // else if (gameState.running) { ... }

    // But `window.lobbyLoop` was defined.
    // Maybe `lobbyLoop` should be called in the loop if `gameState.screen === 'LOBBY'`.
    // I'll add that.

    if (gameState.screen !== 'LOBBY') return;

    // We need access to keys to check for Space/Enter assignment.
    // But input.js handles keys.
    // `inputConfig` is exported.

    // Ideally lobby logic should be in input.js or a lobby.js?
    // Since it's small, I'll keep it here, but I need access to raw input.
    // `playerKeys` are available. But for unassigned inputs?
    // `input.js` logic was: "Assign to first available slot if not already assigned".
    // But `window.addEventListener` in `input.js` only updates `playerKeys`.

    // I'll re-implement lobby logic here using `playerKeys`? No, we need to know WHICH device was pressed.
    // `input.js` maps keyboard to P1 default if unassigned.
    // I might need to improve `input.js` to expose raw events or handle lobby assignment.

    // For now, let's just stick to the original behavior:
    // Keyboard always P1 (slot 0) if pressed?
    // `lobbyLoop` in original code checked `keys`.

    // I'll assume keyboard is always P1 for simplicity in this refactor, as per original code's "defaulting P1 to Keyboard".

    // Check P1 keys (Keyboard default)
    if (playerKeys[0][' '] || playerKeys[0]['enter']) {
        if (!inputConfig[0]) inputConfig[0] = { type: 'keyboard' };
    }

    // Gamepads are polled in `loop()`. `input.js` handles mapping to playerKeys.
    // But for lobby assignment, we need to know if an unassigned gamepad pressed a button.
    // `pollGamepad` in `input.js` iterates gamepads.
    // Maybe `pollGamepad` should return info or handle assignment if in lobby?
    // Since I refactored `pollGamepad`, it only updates `playerKeys` if assigned.

    // I'll modify `pollGamepad` in `input.js`? Or just iterate gamepads here.
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < gamepads.length; i++) {
        let gp = gamepads[i];
        if (gp) {
            if ((gp.buttons[0] && gp.buttons[0].pressed) || (gp.buttons[9] && gp.buttons[9].pressed)) {
                let existing = inputConfig.find(c => c && c.type === 'gamepad' && c.index === gp.index);
                if (!existing) {
                    let slot = inputConfig.findIndex(c => c === null);
                    if (slot !== -1) {
                        inputConfig[slot] = { type: 'gamepad', index: gp.index };
                    }
                }
            }
        }
    }

    updateLobbyUI();
};

function updateLobbyUI() {
    let count = 0;
    for(let i=0; i<4; i++) {
        let el = document.getElementById('lobbyStatus' + (i+1));
        if (el) {
            if (inputConfig[i]) {
                let type = inputConfig[i].type === 'keyboard' ? "KEYBOARD" : `GAMEPAD ${inputConfig[i].index + 1}`;
                el.innerText = "READY\n(" + type + ")";
                el.style.color = "#00ff41";
                count++;
            } else {
                el.innerText = "PRESS A / SPACE";
                el.style.color = "#777";
            }
        }
    }

    let btn = document.getElementById('lobbyStartBtn');
    if (btn) {
        if (count > 0) {
            btn.style.display = 'block';
            document.getElementById('lobbyMessage').innerText = `${count} PLAYER(S) READY`;
        } else {
            btn.style.display = 'none';
            document.getElementById('lobbyMessage').innerText = "WAITING FOR PLAYERS...";
        }
    }
}

// Start actual gameplay
window.startGame = function() {
    console.log("STARTGAME() CALLED");
    try {
        setTiles(generateLevel());
        console.log("LEVEL GENERATED. TILES:", tiles.length);
        setParticles([]);
        setDamageNumbers([]);
        setDebris([]);

        gameState.checkpointsHit = 0;
        // Keep score/rescues if next level, else reset
        if (gameState.screen === 'MENU' || gameState.screen === 'LOBBY') {
            gameState.levelCompleteStats.kills = 0;
            gameState.score = 0;
            gameState.rescues = 0;
            gameState.lives = 3;
            gameState.currentLevel = 1;
        }

        gameState.bossActive = false;
        gameState.screen = 'GAME';
        gameState.running = true;

        // Spawn Players based on Config
        setPlayers([]);
        setPlayer(null);

        let activeConfigs = inputConfig.map((c, i) => ({config: c, slot: i})).filter(o => o.config !== null);

        // Fallback for debugging if started without lobby (e.g. tests)
        if (activeConfigs.length === 0) {
            console.log("No inputs configured, defaulting P1 to Keyboard");
            inputConfig[0] = { type: 'keyboard' };
            activeConfigs = [{ config: { type: 'keyboard' }, slot: 0 }];
        }

        let newPlayers = [];
        activeConfigs.forEach((obj, idx) => {
            // We create Player with the SLOT index so it reads from playerKeys[slot]
            let p = new Player(obj.slot);

            // Pick distinct chars
            let available = Math.min(gameState.globalUnlocked, CHARACTERS.length);
            // Try to give unique char based on index
            let charIdx = (Math.floor(secureRandom() * available) + idx) % available;
            p.setCharacter(CHARACTERS[charIdx].id);

            newPlayers.push(p);
        });
        setPlayers(newPlayers);
        setPlayer(players[0]);

        // --- HELICOPTER INTRO ---
        let startX = 2 * TILE_SIZE;
        let startY = 2 * TILE_SIZE;
        let introHeli = new Helicopter(startX, startY, true);
        entities.push(introHeli);

        // Players start falling from heli
        players.forEach((p, idx) => {
            p.x = startX + 20 + (idx * 10);
            p.y = startY + 60;
            p.vy = 5;
            spawnExplosion(p.x, p.y, "#fff", 1);
        });

        gameState.spawnPoint = { x: startX + 20, y: startY + 60 };

        // Switch UI
        document.getElementById('menuOverlay').style.display = 'none';
        if(document.getElementById('lobbyOverlay')) document.getElementById('lobbyOverlay').style.display = 'none';
        document.getElementById('gameUI').style.display = 'flex';
        document.getElementById('levelCompleteOverlay').style.display = 'none';
        updateUI();

        setLastTime(0);
    } catch (e) {
        console.error("Error starting game:", e);
        // Fallback
        gameState.screen = 'MENU';
        document.getElementById('menuOverlay').style.display = 'flex';
        document.getElementById('gameUI').style.display = 'none';
    }
}

// Next Level Logic
window.nextLevel = function() {
    gameState.currentLevel++;
    gameState.score += 1000;
    window.startGame();
};

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

// GAME LOOP
function loop(timestamp) {
    if (!lastTime) setLastTime(timestamp);
    const deltaTime = timestamp - lastTime;

    // Slow Motion Logic
    let interval = INTERVAL / gameState.slowMo;

    if (deltaTime < interval) {
        requestAnimationFrame(loop);
        return;
    }
    setLastTime(timestamp - (deltaTime % interval));

    // POLL GAMEPAD
    pollGamepad();

    // DEBUG UPDATE
    try {
        if (DEBUG_HUD) {
            DEBUG_HUD.textContent =
                `State: ${gameState.screen}\n` +
                `Run: ${gameState.running}\n` +
                `Level: ${gameState.currentLevel}\n` +
                `Biome: ${gameState.levelData.biome}\n` +
                `Ents: ${entities.length}\n` +
                `FPS: ${Math.round(1000/deltaTime)}`;
        }
    } catch(e) {}

    // 1. UPDATE LOOP (Logic)
    try {
        if(gameState.screen === 'MENU') {
            // No logic
        } else if(gameState.screen === 'ROSTER') {
            // No logic
        } else if(gameState.screen === 'LOBBY') {
            window.lobbyLoop();
        } else if (gameState.running) {
            if(gameState.hitStop > 0) {
                gameState.hitStop--;
            } else {
                gameState.frame++;

                // Update all players
                if (players) {
                    players.forEach(p => {
                        if (p.health > 0) p.update();
                    });
                }

                // Filter dead entities (using reassignment)
                setEntities(entities.filter(e => (e.hp > 0) || (e.life > 0)));
                entities.forEach(e => e.update());

                setParticles(particles.filter(p => p.life > 0));
                particles.forEach(p => p.update());

                setDamageNumbers(damageNumbers.filter(d => d.life > 0));
                damageNumbers.forEach(d => { d.y += d.vy; d.life--; });

                setDebris(debris.filter(d => d.life > 0));
                debris.forEach(d => d.update());
            }

            // Camera Logic: Average Position
            let activePlayers = players.filter(p => p.health > 0);
            if (activePlayers.length > 0) {
                let avgX = 0;
                let avgY = 0;
                activePlayers.forEach(p => { avgX += p.x; avgY += p.y; });
                avgX /= activePlayers.length;
                avgY /= activePlayers.length;

                let zoom = gameState.zoom || 1.0;
                let visibleW = CANVAS.width / zoom;
                let visibleH = CANVAS.height / zoom;

                let targetX = avgX - visibleW * 0.5; // Center adjusted for zoom
                if(targetX < 0) targetX = 0;
                // if(gameState.bossActive) { let bossArenaX = (LEVEL_WIDTH - 25) * TILE_SIZE; if(targetX < bossArenaX) targetX = bossArenaX; }
                gameState.cameraX += (targetX - gameState.cameraX) * 0.1;

                let targetY = avgY - visibleH * 0.5;
                if (targetY < 0) targetY = 0;
                gameState.cameraY += (targetY - gameState.cameraY) * 0.1;
            }

            let sx = (secureRandom()-0.5) * gameState.shake;
            let sy = (secureRandom()-0.5) * gameState.shake;
            gameState.shake *= 0.9;
        }
    } catch(e) {
        console.error("Game Loop Update Error:", e);
        // Explicitly call onerror (assuming setupErrorHandler put it on window)
        // window.onerror(e.message, "loajf.html (Update Loop)", 0, 0, e);
    }

    // 2. DRAW LOOP (Rendering)
    try {
        if(gameState.screen === 'MENU') {
            drawMenu();
        } else if(gameState.screen === 'ROSTER') {
            drawRoster();
        } else if (gameState.screen !== 'LOBBY') { // Don't draw game if in lobby, or do we? Original code didn't handle lobby draw in loop explicit other than "else".
            // Original code: if menu... else if roster... else { game draw }
            // If screen is LOBBY, it would fall into 'else' and try to draw game?
            // But lobbyOverlay covers it.
            // Let's call drawGame if running or if we want to show something behind lobby.
            // But in lobby state, we might not have tiles.
            if (gameState.screen === 'GAME' || gameState.running) {
                drawGame();
            }
        }
    } catch(e) {
        console.error("Game Loop Draw Error:", e);
    }

    requestAnimationFrame(loop);
}

// SETUP
setupErrorHandler();
initInput();
init();
requestAnimationFrame(loop);
