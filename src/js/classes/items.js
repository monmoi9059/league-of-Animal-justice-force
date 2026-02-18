import { TILE_SIZE, GRAVITY, LEVEL_HEIGHT, LEVEL_WIDTH, CHARACTERS } from '../constants.js';
import { tiles, players, gameState } from '../state.js';
import { checkRectOverlap } from '../physics.js';
import { spawnExplosion, createExplosion, unlockCharacter, spawnDamageNumber, shakeCamera } from '../utils.js';
import { drawRoundedRect, drawAnatomicalHero } from '../graphics.js';
import { playerKeys, particles } from '../state.js';
import { winGame } from '../game-flow.js';
import { updateUI } from '../ui.js';
import { secureRandom } from '../math.js';
import { entities } from '../state.js';
import { Bullet } from './projectiles.js';
import { Particle } from './particles.js';
import { soundManager } from '../sound.js';

export class PropaneTank {
    constructor(x, y) {
        this.x = x; this.y = y; this.w = TILE_SIZE; this.h = TILE_SIZE;
        this.hp = 10;
        this.vx = 0; this.vy = 0;
        this.type = 'prop';
        this.burning = false;
        this.burnTimer = 0;
    }
    update() {
        this.vy += GRAVITY;
        this.y += this.vy;

        // Simple floor collision
        let r = Math.floor((this.y + this.h) / TILE_SIZE);
        let c = Math.floor((this.x + this.w / 2) / TILE_SIZE);

        // Use dynamic width check from tiles array if available
        let maxW = tiles && tiles[0] ? tiles[0].length : LEVEL_WIDTH;
        let maxH = tiles ? tiles.length : LEVEL_HEIGHT;

        if (r >= 0 && r < maxH && c >= 0 && c < maxW && tiles[r] && tiles[r][c] && tiles[r][c].type !== 0) {
             this.y = r * TILE_SIZE - this.h;
             this.vy = 0;
             // Stop sideways movement on ground
             this.vx = 0;
        }
        this.x += this.vx;

        if (this.burning) {
            this.burnTimer--;
            if (Math.random() < 0.3) {
                spawnExplosion(this.x + this.w/2 + (Math.random()-0.5)*10, this.y + this.h/2 + (Math.random()-0.5)*10, "orange", 0.2);
                spawnExplosion(this.x + this.w/2 + (Math.random()-0.5)*10, this.y + (Math.random()-0.5)*10, "grey", 0.1); // Smoke
            }
            if (this.burnTimer <= 0) {
                this.hp = 0;
                createExplosion(this.x + this.w/2, this.y + this.h/2, 2, 50);
                this.x = -9999;
            }
        }
    }
    takeDamage(amt, sourceX) {
        // Do not move when hit
        this.vx = 0;
        this.vy = 0;

        if (!this.burning) {
            this.burning = true;
            this.burnTimer = 60; // 1 second fuse
            spawnDamageNumber(this.x, this.y, "WARNING!", "orange");
        } else {
            // Accelerate explosion
            this.burnTimer -= 20;
            this.hp -= amt;
        }

        if(this.hp <= 0) {
            createExplosion(this.x + this.w/2, this.y + this.h/2, 2, 50);
            this.x = -9999;
        }
    }
    draw(ctx, camX, camY, now) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        if (this.burning && Math.floor(now / 100) % 2 === 0) {
             ctx.fillStyle = "#e67e22"; // Flashing orange
        } else {
             ctx.fillStyle = "#e74c3c"; // Red tank
        }

        drawRoundedRect(ctx, cx + 5, cy + 5, this.w - 10, this.h - 5, 5);
        ctx.fillStyle = "#bdc3c7"; // Valve
        ctx.fillRect(cx + 12, cy, 16, 5);
        ctx.fillStyle = "white";
        ctx.font = "10px Arial";
        ctx.fillText("GAS", cx+10, cy+25);
    }
}

export class FallingBlock {
    constructor(x, y) {
        this.x = x; this.y = y; this.w = TILE_SIZE; this.h = TILE_SIZE;
        this.vx = 0; this.vy = 0;
        this.active = false;
        this.solid = true;
        this.hp = 100; // Entity lifecycle
    }
    update() {
        if (!this.active) {
            // Trigger check
            if (players) {
                for (let p of players) {
                    // Check horizontal proximity (underneath)
                    if (Math.abs((p.x + p.w/2) - (this.x + this.w/2)) < 40 && p.y > this.y) {
                        this.active = true;
                        spawnExplosion(this.x + this.w/2, this.y, "grey", 0.5); // Dust
                    }
                }
            }
        } else {
            this.vy += GRAVITY;
            this.y += this.vy;

            // Collision with floor or players
            if (players) {
                for (let p of players) {
                    if (checkRectOverlap(this, p)) {
                        p.takeDamage(2); // Heavy damage
                        this.shatter();
                        return;
                    }
                }
            }

            // Floor check
            let r = Math.floor((this.y + this.h) / TILE_SIZE);
            let c = Math.floor((this.x + this.w / 2) / TILE_SIZE);
            if (tiles && tiles[r] && tiles[r][c] && tiles[r][c].type !== 0) {
                 this.shatter();
            }
        }
    }
    shatter() {
        spawnExplosion(this.x + this.w/2, this.y + this.h/2, "grey", 2);
        this.x = -9999;
    }
    draw(ctx, camX, camY, now) {
        let cx = this.x - camX; let cy = this.y - camY;
        ctx.fillStyle = "#7f8c8d";
        ctx.fillRect(cx, cy, this.w, this.h);
        // Cracks
        ctx.strokeStyle = "#2c3e50";
        ctx.beginPath();
        ctx.moveTo(cx+5, cy+5); ctx.lineTo(cx+15, cy+20); ctx.lineTo(cx+10, cy+30);
        ctx.stroke();
    }
}

export class BridgeBlock {
    constructor(x, y) {
        this.x = x; this.y = y; this.w = TILE_SIZE; this.h = TILE_SIZE;
        this.hp = 20;
    }
    update() {}
    takeDamage(amt) {
        this.hp -= amt;
        if (this.hp <= 0) {
            this.x = -9999;
            spawnExplosion(this.x, this.y, "grey", 1);
        }
    }
    draw(ctx, camX, camY, now) {
        ctx.fillStyle = "#8e44ad"; // Purple bridge?
        ctx.fillRect(this.x - camX, this.y - camY, this.w, this.h);
        ctx.beginPath();
        ctx.moveTo(this.x - camX, this.y - camY);
        ctx.lineTo(this.x - camX + this.w, this.y - camY + this.h);
        ctx.stroke();
    }
}

export class MechSuit {
    constructor(x, y) {
        this.x = x; this.y = y; this.w = 60; this.h = 80;
        this.occupied = false;
        this.hp = 500;
    }
    update() {
        if (!this.occupied) {
            // Apply gravity
            this.y += 5; // Simple gravity
             let r = Math.floor((this.y + this.h) / TILE_SIZE);
             let c = Math.floor((this.x + this.w / 2) / TILE_SIZE);
             if (r >= 0 && r < LEVEL_HEIGHT && c >= 0 && c < LEVEL_WIDTH && tiles[r] && tiles[r][c] && tiles[r][c].type !== 0) {
                 this.y = r * TILE_SIZE - this.h;
             }

            // Interaction
            if (players) {
                for (let p of players) {
                    if (Math.abs(p.x - this.x) < 50 && Math.abs(p.y - this.y) < 50 && playerKeys[p.index]['e']) {
                        this.enter(p);
                        break;
                    }
                }
            }
        }
    }
    enter(p) {
        this.occupied = true;
        p.inMech = true;
        p.mech = this;
        // Visual effect
        spawnExplosion(this.x + 30, this.y + 40, "cyan", 2);
    }
    eject(p) {
        this.occupied = false;
        p.inMech = false;
        p.mech = null;
        this.x = p.x;
        this.y = p.y;
        this.hp = 0; // Destroy after use? Or leave it? Let's destroy it to prevent spam
        spawnExplosion(this.x + 30, this.y + 40, "cyan", 5);
        this.x = -9999;
    }
    draw(ctx, camX, camY, now) {
        if (this.occupied) return; // Drawn with player
        let cx = this.x - camX;
        let cy = this.y - camY;
        ctx.fillStyle = "#34495e";
        drawRoundedRect(ctx, cx, cy, this.w, this.h, 10);
        ctx.fillStyle = "#f1c40f"; // Glass
        ctx.fillRect(cx + 15, cy + 10, 30, 20);
        // Legs
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(cx + 10, cy + 60, 15, 20);
        ctx.fillRect(cx + 35, cy + 60, 15, 20);
        // Arms
        ctx.fillRect(cx - 10, cy + 20, 10, 30);
        ctx.fillRect(cx + 60, cy + 20, 10, 30);
    }
}

export class HamsterBall {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.w = 60; this.h = 60; // Hitbox size
        this.r = 30; // Visual radius
        this.vx = 0; this.vy = 0;
        this.angle = 0;
        this.occupied = false;
        this.driver = null;
        this.jumpCount = 0;
        this.maxJumps = 3;
        this.grounded = false;
        this.hp = 100; // Just for entity persistence, ball uses player HP
        this.cooldown = 0; // Minigun cooldown
        this.interactionCooldown = 0; // Prevent immediate eject
        this.facing = 1;
    }

    update() {
        // Safety Check: If driver is dead or reset, free the ball
        if (this.occupied && this.driver) {
            if (this.driver.dead || !this.driver.inHamsterBall || this.driver.hamsterBall !== this) {
                this.occupied = false;
                this.driver = null;
                // Don't call full eject() as player might be respawning elsewhere
            }
        }

        if (!this.occupied) {
            // Apply gravity
            this.vy += GRAVITY;
            this.y += this.vy;

            // Apply simple friction when not occupied
            this.vx *= 0.95;
            this.x += this.vx;
            this.angle += this.vx * 0.1;

            this.checkCollisions();

            // Interaction with player
            if (players) {
                for (let p of players) {
                    if (p.health > 0 && !p.dead && !p.inHamsterBall && checkRectOverlap(this, p)) {
                        // Check for 'F' key (Flex)
                        let pKeys = playerKeys[p.index];
                        if (pKeys && pKeys['f']) {
                            this.enter(p);
                            break;
                        }
                    }
                }
            }
        }
    }

    updateDriven(p) {
        if(this.interactionCooldown > 0) this.interactionCooldown--;

        // Player Input
        let pKeys = playerKeys[p.index];

        // Eject
        if (pKeys['f'] && this.interactionCooldown <= 0) {
            this.eject(p);
            return;
        }

        let input = 0;
        if (pKeys['arrowleft'] || pKeys['a']) input = -1;
        if (pKeys['arrowright'] || pKeys['d']) input = 1;

        if (input !== 0) this.facing = input;

        // Apply Force (Acceleration)
        const ACCEL = 0.5;
        const MAX_SPEED = 12;
        this.vx += input * ACCEL;

        // Friction
        this.vx *= 0.98;

        // Cap Speed
        if (Math.abs(this.vx) > MAX_SPEED) this.vx = Math.sign(this.vx) * MAX_SPEED;

        // Rotation
        this.angle += this.vx * 0.1;

        // Jump (Triple Jump)
        if (pKeys[' '] && !p.wallJumpLocked) {
             if (this.jumpCount < this.maxJumps) {
                 this.vy = -12; // High jump force
                 this.jumpCount++;
                 p.wallJumpLocked = true; // Use player's debounce
                 if(soundManager) soundManager.play('jump');

                 // Jetpack Visual
                 for(let i=0; i<5; i++) {
                    particles.push(new Particle(this.x + this.w/2, this.y + this.h, "orange", (Math.random()-0.5)*2, 2+Math.random()*2));
                 }
             }
        }
        if (!pKeys[' ']) p.wallJumpLocked = false;

        // Minigun (Shoot)
        if (this.cooldown > 0) this.cooldown--;
        if (pKeys['z']) {
            if (this.cooldown <= 0) {
                this.shootMinigun();
                this.cooldown = 4; // Fast fire rate
            }
        }

        // Gravity
        this.vy += GRAVITY;
        this.y += this.vy;
        this.x += this.vx;

        this.checkCollisions();

        // Sync Player Position
        p.x = this.x + (this.w - p.w)/2;
        p.y = this.y + (this.h - p.h)/2;
        p.vx = this.vx;
        p.vy = this.vy;
        p.facing = this.facing;
    }

    shootMinigun() {
        shakeCamera(1);
        let spawnX = this.x + this.w/2 + (this.facing * 35);
        let spawnY = this.y + this.h/2;

        // Slightly inaccurate
        let vy = (Math.random() - 0.5) * 2;

        entities.push(new Bullet(spawnX, spawnY, this.facing, false, { pColor: '#ff0', pType: 'round' }));
        if(soundManager) soundManager.play('shoot'); // Ideally a machine gun sound

        // Shell casing
        particles.push(new Particle(spawnX, spawnY, "gold", -this.facing * 2, -2));
    }

    enter(p) {
        this.occupied = true;
        this.driver = p;
        p.inHamsterBall = true;
        p.hamsterBall = this;
        p.vx = 0; p.vy = 0;
        this.interactionCooldown = 30; // 0.5s cooldown to prevent immediate eject
        spawnExplosion(this.x + this.w/2, this.y + this.h/2, "cyan", 2);
    }

    eject(p) {
        this.occupied = false;
        this.driver = null;
        p.inHamsterBall = false;
        p.hamsterBall = null;

        // Pop player up
        p.vy = -10;
        p.y -= 20;

        // Push ball away slightly
        this.vx = p.facing * 5;
        this.vy = -5;

        spawnExplosion(this.x + this.w/2, this.y + this.h/2, "white", 2);
    }

    checkCollisions() {
        if (!tiles) return;

        let l = Math.floor(this.x / TILE_SIZE);
        let r = Math.floor((this.x + this.w - 0.01) / TILE_SIZE);
        let t = Math.floor(this.y / TILE_SIZE);
        let b = Math.floor((this.y + this.h - 0.01) / TILE_SIZE);

        this.grounded = false;

        for(let row = t; row <= b; row++) {
            for(let col = l; col <= r; col++) {
                if(row>=0 && row<LEVEL_HEIGHT && col>=0 && col<LEVEL_WIDTH && tiles[row] && tiles[row][col] && tiles[row][col].type !== 0) {
                    let type = tiles[row][col].type;

                    if(type === 6) continue; // Ignore ladders
                    if(type === 4) {
                        // Lava/Spikes - Damage Player if occupied
                        if(this.occupied && this.driver) this.driver.takeDamage();
                        else this.vy = -5; // Bounce prop
                        return;
                    }

                    // Solid Block Collision
                    if(type === 1 || type === 2 || type === 3 || type === 5) {
                        // Vertical Collision
                        if (this.vy > 0 && this.y + this.h < (row+1) * TILE_SIZE) { // Falling down
                             let blockTop = row * TILE_SIZE;
                             if (this.y + this.h > blockTop && this.y + this.h - this.vy <= blockTop + 5) {
                                 this.y = blockTop - this.h;
                                 this.vy = -this.vy * 0.4; // Bounce
                                 if(Math.abs(this.vy) < 2) this.vy = 0;
                                 this.grounded = true;
                                 this.jumpCount = 0; // Reset jumps
                             }
                        } else if (this.vy < 0) { // Moving up
                             let blockBot = (row+1) * TILE_SIZE;
                             if (this.y < blockBot && this.y - this.vy >= blockBot - 5) {
                                 this.y = blockBot;
                                 this.vy = -this.vy * 0.4;
                             }
                        }

                        // Horizontal Collision
                        // Re-check overlap after Y adjustment
                        if (this.y + this.h > row * TILE_SIZE && this.y < (row+1) * TILE_SIZE) {
                            if (this.vx > 0) {
                                let blockLeft = col * TILE_SIZE;
                                if (this.x + this.w > blockLeft && this.x + this.w - this.vx <= blockLeft + 10) {
                                    this.x = blockLeft - this.w;
                                    this.vx = -this.vx * 0.6; // Bounce off wall
                                }
                            } else if (this.vx < 0) {
                                let blockRight = (col+1) * TILE_SIZE;
                                if (this.x < blockRight && this.x - this.vx >= blockRight - 10) {
                                    this.x = blockRight;
                                    this.vx = -this.vx * 0.6; // Bounce off wall
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    draw(ctx, camX, camY, now) {
        let cx = this.x - camX + this.w/2;
        let cy = this.y - camY + this.h/2;

        ctx.save();
        ctx.translate(cx, cy);

        // Draw Player Inside
        if (this.occupied && this.driver) {
             // Calculate animation frame based on ball rotation/speed
             let runFrame = Math.floor(Math.abs(this.angle * 2)); // Map rotation to frames

             ctx.save();
             // Counter-rotate player so they stay upright-ish?
             // Or let them run inside like a hamster wheel?
             // If we rotate the ball, the player should run at the bottom.
             // So player stays upright relative to world, but feet move.

             ctx.translate(0, 10); // Lower in ball
             ctx.scale(this.driver.facing, 1);
             drawAnatomicalHero(ctx, this.driver.charData, runFrame, { type: null, timer: 0 }, 0);
             ctx.restore();
        }

        // Rotate Ball Context
        ctx.rotate(this.angle);

        // Draw Transparent Sphere
        ctx.beginPath();
        ctx.arc(0, 0, this.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(100, 200, 255, 0.3)";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.stroke();

        // Draw "Hamster Wheel" bars/rims
        ctx.beginPath();
        ctx.moveTo(0, -this.r); ctx.lineTo(0, this.r);
        ctx.moveTo(-this.r, 0); ctx.lineTo(this.r, 0);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.stroke();

        ctx.restore(); // Undo rotation for attachments that should face direction

        // Draw Attachments (Jetpack / Minigun) - Fixed orientation
        ctx.save();
        ctx.translate(cx, cy);

        let facing = this.occupied ? this.driver.facing : (this.vx > 0 ? 1 : -1);

        // Jetpack (Back)
        ctx.fillStyle = "#555";
        ctx.fillRect(-10 - (facing*25), -10, 10, 20); // Behind ball

        // Minigun (Front/Side)
        ctx.fillStyle = "#222";
        ctx.save();
        ctx.translate(facing * 25, 5); // Mount point
        // Barrels
        ctx.fillStyle = "#888";
        ctx.fillRect(0, -5, 20, 4);
        ctx.fillRect(0, 0, 20, 4);
        ctx.fillRect(0, 5, 20, 4);
        // Base
        ctx.fillStyle = "#333";
        ctx.fillRect(-5, -8, 10, 20);
        ctx.restore();

        ctx.restore();
    }
}

export class Helicopter {
    constructor(x, y, isIntro = false) {
        this.x = x; this.y = y; this.w = 120; this.h = 60;
        this.timer = 0;
        this.isIntro = isIntro;
        this.hp = 1000;
    }
    update() {
        this.timer++;
        // Hover
        this.y += Math.sin(this.timer * 0.1) * 2;

        // Extraction
        // Only extract if it's NOT the intro heli
        if (!this.isIntro && players) {
            for(let p of players) {
                if (p.health > 0 && checkRectOverlap(this, p)) {
                    gameState.levelComplete = true;
                    winGame();
                    break;
                }
            }
        }

        // If intro heli, fly away after a bit
        if (this.isIntro && this.timer > 100) {
            this.y -= 2;
            this.x -= 2;
            if(this.y < -200) this.x = -9999;
        }
    }
    draw(ctx, camX, camY, now) {
        let cx = this.x - camX;
        let cy = this.y - camY;
        ctx.fillStyle = "#27ae60"; // Green friendly heli
        drawRoundedRect(ctx, cx, cy, 100, 50, 10);
        // Rotor
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(cx - 20, cy - 10, 140, 5);
        // Tail
        ctx.fillStyle = "#27ae60";
        ctx.fillRect(cx - 40, cy + 10, 40, 10);
        ctx.fillRect(cx - 50, cy, 10, 30);

        // Ladder
        ctx.strokeStyle = "#fff";
        ctx.beginPath();
        ctx.moveTo(cx + 50, cy + 50);
        ctx.lineTo(cx + 50, cy + 100);
        ctx.stroke();
    }
}

export class Dumpster {
    constructor(x, y) {
        this.x = x; this.y = y; this.w = 60; this.h = 40;
        this.hp = 100;
    }
    update() {
        // Gravity
        this.y += 5;
        let r = Math.floor((this.y + this.h) / TILE_SIZE);
        let c = Math.floor((this.x + this.w / 2) / TILE_SIZE);
        if (r >= 0 && r < LEVEL_HEIGHT && c >= 0 && c < LEVEL_WIDTH && tiles[r] && tiles[r][c] && tiles[r][c].type !== 0) {
             this.y = r * TILE_SIZE - this.h;
        }
    }
    draw(ctx, camX, camY, now) {
        ctx.fillStyle = "#2c3e50"; // Dark blue
        ctx.fillRect(this.x - camX, this.y - camY, this.w, this.h);
        ctx.fillStyle = "#95a5a6"; // Lid
        ctx.fillRect(this.x - camX - 2, this.y - camY - 5, this.w + 4, 5);
    }
}

export class TrappedBeast {
    constructor(x, y) {
        this.x = x; this.y = y; this.w = 40; this.h = 40;
        this.freed = false;
        this.hp = 100; // Required to persist in entity list

        // Decide which character is trapped. This is the character the player will switch to.
        // We pick from currently unlocked characters to ensure valid switch logic,
        // OR we could pick the NEXT unlockable if we want to preview it (but the switch logic needs to match).

        // Current logic: unlockCharacter() bumps globalUnlocked.
        // Switch logic: Picks random unlocked.

        // Let's make it consistent: The cage holds a specific character.
        // If you free them, you switch to THAT character.

        // To keep it simple and robust:
        // Pick a random unlocked character to be the "prisoner".
        let availableCount = Math.max(1, gameState.globalUnlocked);
        let possibleChars = CHARACTERS.slice(0, availableCount);
        this.prisonerChar = possibleChars[Math.floor(secureRandom() * possibleChars.length)];
    }
    update() {
        // Check intersection with any player
        let touchingPlayer = null;
        if (!this.freed && players) {
            for (let p of players) {
                if (p.health > 0 && checkRectOverlap(this, p)) {
                    touchingPlayer = p;
                    break;
                }
            }
        }

        if (touchingPlayer) {
            this.freed = true;
            spawnExplosion(this.x, this.y, "green", 2);
            unlockCharacter(touchingPlayer); // This might unlock a NEW char, but we switch to the prisoner
            gameState.rescues++;

            // Extra Life
            gameState.lives++;
            spawnDamageNumber(this.x, this.y - 40, "1 UP!", "gold");

            // Revive ONE dead teammate
            if (players) {
                for(let p of players) {
                    if (p.dead) {
                        p.dead = false;
                        p.health = 3;
                        p.x = this.x;
                        p.y = this.y - 40; // Spawn slightly above
                        p.vx = 0; p.vy = -5; // Pop up
                        p.invincible = 120;
                        spawnExplosion(p.x, p.y, "#00ff41", 2);
                        spawnDamageNumber(p.x, p.y - 20, "REVIVED!", "green");
                        break; // Only one per cage
                    }
                }
            }

            if(typeof soundManager !== 'undefined' && soundManager) soundManager.play('powerup');
            try { updateUI(); } catch(e) {}

            // Switch Character Logic - Switch to the specific prisoner we saw
            if (touchingPlayer && this.prisonerChar) {
                touchingPlayer.setCharacter(this.prisonerChar.id);
                touchingPlayer.health = 3; // Reset health
                updateUI(); // Reflect health change

                spawnExplosion(touchingPlayer.x, touchingPlayer.y, "white", 2);
                spawnDamageNumber(touchingPlayer.x, touchingPlayer.y - 60, "SWITCH!", "cyan");
            }
        }
    }
    draw(ctx, camX, camY, now) {
        if (this.freed) return;
        let cx = this.x - camX;
        let cy = this.y - camY;

        // Character inside (scaled down to fit 40x40 cage)
        ctx.save();
        ctx.translate(cx + 20, cy + 30); // Center, slightly down
        ctx.scale(0.8, 0.8); // Scale
        drawAnatomicalHero(ctx, this.prisonerChar, 0, { type: null, timer: 0 });
        ctx.restore();

        // Cage Bars (Overlay)
        ctx.strokeStyle = "#bdc3c7";
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, this.w, this.h);
        for(let i=10; i<this.w; i+=10) {
            ctx.beginPath(); ctx.moveTo(cx+i, cy); ctx.lineTo(cx+i, cy+this.h); ctx.stroke();
        }
    }
}

export class Mailman {
    constructor(x, y) {
        this.x = x; this.y = y; this.w = 30; this.h = 60;
        this.vx = 2;
        this.hp = 100;
    }
    update() {
        this.x += this.vx;
        // Turn around
        let c = Math.floor((this.x + (this.vx>0?this.w:0)) / TILE_SIZE);
        let r = Math.floor((this.y + this.h/2) / TILE_SIZE);
        if (tiles[r] && tiles[r][c] && tiles[r][c].type !== 0) this.vx *= -1;
    }
    draw(ctx, camX, camY, now) {
        ctx.fillStyle = "#3498db"; // Uniform
        ctx.fillRect(this.x - camX, this.y - camY, this.w, this.h);
        ctx.fillStyle = "#ecf0f1"; // Bag
        ctx.fillRect(this.x - camX - 5, this.y - camY + 20, 10, 20);
    }
}

export class SpikeTrap {
    constructor(x, y) {
        this.x = x; this.y = y; this.w = TILE_SIZE; this.h = TILE_SIZE;
        this.solid = true;
        this.state = 0; // 0: Idle, 1: Warning, 2: Active, 3: Retract
        this.timer = 0;
        this.hp = 1000;
    }
    update() {
        if (this.state === 0) {
            if (players) {
                for (let p of players) {
                    if (p.health > 0 && Math.abs(p.x - this.x) < 20 && Math.abs((p.y + p.h) - (this.y + this.h)) < 10) {
                        this.state = 1; this.timer = 20; break;
                    }
                }
            }
        } else if (this.state === 1) {
            this.timer--;
            if (this.timer <= 0) { this.state = 2; this.timer = 60; this.checkDamage(); }
        } else if (this.state === 2) {
             this.checkDamage();
             this.timer--;
             if (this.timer <= 0) { this.state = 3; this.timer = 30; }
        } else if (this.state === 3) {
            this.timer--;
            if (this.timer <= 0) this.state = 0;
        }
    }
    checkDamage() {
        if (players) {
            for (let p of players) {
                 if (checkRectOverlap(this, p)) { p.takeDamage(1); p.vy = -8; }
            }
        }
    }
    draw(ctx, camX, camY, now) {
        let cx = this.x - camX; let cy = this.y - camY;
        ctx.fillStyle = "#555"; ctx.fillRect(cx, cy + 10, this.w, this.h - 10);
        ctx.fillStyle = "#222";
        ctx.beginPath(); ctx.arc(cx+10, cy+15, 3, 0, 6.28); ctx.arc(cx+30, cy+15, 3, 0, 6.28); ctx.fill();
        if (this.state === 1) {
             if (Math.floor(now/100)%2===0) { ctx.fillStyle = "red"; ctx.fillRect(cx+15, cy+12, 10, 5); }
        } else if (this.state === 2) {
            ctx.fillStyle = "#bdc3c7";
            ctx.beginPath();
            ctx.moveTo(cx + 5, cy + 15); ctx.lineTo(cx + 10, cy - 20); ctx.lineTo(cx + 15, cy + 15);
            ctx.moveTo(cx + 25, cy + 15); ctx.lineTo(cx + 30, cy - 20); ctx.lineTo(cx + 35, cy + 15);
            ctx.fill();
        }
    }
}

export class MovingPlatform {
    constructor(x, y, range, axis = 'x') {
        this.x = x; this.y = y; this.w = 60; this.h = 20;
        this.startX = x; this.startY = y;
        this.range = range; this.axis = axis;
        this.timer = 0;
        this.solid = true;
        this.vx = 0; this.vy = 0;
        this.hp = 9999;
    }
    update() {
        this.timer += 0.05;
        let offset = Math.sin(this.timer) * this.range;
        let prevX = this.x; let prevY = this.y;

        if (this.axis === 'x') this.x = this.startX + offset;
        else this.y = this.startY + offset;

        this.vx = this.x - prevX;
        this.vy = this.y - prevY;
    }
    draw(ctx, camX, camY, now) {
        let cx = this.x - camX; let cy = this.y - camY;
        ctx.fillStyle = "#34495e";
        drawRoundedRect(ctx, cx, cy, this.w, this.h, 5);
        ctx.fillStyle = "#f39c12"; // Hazard stripes
        for(let i=0; i<this.w; i+=10) ctx.fillRect(cx+i, cy, 5, this.h);
    }
}

export class MovingHazard {
    constructor(x, y, range, axis = 'x') {
        this.x = x; this.y = y; this.w = 40; this.h = 40;
        this.startX = x; this.startY = y;
        this.range = range; this.axis = axis;
        this.timer = 0;
        this.solid = true; // Push player
        this.hp = 9999;
    }
    update() {
        this.timer += 0.1;
        let offset = Math.sin(this.timer) * this.range;
        if (this.axis === 'x') this.x = this.startX + offset;
        else this.y = this.startY + offset;

        // Spin
        this.angle = this.timer * 5;

        if (players) {
            for (let p of players) {
                if (checkRectOverlap(this, p)) { p.takeDamage(1); }
            }
        }
    }
    draw(ctx, camX, camY, now) {
        let cx = this.x - camX + this.w/2; let cy = this.y - camY + this.h/2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.angle);
        ctx.fillStyle = "#7f8c8d";
        ctx.beginPath();
        for(let i=0; i<8; i++) {
            ctx.rotate(Math.PI/4);
            ctx.moveTo(0, -20); ctx.lineTo(10, 0); ctx.lineTo(-10, 0);
        }
        ctx.fill();
        ctx.fillStyle = "#c0392b"; ctx.beginPath(); ctx.arc(0,0,10,0,6.28); ctx.fill();
        ctx.restore();
    }
}

export class BridgePlank {
    constructor(x, y) {
        this.x = x; this.y = y; this.w = 20; this.h = 10;
        this.solid = true;
        this.anchorY = y;
        this.vy = 0;
        this.hp = 50; // Breakable?
    }
    update() {
        // Spring physics
        let targetY = this.anchorY;
        // Check if player stands on it
        let weight = 0;
        if (players) {
            for (let p of players) {
                if (p.grounded && Math.abs((p.x+p.w/2) - (this.x+this.w/2)) < 15 && Math.abs(p.y+p.h - this.y) < 20) {
                    weight = 10;
                }
            }
        }

        let force = (targetY + weight - this.y) * 0.1;
        this.vy += force;
        this.vy *= 0.8; // Damping
        this.y += this.vy;
    }
    draw(ctx, camX, camY, now) {
        let cx = this.x - camX; let cy = this.y - camY;
        ctx.fillStyle = "#8e44ad"; // Wood color
        drawRoundedRect(ctx, cx, cy, this.w, this.h, 2);
        // Rope lines
        ctx.strokeStyle = "#555";
        ctx.beginPath(); ctx.moveTo(cx, cy+5); ctx.lineTo(cx-5, cy-5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+this.w, cy+5); ctx.lineTo(cx+this.w+5, cy-5); ctx.stroke();
    }
}

export class Decor {
    constructor(x, y, type) {
        this.x = x; this.y = y; this.type = type;
        this.w = 20; this.h = 20;
        this.sway = 0;
        this.timer = Math.random() * 100;
        this.solid = false;
        this.hp = 10; // Can be destroyed
    }
    update() {
        this.timer++;
        // Idle sway
        this.sway = Math.sin(this.timer * 0.05) * 5;

        // Player interaction
        if (players) {
            for (let p of players) {
                if (Math.abs(p.x - this.x) < 30 && Math.abs(p.y - this.y) < 30) {
                    this.sway += (p.vx || 0) * 2;
                }
            }
        }
        // Damping done by sin wave mostly, but let's clamp
    }
    draw(ctx, camX, camY, now) {
        let cx = this.x - camX; let cy = this.y - camY;
        ctx.save();
        ctx.translate(cx, cy);

        if (this.type === 'grass') {
            ctx.strokeStyle = "#2ecc71"; ctx.lineWidth = 2;
            for(let i=0; i<3; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(5 + this.sway/2, -10, 10*i - 10 + this.sway, -15 - Math.abs(this.sway));
                ctx.stroke();
            }
        } else if (this.type === 'vine') {
            ctx.strokeStyle = "#27ae60"; ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(this.sway, 10, -this.sway, 20, this.sway/2, 30);
            ctx.stroke();
            // Leaves
            ctx.fillStyle = "#2ecc71";
            ctx.beginPath(); ctx.arc(this.sway/2, 30, 3, 0, 6.28); ctx.fill();
        } else if (this.type === 'rock') {
            ctx.fillStyle = "#7f8c8d";
            ctx.beginPath();
            ctx.moveTo(0,0); ctx.lineTo(10, -10); ctx.lineTo(20, 0); ctx.fill();
        } else if (this.type === 'pipe') {
             ctx.fillStyle = "#555";
             ctx.fillRect(0, -10, 20, 40);
             ctx.strokeStyle="#333";
             ctx.strokeRect(0, -10, 20, 40);
        }
        ctx.restore();
    }
}
