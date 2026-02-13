export const gameState = {
    screen: 'MENU',
    running: false,
    score: 0,
    cameraX: 0, cameraY: 0,
    zoom: 1.0,
    shake: 0,
    frame: 0,
    checkpointsHit: 0,
    rescues: 0,
    lives: 3,
    unlockedCount: 1,
    globalUnlocked: 1, // Alias for legacy code
    spawnPoint: { x: 100, y: 0 },
    bossActive: false,
    hitStop: 0,
    currentLevel: 1, // Added
    levelData: {
        biome: 'forest',
        difficulty: 1,
        width: 400,
        height: 60
    },
    slowMo: 1.0, // For time dilation
    levelCompleteStats: { kills: 0, rescues: 0, time: 0 }
};

export let tiles = [];
export let entities = [];
export let particles = [];
export let damageNumbers = [];
export let debris = [];
export let players = [];
export let player = null; // Deprecated, kept for legacy reference if needed temporarily

// Global Cooldowns
export let lastTime = 0;

// Inputs
export let playerKeys = [{}, {}, {}, {}];

export function setTiles(newTiles) {
    tiles = newTiles;
}

export function setEntities(newEntities) {
    entities = newEntities;
}

export function setParticles(newParticles) {
    particles = newParticles;
}

export function setDamageNumbers(newDamageNumbers) {
    damageNumbers = newDamageNumbers;
}

export function setDebris(newDebris) {
    debris = newDebris;
}

export function setPlayers(newPlayers) {
    players = newPlayers;
}

export function setPlayer(newPlayer) {
    player = newPlayer;
}

export function setLastTime(time) {
    lastTime = time;
}
