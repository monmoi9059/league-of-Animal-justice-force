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
        this.hp = 100;
    }
    update() {
        // Trigger fall if player is near/under? Or just physics object?
        // Let's make it a physics object that falls if unsupported
        this.vy += GRAVITY;
        this.y += this.vy;

        let r = Math.floor((this.y + this.h) / TILE_SIZE);
        let c = Math.floor((this.x + this.w / 2) / TILE_SIZE);

        let maxW = tiles && tiles[0] ? tiles[0].length : LEVEL_WIDTH;
        let maxH = tiles ? tiles.length : LEVEL_HEIGHT;

        if (r >= 0 && r < maxH && c >= 0 && c < maxW && tiles[r] && tiles[r][c] && tiles[r][c].type !== 0) {
             this.y = r * TILE_SIZE - this.h;
             this.vy = 0;
        }

        // Damage player if falls on head?
        if ((Math.abs(this.vx) > 0 || Math.abs(this.vy) > 2) && players) {
            for (let p of players) {
                if (p.health > 0 && checkRectOverlap(this, p)) {
                    p.takeDamage(10);
                }
            }
        }
    }
    draw(ctx, camX, camY, now) {
        ctx.fillStyle = "#7f8c8d";
        ctx.fillRect(this.x - camX, this.y - camY, this.w, this.h);
        ctx.strokeStyle = "#2c3e50";
        ctx.strokeRect(this.x - camX, this.y - camY, this.w, this.h);
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

export class Decor {
    constructor(x, y, type, biome = 'forest') {
        this.x = x; this.y = y;
        this.type = type;
        this.biome = biome;
        this.hp = 50;
        this.foreground = false;
        this.projectilePassThrough = true;
        this.sway = 0;
        this.swaySpeed = 0.05 + Math.random() * 0.05;
        this.swayOffset = Math.random() * 100;

        this.w = 40; this.h = 40;
        this.vx = 0; this.vy = 0;

        if (type === 'tree') {
            this.w = 40; this.h = 120;
            this.foreground = true;
            this.hp = 200;
        } else if (type === 'bush') {
            this.w = 40; this.h = 30;
            this.foreground = true;
            this.hp = 20;
        } else if (type === 'rock') {
            this.w = 40; this.h = 30;
            this.hp = 500;
        } else if (type === 'sign') {
            this.w = 20; this.h = 40;
            this.hp = 50;
        } else if (type === 'fence') {
             this.w = 40; this.h = 30;
             this.foreground = true;
             this.hp = 50;
        } else if (type === 'crystal') {
             this.w = 30; this.h = 50;
             this.hp = 100;
        } else if (type === 'mushroom') {
             this.w = 30; this.h = 30;
             this.foreground = true;
             this.hp = 10;
        } else if (type === 'pipe') {
             this.w = 30; this.h = 60;
             this.hp = 200;
        } else if (type === 'hydrant') {
             this.w = 20; this.h = 30;
             this.foreground = true;
             this.hp = 80;
        } else if (type === 'trash') {
             this.w = 40; this.h = 30;
             this.hp = 30;
        } else if (type === 'stalactite') {
             this.w = 20; this.h = 60;
             this.hp = 100;
        } else if (type === 'stalagmite') {
             this.w = 20; this.h = 40;
             this.hp = 100;
        } else if (type === 'shack') {
             this.w = 80; this.h = 60;
             this.foreground = false; // Background building
             this.hp = 300;
        } else if (type === 'ruin_column') {
             this.w = 30; this.h = 100;
             this.hp = 200;
        } else if (type === 'lamp_post') {
             this.w = 10; this.h = 80;
             this.foreground = true;
             this.hp = 50;
        }

        // Adjust Y to sit on ground (assuming passed y is top-left of a standard tile)
        this.y = (y + TILE_SIZE) - this.h;

        // Special case for Stalactite (hanging from ceiling)
        if (type === 'stalactite') {
            this.y = y; // Should attach to top tile
        }
    }

    update() {
        if (this.type === 'stalactite') {
            // Check ceiling support
            let r = Math.floor((this.y - 1) / TILE_SIZE);
            let c = Math.floor((this.x + this.w / 2) / TILE_SIZE);
            if (!(r >= 0 && tiles[r] && tiles[r][c] && tiles[r][c].type !== 0)) {
                 this.hp = 0; // Fall? For now just destroy
                 spawnExplosion(this.x + this.w/2, this.y + 10, "grey", 0.5);
            }
        } else {
            // Floor support check
            let r = Math.floor((this.y + this.h + 1) / TILE_SIZE);
            let c = Math.floor((this.x + this.w / 2) / TILE_SIZE);

            if (!(r >= 0 && tiles[r] && tiles[r][c] && tiles[r][c].type !== 0)) {
                 this.hp = 0;
                 if(Math.random() < 0.1) spawnExplosion(this.x + this.w/2, this.y + this.h/2, "brown", 0.5);
            }
        }

        if (this.type === 'tree' || this.type === 'bush' || this.type === 'mushroom' || this.type === 'flower') {
             let swayTarget = 0;
             if (players) {
                 for (let p of players) {
                     if (Math.abs(p.x - (this.x + this.w/2)) < 60 && Math.abs(p.y - (this.y + this.h/2)) < 60) {
                         swayTarget = (p.vx || 0) * 0.1;
                         if (swayTarget > 0.5) swayTarget = 0.5;
                         if (swayTarget < -0.5) swayTarget = -0.5;
                     }
                 }
             }
             let wind = Math.sin((Date.now() / 1000) + this.swayOffset) * 0.05;
             this.sway += (swayTarget + wind - this.sway) * 0.1;
        }
    }

    takeDamage(amt) {
        this.hp -= amt;
        this.sway += 0.2; // Shake on hit
        if (this.hp <= 0) {
            this.x = -9999;
            spawnExplosion(this.x, this.y, this.type === 'rock' ? "grey" : "green", 1);
        }
    }

    draw(ctx, camX, camY, now) {
         let cx = this.x - camX;
         let cy = this.y - camY;

         if (this.type === 'tree') {
             ctx.fillStyle = "#5d4037";
             ctx.fillRect(cx + this.w/2 - 10, cy + 40, 20, this.h - 40);
             ctx.save();
             ctx.translate(cx + this.w/2, cy + 40);
             ctx.rotate(this.sway);
             ctx.fillStyle = this.biome === 'volcano' ? "#333" : "#2e7d32";
             if (this.biome === 'city') ctx.fillStyle = "#555";
             ctx.beginPath(); ctx.arc(0, -20, 40, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = "rgba(255,255,255,0.1)";
             ctx.beginPath(); ctx.arc(-10, -30, 10, 0, Math.PI*2); ctx.fill();
             ctx.restore();
         }
         else if (this.type === 'rock') {
             ctx.fillStyle = "#7f8c8d";
             if (this.biome === 'volcano') ctx.fillStyle = "#444";
             ctx.beginPath();
             ctx.moveTo(cx, cy + this.h);
             ctx.lineTo(cx + 10, cy + 10);
             ctx.lineTo(cx + 30, cy + 5);
             ctx.lineTo(cx + this.w, cy + this.h);
             ctx.fill();
         }
         else if (this.type === 'bush') {
             ctx.save();
             ctx.translate(cx + this.w/2, cy + this.h);
             ctx.rotate(this.sway);
             ctx.fillStyle = "#2ecc71";
             ctx.beginPath(); ctx.arc(0, -15, 20, 0, Math.PI*2); ctx.fill();
             ctx.restore();
         }
         else if (this.type === 'mushroom') {
             ctx.save();
             ctx.translate(cx + this.w/2, cy + this.h);
             ctx.rotate(this.sway);
             ctx.fillStyle = "#ecf0f1"; ctx.fillRect(-5, -15, 10, 15);
             ctx.fillStyle = "#e74c3c"; ctx.beginPath(); ctx.arc(0, -15, 15, Math.PI, 0); ctx.fill();
             ctx.restore();
         }
         else if (this.type === 'crystal') {
             ctx.fillStyle = "#9b59b6";
             ctx.beginPath();
             ctx.moveTo(cx + 15, cy + this.h);
             ctx.lineTo(cx + 5, cy + 20);
             ctx.lineTo(cx + 15, cy);
             ctx.lineTo(cx + 25, cy + 20);
             ctx.fill();
         }
         else if (this.type === 'sign') {
             ctx.fillStyle = "#8b4513";
             ctx.fillRect(cx + 8, cy + 10, 4, 30);
             ctx.fillStyle = "#deb887";
             ctx.fillRect(cx, cy, 20, 15);
             ctx.fillStyle = "#5d4037";
             ctx.font = "8px Arial"; ctx.fillText("-->", cx+2, cy+10);
         }
         else if (this.type === 'fence') {
             ctx.fillStyle = "#8b4513";
             ctx.fillRect(cx, cy+10, 5, 20);
             ctx.fillRect(cx+35, cy+10, 5, 20);
             ctx.fillRect(cx, cy+15, 40, 5);
             ctx.fillRect(cx, cy+25, 40, 5);
         }
         else if (this.type === 'hydrant') {
             ctx.fillStyle = "#e74c3c";
             ctx.fillRect(cx+5, cy+10, 10, 20);
             ctx.fillRect(cx+2, cy+5, 16, 5);
         }
         else if (this.type === 'trash') {
             ctx.fillStyle = "#222";
             ctx.beginPath(); ctx.arc(cx+20, cy+30, 15, Math.PI, 0); ctx.fill();
             ctx.fillRect(cx+5, cy+20, 30, 10);
         }
         else if (this.type === 'pipe') {
             ctx.fillStyle = "#27ae60";
             ctx.fillRect(cx+5, cy, 20, this.h);
             ctx.fillStyle = "#2ecc71";
             ctx.fillRect(cx, cy, 30, 10);
         }
         else if (this.type === 'stalactite') {
             ctx.fillStyle = this.biome === 'volcano' ? "#553333" : "#7f8c8d";
             ctx.beginPath();
             ctx.moveTo(cx, cy);
             ctx.lineTo(cx + this.w, cy);
             ctx.lineTo(cx + this.w/2, cy + this.h);
             ctx.fill();
         }
         else if (this.type === 'stalagmite') {
             ctx.fillStyle = this.biome === 'volcano' ? "#553333" : "#7f8c8d";
             ctx.beginPath();
             ctx.moveTo(cx + this.w/2, cy);
             ctx.lineTo(cx + this.w, cy + this.h);
             ctx.lineTo(cx, cy + this.h);
             ctx.fill();
         }
         else if (this.type === 'shack') {
             ctx.fillStyle = "#5d4037"; // Wood
             if (this.biome === 'city') ctx.fillStyle = "#555"; // Concrete
             ctx.fillRect(cx, cy, this.w, this.h);
             ctx.fillStyle = "#000"; // Door
             ctx.fillRect(cx + 20, cy + this.h - 30, 20, 30);
             ctx.fillStyle = "#8d6e63"; // Roof
             ctx.beginPath(); ctx.moveTo(cx-10, cy); ctx.lineTo(cx+this.w+10, cy); ctx.lineTo(cx+this.w/2, cy-20); ctx.fill();
         }
         else if (this.type === 'ruin_column') {
             ctx.fillStyle = "#95a5a6";
             ctx.fillRect(cx + 5, cy, 20, this.h);
             ctx.fillStyle = "#7f8c8d";
             ctx.fillRect(cx, cy, 30, 10); // Cap
             ctx.fillRect(cx, cy + this.h - 10, 30, 10); // Base
             // Cracks
             ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
             ctx.beginPath(); ctx.moveTo(cx+10, cy+20); ctx.lineTo(cx+20, cy+30); ctx.stroke();
         }
         else if (this.type === 'lamp_post') {
             ctx.fillStyle = "#2c3e50";
             ctx.fillRect(cx + 2, cy + 10, 6, this.h - 10);
             ctx.fillStyle = "#f1c40f"; // Light
             ctx.beginPath(); ctx.arc(cx + 5, cy + 10, 8, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = "rgba(241, 196, 15, 0.3)"; // Glow
             ctx.beginPath(); ctx.arc(cx + 5, cy + 10, 20, 0, Math.PI*2); ctx.fill();
         }
    }
}
