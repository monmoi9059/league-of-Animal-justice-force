// --- GLOBAL VARS ---
let globalUnlocked = 1;
let shootCooldown = 0;
let specialCooldown = 0;
let lastTime = 0;

let gameState = {
    screen: 'MENU',
    running: false,
    score: 0,
    cameraX: 0, cameraY: 0,
    shake: 0,
    frame: 0,
    checkpointsHit: 0,
    rescues: 0,
    lives: 3,
    unlockedCount: 1,
    spawnPoint: { x: 100, y: 0 },
    bossActive: false,
    hitStop: 0
};

let tiles = [];
let entities = [];
let particles = [];
let damageNumbers = [];
let debris = [];
let player;
