global.document = {
    getElementById: (id) => ({
        getContext: () => ({
            save: () => {}, restore: () => {}, translate: () => {}, scale: () => {},
            beginPath: () => {}, ellipse: () => {}, fill: () => {}, fillRect: () => {},
            arc: () => {}, lineTo: () => {}, rotate: () => {}, shadowBlur: 0, shadowColor: '', font: '', fillText: () => {}
        }),
        innerText: '',
        style: {}
    })
};

import { Player } from './src/js/classes/player.js';
import { CHARACTERS } from './src/js/constants.js';
import { setTiles, setPlayers, gameState, playerKeys, setEntities, entities } from './src/js/state.js';

gameState.spawnPoint = { x: 100, y: 100 };
gameState.running = true;

const mockTiles = [];
for (let r = 0; r < 60; r++) {
    mockTiles[r] = [];
    for (let c = 0; c < 400; c++) {
        mockTiles[r][c] = { type: 0 };
    }
}
for (let r = 0; r < 60; r++) mockTiles[r][1] = { type: 1 };
setTiles(mockTiles);

const p = new Player(0);
setPlayers([p]);

// TEST 1: FLIGHT
console.log("--- TEST 1: FLIGHT ---");
const flyer = CHARACTERS.find(c => c.trait === 'fly');
p.charData = flyer;
p.stamina = 100;
p.grounded = false;
p.y = 100; p.x = 200;
p.vy = 0;
playerKeys[0] = { ' ': true };

p.update();
console.log(`Flyer '${flyer.name}' - VY: ${p.vy}, Stamina: ${p.stamina}`);
if (p.vy < 0 && p.stamina < 100) console.log("PASS: Flight mechanics verified.");
else console.error("FAIL: Flight mechanics broken.");

// TEST 2: CLIMBING
console.log("\n--- TEST 2: CLIMBING ---");
const climber = CHARACTERS.find(c => c.trait === 'climb');
p.charData = climber;
p.grounded = false;
p.x = 14; // Right edge at 38 (x+w). Wall at 40.
p.y = 100;
p.vy = 5;
p.vx = 5;
playerKeys[0] = { 'arrowright': true }; // Press into wall
// Force checkWall logic test manually if needed, but update() calls it.

p.update();
console.log(`Climber '${climber.name}' - VY: ${p.vy}, X: ${p.x}`);
if (p.vy === 0) console.log("PASS: Climbing stick verified.");
else console.error("FAIL: Climbing stick broken (vy should be 0).");

// TEST 3: BAZAZE
console.log("\n--- TEST 3: BAZAZE ---");
// Use 'pug' specifically as we know its defaults (w:40, h:4, damage:2) and it should be Buff trait
const buffer = CHARACTERS.find(c => c.id === 'pug');
if (buffer.trait) console.error("FAIL: Pug should be Buff trait but has:", buffer.trait);

p.charData = buffer;
setEntities([]);
// Reset cooldowns
p.shootCooldown = 0;
playerKeys[0] = { 'z': true }; // Shoot key
p.update(); // Should trigger shoot()

const bullet = entities[0];
if (bullet) {
    console.log(`Bullet Stats - W: ${bullet.w}, H: ${bullet.h}, Dmg: ${bullet.damage}`);
    // Expected: 40*1.3=52, 4*1.3=5.2, 2*1.5=3 (ceil)
    if (Math.abs(bullet.w - 52) < 0.01 && Math.abs(bullet.h - 5.2) < 0.01 && bullet.damage === 3) console.log("PASS: Weapon Bazaze verified.");
    else console.error(`FAIL: Weapon Bazaze values incorrect. Got W:${bullet.w}, H:${bullet.h}, Dmg:${bullet.damage}`);
} else {
    // Try forcing shoot directly if update() didn't catch key (due to cooldown or input reading mock)
    console.log("Forcing shoot call...");
    p.shoot(false, false, false);
    const b2 = entities[0];
    if (b2) {
         console.log(`Bullet Stats - W: ${b2.w}, H: ${b2.h}, Dmg: ${b2.damage}`);
         if (Math.abs(b2.w - 52) < 0.01 && Math.abs(b2.h - 5.2) < 0.01 && b2.damage === 3) console.log("PASS: Weapon Bazaze verified.");
         else console.error(`FAIL: Weapon Bazaze values incorrect. Got W:${b2.w}, H:${b2.h}, Dmg:${b2.damage}`);
    } else {
         console.error("FAIL: No bullet spawned.");
    }
}
