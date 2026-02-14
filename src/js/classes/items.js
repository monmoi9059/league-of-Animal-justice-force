import { TILE_SIZE, GRAVITY, LEVEL_HEIGHT, LEVEL_WIDTH, CHARACTERS } from '../constants.js';
import { tiles, players, gameState } from '../state.js';
import { checkRectOverlap } from '../physics.js';
import { spawnExplosion, createExplosion, unlockCharacter, spawnDamageNumber } from '../utils.js';
import { drawRoundedRect } from '../graphics.js';
import { playerKeys } from '../state.js';
import { winGame } from '../game-flow.js';
import { updateUI } from '../ui.js';
import { secureRandom } from '../math.js';
import { entities } from '../state.js'; // TrappedBeast needs access to entities list implicitly? No, generated in level.js. But TrappedBeast adds to gameState via unlockCharacter.

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
            unlockCharacter(touchingPlayer);
            gameState.rescues++;

            // Extra Life
            gameState.lives++;
            spawnDamageNumber(this.x, this.y - 40, "1 UP!", "gold");
            if(typeof soundManager !== 'undefined' && soundManager) soundManager.play('powerup');
            try { updateUI(); } catch(e) {}

            // Switch Character Logic
            if (touchingPlayer) {
                // Pick random unlocked character
                let unlockedChars = CHARACTERS.slice(0, gameState.globalUnlocked);
                let newCharIndex = Math.floor(secureRandom() * unlockedChars.length);
                let newCharId = unlockedChars[newCharIndex].id;

                // Ensure switch if possible (optional, but good for UX)
                if (unlockedChars.length > 1 && newCharId === touchingPlayer.charData.id) {
                     newCharIndex = (newCharIndex + 1) % unlockedChars.length;
                     newCharId = unlockedChars[newCharIndex].id;
                }

                touchingPlayer.setCharacter(newCharId);
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
        // Cage
        ctx.strokeStyle = "#bdc3c7";
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, this.w, this.h);
        for(let i=10; i<this.w; i+=10) {
            ctx.beginPath(); ctx.moveTo(cx+i, cy); ctx.lineTo(cx+i, cy+this.h); ctx.stroke();
        }
        // Beast inside
        ctx.fillStyle = "#e67e22";
        ctx.beginPath(); ctx.arc(cx+20, cy+20, 10, 0, Math.PI*2); ctx.fill();
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
