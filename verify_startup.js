
// Mock environment
global.window = {};
global.document = {
    getElementById: () => ({ innerText: '', style: {}, classList: { add: ()=>{}, remove: ()=>{} }, addEventListener: ()=>{} }),
    addEventListener: () => {}
};
global.navigator = { getGamepads: () => [] };
global.keys = {};
global.playerKeys = [{}, {}, {}, {}];
global.players = [];
global.player = null;
global.tiles = [];
global.entities = [];
global.particles = [];
global.damageNumbers = [];
global.debris = [];
global.gameState = {
    frame: 0,
    running: false,
    screen: 'MENU',
    score: 0,
    rescues: 0,
    lives: 3,
    globalUnlocked: 1,
    spawnPoint: { x: 0, y: 0 },
    levelData: { biome: 'forest' },
    cameraX: 0, cameraY: 0,
    shake: 0,
    hitStop: 0,
    currentLevel: 1,
    levelCompleteStats: {}
};
global.shootCooldown = 0;
global.specialCooldown = 0;
global.lastTime = 0;
global.TILE_SIZE = 40;
global.LEVEL_HEIGHT = 20;
global.LEVEL_WIDTH = 100;
global.CHARACTERS = [{ id: 'hero', pType: 'gun', pColor: 'blue' }];
global.C = { dirtBase: "#000" }; // Mock assets
global.GRAVITY = 0.5;
global.JUMP_FORCE = -10;
global.ACCELERATION = 1;
global.FRICTION = 0.8;
global.TERMINAL_VELOCITY = 15;
global.secureRandom = Math.random;
global.spawnExplosion = () => {};
global.shakeCamera = () => {};
global.spawnDamageNumber = () => {};
global.updateUI = () => {};
global.endGame = () => {};
global.winGame = () => {};
global.drawAnatomicalHero = () => {};
global.destroyRadius = () => {};
global.rectIntersect = () => false;
global.drawRoundedRect = () => {};
global.drawBackground = () => {};
global.drawMenu = () => {};
global.drawRoster = () => {};
global.checkRectOverlap = () => false;
global.generateLevel = () => [];
global.unlockCharacter = () => {};

// Classes
class Particle { constructor() {} update() {} draw() {} }
global.Particle = Particle;
class Bullet { constructor() {} update() {} draw() {} }
global.Bullet = Bullet;
class MeleeHitbox { constructor() {} update() {} draw() {} }
global.MeleeHitbox = MeleeHitbox;
class Helicopter { constructor() {} update() {} draw() {} }
global.Helicopter = Helicopter;

// Load Files
const fs = require('fs');
eval(fs.readFileSync('src/js/classes/player.js', 'utf8') + "; global.Player = Player;");
eval(fs.readFileSync('src/js/classes/enemies.js', 'utf8') + "; global.Enemy = Enemy;");
eval(fs.readFileSync('src/js/utils.js', 'utf8'));
// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => {};

// Load Main
const mainCode = fs.readFileSync('src/js/main.js', 'utf8');
// We can't direct eval main.js because it calls init() immediately.
// We'll wrap it or just eval it and let init fail or pass.
try {
    eval(mainCode);
} catch (e) {
    console.log("Main eval error (expected if DOM missing):", e.message);
}

// Test startGame
console.log("--- Testing startGame ---");
try {
    // Manually call window.startGame if defined (it is attached to window in main.js)
    if (global.window.startGame) {
        global.window.startGame();
        console.log(`Players Spawned: ${global.window.players ? global.window.players.length : 'undefined'}`);

        if (global.window.players && global.window.players.length >= 1) {
            console.log("[PASS] startGame spawned at least 1 player.");
        } else {
            console.log("[FAIL] No players spawned.");
        }
    } else {
        console.log("[FAIL] window.startGame not defined.");
    }
} catch (e) {
    console.error("CRITICAL ERROR in startGame:", e);
}
