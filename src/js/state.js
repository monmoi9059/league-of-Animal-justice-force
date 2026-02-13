
window.gameState = {
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

window.tiles = [];
window.entities = [];
window.particles = [];
window.damageNumbers = [];
window.debris = [];
window.players = [];
window.player = null; // Deprecated, kept for legacy reference if needed temporarily

// Global Cooldowns
window.lastTime = 0;

// Inputs
window.playerKeys = [{}, {}, {}, {}];
