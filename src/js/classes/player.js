import { CHARACTERS, LEVEL_HEIGHT, LEVEL_WIDTH, JUMP_FORCE, ACCELERATION, FRICTION, GRAVITY, TERMINAL_VELOCITY, TILE_SIZE, ASSETS } from '../constants.js';
import { updateUI } from '../ui.js';
import { gameState, playerKeys, tiles, particles, entities, players } from '../state.js';
import { winGame, endGame } from '../game-flow.js';
import { spawnExplosion, spawnDamageNumber, shakeCamera } from '../utils.js';
import { Particle, DustParticle } from './particles.js';
import { soundManager } from '../sound.js';
import { Bullet, MeleeHitbox } from './projectiles.js';
import { Dumpster } from './items.js';
import { drawAnatomicalHero } from '../graphics.js';
import { secureRandom } from '../math.js';
import { WEAPONS } from './weapons.js';

export class Player {
    constructor(index = 0) {
        this.index = index;
        this.reset();
        this.charData = CHARACTERS[index % CHARACTERS.length]; // Default to different chars for multiplayer
    }
    setCharacter(typeId) {
        this.charData = CHARACTERS.find(c => c.id === typeId) || CHARACTERS[0];
        // Apply Character Dimensions
        this.w = this.charData.w || 24;
        this.h = this.charData.h || 30;
        if (this.index === 0) updateUI(); // Only update UI for P1 for now
    }
    reset() {
        this.x = gameState.spawnPoint.x + (this.index * 20); // Spread spawn
        this.y = gameState.spawnPoint.y;
        this.w = 24; this.h = 30; // Default, overwritten in setCharacter
        this.vx = 0; this.vy = 0; this.speed = 5;
        this.grounded = false; this.facing = 1; this.health = 3; this.invincible = 0;
        this.stretchX = 1; this.stretchY = 1; this.animFrame = 0;
        this.lastY = this.y;
        this.secondaryCooldown = 0;
        this.shootCooldown = 0;
        this.specialCooldown = 0;
        this.attackAnim = { type: null, timer: 0, max: 0 };
        this.wallJumpLocked = false;

        // Travel Ability Stats
        this.stamina = 100;
        this.maxStamina = 100;
        this.staminaRecharge = 1;

        this.dead = false;
    }
    respawn() {
        gameState.lives--; updateUI(); if(gameState.lives <= 0) { endGame(); return; }

        // Pick from unlocked characters
        let unlockedChars = CHARACTERS.slice(0, gameState.globalUnlocked);
        let newCharIndex = Math.floor(secureRandom() * unlockedChars.length);
        this.setCharacter(unlockedChars[newCharIndex].id);

        this.x = gameState.spawnPoint.x; this.y = gameState.spawnPoint.y - 40;
        this.vx = 0; this.vy = 0; this.health = 3; this.invincible = 120;
        this.stamina = 100;
        this.dead = false;
        spawnExplosion(this.x, this.y, "#00ff41", 2);
        if(soundManager) soundManager.play('powerup'); // Respawn sound
    }

    // --- WALL DETECTION ---
    checkWall(dir) {
        if (!tiles) return false;
        let sensorSize = 2; // Check 2 pixels away
        let checkX = dir > 0 ? this.x + this.w + sensorSize : this.x - sensorSize;

        // Check top, middle, and bottom points to ensure we are really next to a wall
        let points = [this.y, this.y + this.h/2, this.y + this.h - 1];

        for (let py of points) {
            let r = Math.floor(py / TILE_SIZE);
            let c = Math.floor(checkX / TILE_SIZE);
            if (r>=0 && r<LEVEL_HEIGHT && c>=0 && c<LEVEL_WIDTH && tiles[r] && tiles[r][c] && (tiles[r][c].type === 1 || tiles[r][c].type === 2 || tiles[r][c].type === 3)) {
                return true;
            }
        }
        return false;
    }

    update() {
        if (this.dead) return;
        this.lastY = this.y;
        if(this.secondaryCooldown > 0) this.secondaryCooldown--;
        if(this.attackAnim.timer > 0) this.attackAnim.timer--;

        // Stamina Recharge
        if (this.grounded) {
            if (this.stamina < this.maxStamina) this.stamina += this.staminaRecharge;
        }

        // INPUT SOURCE
        let pKeys = playerKeys[this.index] || {};

        // FLEX LOGIC
        if (pKeys['f']) {
            this.vx = 0; // Stop moving
            this.attackAnim = { type: 'flex', timer: 10, max: 10 }; // Keep resetting timer as long as held
            if (gameState.frame % 10 === 0) {
                 spawnDamageNumber(this.x, this.y - 20, "FLEX!", "gold");
                 shakeCamera(2);
            }
            // Optional: Slight heal or invincibility?
            // Let's just make it cool for now.
            // Gravity still applies
            this.vy += GRAVITY;
            this.y += this.vy;
            this.checkCollisions(false);
            return;
        }

        // LADDER CHECK
        let cx = Math.floor((this.x + this.w/2) / TILE_SIZE);
        let cy = Math.floor((this.y + this.h/2) / TILE_SIZE);
        let onLadder = (cy>=0 && cy<LEVEL_HEIGHT && cx>=0 && cx<LEVEL_WIDTH && tiles[cy] && tiles[cy][cx] && tiles[cy][cx].type === 6);

        let input = 0;
        if (pKeys['arrowleft'] || pKeys['a']) input = -1;
        if (pKeys['arrowright'] || pKeys['d']) input = 1;

        // SECONDARY ATTACK
        if ((pKeys['c'] || pKeys['v']) && this.secondaryCooldown <= 0) {
            this.performSecondary();
            this.secondaryCooldown = 30;
        }

        // SPRINT LOGIC
        let isSprinting = pKeys['shift'];
        this.speed = isSprinting ? 9 : 5;

        // WALL LOGIC
        let wallDir = 0;
        if (this.checkWall(-1)) wallDir = -1;
        if (this.checkWall(1)) wallDir = 1;

        let isWallSliding = false;
        let isClimbing = false;

        // --- CLIMB ABILITY ---
        if (this.charData.trait === 'climb' && wallDir !== 0 && !this.grounded) {
             // Full Climbing Control
             isClimbing = true;
             this.vx = 0;
             this.vy = 0; // Stick to wall

             // Up/Down Movement
             if (pKeys['arrowup'] || pKeys['w']) this.vy = -4;
             if (pKeys['arrowdown'] || pKeys['s']) this.vy = 4;

             // Wall Jump
             if (pKeys[' '] && !this.wallJumpLocked) {
                 this.vy = JUMP_FORCE;
                 if(soundManager) soundManager.play('jump');
                 this.vx = -wallDir * 5; // Reduced bounce
                 this.wallJumpLocked = true;
                 this.facing = -wallDir;
                 spawnExplosion(this.x + (wallDir > 0 ? this.w : 0), this.y + this.h/2, ASSETS.dirtLight, 0.5);
                 isClimbing = false;
             }
        }
        else if (!this.grounded && wallDir !== 0 && input === wallDir && this.vy > 0) {
            // Standard Wall Slide (for non-climbers)
            isWallSliding = true;

            // Wall Slide Physics (Slow fall)
            if (this.vy > 2) this.vy = 2;

            // Wall Jump Logic
            // We check jump key here directly to override normal jump behavior
            if (pKeys[' '] && !this.wallJumpLocked) {
                this.vy = JUMP_FORCE;
                if(soundManager) soundManager.play('jump');
                this.vx = -wallDir * 5; // Reduced bounce
                this.wallJumpLocked = true; // Prevent spam
                this.facing = -wallDir; // Face away

                // Visuals
                spawnExplosion(this.x + (wallDir > 0 ? this.w : 0), this.y + this.h/2, ASSETS.dirtLight, 0.5);

                // Force exit slide state immediately
                isWallSliding = false;
            }
        }

        // Reset jump lock when key released
        if (!pKeys[' ']) this.wallJumpLocked = false;

        if (onLadder) {
            this.vy = 0;

            // Allow lateral movement to get off
            if (input !== 0) {
                this.vx = input * 3;
            } else {
                // Smooth snap to center
                let targetX = cx * TILE_SIZE + (TILE_SIZE - this.w) / 2;
                this.vx = (targetX - this.x) * 0.2;
            }

            if (pKeys['arrowup'] || pKeys['w']) this.vy = -3;
            if (pKeys['arrowdown'] || pKeys['s']) this.vy = 3;

            // Jump
            if (pKeys[' ']) { this.vy = JUMP_FORCE; if(soundManager) soundManager.play('jump'); }
        } else if (!isClimbing) { // Only apply normal physics if NOT climbing
            // Only apply normal physics if NOT wall jumping this frame
            if (!this.wallJumpLocked) {
                if (input !== 0) {
                    this.vx += input * ACCELERATION; this.facing = input;
                    this.animFrame += isSprinting ? 2 : 1;
                    let dustFreq = isSprinting ? 5 : 10;
                    if(this.grounded && this.animFrame % dustFreq === 0) {
                        particles.push(new DustParticle(this.x + this.w/2, this.y + this.h, "#fff"));
                    }
                } else { this.vx *= FRICTION; this.animFrame = 0; }

                if(Math.abs(this.vx) > this.speed) this.vx = Math.sign(this.vx) * this.speed;
            }

            // Normal Jump
            if (pKeys[' '] && this.grounded && !isWallSliding) {
                this.vy = JUMP_FORCE; this.grounded = false; this.stretchX = 0.7; this.stretchY = 1.3;
                if(soundManager) soundManager.play('jump');
                // Jump dust
                for(let i=0; i<3; i++) particles.push(new DustParticle(this.x + this.w/2 + (Math.random()-0.5)*10, this.y + this.h, "#fff"));
            }

            // --- FLY ABILITY ---
            if (this.charData.trait === 'fly') {
                if (pKeys[' '] && this.stamina > 0) {
                    this.vy -= 1.5; // Thrust
                    if(this.vy < -7) this.vy = -7; // Cap ascent
                    this.stamina -= 1;
                    this.grounded = false;
                    // Jetpack Particles
                    if (gameState.frame % 3 === 0) {
                        particles.push(new Particle(this.x + this.w/2, this.y + this.h, "#fff", 0, 2));
                    }
                }
            }

            this.vy += GRAVITY;
            if(this.vy > TERMINAL_VELOCITY) this.vy = TERMINAL_VELOCITY;
        }

        // Dust particles for wall slide/climb
        if ((isWallSliding || isClimbing) && gameState.frame % 5 === 0) {
             particles.push(new Particle(this.x + (wallDir > 0 ? this.w : 0), this.y + this.h, "#fff"));
        }

        // Apply Shoot Input (Separate from movement)
        if(this.shootCooldown > 0) this.shootCooldown--;
        if(this.specialCooldown > 0) this.specialCooldown--;

        if((pKeys['z'] || pKeys['j']) && this.shootCooldown <= 0) {
            let isDown = pKeys['arrowdown'] || pKeys['s'];
            let isUp = pKeys['arrowup'] || pKeys['w'];
            this.shoot(false, isDown, isUp);
            // SHOOTING SPEED BUFF for non-travelers
            this.shootCooldown = this.charData.trait ? 15 : 10;
        }
        if((pKeys['x'] || pKeys['k']) && this.specialCooldown <= 0) {
            this.shoot(true, false); this.specialCooldown = 120;
        }

        this.x += this.vx; this.checkCollisions(true);
        this.y += this.vy; this.checkCollisions(false);
        this.stretchX += (1 - this.stretchX) * 0.1; this.stretchY += (1 - this.stretchY) * 0.1;
        if(this.invincible > 0) this.invincible--;
        if (this.y > (LEVEL_HEIGHT + 5) * TILE_SIZE) this.takeDamage(99);
    }

    checkCollisions(isX) {
        if (!tiles) return;

        let l = Math.floor(this.x / TILE_SIZE);
        let r = Math.floor((this.x + this.w - 0.01) / TILE_SIZE);
        let t = Math.floor(this.y / TILE_SIZE);
        let b = Math.floor((this.y + this.h - 0.01) / TILE_SIZE);

        for(let row = t; row <= b; row++) {
            for(let col = l; col <= r; col++) {
                if(row>=0 && row<LEVEL_HEIGHT && col>=0 && col<LEVEL_WIDTH && tiles[row] && tiles[row][col] && tiles[row][col].type !== 0) {
                    let type = tiles[row][col].type;

                    if(type === 6) continue; // Ignore ladders for solid collision
                    if(type === 4) { this.takeDamage(); return; }
                    if(type === 9) { winGame(); return; }
                    if(type === 5) {
                        if(!tiles[row][col].active) {
                            tiles[row][col].active = true; gameState.checkpointsHit++;
                            gameState.spawnPoint = { x: col * TILE_SIZE, y: (row * TILE_SIZE) - 40 };
                            spawnExplosion(col*TILE_SIZE+20, row*TILE_SIZE+20, "#00ff41", 2);
                            if(this.health < 3) this.health = 3;

                            // Revive dead players
                            if (players) {
                                players.forEach(p => {
                                    if (p.dead) {
                                        p.dead = false;
                                        p.health = 3;
                                        p.x = gameState.spawnPoint.x;
                                        p.y = gameState.spawnPoint.y;
                                        p.vx = 0; p.vy = 0;
                                        p.invincible = 120;
                                        spawnExplosion(p.x, p.y, "#00ff41", 2);
                                        if(soundManager) soundManager.play('powerup');
                                    }
                                });
                            }
                            updateUI();
                        }
                        continue;
                    }
                    if(type === 1 || type === 2 || type === 3) {
                        if(isX) {
                            if(this.vx > 0) {
                                this.x = (col * TILE_SIZE) - this.w;
                                this.vx = 0;
                            } else if (this.vx < 0) {
                                this.x = (col * TILE_SIZE) + TILE_SIZE;
                                this.vx = 0;
                            }
                        } else {
                            if(this.vy > 0) {
                                // Only land if feet were previously above the block
                                if (this.lastY + this.h <= row * TILE_SIZE + 15) {
                                    this.y = (row * TILE_SIZE) - this.h;
                                    this.vy = 0;
                                    if(!this.grounded) {
                                        this.stretchX = 1.4; this.stretchY = 0.6;
                                        // Land dust
                                        for(let i=0; i<5; i++) particles.push(new DustParticle(this.x + this.w/2 + (Math.random()-0.5)*10, this.y + this.h, "#fff"));
                                    }
                                    this.grounded = true;
                                    return;
                                }
                            } else if (this.vy < 0) {
                                this.y = (row * TILE_SIZE) + TILE_SIZE;
                                this.vy = 0;
                                return;
                            }
                        }
                    }
                }
            }
        }
    }
    takeDamage(amt = 1) {
        if(this.invincible > 0 || this.dead) return;
        this.health -= amt; shakeCamera(15); this.invincible = 60; spawnExplosion(this.x, this.y, "red");
        if(soundManager) soundManager.play('hurt');

        if(this.health <= 0) {
            // Multiplayer Logic
            if (players && players.length > 1) {
                this.dead = true;
                this.x = -9999; // Move offscreen

                // Check if ALL are dead
                let allDead = true;
                for(let p of players) {
                    if (!p.dead && p.health > 0) {
                        allDead = false;
                        break;
                    }
                }

                if (allDead) {
                    if (gameState.lives > 1) { // Check > 1 because we will decrement
                        gameState.lives--;
                        players.forEach(p => {
                            p.dead = false;
                            p.health = 3;
                            p.x = gameState.spawnPoint.x;
                            p.y = gameState.spawnPoint.y - 40;
                            p.vx = 0; p.vy = 0;
                            p.invincible = 120;
                            spawnExplosion(p.x, p.y, "#00ff41", 2);
                        });
                        spawnDamageNumber(gameState.spawnPoint.x, gameState.spawnPoint.y, "GROUP RESPAWN!", "#00ff41");
                        if(soundManager) soundManager.play('powerup');
                    } else {
                        endGame();
                    }
                } else {
                    spawnDamageNumber(gameState.spawnPoint.x, gameState.spawnPoint.y, "PLAYER DOWN!", "red");
                }
            } else {
                this.respawn();
            }
        }
        updateUI();
    }

    performSecondary() {
        if (this.charData.melee) {
            // Melee chars get a secondary ranged attack (Throwable/Gun)
            entities.push(new Bullet(
                this.x + (this.facing > 0 ? this.w : 0),
                this.y + 10,
                this.facing,
                false,
                this.charData, // Inherit mainly for safety, but isSecondary overrides most stats
                false, // isDown
                true   // isSecondary
            ));
            this.attackAnim = { type: 'shoot', timer: 10, max: 10 };
            if(soundManager) soundManager.play('shoot');
        } else {
            // Ranged chars get a secondary melee attack (Kick)
            entities.push(new MeleeHitbox(this.x + (this.facing===1?0:-40), this.y, 40, 40, this, 1));
            // Visual
            particles.push(new Particle(this.x + (this.facing*20), this.y + 10, "white"));
            this.attackAnim = { type: 'kick', timer: 15, max: 15 };
        }
    }

    shoot(isSpecial, isDown, isUp = false) {
        particles.push(new Particle(this.x + (this.facing*30), this.y + 10, "yellow"));
        shakeCamera(2);

        // Determine spawn point based on stance
        let spawnX = this.x + this.w/2 + (this.facing * 10);
        let spawnY = this.y + 15;

        // Adjust for weapon mount type
        if (this.charData.mount === 'back') {
            spawnY = this.y + 5;
            spawnX = this.x + this.w/2 + (this.facing * 5);
        } else if (this.charData.mount === 'mouth') {
            spawnY = this.y + this.h - 10;
            spawnX = this.x + (this.facing === 1 ? this.w : 0);
        }

        // Generic Down/Up Shot Logic to preserve platforming mechanics
        if (!isSpecial) {
             if (isDown) {
                 // Hover / Down Shot
                 entities.push(new Bullet(this.x + this.w/2 - 5, this.y + this.h, this.facing, isSpecial, { pColor: '#fff', pType: 'normal' }, true));
                 this.vy = -2; // Hover effect
                 return;
             }
             if (isUp) {
                 // Up Shot
                 entities.push(new Bullet(this.x + this.w/2 - 5, this.y - 20, this.facing, isSpecial, { pColor: '#fff', pType: 'normal' }, false, false, true));
                 return;
             }
        }

        // UNIQUE WEAPON LOGIC
        let weapon = WEAPONS[this.charData.id];
        if (weapon) {
            if (isSpecial) {
                if (weapon.special) {
                    weapon.special(this);
                    this.attackAnim = { type: 'punch', timer: 15, max: 15 }; // Generic anim trigger
                }
            } else {
                if (weapon.shoot) {
                    weapon.shoot(this);
                    this.attackAnim = { type: 'shoot', timer: 10, max: 10 }; // Generic anim trigger
                }
            }
        } else {
             // Fallback for undefined weapons
             entities.push(new Bullet(spawnX, spawnY, this.facing, isSpecial, this.charData));
             this.attackAnim = { type: 'shoot', timer: 10, max: 10 };
        }

        if (!isSpecial) this.vx -= this.facing * 2; // Recoil
    }

    draw(ctx, camX, camY, now) {
        if (this.dead) return;
        if (this.invincible > 0 && Math.floor(gameState.frame / 4) % 2 === 0) return;
        let cx = this.x - camX + this.w/2;
        let cy = this.y - camY + this.h/2 + (this.h * (1-this.stretchY));

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(this.facing * this.stretchX, this.stretchY);

        // Shadow (At ground level)
        // Adjust shadow based on width
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(0, this.h/2, this.w/1.5, 5, 0, 0, Math.PI*2); ctx.fill();

        // Offset sprite up so feet align with shadow/ground
        // Standard biped offset was -22 (approx h/2 + bob)
        // Dynamic offset:
        ctx.translate(0, -this.h/2 - 7); // -7 acts as base bob/leg padding

        drawAnatomicalHero(ctx, this.charData, this.animFrame, this.attackAnim, this.vy);
        ctx.restore();

        // DRAW STAMINA BAR
        if (this.charData.trait === 'fly') {
            ctx.fillStyle = "black";
            ctx.fillRect(cx - 15, cy - 60, 30, 6);
            ctx.fillStyle = "#00ffff";
            ctx.fillRect(cx - 14, cy - 59, 28 * (this.stamina/this.maxStamina), 4);
        }
    }
}
