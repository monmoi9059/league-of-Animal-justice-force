import { Bullet, MeleeHitbox } from './projectiles.js';
import { entities, gameState } from '../state.js';
import { secureRandom } from '../math.js';
import { spawnExplosion, shakeCamera, spawnDamageNumber } from '../utils.js';
import { soundManager } from '../sound.js';
import { drawRoundedRect } from '../graphics.js';
import { CHARACTERS } from '../constants.js';

// --- HELPER FUNCTIONS ---

function playSound(name) {
    if(soundManager) soundManager.play(name);
}

function createBullet(player, config) {
    config = { ...config };
    // BUFF LOGIC for non-travelers
    if (!player.charData.trait) {
        if(config.damage) config.damage = Math.ceil(config.damage * 1.5);
        if(config.w) config.w *= 1.3;
        if(config.h) config.h *= 1.3;
        if (config.vx) config.vx *= 1.3;
        if (config.vy) config.vy *= 1.3;
        spawnExplosion(player.x + (player.facing*20), player.y, player.charData.pColor || "white", 1);
        shakeCamera(2);
    }
    config.owner = player;
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

// Updated createMelee to support new config or legacy args
function createMelee(player, arg1, arg2, arg3, arg4) {
    let config = {};
    if (typeof arg1 === 'object') {
        config = { ...arg1 };
    } else {
        // Legacy: range, power, height, offset
        config = {
            w: arg1,
            h: arg3 || 40,
            power: arg2,
            offset: { x: arg4 || 0, y: 0 }
        };
    }

    // Buff Logic
    if (!player.charData.trait) {
        if (config.power) config.power = Math.ceil(config.power * 1.5);
        if (config.w) config.w *= 1.3;
        if (config.h) config.h *= 1.3;
        spawnExplosion(player.x + (player.facing*20), player.y, "white", 1);
        shakeCamera(3);
    }

    config.owner = player;

    // Handle Aim Down Ground Break
    // If not explicitly set, default to false unless aim down
    if (config.breakGround === undefined) {
        config.breakGround = false;
        // Check if player is aiming down via 'aimDown' property set in Player.performSecondary
        // or passed via config.isDown
        if (player.aimDown || config.isDown) config.breakGround = true;
    }

    // Calculate spawn position if not provided or if dynamic
    // For melee, it's usually relative to player facing
    let spawnX = player.x + (player.facing === 1 ? player.w : -config.w);
    let spawnY = player.y + (player.h - (config.h || 40))/2;

    if (config.offset) {
        spawnX += config.offset.x * player.facing;
        spawnY += config.offset.y;
    }

    let hitbox = new MeleeHitbox(spawnX, spawnY, config.w || 40, config.h || 40, config);
    entities.push(hitbox);
    return hitbox;
}

// --- BEHAVIORS (Projectile) ---

const Behaviors = {
    basic: (b) => { b.x += b.vx; b.y += b.vy; },
    wave: (freq, amp) => (b) => { b.x += b.vx; b.y += Math.sin(b.x * freq) * amp; },
    accelerate: (acc) => (b) => { b.vx *= acc; b.x += b.vx; b.y += b.vy; },
    decelerate: (dec) => (b) => { if(Math.abs(b.vx) > 1) b.vx *= dec; b.x += b.vx; b.y += b.vy; },
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
        let target = null;
        let minDist = 400;
        for(let e of entities) {
            if(e.hp && e.hp > 0 && e !== b.owner && e !== b && !e.dead) {
                let d = Math.hypot(e.x - b.x, e.y - b.y);
                if(d < minDist) { minDist = d; target = e; }
            }
        }
        if(target) {
            let angle = Math.atan2((target.y + target.h/2) - b.y, (target.x + target.w/2) - b.x);
            b.vx += Math.cos(angle) * turnRate;
            b.vy += Math.sin(angle) * turnRate;
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
    circle: (color, radius) => (ctx, b, cx, cy) => {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx + b.w/2, cy + b.h/2, radius, 0, Math.PI*2); ctx.fill();
    },
    rect: (color) => (ctx, b, cx, cy) => {
        ctx.fillStyle = color; ctx.fillRect(cx, cy, b.w, b.h);
    },
    laser: (color) => (ctx, b, cx, cy) => {
        ctx.fillStyle = color; ctx.shadowBlur = 10; ctx.shadowColor = color; ctx.fillRect(cx, cy, b.w, b.h); ctx.shadowBlur = 0;
    },
    star: (color) => (ctx, b, cx, cy, now) => {
        ctx.save(); ctx.translate(cx + b.w/2, cy + b.h/2); ctx.rotate(now * 0.1); ctx.fillStyle = color;
        ctx.beginPath();
        for(let i=0; i<5; i++) {
            ctx.lineTo(Math.cos((18+i*72)/180*Math.PI)*10, -Math.sin((18+i*72)/180*Math.PI)*10);
            ctx.lineTo(Math.cos((54+i*72)/180*Math.PI)*5, -Math.sin((54+i*72)/180*Math.PI)*5);
        }
        ctx.fill(); ctx.restore();
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
    }
};

// --- MELEE ARCHETYPES ---
const MeleeStyles = {
    slash: (p, color) => {
        playSound('swish');
        createMelee(p, {
            w: 50, h: 50, power: 3, life: 10,
            renderer: (ctx, b, cx, cy, now) => {
                ctx.save(); ctx.translate(cx + (p.facing===1?0:50), cy+50);
                if(p.facing===-1) ctx.scale(-1, 1);
                ctx.rotate(-Math.PI/4 + (10-b.life)*0.2);
                ctx.fillStyle = color || "white";
                ctx.beginPath(); ctx.arc(0, 0, 50, -Math.PI/4, 0); ctx.lineTo(0,0); ctx.fill();
                ctx.restore();
            }
        });
    },
    lunge: (p, color) => {
        playSound('swish');
        p.vx = p.facing * 15; // Dash forward
        createMelee(p, {
            w: 40, h: 20, power: 4, life: 15, followOwner: true, offset: {x: 20, y: 0},
            renderer: (ctx, b, cx, cy) => {
                ctx.fillStyle = color || "white";
                ctx.beginPath(); ctx.moveTo(cx, cy+10); ctx.lineTo(cx+40, cy); ctx.lineTo(cx+40, cy+20); ctx.fill();
            }
        });
    },
    spin: (p, color) => {
        playSound('swish');
        createMelee(p, {
            w: 80, h: 80, power: 3, life: 15, followOwner: true, offset: {x: 0, y: 0},
            renderer: (ctx, b, cx, cy, now) => {
                ctx.save(); ctx.translate(cx+40, cy+40); ctx.rotate(now*0.5);
                ctx.strokeStyle = color || "white"; ctx.lineWidth=4;
                ctx.beginPath(); ctx.arc(0,0,35,0,Math.PI*2); ctx.stroke();
                ctx.restore();
            }
        });
    },
    smash: (p, color) => {
        playSound('explosion');
        shakeCamera(5);
        createMelee(p, {
            w: 60, h: 60, power: 6, life: 20,
            renderer: (ctx, b, cx, cy, now) => {
                ctx.fillStyle = color || "white";
                ctx.globalAlpha = b.life/20;
                ctx.fillRect(cx, cy, 60, 60);
                ctx.globalAlpha = 1;
            }
        });
    },
    stab: (p, color) => {
        playSound('swish');
        createMelee(p, {
            w: 60, h: 10, power: 4, life: 10,
            renderer: (ctx, b, cx, cy) => {
                ctx.fillStyle = color || "#ccc";
                ctx.fillRect(cx, cy+2, 60, 6);
            }
        });
    },
    bite: (p, color) => {
        playSound('hurt');
        createMelee(p, {
            w: 30, h: 30, power: 5, life: 10,
            renderer: (ctx, b, cx, cy, now) => {
                 let open = Math.abs(Math.sin(now*0.5))*15;
                 ctx.fillStyle = color || "white";
                 ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx+30, cy+15-open); ctx.lineTo(cx, cy+30); ctx.fill();
                 ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx+30, cy+15+open); ctx.lineTo(cx, cy+30); ctx.fill();
            }
        });
    }
};

// --- WEAPON REGISTRY ---

export const WEAPONS = {};

// --- GENERATOR LOGIC ---

function assignWeaponry(char) {
    if (WEAPONS[char.id]) return;

    let primary, secondary;
    let pColor = char.pColor || "white";

    // 1. DETERMINE PRIMARY ATTACK
    if (char.melee) {
        if (char.body === 'muscular' || char.body === 'brute') {
            primary = (p) => MeleeStyles.smash(p, pColor);
        } else if (char.type.includes('cat') || char.type.includes('lizard') || char.type.includes('fish')) {
            primary = (p) => MeleeStyles.slash(p, pColor);
        } else if (char.type.includes('dog') || char.type.includes('wolf')) {
            primary = (p) => MeleeStyles.bite(p, "red");
        } else if (char.name.includes('NINJA') || char.name.includes('KNIGHT')) {
            primary = (p) => MeleeStyles.slash(p, "silver");
        } else {
            primary = (p) => MeleeStyles.lunge(p, pColor);
        }
    } else {
        if (char.pType.includes('laser')) {
            primary = (p) => { playSound('shoot'); createBullet(p, { vx: p.facing * 25, w: 30, h: 4, damage: 3, renderer: Renderers.laser(pColor) }); };
        } else if (char.pType.includes('grenade')) {
            primary = (p) => { playSound('throw'); createBullet(p, { vx: p.facing * 12, vy: -8, w: 12, h: 12, damage: 4, type: 'grenade' }); };
        } else if (char.pType.includes('boomerang')) {
            primary = (p) => { playSound('throw'); createBullet(p, { vx: p.facing * 15, w: 15, h: 15, damage: 3, behavior: Behaviors.boomerang(1), renderer: Renderers.circle(pColor, 8) }); };
        } else if (char.pType.includes('spread') || char.pType.includes('shotgun')) {
            primary = (p) => { playSound('shoot'); for(let i=-1; i<=1; i++) createBullet(p, { vx: p.facing*15, vy: i*2, w: 8, h: 8, damage: 2, pColor: pColor }); };
        } else {
            primary = (p) => { playSound('shoot'); createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 3, pColor: pColor }); };
        }
    }

    // 2. DETERMINE SECONDARY ATTACK
    if (char.melee) {
        if (char.type.includes('dog') || char.type.includes('wolf')) {
             secondary = (p) => {
                 createBullet(p, { vx: p.facing * 10, w: 10, h: 40, damage: 2, life: 30, type: 'sonic_wave', pColor: 'white' });
                 playSound('shoot');
             };
        } else if (char.type.includes('cat') || char.type.includes('lion')) {
             secondary = (p) => {
                 p.vx = p.facing * 25; p.vy = -5;
                 createMelee(p, { w: 40, h: 30, power: 4, life: 20, followOwner: true });
             };
        } else if (char.body === 'muscular') {
             secondary = (p) => {
                 createBullet(p, { vx: p.facing * 15, vy: -5, w: 20, h: 20, damage: 5, type: 'grenade', renderer: Renderers.rect('grey') });
             };
        } else if (char.name.includes('NINJA')) {
             secondary = (p) => {
                 createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 2, type: 'shuriken' });
             };
        } else {
             secondary = (p) => {
                 createBullet(p, { vx: p.facing * 15, w: 12, h: 12, damage: 3, pColor: pColor });
             };
        }
    } else {
        if (char.trait === 'fly') {
             secondary = (p) => {
                 createMelee(p, { w: 60, h: 60, power: 1, knockback: 10, life: 10, offset: {x: 30, y: 0}, renderer: (ctx,b,cx,cy) => {
                     ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.arc(cx+30,cy+30,30,0,Math.PI*2); ctx.fill();
                 }});
             };
        } else if (char.type.includes('bird')) {
             secondary = (p) => { MeleeStyles.stab(p, "orange"); };
        } else if (char.type.includes('stone') || char.type.includes('robot')) {
             secondary = (p) => { MeleeStyles.smash(p, "grey"); };
        } else {
             secondary = (p) => {
                 createMelee(p, { w: 30, h: 30, power: 3, life: 10, offset: {x: 15, y: 10}, renderer: (ctx,b,cx,cy) => {
                     ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(cx, cy, 30, 30);
                 }});
             };
        }
    }

    let special = (p) => {
        shakeCamera(5);
        if (char.melee) {
            MeleeStyles.spin(p, pColor);
            for(let i=0; i<8; i++) {
                 let a = i * (Math.PI/4);
                 createBullet(p, { vx: Math.cos(a)*10, vy: Math.sin(a)*10, w: 10, h: 10, damage: 5, pColor: pColor });
            }
        } else {
             for(let i=0; i<5; i++) setTimeout(() => primary(p), i*50);
        }
    };

    WEAPONS[char.id] = { shoot: primary, secondary: secondary, special: special };
}

// 3. APPLY TO ALL CHARACTERS
CHARACTERS.forEach(char => assignWeaponry(char));

// 4. OVERRIDE SPECIFICS
const specificWeapons = {
    'pug': {
        shoot: (p) => { playSound('shoot'); createBullet(p, { pColor: '#f00', vx: p.facing * 25, w: 40, h: 4, damage: 2, renderer: Renderers.laser('red') }); },
        secondary: (p) => { MeleeStyles.bite(p, "red"); },
        special: (p) => { playSound('shoot'); createBullet(p, { pColor: '#f00', vx: p.facing * 30, w: 400, h: 20, damage: 10, life: 10, renderer: Renderers.laser('#ffaaaa') }); shakeCamera(5); }
    },
    'raccoon': {
        shoot: (p) => { playSound('throw'); createBullet(p, { vx: p.facing * 15, w: 20, h: 20, life: 100, damage: 2, behavior: Behaviors.boomerang(1), renderer: (ctx,b,cx,cy,now) => { ctx.save(); ctx.translate(cx+10, cy+10); ctx.rotate(now*0.3); ctx.fillStyle="#888"; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill(); ctx.restore(); }}); },
        secondary: (p) => { MeleeStyles.spin(p, "grey"); },
        special: (p) => { createBullet(p, { vx: p.facing * 5, vy: -5, w: 40, h: 40, damage: 10, type: 'grenade' }); }
    },
    'cat': {
        shoot: (p) => { for(let i=-1; i<=1; i++) createBullet(p, { vx: p.facing*15, vy: i*2, w: 15, h: 10, damage: 2, pColor: "#000" }); },
        secondary: (p) => { MeleeStyles.lunge(p, "black"); },
        special: (p) => { p.invincible = 60; p.vx = p.facing * 25; createMelee(p, 60, 5); if (p.health < 3) p.health++; spawnDamageNumber(p.x, p.y-20, "DRAIN!", "red"); }
    },
    'corgi': {
        shoot: (p) => { createBullet(p, { vx: p.facing * 30, w: 40, h: 4, damage: 3, renderer: Renderers.laser('cyan') }); },
        secondary: (p) => { createBullet(p, { vx: p.facing * 10, w: 10, h: 40, damage: 2, life: 30, type: 'sonic_wave', pColor: 'white' }); },
        special: (p) => { for(let i=0; i<5; i++) createBullet(p, { x: p.x + (i*50 - 100), y: p.y - 300, vx: 0, vy: 40, w: 10, h: 300, damage: 8, renderer: Renderers.laser('white') }); shakeCamera(10); }
    },
    'hulk': {
        shoot: (p) => MeleeStyles.smash(p, "#0f0"),
        secondary: (p) => { createBullet(p, { vx: p.facing*15, vy: 0, w: 40, h: 40, damage: 4, type: 'sonic_wave', pColor: '#0f0' }); },
        special: (p) => { createBullet(p, { vx: p.facing * 10, vy: 0, w: 60, h: 40, damage: 6, life: 30, renderer: Renderers.rect('#00ff00') }); createBullet(p, { vx: -p.facing * 10, vy: 0, w: 60, h: 40, damage: 6, life: 30, renderer: Renderers.rect('#00ff00') }); shakeCamera(10); }
    },
    'spider': {
        shoot: (p) => { createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 2, behavior: Behaviors.decelerate(0.95), renderer: Renderers.circle('white', 5) }); },
        secondary: (p) => MeleeStyles.bite(p, "red"),
        special: (p) => { createBullet(p, { vx: 0, vy: 0, w: 60, h: 60, damage: 1, life: 200, renderer: (ctx, b, cx, cy) => { ctx.strokeStyle = "white"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx+60, cy+60); ctx.moveTo(cx+60, cy); ctx.lineTo(cx, cy+60); ctx.stroke(); }}); }
    },
    'wolvie': {
        shoot: (p) => MeleeStyles.slash(p, "silver"),
        secondary: (p) => MeleeStyles.lunge(p, "silver"),
        special: (p) => { p.vx = p.facing * 20; for(let i=0; i<5; i++) setTimeout(() => MeleeStyles.slash(p, "silver"), i * 100); }
    },
    'dead': {
        shoot: (p) => { createBullet(p, { vx: p.facing * 20, w: 5, h: 5, damage: 3, renderer: Renderers.rect('yellow') }); },
        secondary: (p) => { createBullet(p, { vx: p.facing * 25, w: 20, h: 5, damage: 4, renderer: Renderers.rect('silver') }); }, // Knife
        special: (p) => { for(let i=0; i<3; i++) createBullet(p, { vx: p.facing * 10 + i*2, vy: -8 - i, w: 15, h: 15, damage: 8, type: 'grenade' }); }
    },
    'cap': {
        shoot: (p) => { createBullet(p, { vx: p.facing * 18, w: 20, h: 20, damage: 3, behavior: Behaviors.boomerang(1.2), renderer: (ctx,b,cx,cy) => { ctx.fillStyle="red"; ctx.beginPath(); ctx.arc(cx+10,cy+10,10,0,Math.PI*2); ctx.fill(); ctx.fillStyle="white"; ctx.beginPath(); ctx.arc(cx+10,cy+10,7,0,Math.PI*2); ctx.fill(); ctx.fillStyle="blue"; ctx.beginPath(); ctx.arc(cx+10,cy+10,4,0,Math.PI*2); ctx.fill(); }}); },
        secondary: (p) => MeleeStyles.smash(p, "blue"),
        special: (p) => { p.vy = -10; p.vx = p.facing * 15; createMelee(p, 60, 6); }
    },
    'ironmouse': {
        shoot: (p) => { createBullet(p, { vx: p.facing * 20, w: 10, h: 4, damage: 2, renderer: Renderers.laser('cyan') }); },
        secondary: (p) => MeleeStyles.lunge(p, "cyan"),
        special: (p) => { for(let i=0; i<6; i++) createBullet(p, { vx: p.facing * 10, vy: (i-2.5)*3, w: 8, h: 8, damage: 4, behavior: Behaviors.homing(0.5), renderer: Renderers.rect('orange') }); }
    },
    'starlord': {
        shoot: (p) => { createBullet(p, { vx: p.facing * 20, vy: -1, w: 8, h: 8, damage: 3, renderer: Renderers.circle('cyan', 4) }); createBullet(p, { vx: p.facing * 20, vy: 1, w: 8, h: 8, damage: 3, renderer: Renderers.circle('magenta', 4) }); },
        secondary: (p) => MeleeStyles.smash(p, "purple"),
        special: (p) => { createBullet(p, { vx: p.facing * 8, vy: 0, w: 40, h: 40, damage: 1, life: 120, renderer: (ctx, b, cx, cy, now) => { ctx.strokeStyle = "purple"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx+20, cy+20, 20 + Math.sin(now*0.2)*5, 0, Math.PI*2); ctx.stroke(); }}); }
    },
    'gamora': {
        shoot: (p) => { createBullet(p, { vx: p.facing * 25, w: 10, h: 2, damage: 2, renderer: Renderers.rect('lime') }); },
        secondary: (p) => MeleeStyles.slash(p, "green"),
        special: (p) => { p.vx = p.facing * 30; createMelee(p, 80, 8); }
    },
    'drax': {
        shoot: (p) => { createBullet(p, { vx: p.facing * 15, vy: -5, w: 15, h: 15, damage: 5, type: 'grenade', renderer: Renderers.circle('grey', 8) }); },
        secondary: (p) => MeleeStyles.smash(p, "grey"),
        special: (p) => { createBullet(p, { vx: p.facing * 10, vy: 0, w: 40, h: 40, damage: 8, life: 60, renderer: Renderers.circle('#555', 20) }); }
    },
    'vision': {
        shoot: (p) => { createBullet(p, { vx: p.facing * 30, w: 40, h: 6, damage: 4, renderer: Renderers.laser('#ff00ff') }); },
        secondary: (p) => { createBullet(p, { vx: p.facing*25, w: 10, h: 4, damage: 3, renderer: Renderers.laser('yellow') }); },
        special: (p) => { p.invincible = 90; createBullet(p, { vx: 0, vy: 0, w: 100, h: 100, damage: 5, life: 10, renderer: Renderers.circle('rgba(255,0,255,0.3)', 50) }); }
    },
    'scarlet': {
        shoot: (p) => { createBullet(p, { vx: p.facing * 12, w: 12, h: 12, damage: 3, behavior: Behaviors.homing(0.8), renderer: Renderers.circle('red', 6) }); },
        secondary: (p) => MeleeStyles.spin(p, "red"),
        special: (p) => { for(let i=0; i<8; i++) { let angle = i * (Math.PI/4); createBullet(p, { vx: Math.cos(angle)*10, vy: Math.sin(angle)*10, w: 15, h: 15, damage: 5, renderer: Renderers.circle('red', 8) }); } }
    },
    'ghost': {
        shoot: (p) => { createBullet(p, { vx: p.facing * 20, w: 30, h: 5, damage: 4, renderer: Renderers.rect('rgba(200,255,255,0.8)') }); },
        secondary: (p) => MeleeStyles.slash(p, "cyan"),
        special: (p) => { for(let i=0; i<3; i++) { let b = createBullet(p, { vx: 0, vy: 0, w: 15, h: 15, damage: 5, life: 200, behavior: Behaviors.orbit(50, 0.1 + (i*2)), renderer: Renderers.circle('white', 8) }); b.angle = i * (Math.PI*2/3); } }
    },
    'galaxygod': {
        shoot: (p) => { createBullet(p, { vx: p.facing * 18, w: 15, h: 15, damage: 5, renderer: Renderers.star('gold') }); },
        secondary: (p) => { createBullet(p, { vx: p.facing * 15, vy: -10, w: 20, h: 20, damage: 6, type: 'grenade', renderer: Renderers.circle('orange', 10) }); },
        special: (p) => { createBullet(p, { vx: 0, vy: 0, w: 200, h: 200, damage: 20, life: 10, renderer: Renderers.circle('white', 100) }); shakeCamera(15); }
    },
    'skeletonram': {
        shoot: (p) => { createBullet(p, { vx: p.facing * 15, vy: -8, w: 20, h: 8, damage: 4, type: 'grenade', renderer: Renderers.bone }); },
        secondary: (p) => MeleeStyles.lunge(p, "white"),
        special: (p) => { for(let i=0; i<5; i++) { createBullet(p, { vx: p.facing * 10 + (Math.random()*10), vy: -10 - Math.random()*5, w: 20, h: 8, damage: 5, type: 'grenade', renderer: Renderers.bone }); } }
    },
    'robbereagle': {
        shoot: (p) => { createBullet(p, { vx: p.facing * 20, w: 10, h: 10, damage: 2, renderer: Renderers.circle('gold', 5) }); },
        secondary: (p) => MeleeStyles.stab(p, "gold"),
        special: (p) => { createBullet(p, { vx: 0, vy: 5, w: 30, h: 30, damage: 15, renderer: Renderers.rect('brown') }); }
    },
    'policecroc': {
        shoot: (p) => { MeleeStyles.bite(p, "green"); },
        secondary: (p) => { createBullet(p, { vx: p.facing * 15, w: 15, h: 15, damage: 2, behavior: Behaviors.boomerang(1), renderer: (ctx,b,cx,cy) => { ctx.strokeStyle="pink"; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(cx+8,cy+8,6,0,Math.PI*2); ctx.stroke(); }}); },
        special: (p) => { createBullet(p, { vx: p.facing * 15, w: 15, h: 15, damage: 2, behavior: Behaviors.boomerang(1), renderer: (ctx,b,cx,cy) => { ctx.strokeStyle="pink"; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(cx+8,cy+8,6,0,Math.PI*2); ctx.stroke(); }}); }
    },
    'homepumpkin': {
        shoot: (p) => { createBullet(p, { vx: p.facing * 22, w: 6, h: 4, damage: 2, renderer: Renderers.circle('orange', 3) }); },
        secondary: (p) => MeleeStyles.spin(p, "orange"),
        special: (p) => { createBullet(p, { vx: 0, vy: 0, w: 20, h: 80, damage: 5, life: 100, renderer: Renderers.rect('green') }); }
    }
};

Object.assign(WEAPONS, specificWeapons);
