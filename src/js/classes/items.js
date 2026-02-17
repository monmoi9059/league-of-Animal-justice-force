import { TILE_SIZE, GRAVITY, LEVEL_HEIGHT, LEVEL_WIDTH, CHARACTERS } from '../constants.js';
import { tiles, players, gameState, entities, playerKeys } from '../state.js';
import { checkRectOverlap } from '../physics.js';
import { spawnExplosion, createExplosion, unlockCharacter, spawnDamageNumber } from '../utils.js';
import { drawRoundedRect, drawAnatomicalHero } from '../graphics.js';
import { winGame } from '../game-flow.js';
import { updateUI } from '../ui.js';
import { secureRandom } from '../math.js';
import { Bullet } from './projectiles.js';
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
        this.vx = 0; this.vy = 0;
        this.occupied = false;
        this.hp = 500;
        this.stamina = 200;
        this.maxStamina = 200;
        this.pilot = null;
        this.shootTimer = 0;
    }
    update() {
        // Apply Gravity
        this.vy += GRAVITY;

        if (!this.occupied) {
            // Simple falling when not occupied
             let r = Math.floor((this.y + this.h + this.vy) / TILE_SIZE);
             let c = Math.floor((this.x + this.w / 2) / TILE_SIZE);
             if (r >= 0 && r < LEVEL_HEIGHT && c >= 0 && c < LEVEL_WIDTH && tiles[r] && tiles[r][c] && tiles[r][c].type !== 0) {
                 this.y = r * TILE_SIZE - this.h;
                 this.vy = 0;
             } else {
                 this.y += this.vy;
             }

            // Interaction
            if (players) {
                for (let p of players) {
                    if (Math.abs(p.x - this.x) < 50 && Math.abs(p.y - this.y) < 50) {
                         let keys = playerKeys[p.index] || {};
                         // Press DOWN to enter (ArrowDown or S)
                         if (keys['arrowdown'] || keys['s']) {
                             this.enter(p);
                             break;
                         }
                    }
                }
            }
        } else {
            // CONTROLS
            if (this.pilot) {
                let keys = playerKeys[this.pilot.index] || {};

                // Move Left/Right
                if (keys['arrowleft'] || keys['a']) this.vx -= 1;
                if (keys['arrowright'] || keys['d']) this.vx += 1;

                // Fly (Up)
                if ((keys['arrowup'] || keys['w'] || keys[' ']) && this.stamina > 0) {
                    this.vy -= 1.5;
                    this.stamina -= 2;
                    // Particles
                    if (gameState.frame % 3 === 0) spawnExplosion(this.x + 30 + (Math.random()-0.5)*20, this.y + 70, "cyan", 0.5);
                } else if (this.stamina < this.maxStamina) {
                    // Recharge if on ground
                    if (this.vy === 0) this.stamina += 2;
                }

                // Eject (V)
                if (keys['v']) {
                    this.eject(this.pilot);
                    return;
                }

                // Shoot
                this.shootTimer--;
                if ((keys['z'] || keys['j']) && this.shootTimer <= 0) {
                     this.shoot();
                     this.shootTimer = 5; // Rapid Fire (Minigun)
                }

                // Friction / Max Speed
                this.vx *= 0.9;
                if (this.vy < -8) this.vy = -8;
                if (this.vy > 10) this.vy = 10;

                // COLLISION
                let nextX = this.x + this.vx;
                let nextY = this.y + this.vy;

                // X Collision
                let l = Math.floor(nextX / TILE_SIZE);
                let r = Math.floor((nextX + this.w) / TILE_SIZE);
                let t = Math.floor(this.y / TILE_SIZE);
                let b = Math.floor((this.y + this.h - 1) / TILE_SIZE);

                let hitX = false;
                for(let row = t; row <= b; row++) {
                    for(let col = l; col <= r; col++) {
                         if(row>=0 && row<LEVEL_HEIGHT && col>=0 && col<LEVEL_WIDTH && tiles[row] && tiles[row][col] && tiles[row][col].type !== 0) {
                             hitX = true;
                             this.vx = 0;
                         }
                    }
                }
                if (!hitX) this.x += this.vx;

                // Y Collision
                l = Math.floor(this.x / TILE_SIZE);
                r = Math.floor((this.x + this.w) / TILE_SIZE);
                t = Math.floor(nextY / TILE_SIZE);
                b = Math.floor((nextY + this.h) / TILE_SIZE);

                let hitY = false;
                for(let row = t; row <= b; row++) {
                     for(let col = l; col <= r; col++) {
                          if(row>=0 && row<LEVEL_HEIGHT && col>=0 && col<LEVEL_WIDTH && tiles[row] && tiles[row][col] && tiles[row][col].type !== 0) {
                              if (this.vy > 0) {
                                  this.y = row * TILE_SIZE - this.h;
                                  hitY = true;
                                  this.vy = 0;
                              } else if (this.vy < 0) {
                                  this.y = (row+1) * TILE_SIZE;
                                  hitY = true;
                                  this.vy = 0;
                              }
                          }
                     }
                }
                if (!hitY) this.y += this.vy;

                // Sync Pilot
                this.pilot.x = this.x + 18; // Center inside
                this.pilot.y = this.y + 20;
                this.pilot.vx = 0;
                this.pilot.vy = 0;

                // Keep pilot active/invincible so logic doesn't kill them
                this.pilot.invincible = 2;
            }
        }
    }
    enter(p) {
        this.occupied = true;
        p.inMech = true;
        p.mech = this;
        this.pilot = p;
        // Visual effect
        spawnExplosion(this.x + 30, this.y + 40, "cyan", 2);
    }
    eject(p) {
        this.occupied = false;
        p.inMech = false;
        p.mech = null;
        this.pilot = null;
        p.y -= 30; // Hop out top
        p.vy = -10;
        spawnExplosion(this.x + 30, this.y + 40, "white", 2);
    }
    shoot() {
        // Minigun Spread
        // Determine facing from velocity or fallback to pilot's last facing
        let facing = 1;
        if (Math.abs(this.vx) > 0.1) facing = Math.sign(this.vx);
        else if (this.pilot) facing = this.pilot.facing;

        let spawnX = facing === 1 ? this.x + 70 : this.x - 10;

        spawnExplosion(spawnX, this.y + 40, "yellow", 1);

        let b = new Bullet(spawnX, this.y + 40, facing, false, { pColor: 'orange', pType: 'normal', damage: 2 }); // Increased damage
        b.vx = facing * 20;
        b.vy = (secureRandom() - 0.5) * 3; // Spread
        b.w = 12; b.h = 4;

        entities.push(b);
        if(soundManager) soundManager.play('enemy_shoot');
    }
    takeDamage(amt) {
        this.hp -= amt;
        spawnDamageNumber(this.x, this.y, amt, "cyan");
        if (this.hp <= 0) {
            if (this.pilot) {
                this.eject(this.pilot);
            }
            createExplosion(this.x + 30, this.y + 40, 2, 50);
            this.x = -9999;
        }
    }
    draw(ctx, camX, camY, now) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        // Draw Pilot Inside if Occupied
        if (this.occupied && this.pilot) {
            ctx.save();
            // Draw pilot slightly smaller inside the cockpit
            ctx.translate(cx + 30, cy + 30);
            ctx.scale(0.8, 0.8);
            drawAnatomicalHero(ctx, this.pilot.charData, 0, { type: null, timer: 0 });
            ctx.restore();
        }

        // Mech Body
        ctx.fillStyle = "#34495e";
        drawRoundedRect(ctx, cx, cy, this.w, this.h, 10);

        // Cockpit Glass (Translucent)
        ctx.fillStyle = "rgba(241, 196, 15, 0.5)"; // Yellow glass
        ctx.fillRect(cx + 15, cy + 10, 30, 20);

        // Legs
        ctx.fillStyle = "#2c3e50";
        // Animate legs if moving
        let legOffset = Math.sin(now * 0.02) * 5 * (Math.abs(this.vx) > 0.1 ? 1 : 0);
        ctx.fillRect(cx + 10, cy + 60 + legOffset, 15, 20);
        ctx.fillRect(cx + 35, cy + 60 - legOffset, 15, 20);

        // Arms (Guns)
        ctx.fillStyle = "#7f8c8d";
        ctx.fillRect(cx - 10, cy + 30, 10, 20);
        ctx.fillRect(cx + 60, cy + 30, 10, 20);

        // Gun Barrels
        ctx.fillStyle = "#111";
        ctx.fillRect(cx - 10, cy + 50, 10, 5);
        ctx.fillRect(cx + 60, cy + 50, 10, 5);

        // Stamina Bar
        if (this.occupied) {
             ctx.fillStyle = "black";
             ctx.fillRect(cx + 5, cy - 10, 50, 6);
             ctx.fillStyle = "cyan";
             ctx.fillRect(cx + 6, cy - 9, 48 * (this.stamina/this.maxStamina), 4);
        }
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
