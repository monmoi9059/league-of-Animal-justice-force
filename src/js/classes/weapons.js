import { Bullet, MeleeHitbox } from './projectiles.js';
import { entities, gameState } from '../state.js';
import { secureRandom } from '../math.js';
import { spawnExplosion, shakeCamera, spawnDamageNumber } from '../utils.js';
import { soundManager } from '../sound.js';
import { drawRoundedRect } from '../graphics.js';

// --- HELPER FUNCTIONS ---

function createBullet(player, config) {
    // Clone config to prevent mutation of shared objects
    config = { ...config };

    // BUFF LOGIC for non-travelers
    if (!player.charData.trait) {
        // 1. DAMAGE BUFF
        if(config.damage) config.damage = Math.ceil(config.damage * 1.5);

        // 2. SIZE BUFF
        if(config.w) config.w *= 1.3; // Slightly reduced from 1.5 for better balance
        if(config.h) config.h *= 1.3;

        // 3. VELOCITY BUFF
        if (config.vx) config.vx *= 1.3;
        if (config.vy) config.vy *= 1.3;

        // Extra Bazaze Visuals
        spawnExplosion(player.x + (player.facing*20), player.y, player.charData.pColor || "white", 1);
        shakeCamera(2);
    }

    config.owner = player; // Set owner for behaviors
    let b = new Bullet(
        player.x + (player.facing > 0 ? player.w : 0),
        player.y + player.h/2 - 5,
        player.facing,
        false,
        config
    );
    entities.push(b);
    return b;
}

function createMelee(player, range, power, height=40, offset=0) {
    // BUFF LOGIC for non-travelers
    if (!player.charData.trait) {
        power = Math.ceil(power * 1.5);
        range *= 1.3;
        height *= 1.3;
        // Extra Bazaze Visuals
        spawnExplosion(player.x + (player.facing*range), player.y, "white", 1);
        shakeCamera(3);
    }

    let hitbox = new MeleeHitbox(
        player.x + (player.facing === 1 ? player.w + offset : -range - offset),
        player.y + (player.h - height)/2,
        range,
        height,
        player,
        power
    );
    entities.push(hitbox);
    return hitbox;
}

function playSound(name) {
    if(soundManager) soundManager.play(name);
}

// --- BEHAVIORS ---

const Behaviors = {
    basic: (speed) => (b) => {
        b.x += b.vx; b.y += b.vy;
    },
    wave: (freq, amp) => (b) => {
        b.x += b.vx;
        b.y += Math.sin(b.x * freq) * amp;
    },
    accelerate: (acc) => (b) => {
        b.vx *= acc;
        b.x += b.vx; b.y += b.vy;
    },
    boomerang: (turnSpeed) => (b) => {
        if (b.returnState === 0) {
            b.x += b.vx; b.vx *= 0.95;
            if (Math.abs(b.vx) < 1) b.returnState = 1;
        } else {
            let p = b.owner;
            if (!p) { b.life = 0; return; }
            let dx = (p.x + p.w/2) - b.x;
            let dy = (p.y + p.h/2) - b.y;
            let angle = Math.atan2(dy, dx);
            b.x += Math.cos(angle) * 15;
            b.y += Math.sin(angle) * 15;
            if (Math.hypot(dx, dy) < 20) b.life = 0;
        }
    },
    homing: (turnRate) => (b) => {
        // Simple homing towards nearest enemy
        let target = null;
        let minDist = 300;
        for(let e of entities) {
            if(e.hp && e.hp > 0 && e !== b.owner && e !== b) {
                let d = Math.hypot(e.x - b.x, e.y - b.y);
                if(d < minDist) { minDist = d; target = e; }
            }
        }
        if(target) {
            let angle = Math.atan2(target.y - b.y, target.x - b.x);
            b.vx += Math.cos(angle) * turnRate;
            b.vy += Math.sin(angle) * turnRate;
            // Cap speed?
            let speed = Math.hypot(b.vx, b.vy);
            if(speed > 15) { b.vx = (b.vx/speed)*15; b.vy = (b.vy/speed)*15; }
        }
        b.x += b.vx; b.y += b.vy;
    }
};

const Renderers = {
    circle: (color, radius) => (ctx, b, cx, cy, now) => {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(cx + b.w/2, cy + b.h/2, radius, 0, Math.PI*2); ctx.fill();
    },
    rect: (color) => (ctx, b, cx, cy, now) => {
        ctx.fillStyle = color;
        ctx.fillRect(cx, cy, b.w, b.h);
    },
    laser: (color) => (ctx, b, cx, cy, now) => {
        ctx.fillStyle = color;
        ctx.shadowBlur = 10; ctx.shadowColor = color;
        ctx.fillRect(cx, cy, b.w, b.h);
        ctx.shadowBlur = 0;
    },
    star: (color) => (ctx, b, cx, cy, now) => {
        ctx.save();
        ctx.translate(cx + b.w/2, cy + b.h/2);
        ctx.rotate(now * 0.1);
        ctx.fillStyle = color;
        ctx.beginPath();
        for(let i=0; i<5; i++) {
            ctx.lineTo(Math.cos((18+i*72)/180*Math.PI)*10, -Math.sin((18+i*72)/180*Math.PI)*10);
            ctx.lineTo(Math.cos((54+i*72)/180*Math.PI)*5, -Math.sin((54+i*72)/180*Math.PI)*5);
        }
        ctx.fill();
        ctx.restore();
    },
    note: (color) => (ctx, b, cx, cy, now) => {
        ctx.fillStyle = color;
        ctx.font = "20px Arial";
        ctx.fillText("♪", cx, cy + 15);
    }
};

// --- WEAPON REGISTRY ---

export const WEAPONS = {
    // 1. Pug - Laser Eyes
    'pug': {
        shoot: (p) => {
            playSound('shoot');
            createBullet(p, { pColor: '#f00', vx: p.facing * 25, w: 40, h: 4, damage: 2, renderer: Renderers.laser('red') });
        },
        special: (p) => {
            playSound('shoot');
            // Giant Laser
            createBullet(p, { pColor: '#f00', vx: p.facing * 30, w: 400, h: 20, damage: 10, life: 10, renderer: Renderers.laser('#ffaaaa') });
            shakeCamera(5);
        }
    },
    // 2. Raccoon - Trash Lid Boomerang
    'raccoon': {
        shoot: (p) => {
            playSound('throw');
            createBullet(p, {
                vx: p.facing * 15, w: 20, h: 20, life: 100, damage: 2,
                behavior: Behaviors.boomerang(1),
                renderer: (ctx, b, cx, cy, now) => {
                    ctx.save(); ctx.translate(cx+10, cy+10); ctx.rotate(now*0.3);
                    ctx.fillStyle = "#888"; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
                    ctx.fillStyle = "#555"; ctx.beginPath(); ctx.arc(0,0,3,0,Math.PI*2); ctx.fill();
                    ctx.restore();
                }
            });
        },
        special: (p) => {
            // Dumpster Drop
            let b = createBullet(p, { vx: p.facing * 5, vy: -5, w: 40, h: 40, damage: 10 });
            b.type = 'grenade'; // Uses gravity
        }
    },
    // 3. Cat - Claw Swipe / Hairball
    'cat': {
        shoot: (p) => {
             createMelee(p, 50, 2);
             playSound('hit');
        },
        special: (p) => {
             // Giant Hairball
             createBullet(p, { vx: p.facing * 10, vy: -2, w: 30, h: 30, damage: 5, type: 'grenade', renderer: Renderers.circle('#5d4037', 15) });
        }
    },
    // 4. Corgi - Lightning Hammer
    'corgi': {
        shoot: (p) => {
             // Throw Hammer
             createBullet(p, {
                 vx: p.facing * 18, w: 20, h: 20, damage: 3,
                 behavior: Behaviors.boomerang(1),
                 renderer: (ctx, b, cx, cy, now) => {
                     ctx.fillStyle = "#ccc"; ctx.fillRect(cx, cy, 15, 10); ctx.fillStyle = "#855e42"; ctx.fillRect(cx+5, cy+10, 5, 10);
                 }
             });
        },
        special: (p) => {
             // Thunder Strike
             for(let i=0; i<5; i++) {
                 createBullet(p, { x: p.x + (i*40 - 80), y: p.y - 200, vx: 0, vy: 30, w: 10, h: 200, damage: 8, renderer: Renderers.laser('cyan') });
             }
             shakeCamera(10);
        }
    },
    // 5. Hulk Poodle - Smash
    'hulk': {
        shoot: (p) => {
             createMelee(p, 60, 4);
             shakeCamera(2);
        },
        special: (p) => {
             // Gamma Clap
             let shockwave = createBullet(p, { vx: p.facing * 10, w: 100, h: 100, damage: 5, life: 20, renderer: Renderers.circle('rgba(0,255,0,0.5)', 50) });
             shockwave.vx = p.facing * 5;
             shakeCamera(10);
        }
    },
    // 6. Spider-Pig - Web Shot
    'spider': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 1, renderer: Renderers.circle('white', 5) });
        },
        special: (p) => {
             // Web Spread
             for(let i=-2; i<=2; i++) {
                 createBullet(p, { vx: p.facing * 15, vy: i*2, w: 10, h: 10, damage: 2, renderer: Renderers.circle('white', 5) });
             }
        }
    },
    // 7. Wolvie - Claws
    'wolvie': {
        shoot: (p) => {
             createMelee(p, 40, 3, 20);
        },
        special: (p) => {
             // Berserker Barrage
             p.vx = p.facing * 15;
             createMelee(p, 80, 5, 40);
        }
    },
    // 8. Dead-Poodle - Dual Pistols
    'dead': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 20, w: 5, h: 5, damage: 2, renderer: Renderers.rect('yellow') });
             setTimeout(() => createBullet(p, { vx: p.facing * 20, w: 5, h: 5, damage: 2, renderer: Renderers.rect('yellow') }), 100);
        },
        special: (p) => {
             // Grenade Toss
             createBullet(p, { vx: p.facing * 10, vy: -8, w: 15, h: 15, damage: 10, type: 'grenade' });
        }
    },
    // 9. Captain Eagle - Shield
    'cap': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 15, w: 20, h: 20, damage: 3, behavior: Behaviors.boomerang(1), renderer: Renderers.circle('blue', 10) });
        },
        special: (p) => {
             // Shield Dash
             p.invincible = 60;
             p.vx = p.facing * 20;
             createMelee(p, 60, 5);
        }
    },
    // 10. Iron Mouse - Repulsors
    'ironmouse': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 20, w: 10, h: 4, damage: 2, renderer: Renderers.laser('yellow') });
        },
        special: (p) => {
             // Unibeam
             createBullet(p, { vx: p.facing * 30, w: 200, h: 30, damage: 15, renderer: Renderers.laser('white') });
        }
    },
    // 11. Black Widow Pug - Stun Baton
    'widow': {
        shoot: (p) => {
             createMelee(p, 40, 2);
        },
        special: (p) => {
             // Electric Shock
             createBullet(p, { vx: p.facing * 25, w: 50, h: 50, damage: 6, renderer: Renderers.circle('cyan', 20) });
        }
    },
    // 12. Hawk Hedgehog - Arrows
    'hawkeye': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 25, w: 20, h: 3, damage: 3, renderer: Renderers.rect('purple') });
        },
        special: (p) => {
             // Explosive Arrow
             let b = createBullet(p, { vx: p.facing * 20, w: 20, h: 5, damage: 10, type: 'rocket' });
        }
    },
    // 13. Dr Strange Cat - Magic
    'strange': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 10, w: 15, h: 15, damage: 3, behavior: Behaviors.wave(0.1, 5), renderer: Renderers.star('orange') });
        },
        special: (p) => {
             // Portal? Just big magic blast
             createBullet(p, { vx: p.facing * 5, w: 60, h: 60, damage: 8, life: 100, renderer: Renderers.circle('orange', 30) });
        }
    },
    // 14. Black Panther - Claws + Kinetic
    'panther': {
        shoot: (p) => {
             createMelee(p, 40, 3);
        },
        special: (p) => {
             // Kinetic Burst
             createBullet(p, { vx: 0, vy: 0, w: 100, h: 100, damage: 10, life: 10, renderer: Renderers.circle('purple', 50) });
        }
    },
    // 15. Ant-Eater-Man - Shrink/Grow
    'ant': {
        shoot: (p) => {
             createMelee(p, 30, 2);
        },
        special: (p) => {
             // Grow Giant
             p.invincible = 60;
             shakeCamera(5);
             createMelee(p, 100, 10); // Giant hit
        }
    },
    // 16. Star-Lord Fox - Element Guns
    'starlord': {
        shoot: (p) => {
             let element = Math.random() < 0.5 ? 'red' : 'yellow';
             createBullet(p, { vx: p.facing * 20, w: 8, h: 8, damage: 3, renderer: Renderers.circle(element, 4) });
        },
        special: (p) => {
             // Gravity Mine
             createBullet(p, { vx: p.facing * 10, vy: -5, w: 20, h: 20, damage: 8, type: 'grenade', renderer: Renderers.circle('purple', 10) });
        }
    },
    // 17. Gamora Gecko - Sword
    'gamora': {
        shoot: (p) => {
             createMelee(p, 50, 4);
        },
        special: (p) => {
             // Assassin Strike
             p.x += p.facing * 100; // Teleport dash
             createMelee(p, 60, 8);
        }
    },
    // 18. Drax Bulldog - Knives
    'drax': {
        shoot: (p) => {
             createMelee(p, 40, 4);
        },
        special: (p) => {
             // Double Knife Throw
             createBullet(p, { vx: p.facing * 20, vy: -2, w: 15, h: 5, damage: 5, renderer: Renderers.rect('grey') });
             createBullet(p, { vx: p.facing * 20, vy: 2, w: 15, h: 5, damage: 5, renderer: Renderers.rect('grey') });
        }
    },
    // 19. Groot Bark - Roots
    'groot': {
        shoot: (p) => {
             createMelee(p, 60, 3);
        },
        special: (p) => {
             // Branch Extend
             createBullet(p, { vx: p.facing * 15, w: 100, h: 10, damage: 6, life: 20, renderer: Renderers.rect('brown') });
        }
    },
    // 20. Rocket Rabbit - Big Guns
    'rocket': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 4, renderer: Renderers.laser('orange') });
        },
        special: (p) => {
             // Rocket Launcher
             createBullet(p, { vx: p.facing * 15, w: 20, h: 10, damage: 15, type: 'rocket' });
        }
    },
    // 21. Vision Zebra - Beam
    'vision': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 25, w: 30, h: 5, damage: 4, renderer: Renderers.laser('yellow') });
        },
        special: (p) => {
             // Phase Density
             p.invincible = 60;
             createMelee(p, 50, 8);
        }
    },
    // 22. Scarlet Skunk - Hex Magic
    'scarlet': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 12, w: 15, h: 15, damage: 4, behavior: Behaviors.homing(1), renderer: Renderers.circle('red', 8) });
        },
        special: (p) => {
             // Reality Warping (Screen Nuke)
             for(let i=0; i<10; i++) {
                 let b = createBullet(p, { vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20, w: 20, h: 20, damage: 5, renderer: Renderers.circle('red', 10) });
             }
        }
    },
    // 23. Quick Cheetah - Speed
    'quick': {
        shoot: (p) => {
             // Rapid punches
             createMelee(p, 30, 1);
             setTimeout(() => createMelee(p, 30, 1), 100);
        },
        special: (p) => {
             // Dash Attack
             p.vx = p.facing * 30;
             createMelee(p, 100, 5);
        }
    },
    // 24. Winter Wolf - Rifle
    'winter': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 25, w: 10, h: 5, damage: 4, renderer: Renderers.rect('grey') });
        },
        special: (p) => {
             // Metal Arm Punch
             createMelee(p, 50, 10);
             shakeCamera(5);
        }
    },
    // 25. Falcon Pigeon - Wings
    'falcon': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 20, w: 8, h: 8, damage: 3, renderer: Renderers.rect('red') });
        },
        special: (p) => {
             // Drone Strike
             createBullet(p, { x: p.x + 100 * p.facing, y: p.y - 100, vx: 0, vy: 10, w: 20, h: 20, damage: 8, renderer: Renderers.circle('grey', 10) });
        }
    },
    // 26. War Rhino - Heavy Weapons
    'war': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 20, w: 12, h: 12, damage: 5, renderer: Renderers.rect('grey') });
        },
        special: (p) => {
             // Shoulder Cannon
             createBullet(p, { vx: p.facing * 15, vy: -2, w: 15, h: 15, damage: 12, type: 'rocket' });
        }
    },
    // 27. Daredevil Dog - Billy Club
    'dare': {
        shoot: (p) => {
             createMelee(p, 40, 3);
        },
        special: (p) => {
             // Radar Sense (Hit everything around)
             createBullet(p, { vx: 0, vy: 0, w: 100, h: 100, damage: 5, life: 5, renderer: Renderers.circle('red', 50) });
        }
    },
    // 28. Punisher Penguin - Guns
    'punish': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 22, w: 6, h: 6, damage: 3, renderer: Renderers.rect('white') });
        },
        special: (p) => {
             // Grenade Launcher
             createBullet(p, { vx: p.facing * 12, vy: -5, w: 12, h: 12, damage: 10, type: 'grenade' });
        }
    },
    // 29. Shang-Chi Panda - Martial Arts
    'shang': {
        shoot: (p) => {
             createMelee(p, 40, 3);
        },
        special: (p) => {
             // Ten Rings Blast
             createBullet(p, { vx: p.facing * 20, w: 30, h: 30, damage: 8, renderer: Renderers.circle('gold', 15) });
        }
    },
    // 30. Eternal Elephant - Cosmic Energy
    'eternal': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 18, w: 15, h: 15, damage: 4, renderer: Renderers.circle('gold', 8) });
        },
        special: (p) => {
             // Cosmic Stomp
             createMelee(p, 80, 8);
             shakeCamera(5);
        }
    },
    // 31. Moon Owl - Moonerang
    'moon': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 15, w: 15, h: 15, damage: 3, behavior: Behaviors.boomerang(1), renderer: Renderers.circle('white', 8) });
        },
        special: (p) => {
             // Cape Glider Attack
             p.vy = -5;
             createMelee(p, 50, 5);
        }
    },
    // 32. She-Hulk Hamster - Smash
    'shehulk': {
        shoot: (p) => {
             createMelee(p, 50, 4);
        },
        special: (p) => {
             // Ground Pound
             p.vy = 20;
             createBullet(p, { vx: 0, vy: 0, w: 100, h: 40, damage: 8, life: 10, renderer: Renderers.rect('green') });
        }
    },
    // 33. Ghost Goat - Chain
    'ghost': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 20, w: 40, h: 5, damage: 4, renderer: Renderers.rect('orange') });
        },
        special: (p) => {
             // Hellfire
             for(let i=0; i<3; i++) {
                 createBullet(p, { vx: p.facing * 15, vy: (i-1)*5, w: 20, h: 20, damage: 6, renderer: Renderers.circle('orange', 10) });
             }
        }
    },
    // 34. Unicorn Cyborg - Laser Horn
    'unicorncyborg': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 30, w: 40, h: 5, damage: 5, renderer: Renderers.laser('pink') });
        },
        special: (p) => {
             // Rainbow Blast
             for(let i=0; i<5; i++) {
                 createBullet(p, { vx: p.facing * 20, vy: (i-2)*3, w: 10, h: 10, damage: 4, renderer: Renderers.rect(['red','orange','yellow','green','blue'][i]) });
             }
        }
    },
    // 35. Creature Hedgehog - Spines
    'creaturehedgehog': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 20, w: 10, h: 4, damage: 3, renderer: Renderers.rect('green') });
        },
        special: (p) => {
             // Spine Burst
             for(let i=0; i<8; i++) {
                 let angle = i * (Math.PI/4);
                 createBullet(p, { vx: Math.cos(angle)*15, vy: Math.sin(angle)*15, w: 10, h: 4, damage: 4, renderer: Renderers.rect('green') });
             }
        }
    },
    // 36. Store Stump - Log Roll
    'storestump': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 10, vy: 0, w: 20, h: 20, damage: 4, type: 'grenade', renderer: Renderers.circle('brown', 10) });
        },
        special: (p) => {
             // Big Log
             createBullet(p, { vx: p.facing * 12, w: 40, h: 20, damage: 10, renderer: Renderers.rect('brown') });
        }
    },
    // 37. Galaxy God - Star Throw
    'galaxygod': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 20, w: 15, h: 15, damage: 5, renderer: Renderers.star('yellow') });
        },
        special: (p) => {
             // Black Hole
             createBullet(p, { vx: p.facing * 5, w: 40, h: 40, damage: 1, life: 100, renderer: Renderers.circle('black', 20) });
             // Todo: Pull enemies? Simplified for now.
        }
    },
    // 38. Wraith House - Poltergeist
    'wraithhouse': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 15, w: 20, h: 20, damage: 4, renderer: Renderers.circle('rgba(255,255,255,0.5)', 10) });
        },
        special: (p) => {
             // Spook Scream
             createBullet(p, { vx: p.facing * 10, w: 10, h: 40, damage: 8, life: 30, renderer: Renderers.rect('white'), type: 'sonic_wave' });
        }
    },
    // 39. Ninja Kangaroo - Kick
    'ninjakangaroo': {
        shoot: (p) => {
             createMelee(p, 50, 4);
        },
        special: (p) => {
             // Shuriken Storm
             for(let i=0; i<3; i++) {
                 createBullet(p, { vx: p.facing * 20, vy: (i-1)*5, w: 15, h: 15, damage: 3, type: 'shuriken' });
             }
        }
    },
    // 40. Devil Castle - Fire Breath
    'devilcastle': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 15, w: 20, h: 20, damage: 4, type: 'fireball' });
        },
        special: (p) => {
             // Gate Crush
             createBullet(p, { vx: 0, vy: 10, w: 40, h: 60, damage: 10, renderer: Renderers.rect('grey') });
        }
    },
    // 41. Aqua Alpaca - Spit
    'aquaalpaca': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 15, w: 10, h: 10, damage: 3, renderer: Renderers.circle('cyan', 5) });
        },
        special: (p) => {
             // Tsunami
             createBullet(p, { vx: p.facing * 10, w: 40, h: 40, damage: 8, life: 40, renderer: Renderers.circle('blue', 20) });
        }
    },
    // 42. Makeup Gate - Powder Puff
    'makeupgate': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 12, w: 20, h: 20, damage: 2, renderer: Renderers.circle('pink', 10) });
        },
        special: (p) => {
             // Mirror Reflection (Shield)
             createMelee(p, 60, 5);
        }
    },
    // 43. Alien Boulder - Roll
    'alienboulder': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 15, w: 20, h: 20, damage: 5, renderer: Renderers.circle('grey', 10) });
        },
        special: (p) => {
             // Meteor
             createBullet(p, { vx: p.facing * 10, vy: 10, w: 30, h: 30, damage: 10, renderer: Renderers.circle('green', 15) });
        }
    },
    // 44. Skeleton Ram - Bone Throw
    'skeletonram': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 15, vy: -5, w: 20, h: 10, damage: 3, type: 'grenade', renderer: Renderers.rect('white') });
        },
        special: (p) => {
             // Headbutt Charge
             p.vx = p.facing * 20;
             createMelee(p, 60, 8);
        }
    },
    // 45. Aquarium Forest - Water Gun
    'aquariumforest': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('blue', 5) });
        },
        special: (p) => {
             // Fish Summon
             createBullet(p, { vx: p.facing * 15, vy: (Math.random()-0.5)*5, w: 20, h: 10, damage: 6, renderer: Renderers.rect('orange') });
        }
    },
    // 46. Dark Log - Spikes
    'darklog': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 15, w: 20, h: 10, damage: 4, renderer: Renderers.rect('black') });
        },
        special: (p) => {
             // Rot Gas
             createBullet(p, { vx: p.facing * 5, w: 60, h: 60, damage: 2, life: 60, renderer: Renderers.circle('rgba(0,0,0,0.5)', 30) });
        }
    },
    // 47. Factory Skeleton - Wrench
    'factoryskeleton': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 15, w: 20, h: 10, damage: 4, behavior: Behaviors.boomerang(1), renderer: Renderers.rect('grey') });
        },
        special: (p) => {
             // Gear Grinder
             createBullet(p, { vx: p.facing * 10, w: 30, h: 30, damage: 8, life: 40, renderer: Renderers.circle('grey', 15) });
        }
    },
    // 48. Defender Roof - Shingle Shot
    'defenderroof': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 20, w: 15, h: 5, damage: 3, renderer: Renderers.rect('brown') });
        },
        special: (p) => {
             // Collapse
             createBullet(p, { vx: 0, vy: 10, w: 80, h: 20, damage: 10, renderer: Renderers.rect('brown') });
        }
    },
    // 49. Robber Eagle - Coin Bag
    'robbereagle': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 15, w: 15, h: 15, damage: 3, renderer: Renderers.circle('gold', 8) });
        },
        special: (p) => {
             // Dive Bomb
             p.vy = 20;
             createMelee(p, 40, 8);
        }
    },
    // 50. Professor Skunk - Chemical Beaker
    'professorskunk': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 12, vy: -5, w: 10, h: 10, damage: 5, type: 'grenade', renderer: Renderers.circle('green', 5) });
        },
        special: (p) => {
             // Gas Cloud
             createBullet(p, { vx: 0, vy: 0, w: 100, h: 50, damage: 1, life: 100, renderer: Renderers.circle('rgba(0,255,0,0.3)', 40) });
        }
    },
    // 51. Earth Buffalo - Rock Throw
    'earthbuffalo': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 15, w: 20, h: 20, damage: 5, renderer: Renderers.circle('brown', 10) });
        },
        special: (p) => {
             // Quake
             shakeCamera(10);
             createMelee(p, 100, 5);
        }
    },
    // 52. Ogre Guinea - Club
    'ogreguinea': {
        shoot: (p) => {
             createMelee(p, 50, 4);
        },
        special: (p) => {
             // Boulder Toss
             createBullet(p, { vx: p.facing * 12, vy: -5, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('grey', 15) });
        }
    },
    // 53. Artist Alien - Paint Gun
    'artistalien': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle(['red','blue','green'][Math.floor(Math.random()*3)], 5) });
        },
        special: (p) => {
             // Splatter
             for(let i=0; i<5; i++) {
                 createBullet(p, { vx: p.facing*15, vy: (Math.random()-0.5)*10, w: 15, h: 15, damage: 4, renderer: Renderers.circle('purple', 8) });
             }
        }
    },
    // 54. Fire Donkey - Kick
    'firedonkey': {
        shoot: (p) => {
             createMelee(p, 40, 3);
        },
        special: (p) => {
             // Fire Breath
             for(let i=0; i<3; i++) {
                 createBullet(p, { vx: p.facing*15, vy: (i-1)*2, w: 20, h: 20, damage: 5, type: 'fireball' });
             }
        }
    },
    // 55. Fighter Hawk - Missile
    'fighterhawk': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 25, w: 15, h: 5, damage: 4, renderer: Renderers.rect('grey') });
        },
        special: (p) => {
             // Air Strike
             createBullet(p, { vx: p.facing*10, vy: 5, w: 20, h: 10, damage: 10, type: 'rocket' });
        }
    },
    // 56. Troll Peacock - Fan
    'trollpeacock': {
        shoot: (p) => {
             // Spread shot
             for(let i=-1; i<=1; i++) {
                 createBullet(p, { vx: p.facing*15, vy: i*5, w: 10, h: 10, damage: 2, renderer: Renderers.circle('purple', 5) });
             }
        },
        special: (p) => {
             // Hypnosis? Stun
             createBullet(p, { vx: p.facing*10, w: 50, h: 50, damage: 1, life: 60, renderer: Renderers.circle('pink', 25) });
        }
    },
    // 57. Detective Monkey - Magnifying Glass
    'detectivemonkey': {
        shoot: (p) => {
             createMelee(p, 40, 3);
        },
        special: (p) => {
             // Sun Beam
             createBullet(p, { vx: p.facing*30, w: 50, h: 5, damage: 6, renderer: Renderers.laser('yellow') });
        }
    },
    // 58. Home Lizard - Tongue
    'homelizard': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*20, w: 30, h: 5, damage: 3, life: 10, renderer: Renderers.rect('pink') });
        },
        special: (p) => {
             // Camouflage
             p.invincible = 60;
        }
    },
    // 59. Headsman Shark - Axe
    'headsmanshark': {
        shoot: (p) => {
             createMelee(p, 50, 5);
        },
        special: (p) => {
             // Axe Throw
             createBullet(p, { vx: p.facing*15, w: 30, h: 30, damage: 8, behavior: Behaviors.boomerang(1), renderer: Renderers.rect('grey') });
        }
    },
    // 60. Cafe Raven - Coffee Pot
    'caferaven': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*15, w: 15, h: 15, damage: 3, renderer: Renderers.rect('black') });
        },
        special: (p) => {
             // Hot Coffee Splash
             for(let i=0; i<5; i++) {
                 createBullet(p, { vx: p.facing*10 + (Math.random()*5), vy: -5, w: 5, h: 5, damage: 2, type: 'grenade', renderer: Renderers.circle('brown', 3) });
             }
        }
    },
    // 61. Phoenix Demon - Fire
    'phoenixdemon': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*18, w: 20, h: 10, damage: 4, type: 'fireball' });
        },
        special: (p) => {
             // Rebirth Blast
             createBullet(p, { vx: 0, vy: 0, w: 100, h: 100, damage: 10, life: 20, renderer: Renderers.circle('orange', 50) });
             p.health = Math.min(p.health+1, 3); // Heal
        }
    },
    // 62. Alien Lion - Roar
    'alienlion': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*15, w: 15, h: 40, damage: 3, type: 'sonic_wave' });
        },
        special: (p) => {
             // Laser Roar
             createBullet(p, { vx: p.facing*25, w: 100, h: 20, damage: 8, renderer: Renderers.laser('cyan') });
        }
    },
    // 63. Painter Villain - Brush
    'paintervillain': {
        shoot: (p) => {
             createMelee(p, 50, 3);
        },
        special: (p) => {
             // Paint Minion (Simplified to projectile)
             createBullet(p, { vx: p.facing*10, w: 30, h: 30, damage: 5, life: 100, renderer: Renderers.circle('red', 15) });
        }
    },
    // 64. Mage Slime - Acid
    'mageslime': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*15, w: 15, h: 15, damage: 3, renderer: Renderers.circle('green', 8) });
        },
        special: (p) => {
             // Split
             createBullet(p, { vx: p.facing*15, vy: -5, w: 10, h: 10, damage: 4, type: 'acid_spit' });
             createBullet(p, { vx: p.facing*15, vy: 5, w: 10, h: 10, damage: 4, type: 'acid_spit' });
        }
    },
    // 65. Journalist Ceiling - Mic Drop
    'journalistceiling': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*15, w: 10, h: 20, damage: 3, renderer: Renderers.rect('black') });
        },
        special: (p) => {
             // Breaking News
             shakeCamera(5);
             createBullet(p, { vx: p.facing*20, w: 60, h: 40, damage: 6, renderer: Renderers.rect('white') });
        }
    },
    // 66. Baker Hamster - Baguette
    'bakerhamster': {
        shoot: (p) => {
             createMelee(p, 50, 3); // Bread smack
        },
        special: (p) => {
             // Hot Pie
             createBullet(p, { vx: p.facing*15, vy: -5, w: 20, h: 10, damage: 8, type: 'grenade', renderer: Renderers.circle('orange', 10) });
        }
    },
    // 67. Zombie Fish - Bite
    'zombiefish': {
        shoot: (p) => {
             createMelee(p, 30, 4);
        },
        special: (p) => {
             // Poison Gas
             createBullet(p, { vx: p.facing*5, w: 50, h: 50, damage: 1, life: 60, renderer: Renderers.circle('green', 25) });
        }
    },
    // 68. Chef Deer - Knife
    'chefdeer': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*20, w: 15, h: 5, damage: 3, renderer: Renderers.rect('silver') });
        },
        special: (p) => {
             // Cleaver Chop
             createMelee(p, 60, 8);
        }
    },
    // 69. Resort Stone - Towel Whip
    'resortstone': {
        shoot: (p) => {
             createMelee(p, 50, 3);
        },
        special: (p) => {
             // Beach Ball
             createBullet(p, { vx: p.facing*10, vy: -5, w: 30, h: 30, damage: 5, type: 'grenade', renderer: Renderers.circle('red', 15) });
        }
    },
    // 70. Hospital Chipmunk - Syringe
    'hospitalchipmunk': {
        shoot: (p) => {
             createMelee(p, 30, 3);
        },
        special: (p) => {
             // Heal / Medpack
             p.health = Math.min(p.health+1, 3);
             spawnDamageNumber(p.x, p.y-20, "HEAL", "green");
        }
    },
    // 71. Mutant Koala - Extra Arm
    'mutantkoala': {
        shoot: (p) => {
             createMelee(p, 40, 4);
        },
        special: (p) => {
             // Radioactive Spit
             createBullet(p, { vx: p.facing*15, w: 15, h: 15, damage: 6, renderer: Renderers.circle('lime', 8) });
        }
    },
    // 72. Director Dirt - Megaphone
    'directordirt': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*15, w: 20, h: 30, damage: 3, type: 'sonic_wave' });
        },
        special: (p) => {
             // Cut!
             shakeCamera(10);
             // Stun enemies logic omitted for simplicity, just damage
             createBullet(p, { vx: 0, vy: 0, w: 200, h: 200, damage: 2, life: 10, renderer: Renderers.rect('rgba(0,0,0,0.5)') });
        }
    },
    // 73. Spectre Bison - Ghost Charge
    'spectrebison': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*15, w: 20, h: 20, damage: 4, renderer: Renderers.circle('white', 10) });
        },
        special: (p) => {
             // Ethereal Dash
             p.invincible = 60;
             p.vx = p.facing * 20;
             createMelee(p, 80, 6);
        }
    },
    // 74. Convict Chicken - Egg
    'convictchicken': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*15, vy: 5, w: 10, h: 10, damage: 3, renderer: Renderers.circle('white', 5) });
        },
        special: (p) => {
             // Jailbreak
             for(let i=0; i<5; i++) {
                 createBullet(p, { vx: (Math.random()-0.5)*20, vy: -10, w: 10, h: 10, damage: 3, type: 'grenade' });
             }
        }
    },
    // 75. Inn Mud - Blob
    'innmud': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*12, w: 20, h: 20, damage: 3, renderer: Renderers.circle('brown', 10) });
        },
        special: (p) => {
             // Mudslide
             createBullet(p, { vx: p.facing*10, w: 60, h: 20, damage: 5, life: 60, renderer: Renderers.rect('brown') });
        }
    },
    // 76. Killer Donkey - Kick
    'killerdonkey': {
        shoot: (p) => {
             createMelee(p, 50, 4);
        },
        special: (p) => {
             // Berserk
             p.vx = p.facing * 25;
             createMelee(p, 60, 8);
        }
    },
    // 77. Professor Kangaroo - Book
    'professorkangaroo': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*15, w: 15, h: 15, damage: 3, renderer: Renderers.rect('blue') });
        },
        special: (p) => {
             // Knowledge Bomb
             createBullet(p, { vx: p.facing*10, vy: -5, w: 30, h: 30, damage: 10, type: 'grenade', renderer: Renderers.rect('blue') });
        }
    },
    // 78. Paramedic Peacock - Defib
    'paramedicpeacock': {
        shoot: (p) => {
             createMelee(p, 30, 4); // Shock
        },
        special: (p) => {
             // Siren Scream
             createBullet(p, { vx: p.facing*15, w: 40, h: 40, damage: 5, type: 'sonic_wave' });
        }
    },
    // 79. Restaurant Wolf - Plate
    'restaurantwolf': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*20, w: 15, h: 5, damage: 3, renderer: Renderers.rect('white') });
        },
        special: (p) => {
             // Waiter Rush
             p.vx = p.facing * 20;
             createMelee(p, 60, 5);
        }
    },
    // 80. Knight Sheep - Lance
    'knightsheep': {
        shoot: (p) => {
             createMelee(p, 60, 4);
        },
        special: (p) => {
             // Joust
             p.vx = p.facing * 25;
             createMelee(p, 80, 8);
        }
    },
    // 81. Ranch Wombat - Shovel
    'ranchwombat': {
        shoot: (p) => {
             createMelee(p, 40, 3);
        },
        special: (p) => {
             // Dig / Rock throw
             createBullet(p, { vx: p.facing*15, vy: -10, w: 20, h: 20, damage: 6, type: 'grenade', renderer: Renderers.circle('grey', 10) });
        }
    },
    // 82. Murderer Forest - Vines
    'murdererforest': {
        shoot: (p) => {
             createMelee(p, 50, 4);
        },
        special: (p) => {
             // Thorns
             for(let i=0; i<3; i++) {
                 createBullet(p, { vx: p.facing*15, vy: (i-1)*5, w: 15, h: 5, damage: 4, renderer: Renderers.rect('green') });
             }
        }
    },
    // 83. Night Llama - Spit
    'nightllama': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*18, w: 10, h: 10, damage: 3, renderer: Renderers.circle('white', 5) });
        },
        special: (p) => {
             // Darkness
             createBullet(p, { vx: p.facing*10, w: 60, h: 60, damage: 5, life: 60, renderer: Renderers.circle('black', 30) });
        }
    },
    // 84. Musician Turkey - Guitar Note
    'musicianturkey': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*15, w: 15, h: 15, damage: 3, renderer: Renderers.note('black') });
        },
        special: (p) => {
             // Power Chord
             createBullet(p, { vx: p.facing*20, w: 50, h: 50, damage: 8, type: 'sonic_wave' });
        }
    },
    // 85. Ooze Crow - Sludge
    'oozecrow': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*15, w: 15, h: 15, damage: 3, renderer: Renderers.circle('purple', 8) });
        },
        special: (p) => {
             // Toxic Rain
             for(let i=0; i<5; i++) {
                 createBullet(p, { vx: (Math.random()-0.5)*10, vy: -10, w: 10, h: 10, damage: 3, type: 'grenade', renderer: Renderers.circle('green', 5) });
             }
        }
    },
    // 86. Lord Blob - Consume
    'lordblob': {
        shoot: (p) => {
             createMelee(p, 40, 5);
        },
        special: (p) => {
             // Giant Slam
             p.vy = -10;
             setTimeout(() => { p.vy = 20; createMelee(p, 80, 10); }, 200);
        }
    },
    // 87. Shadow Panda - Stealth Strike
    'shadowpanda': {
        shoot: (p) => {
             createMelee(p, 40, 4);
        },
        special: (p) => {
             // Shadow Clone
             createBullet(p, { vx: p.facing*20, w: 30, h: 30, damage: 6, renderer: Renderers.rect('black') });
        }
    },
    // 88. Spy Boulder - Silenced Pistol
    'spyboulder': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*25, w: 5, h: 5, damage: 4, renderer: Renderers.rect('black') });
        },
        special: (p) => {
             // Explosive Gadget
             createBullet(p, { vx: p.facing*15, w: 10, h: 10, damage: 10, type: 'grenade', renderer: Renderers.circle('red', 5) });
        }
    },
    // 89. Stylist Earth - Scissors
    'stylistearth': {
        shoot: (p) => {
             createMelee(p, 30, 3);
        },
        special: (p) => {
             // Hair Spray (Stun/Freeze)
             createBullet(p, { vx: p.facing*20, w: 40, h: 40, damage: 2, life: 30, renderer: Renderers.circle('white', 20) });
        }
    },
    // 90. Spa Rock - Hot Stone
    'sparock': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*15, w: 20, h: 10, damage: 3, renderer: Renderers.circle('grey', 10) });
        },
        special: (p) => {
             // Steam Cloud
             createBullet(p, { vx: 0, vy: -2, w: 80, h: 80, damage: 1, life: 100, renderer: Renderers.circle('rgba(255,255,255,0.3)', 40) });
        }
    },
    // 91. Farm Pig - Mud
    'farmpig': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*15, w: 15, h: 15, damage: 3, renderer: Renderers.circle('brown', 8) });
        },
        special: (p) => {
             // Stampede
             p.vx = p.facing * 20;
             createMelee(p, 60, 6);
        }
    },
    // 92. Guard Brick - Shield Bash
    'guardbrick': {
        shoot: (p) => {
             createMelee(p, 30, 3);
        },
        special: (p) => {
             // Wall Up
             createBullet(p, { vx: 0, vy: 0, w: 20, h: 60, damage: 5, life: 100, renderer: Renderers.rect('grey') });
        }
    },
    // 93. Sun Pegasus - Light Beam
    'sunpegasus': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*25, w: 20, h: 5, damage: 4, renderer: Renderers.laser('gold') });
        },
        special: (p) => {
             // Solar Flare
             createBullet(p, { vx: 0, vy: 0, w: 200, h: 200, damage: 10, life: 5, renderer: Renderers.circle('white', 100) });
        }
    },
    // 94. Shop Stone - Receipt
    'shopstone': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*15, w: 10, h: 10, damage: 2, renderer: Renderers.rect('white') });
        },
        special: (p) => {
             // Sale! (Coins)
             for(let i=0; i<5; i++) {
                 createBullet(p, { vx: p.facing*15, vy: 10*(Math.random()-.5), w: 10, h: 10, damage: 3, renderer: Renderers.circle('gold', 5) });
             }
        }
    },
    // 95. Prince Monster - Royal Scepter
    'princemonster': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*18, w: 15, h: 5, damage: 4, renderer: Renderers.laser('purple') });
        },
        special: (p) => {
             // Summon Guard (Projectile)
             createBullet(p, { vx: p.facing*10, w: 20, h: 40, damage: 6, life: 60, renderer: Renderers.rect('grey') });
        }
    },
    // 96. Director Reindeer - Action!
    'directorreindeer': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*20, w: 20, h: 15, damage: 3, renderer: Renderers.rect('black') }); // Clapperboard
        },
        special: (p) => {
             // SFX Explosion
             createBullet(p, { vx: p.facing*15, w: 60, h: 60, damage: 8, type: 'rocket' });
        }
    },
    // 97. Police Croc - Bite
    'policecroc': {
        shoot: (p) => {
             createMelee(p, 50, 5);
        },
        special: (p) => {
             // Handcuffs (Stun projectile)
             createBullet(p, { vx: p.facing*20, w: 20, h: 10, damage: 2, renderer: Renderers.circle('silver', 10) });
        }
    },
    // 98. Composer Frog - Music Note
    'composerfrog': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*15, w: 15, h: 15, damage: 3, renderer: Renderers.note('green') });
        },
        special: (p) => {
             // Symphony
             for(let i=0; i<3; i++) {
                 createBullet(p, { vx: p.facing*15, vy: 3*(i-1), w: 15, h: 15, damage: 4, renderer: Renderers.note('green') });
             }
        }
    },
    // 99. Nun Turtle - Ruler
    'nunturtle': {
        shoot: (p) => {
             createMelee(p, 40, 3);
        },
        special: (p) => {
             // Holy Light
             createBullet(p, { vx: p.facing*20, w: 30, h: 30, damage: 6, renderer: Renderers.circle('yellow', 15) });
        }
    },
    // 100. Home Pumpkin - Seed Spit
    'homepumpkin': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing*15, w: 8, h: 8, damage: 3, renderer: Renderers.circle('orange', 4) });
        },
        special: (p) => {
             // Vine Tangle
             createBullet(p, { vx: p.facing*10, w: 80, h: 20, damage: 5, life: 40, renderer: Renderers.rect('green') });
        }
    }
,
    'willywombat': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#dda0dd', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#dda0dd', 15) });
        }
    },
    'mandalmatian': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 20, h: 20, damage: 3, type: 'fireball' });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 10, w: 60, h: 40, damage: 8, life: 40, type: 'fireball' });
        }
    },
    'kungfupanther': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 25, w: 30, h: 5, damage: 4, renderer: Renderers.laser('#ffd700') });
        },
        special: (p) => {
            createBullet(p, { x: p.x + 100*p.facing, y: p.y - 100, vx: 0, vy: 20, w: 20, h: 200, damage: 10, renderer: Renderers.laser('#ffd700') });
        }
    },
    'minnowion': {
        shoot: (p) => {
            for(let i=-1; i<=1; i++) createBullet(p, { vx: p.facing*15, vy: i*3, w: 8, h: 8, damage: 2, renderer: Renderers.circle('#ffd700', 4) });
        },
        special: (p) => {
            for(let i=-3; i<=3; i++) createBullet(p, { vx: p.facing*15, vy: i*3, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ffd700', 5) });
        }
    },
    'mooana': {
        shoot: (p) => {
            createMelee(p, 50, 4);
        },
        special: (p) => {
            p.vx = p.facing * 20; createMelee(p, 80, 8);
        }
    },
    'batmanatee': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ffff00', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ffff00', 15) });
        }
    },
    'moolan': {
        shoot: (p) => {
            createMelee(p, 50, 4);
        },
        special: (p) => {
            p.vx = p.facing * 20; createMelee(p, 80, 8);
        }
    },
    'yodog': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 15, h: 15, damage: 4, behavior: Behaviors.wave(0.1, 5), renderer: Renderers.star('#00ff00') });
        },
        special: (p) => {
            for(let i=0; i<5; i++) createBullet(p, { vx: p.facing*15, vy: (i-2)*3, w: 15, h: 15, damage: 4, renderer: Renderers.star('#00ff00') });
        }
    },
    'alihen': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 12, w: 15, h: 15, damage: 3, type: 'acid_spit', renderer: Renderers.circle('#00ff00', 8) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 8, w: 50, h: 50, damage: 1, life: 100, renderer: Renderers.circle('#00ff00', 25) });
        }
    },
    'drmanhatcat': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#fff', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#fff', 15) });
        }
    },
    'supermanta': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 25, w: 30, h: 4, damage: 3, renderer: Renderers.laser('#ff0000') });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 30, w: 200, h: 20, damage: 10, renderer: Renderers.laser('#ff0000') });
        }
    },
    'freddycougar': {
        shoot: (p) => {
            createMelee(p, 50, 4);
        },
        special: (p) => {
            p.vx = p.facing * 20; createMelee(p, 80, 8);
        }
    },
    'chewbarka': {
        shoot: (p) => {
            createMelee(p, 50, 4);
        },
        special: (p) => {
            p.vx = p.facing * 20; createMelee(p, 80, 8);
        }
    },
    'eweve': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 25, w: 30, h: 4, damage: 3, renderer: Renderers.laser('#0000ff') });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 30, w: 200, h: 20, damage: 10, renderer: Renderers.laser('#0000ff') });
        }
    },
    'wickedfish': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#00ff00', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#00ff00', 15) });
        }
    },
    'beastbee': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ff0000', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ff0000', 15) });
        }
    },
    'wonderwombat': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ffd700', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ffd700', 15) });
        }
    },
    'woodpecker': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#a52a2a', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#a52a2a', 15) });
        }
    },
    'madcatter': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#da70d6', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#da70d6', 15) });
        }
    },
    'duckula': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ff0000', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ff0000', 15) });
        }
    },
    'stitchostrich': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 25, w: 30, h: 4, damage: 3, renderer: Renderers.laser('#00ff00') });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 30, w: 200, h: 20, damage: 10, renderer: Renderers.laser('#00ff00') });
        }
    },
    'monkeysifu': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#8b4513', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#8b4513', 15) });
        }
    },
    'oompallama': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#8b4513', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#8b4513', 15) });
        }
    },
    'hercowles': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ffd700', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ffd700', 15) });
        }
    },
    'cheshirerat': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#da70d6', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#da70d6', 15) });
        }
    },
    'grub': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 20, h: 5, damage: 3, renderer: Renderers.rect('#add8e6') });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 60, h: 60, damage: 2, life: 60, renderer: Renderers.rect('rgba(200,255,255,0.5)') });
        }
    },
    'lightningmcqueen': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ffff00', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ffff00', 15) });
        }
    },
    'indianabones': {
        shoot: (p) => {
            createMelee(p, 50, 4);
        },
        special: (p) => {
            p.vx = p.facing * 20; createMelee(p, 80, 8);
        }
    },
    'greensparrow': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#00ff00', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#00ff00', 15) });
        }
    },
    'johnlick': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#c0c0c0', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#c0c0c0', 15) });
        }
    },
    'fiony': {
        shoot: (p) => {
            createMelee(p, 50, 4);
        },
        special: (p) => {
            p.vx = p.facing * 20; createMelee(p, 80, 8);
        }
    },
    'neot': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#fff', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#fff', 15) });
        }
    },
    'tinkerbull': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 15, h: 15, damage: 4, behavior: Behaviors.wave(0.1, 5), renderer: Renderers.star('#ffd700') });
        },
        special: (p) => {
            for(let i=0; i<5; i++) createBullet(p, { vx: p.facing*15, vy: (i-2)*3, w: 15, h: 15, damage: 4, renderer: Renderers.star('#ffd700') });
        }
    },
    'snowcrow': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ff0000', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ff0000', 15) });
        }
    },
    'mooshu': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 20, h: 20, damage: 3, type: 'fireball' });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 10, w: 60, h: 40, damage: 8, life: 40, type: 'fireball' });
        }
    },
    'frodobaggins': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#00bfff', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#00bfff', 15) });
        }
    },
    'docbrown': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#00ffff', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#00ffff', 15) });
        }
    },
    'buzzlightbear': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 25, w: 30, h: 4, damage: 3, renderer: Renderers.laser('#ff0000') });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 30, w: 200, h: 20, damage: 10, renderer: Renderers.laser('#ff0000') });
        }
    },
    'matear': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#8b4513', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#8b4513', 15) });
        }
    },
    'doray': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#4169e1', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#4169e1', 15) });
        }
    },
    'totoad': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ff69b4', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ff69b4', 15) });
        }
    },
    'invisibull': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#fff', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#fff', 15) });
        }
    },
    'meowpheus': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#800080', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#800080', 15) });
        }
    },
    'greenlantern': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 25, w: 30, h: 5, damage: 4, renderer: Renderers.laser('#00ff00') });
        },
        special: (p) => {
            createBullet(p, { x: p.x + 100*p.facing, y: p.y - 100, vx: 0, vy: 20, w: 20, h: 200, damage: 10, renderer: Renderers.laser('#00ff00') });
        }
    },
    'lukeskydog': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 25, w: 30, h: 4, damage: 3, renderer: Renderers.laser('#00ff00') });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 30, w: 200, h: 20, damage: 10, renderer: Renderers.laser('#00ff00') });
        }
    },
    'gollum': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#808080', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#808080', 15) });
        }
    },
    'leatherfish': {
        shoot: (p) => {
            createMelee(p, 50, 4);
        },
        special: (p) => {
            p.vx = p.facing * 20; createMelee(p, 80, 8);
        }
    },
    'jasonboarhees': {
        shoot: (p) => {
            createMelee(p, 50, 4);
        },
        special: (p) => {
            p.vx = p.facing * 20; createMelee(p, 80, 8);
        }
    },
    'aquamander': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#00bfff', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#00bfff', 15) });
        }
    },
    'owladdin': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ffd700', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ffd700', 15) });
        }
    },
    'scarecrow': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#f5deb3', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#f5deb3', 15) });
        }
    },
    'dogzilla': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 20, h: 20, damage: 3, type: 'fireball' });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 10, w: 60, h: 40, damage: 8, life: 40, type: 'fireball' });
        }
    },
    'catatouille': {
        shoot: (p) => {
            createMelee(p, 50, 4);
        },
        special: (p) => {
            p.vx = p.facing * 20; createMelee(p, 80, 8);
        }
    },
    'predatoad': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#00ffff', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#00ffff', 15) });
        }
    },
    'peterprawn': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 15, h: 15, damage: 4, behavior: Behaviors.wave(0.1, 5), renderer: Renderers.star('#ffd700') });
        },
        special: (p) => {
            for(let i=0; i<5; i++) createBullet(p, { vx: p.facing*15, vy: (i-2)*3, w: 15, h: 15, damage: 4, renderer: Renderers.star('#ffd700') });
        }
    },
    'lyin': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ffd700', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ffd700', 15) });
        }
    },
    'arielbird': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#c0c0c0', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#c0c0c0', 15) });
        }
    },
    'edwardscissorclaws': {
        shoot: (p) => {
            createMelee(p, 50, 4);
        },
        special: (p) => {
            p.vx = p.facing * 20; createMelee(p, 80, 8);
        }
    },
    'ursulabear': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 12, w: 15, h: 15, damage: 3, type: 'acid_spit', renderer: Renderers.circle('#800080', 8) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 8, w: 50, h: 50, damage: 1, life: 100, renderer: Renderers.circle('#800080', 25) });
        }
    },
    'captainhaddock': {
        shoot: (p) => {
            createMelee(p, 50, 4);
        },
        special: (p) => {
            p.vx = p.facing * 20; createMelee(p, 80, 8);
        }
    },
    'tarantula': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#006400', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#006400', 15) });
        }
    },
    'agentsniff': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#fff', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#fff', 15) });
        }
    },
    'mumbee': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#fff', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#fff', 15) });
        }
    },
    'michaelmeowers': {
        shoot: (p) => {
            createMelee(p, 50, 4);
        },
        special: (p) => {
            p.vx = p.facing * 20; createMelee(p, 80, 8);
        }
    },
    'dogothy': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#deb887', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#deb887', 15) });
        }
    },
    'et': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ffd700', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ffd700', 15) });
        }
    },
    'hairyotter': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 15, h: 15, damage: 4, behavior: Behaviors.wave(0.1, 5), renderer: Renderers.star('#ff0000') });
        },
        special: (p) => {
            for(let i=0; i<5; i++) createBullet(p, { vx: p.facing*15, vy: (i-2)*3, w: 15, h: 15, damage: 4, renderer: Renderers.star('#ff0000') });
        }
    },
    'pinhead': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#c0c0c0', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#c0c0c0', 15) });
        }
    },
    'glinduck': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ffc0cb', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ffc0cb', 15) });
        }
    },
    'rambo': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ffd700', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ffd700', 15) });
        }
    },
    'beetlegoose': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#00ff00', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#00ff00', 15) });
        }
    },
    'princessleia': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 25, w: 30, h: 4, damage: 3, renderer: Renderers.laser('#0000ff') });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 30, w: 200, h: 20, damage: 10, renderer: Renderers.laser('#0000ff') });
        }
    },
    'ghostfish': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#fff', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#fff', 15) });
        }
    },
    'darthvadehound': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 25, w: 30, h: 4, damage: 3, renderer: Renderers.laser('#ff0000') });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 30, w: 200, h: 20, damage: 10, renderer: Renderers.laser('#ff0000') });
        }
    },
    'eelsad': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#e0ffff', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#e0ffff', 15) });
        }
    },
    'incrabible': {
        shoot: (p) => {
            createMelee(p, 50, 4);
        },
        special: (p) => {
            p.vx = p.facing * 20; createMelee(p, 80, 8);
        }
    },
    'pennywise': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ff0000', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ff0000', 15) });
        }
    },
    'grinchfinch': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 20, h: 10, damage: 5, type: 'rocket', renderer: Renderers.rect('#ff0000') });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 40, h: 20, damage: 12, type: 'rocket', renderer: Renderers.rect('#ff0000') });
        }
    },
    'pussinboats': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#c0c0c0', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#c0c0c0', 15) });
        }
    },
    'hantoad': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 25, w: 30, h: 4, damage: 3, renderer: Renderers.laser('#ff0000') });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 30, w: 200, h: 20, damage: 10, renderer: Renderers.laser('#ff0000') });
        }
    },
    'tinram': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#000', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#000', 15) });
        }
    },
    'rockybalboa': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ff0000', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ff0000', 15) });
        }
    },
    'whalee': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 20, h: 10, damage: 5, type: 'rocket', renderer: Renderers.rect('#8b4513') });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 40, h: 20, damage: 12, type: 'rocket', renderer: Renderers.rect('#8b4513') });
        }
    },
    'hanniball': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#a52a2a', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#a52a2a', 15) });
        }
    },
    'gandalfthegreyhound': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 15, h: 15, damage: 4, behavior: Behaviors.wave(0.1, 5), renderer: Renderers.star('#fff') });
        },
        special: (p) => {
            for(let i=0; i<5; i++) createBullet(p, { vx: p.facing*15, vy: (i-2)*3, w: 15, h: 15, damage: 4, renderer: Renderers.star('#fff') });
        }
    },
    'jamespond': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#c0c0c0', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#c0c0c0', 15) });
        }
    },
    'jafrog': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ffd700', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ffd700', 15) });
        }
    },
    'simbasheep': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ffd700', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ffd700', 15) });
        }
    },
    'martymcfly': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ff69b4', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ff69b4', 15) });
        }
    },
    'queenofharts': {
        shoot: (p) => {
            for(let i=-1; i<=1; i++) createBullet(p, { vx: p.facing*15, vy: i*3, w: 8, h: 8, damage: 2, renderer: Renderers.circle('#ff0000', 4) });
        },
        special: (p) => {
            for(let i=-3; i<=3; i++) createBullet(p, { vx: p.facing*15, vy: i*3, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ff0000', 5) });
        }
    },
    'shrewk': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 12, w: 15, h: 15, damage: 3, type: 'acid_spit', renderer: Renderers.circle('#32cd32', 8) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 8, w: 50, h: 50, damage: 1, life: 100, renderer: Renderers.circle('#32cd32', 25) });
        }
    },
    'mrtomatohead': {
        shoot: (p) => {
            for(let i=-1; i<=1; i++) createBullet(p, { vx: p.facing*15, vy: i*3, w: 8, h: 8, damage: 2, renderer: Renderers.circle('#fff', 4) });
        },
        special: (p) => {
            for(let i=-3; i<=3; i++) createBullet(p, { vx: p.facing*15, vy: i*3, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#fff', 5) });
        }
    },
    'chucky': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#c0c0c0', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#c0c0c0', 15) });
        }
    },
    'terminator': {
        shoot: (p) => {
            for(let i=-1; i<=1; i++) createBullet(p, { vx: p.facing*15, vy: i*3, w: 8, h: 8, damage: 2, renderer: Renderers.circle('#ff0000', 4) });
        },
        special: (p) => {
            for(let i=-3; i<=3; i++) createBullet(p, { vx: p.facing*15, vy: i*3, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ff0000', 5) });
        }
    },
    'cyboar': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#00ffff', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#00ffff', 15) });
        }
    },
    'shalamb': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 25, w: 30, h: 5, damage: 4, renderer: Renderers.laser('#ffd700') });
        },
        special: (p) => {
            createBullet(p, { x: p.x + 100*p.facing, y: p.y - 100, vx: 0, vy: 20, w: 20, h: 200, damage: 10, renderer: Renderers.laser('#ffd700') });
        }
    },
    'owlaf': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 20, h: 5, damage: 3, renderer: Renderers.rect('#fff') });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 60, h: 60, damage: 2, life: 60, renderer: Renderers.rect('rgba(200,255,255,0.5)') });
        }
    },
    'genieguinea': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#00bfff', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#00bfff', 15) });
        }
    },
    'flashfish': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ffd700', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ffd700', 15) });
        }
    },
    'trinibee': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#fff', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#fff', 15) });
        }
    },
    'pup': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ff0000', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ff0000', 15) });
        }
    },
    'wolfclam': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#fff', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#fff', 15) });
        }
    },
    'stormgrouper': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 25, w: 30, h: 4, damage: 3, renderer: Renderers.laser('#ff0000') });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 30, w: 200, h: 20, damage: 10, renderer: Renderers.laser('#ff0000') });
        }
    },
    'frankenswine': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#c0c0c0', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#c0c0c0', 15) });
        }
    },
    'sulleyseal': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#00ced1', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#00ced1', 15) });
        }
    },
    'vipear': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#9acd32', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#9acd32', 15) });
        }
    },
    'jacksparrow': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#c0c0c0', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#c0c0c0', 15) });
        }
    },
    'nemoo': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#add8e6', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#add8e6', 15) });
        }
    },
    'bobaferret': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 20, h: 10, damage: 5, type: 'rocket', renderer: Renderers.rect('#00ff00') });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 40, h: 20, damage: 12, type: 'rocket', renderer: Renderers.rect('#00ff00') });
        }
    },
    'jocurr': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#00ff00', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#00ff00', 15) });
        }
    },
    'polarbear': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#ffd700', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#ffd700', 15) });
        }
    },
    'frozonefrog': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 20, h: 5, damage: 3, renderer: Renderers.rect('#e0ffff') });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 60, h: 60, damage: 2, life: 60, renderer: Renderers.rect('rgba(200,255,255,0.5)') });
        }
    },
    'forrestgrump': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, renderer: Renderers.circle('#8b4513', 5) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 15, w: 30, h: 30, damage: 8, type: 'grenade', renderer: Renderers.circle('#8b4513', 15) });
        }
    },
    'mikewacowski': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 25, w: 30, h: 4, damage: 3, renderer: Renderers.laser('#32cd32') });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 30, w: 200, h: 20, damage: 10, renderer: Renderers.laser('#32cd32') });
        }
    },
    'rex': {
        shoot: (p) => {
            createMelee(p, 50, 4);
        },
        special: (p) => {
            p.vx = p.facing * 20; createMelee(p, 80, 8);
        }
    },
    'roarschach': {
        shoot: (p) => {
            createBullet(p, { vx: p.facing * 12, w: 15, h: 15, damage: 3, type: 'acid_spit', renderer: Renderers.circle('#000', 8) });
        },
        special: (p) => {
            createBullet(p, { vx: p.facing * 8, w: 50, h: 50, damage: 1, life: 100, renderer: Renderers.circle('#000', 25) });
        }
    }
};
