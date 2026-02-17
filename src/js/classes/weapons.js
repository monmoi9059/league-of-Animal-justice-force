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
        if(config.w) config.w *= 1.3;
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
    decelerate: (dec) => (b) => {
        if(Math.abs(b.vx) > 1) b.vx *= dec;
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
        let minDist = 400;
        for(let e of entities) {
            if(e.hp && e.hp > 0 && e !== b.owner && e !== b && !e.dead) { // Added !e.dead check
                let d = Math.hypot(e.x - b.x, e.y - b.y);
                if(d < minDist) { minDist = d; target = e; }
            }
        }
        if(target) {
            let angle = Math.atan2((target.y + target.h/2) - b.y, (target.x + target.w/2) - b.x);
            // Smooth turn
            let currentAngle = Math.atan2(b.vy, b.vx);
            // Simple approach: just nudge velocity vector
            b.vx += Math.cos(angle) * turnRate;
            b.vy += Math.sin(angle) * turnRate;

            // Normalize to max speed
            let speed = Math.hypot(b.vx, b.vy);
            let maxSpeed = 12;
            if(speed > maxSpeed) { b.vx = (b.vx/speed)*maxSpeed; b.vy = (b.vy/speed)*maxSpeed; }
        }
        b.x += b.vx; b.y += b.vy;
    },
    orbit: (radius, speed) => (b) => {
        let p = b.owner;
        if (!p || p.dead) { b.life = 0; return; }
        b.angle = (b.angle || 0) + speed;
        b.x = p.x + p.w/2 + Math.cos(b.angle) * radius;
        b.y = p.y + p.h/2 + Math.sin(b.angle) * radius;
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
    },
    bone: (ctx, b, cx, cy, now) => {
        ctx.save(); ctx.translate(cx + b.w/2, cy + b.h/2); ctx.rotate(now * 0.2);
        ctx.fillStyle = "#eee";
        ctx.fillRect(-10, -3, 20, 6);
        ctx.beginPath(); ctx.arc(-12, -4, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-12, 4, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(12, -4, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(12, 4, 4, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    },
    shuriken: (color) => (ctx, b, cx, cy, now) => {
        ctx.save(); ctx.translate(cx + b.w/2, cy + b.h/2); ctx.rotate(now * 0.5);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -10); ctx.lineTo(3, -3); ctx.lineTo(10, 0); ctx.lineTo(3, 3);
        ctx.lineTo(0, 10); ctx.lineTo(-3, 3); ctx.lineTo(-10, 0); ctx.lineTo(-3, -3);
        ctx.fill();
        ctx.restore();
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
    // 3. Cat - Vampire Cat (Updated Theme)
    'cat': {
        shoot: (p) => {
             // Bat Swarm
             for(let i=-1; i<=1; i++) {
                 createBullet(p, { vx: p.facing*15, vy: i*2, w: 15, h: 10, damage: 2, renderer: (ctx, b, cx, cy, now) => {
                     ctx.fillStyle = "#000";
                     ctx.beginPath(); ctx.arc(cx+b.w/2, cy+b.h/2, 5, 0, Math.PI*2); ctx.fill();
                     // Wings
                     ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx-5, cy-5); ctx.lineTo(cx+5, cy); ctx.stroke();
                 }});
             }
        },
        special: (p) => {
             // Life Drain Dash
             p.invincible = 60;
             p.vx = p.facing * 25;
             createMelee(p, 60, 5);
             if (p.health < 3) p.health++; // Lifesteal
             spawnDamageNumber(p.x, p.y-20, "DRAIN!", "red");
        }
    },
    // 4. Corgi - Thunder Corgi
    'corgi': {
        shoot: (p) => {
             // Lightning Bolt
             createBullet(p, { vx: p.facing * 30, w: 40, h: 4, damage: 3, renderer: Renderers.laser('cyan') });
        },
        special: (p) => {
             // Thunder Storm (Vertical Strikes)
             for(let i=0; i<5; i++) {
                 createBullet(p, { x: p.x + (i*50 - 100), y: p.y - 300, vx: 0, vy: 40, w: 10, h: 300, damage: 8, renderer: Renderers.laser('white') });
             }
             shakeCamera(10);
        }
    },
    // 5. Hulk Poodle - Gamma Poodle
    'hulk': {
        shoot: (p) => {
             createMelee(p, 60, 4);
             shakeCamera(2);
        },
        special: (p) => {
             // Ground Smash Shockwave
             createBullet(p, { vx: p.facing * 10, vy: 0, w: 60, h: 40, damage: 6, life: 30, renderer: Renderers.rect('#00ff00') });
             createBullet(p, { vx: -p.facing * 10, vy: 0, w: 60, h: 40, damage: 6, life: 30, renderer: Renderers.rect('#00ff00') });
             shakeCamera(10);
        }
    },
    // 6. Spider-Pig - Web Shot
    'spider': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 2, behavior: Behaviors.decelerate(0.95), renderer: Renderers.circle('white', 5) });
        },
        special: (p) => {
             // Web Trap (Stationary hitbox)
             createBullet(p, { vx: 0, vy: 0, w: 60, h: 60, damage: 1, life: 200, renderer: (ctx, b, cx, cy) => {
                 ctx.strokeStyle = "white"; ctx.lineWidth = 1;
                 ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx+60, cy+60); ctx.moveTo(cx+60, cy); ctx.lineTo(cx, cy+60); ctx.stroke();
             }});
        }
    },
    // 7. Wolvie - Berserker Wolf
    'wolvie': {
        shoot: (p) => {
             // Rapid Slash
             createMelee(p, 40, 3, 30);
        },
        special: (p) => {
             // Frenzy
             p.vx = p.facing * 20;
             for(let i=0; i<5; i++) {
                 setTimeout(() => createMelee(p, 60, 3, 40), i * 100);
             }
        }
    },
    // 8. Dead-Poodle - Undead Guns
    'dead': {
        shoot: (p) => {
             // Ricochet Shot
             createBullet(p, { vx: p.facing * 20, w: 5, h: 5, damage: 3, renderer: Renderers.rect('yellow') }); // TODO: Add bounce behavior later
        },
        special: (p) => {
             // Grenade Bouquet
             for(let i=0; i<3; i++) {
                createBullet(p, { vx: p.facing * 10 + i*2, vy: -8 - i, w: 15, h: 15, damage: 8, type: 'grenade' });
             }
        }
    },
    // 9. Captain Eagle - Patriot Eagle
    'cap': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 18, w: 20, h: 20, damage: 3, behavior: Behaviors.boomerang(1.2), renderer: (ctx, b, cx, cy) => {
                 ctx.fillStyle = "red"; ctx.beginPath(); ctx.arc(cx+10, cy+10, 10, 0, Math.PI*2); ctx.fill();
                 ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(cx+10, cy+10, 7, 0, Math.PI*2); ctx.fill();
                 ctx.fillStyle = "blue"; ctx.beginPath(); ctx.arc(cx+10, cy+10, 4, 0, Math.PI*2); ctx.fill();
             }});
        },
        special: (p) => {
             // Freedom Dive
             p.vy = -10; p.vx = p.facing * 15;
             createMelee(p, 60, 6);
        }
    },
    // 10. Iron Mouse - Mech Mouse
    'ironmouse': {
        shoot: (p) => {
             createBullet(p, { vx: p.facing * 20, w: 10, h: 4, damage: 2, renderer: Renderers.laser('cyan') });
        },
        special: (p) => {
             // Micro Missiles
             for(let i=0; i<6; i++) {
                 createBullet(p, { vx: p.facing * 10, vy: (i-2.5)*3, w: 8, h: 8, damage: 4, behavior: Behaviors.homing(0.5), renderer: Renderers.rect('orange') });
             }
        }
    },
    // 16. Star-Lord Fox - Space Fox
    'starlord': {
        shoot: (p) => {
             // Plasma Splitter (splits on impact logic could be added, for now double shot)
             createBullet(p, { vx: p.facing * 20, vy: -1, w: 8, h: 8, damage: 3, renderer: Renderers.circle('cyan', 4) });
             createBullet(p, { vx: p.facing * 20, vy: 1, w: 8, h: 8, damage: 3, renderer: Renderers.circle('magenta', 4) });
        },
        special: (p) => {
             // Gravity Well
             let b = createBullet(p, { vx: p.facing * 8, vy: 0, w: 40, h: 40, damage: 1, life: 120, renderer: (ctx, b, cx, cy, now) => {
                 ctx.strokeStyle = "purple"; ctx.lineWidth = 2;
                 ctx.beginPath(); ctx.arc(cx+20, cy+20, 20 + Math.sin(now*0.2)*5, 0, Math.PI*2); ctx.stroke();
             }});
             // TODO: Add pull effect in update if possible, for now it just hurts
        }
    },
    // 17. Gamora Gecko - Jungle Gecko
    'gamora': {
        shoot: (p) => {
             // Poison Dart
             createBullet(p, { vx: p.facing * 25, w: 10, h: 2, damage: 2, renderer: Renderers.rect('lime') });
        },
        special: (p) => {
             // Tribal Spear Dash
             p.vx = p.facing * 30;
             createMelee(p, 80, 8);
        }
    },
    // 18. Drax Bulldog - Boulder Dog
    'drax': {
        shoot: (p) => {
             // Rock Throw (Physics)
             createBullet(p, { vx: p.facing * 15, vy: -5, w: 15, h: 15, damage: 5, type: 'grenade', renderer: Renderers.circle('grey', 8) });
        },
        special: (p) => {
             // Boulder Roll
             createBullet(p, { vx: p.facing * 10, vy: 0, w: 40, h: 40, damage: 8, life: 60, renderer: Renderers.circle('#555', 20) });
        }
    },
    // 21. Vision Zebra - Android Zebra
    'vision': {
        shoot: (p) => {
             // Laser Beam
             createBullet(p, { vx: p.facing * 30, w: 40, h: 6, damage: 4, renderer: Renderers.laser('#ff00ff') });
        },
        special: (p) => {
             // Phase Shift (Invincibility + AoE)
             p.invincible = 90;
             createBullet(p, { vx: 0, vy: 0, w: 100, h: 100, damage: 5, life: 10, renderer: Renderers.circle('rgba(255,0,255,0.3)', 50) });
        }
    },
    // 22. Scarlet Skunk - Magic Skunk
    'scarlet': {
        shoot: (p) => {
             // Magic Bolt Homing
             createBullet(p, { vx: p.facing * 12, w: 12, h: 12, damage: 3, behavior: Behaviors.homing(0.8), renderer: Renderers.circle('red', 6) });
        },
        special: (p) => {
             // Chaos Blast
             for(let i=0; i<8; i++) {
                 let angle = i * (Math.PI/4);
                 createBullet(p, { vx: Math.cos(angle)*10, vy: Math.sin(angle)*10, w: 15, h: 15, damage: 5, renderer: Renderers.circle('red', 8) });
             }
        }
    },
    // 33. Ghost Goat
    'ghost': {
        shoot: (p) => {
             // Ethereal Chain
             createBullet(p, { vx: p.facing * 20, w: 30, h: 5, damage: 4, renderer: Renderers.rect('rgba(200,255,255,0.8)') });
        },
        special: (p) => {
             // Haunt (Orbiting skulls)
             for(let i=0; i<3; i++) {
                 let b = createBullet(p, { vx: 0, vy: 0, w: 15, h: 15, damage: 5, life: 200, behavior: Behaviors.orbit(50, 0.1 + (i*2)), renderer: Renderers.circle('white', 8) });
                 b.angle = i * (Math.PI*2/3);
             }
        }
    },
    // 37. Galaxy God
    'galaxygod': {
        shoot: (p) => {
             // Star Throw
             createBullet(p, { vx: p.facing * 18, w: 15, h: 15, damage: 5, renderer: Renderers.star('gold') });
        },
        special: (p) => {
             // Big Bang
             createBullet(p, { vx: 0, vy: 0, w: 200, h: 200, damage: 20, life: 10, renderer: Renderers.circle('white', 100) });
             shakeCamera(15);
        }
    },
    // 44. Skeleton Ram
    'skeletonram': {
        shoot: (p) => {
             // Bone Throw (Arc)
             createBullet(p, { vx: p.facing * 15, vy: -8, w: 20, h: 8, damage: 4, type: 'grenade', renderer: Renderers.bone });
        },
        special: (p) => {
             // Bone Storm
             for(let i=0; i<5; i++) {
                 createBullet(p, { vx: p.facing * 10 + (Math.random()*10), vy: -10 - Math.random()*5, w: 20, h: 8, damage: 5, type: 'grenade', renderer: Renderers.bone });
             }
        }
    },
    // 49. Robber Eagle
    'robbereagle': {
        shoot: (p) => {
             // Coin Shot
             createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 2, renderer: Renderers.circle('gold', 5) });
        },
        special: (p) => {
             // Money Bag Drop
             createBullet(p, { vx: 0, vy: 5, w: 30, h: 30, damage: 15, renderer: Renderers.rect('brown') });
        }
    },
    // 97. Police Croc
    'policecroc': {
        shoot: (p) => {
             createMelee(p, 50, 5); // Bite
        },
        special: (p) => {
             // Donut Throw (Stun)
             createBullet(p, { vx: p.facing * 15, w: 15, h: 15, damage: 2, behavior: Behaviors.boomerang(1), renderer: (ctx, b, cx, cy) => {
                 ctx.strokeStyle = "pink"; ctx.lineWidth = 4;
                 ctx.beginPath(); ctx.arc(cx+8, cy+8, 6, 0, Math.PI*2); ctx.stroke();
             }});
        }
    },
    // 100. Home Pumpkin
    'homepumpkin': {
        shoot: (p) => {
             // Pumpkin Seed Machine Gun
             createBullet(p, { vx: p.facing * 22, w: 6, h: 4, damage: 2, renderer: Renderers.circle('orange', 3) });
        },
        special: (p) => {
             // Vine Wall
             createBullet(p, { vx: 0, vy: 0, w: 20, h: 80, damage: 5, life: 100, renderer: Renderers.rect('green') });
        }
    },
    // FALLBACK FOR OTHERS (Generic implementations for the massive roster)
    'default': {
        shoot: (p) => { createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3 }); }
    }
};

// --- DEFAULT FILLER ---
// Fill in missing characters with generic but thematic attacks based on pType from constants
// This ensures we don't crash and still have variety
import { CHARACTERS } from '../constants.js';

CHARACTERS.forEach(char => {
    if (!WEAPONS[char.id]) {
        WEAPONS[char.id] = {
            shoot: (p) => {
                let conf = { vx: p.facing * 20, w: 12, h: 12, damage: 3, pColor: char.pColor };
                // Adapt based on pType hints
                if (char.pType.includes('grenade')) { conf.type = 'grenade'; conf.vy = -8; }
                else if (char.pType.includes('boomerang')) { conf.behavior = Behaviors.boomerang(1); }
                else if (char.pType.includes('laser')) { conf.renderer = Renderers.laser(char.pColor); conf.w = 30; conf.h = 4; }
                else if (char.pType.includes('spread')) {
                    for(let i=-1; i<=1; i++) createBullet(p, { ...conf, vy: i*3 });
                    return;
                }
                else if (char.pType.includes('melee')) { createMelee(p, 40, 3); return; }

                createBullet(p, conf);
            },
            special: (p) => {
                // Generic Special: Big version of normal
                let conf = { vx: p.facing * 15, w: 30, h: 30, damage: 8, pColor: char.pColor };
                if (char.pType.includes('grenade')) { conf.type = 'grenade'; conf.vy = -10; }
                else if (char.pType.includes('laser')) { conf.renderer = Renderers.laser(char.pColor); conf.w = 200; conf.h = 10; }
                else { conf.type = 'rocket'; } // Default to rocket for impact
                createBullet(p, conf);
            }
        };
    }
});
