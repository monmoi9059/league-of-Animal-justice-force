
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 40;
        this.h = 60;
        this.vx = 0;
        this.vy = 0;
        this.hp = 3;
        this.facing = 1;
        this.state = 'patrol'; // patrol, chase
        this.timer = 0;
        this.shootTimer = 0;
        this.color = "#e74c3c"; // Default color asset
        this.blockedTimer = 0;
        this.speed = 2; // Default patrol speed
        this.chaseSpeed = 3;
    }

    update() {
        this.vy += GRAVITY;
        this.y += this.vy;

        // Vertical Collision (Ground)
        let r = Math.floor((this.y + this.h) / TILE_SIZE);
        let c = Math.floor((this.x + this.w / 2) / TILE_SIZE);

        // Check for solid ground (Type 1=Dirt, 2=Stone)
        if (r >= 0 && r < LEVEL_HEIGHT && c >= 0 && c < LEVEL_WIDTH && tiles[r] && tiles[r][c] && (tiles[r][c].type === 1 || tiles[r][c].type === 2)) {
            this.y = r * TILE_SIZE - this.h;
            this.vy = 0;
        }

        // AI Logic
        if (this.blockedTimer > 0) {
            this.blockedTimer--;
            // Force movement away from wall
            this.vx = this.facing * this.speed;
        } else if (player) {
            let dist = Math.sqrt(Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2));

            if (dist < 400) {
                this.state = 'chase';
            } else {
                this.state = 'patrol';
            }

            if (this.state === 'patrol') {
                if (this.timer <= 0) {
                    this.timer = 60 + Math.random() * 60;
                    this.facing = Math.random() < 0.5 ? -1 : 1;
                    this.vx = this.facing * this.speed;
                }
                this.timer--;
                this.vx = this.facing * this.speed;
            } else if (this.state === 'chase') {
                // Determine direction based on player, unless just blocked
                this.facing = player.x < this.x ? -1 : 1;
                this.vx = this.facing * this.chaseSpeed;

                this.shootTimer++;
                if (this.shootTimer > 60) {
                    this.shoot();
                    this.shootTimer = 0;
                }
            }
        }

        // Horizontal Movement & Wall/Ledge Collision
        let nextX = this.x + this.vx;

        // Check Wall Ahead
        // Check both top and bottom corners of the hitbox to avoid getting stuck on half-blocks
        let wallCheckY_Top = Math.floor(this.y / TILE_SIZE);
        let wallCheckY_Bot = Math.floor((this.y + this.h - 1) / TILE_SIZE);
        let wallCheckX = Math.floor((nextX + (this.vx > 0 ? this.w : 0)) / TILE_SIZE);

        let hitWall = false;
        if (wallCheckX >= 0 && wallCheckX < LEVEL_WIDTH) {
             let t1 = (tiles[wallCheckY_Top] && tiles[wallCheckY_Top][wallCheckX]);
             let t2 = (tiles[wallCheckY_Bot] && tiles[wallCheckY_Bot][wallCheckX]);

             if ((t1 && (t1.type === 1 || t1.type === 2)) || (t2 && (t2.type === 1 || t2.type === 2))) {
                 hitWall = true;
             }
        } else {
            hitWall = true; // Level boundary
        }

        // Check Ledge Ahead (Ground Check at next position)
        // We check the tile directly below the future feet position
        let ledgeCheckX = Math.floor((nextX + (this.vx > 0 ? this.w : 0)) / TILE_SIZE);
        // Or check center? Standard platformer check usually checks the leading edge.
        // If leading edge is over empty space, turn back.
        let ledgeCheckY = Math.floor((this.y + this.h + 2) / TILE_SIZE); // Look slightly down

        let hitLedge = false;
        if (ledgeCheckY < LEVEL_HEIGHT && ledgeCheckX >= 0 && ledgeCheckX < LEVEL_WIDTH) {
            let t = tiles[ledgeCheckY][ledgeCheckX];
            // If air (0) or non-solid, it's a ledge.
            if (!t || t.type === 0 || t.type === 4 || t.type === 6) {
                hitLedge = true;
            }
        } else {
             hitLedge = true; // Off map bottom
        }

        // React to Obstacle
        if (hitWall || hitLedge) {
            this.vx = 0;
            this.facing *= -1; // Turn around
            this.blockedTimer = 60; // Ignore player/patrol logic for 1 second

            // Push back slightly to avoid sticking
            // this.x += this.facing * 2;
        } else {
            this.x += this.vx;
        }
    }

    shoot() {
        if (!player) return;
        let angle = Math.atan2(player.y - this.y, player.x - this.x);
        angle += (Math.random() - 0.5) * 0.2;
        // Pass minimal valid args
        let b = new Bullet(this.x + this.w/2, this.y + 20, 1, false, { pColor: this.color, pType: 'normal', isEnemy: true });
        b.vx = Math.cos(angle) * 8;
        b.vy = Math.sin(angle) * 8;
        entities.push(b);
    }

    takeDamage(amt, sourceX) {
        this.hp -= amt;
        spawnDamageNumber(this.x, this.y, amt * 10);
        this.vx = (this.x - sourceX) > 0 ? 5 : -5;
        this.vy = -3;
        this.blockedTimer = 10; // Stun briefly

        if (this.hp <= 0) {
            spawnExplosion(this.x + this.w/2, this.y + this.h/2, "red", 1);
            this.x = -9999;
        }
    }

    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        // RETRO ROBOT GRUNT
        // Color
        let mainColor = "#c0392b"; // Red
        let metalColor = "#7f8c8d"; // Grey

        // Legs (Tracks)
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(cx + 5, cy + 40, 10, 20); // L
        ctx.fillRect(cx + 25, cy + 40, 10, 20); // R

        // Body (Blocky)
        ctx.fillStyle = mainColor;
        ctx.fillRect(cx, cy + 10, 40, 30);
        ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.strokeRect(cx, cy+10, 40, 30);

        // Rivets
        ctx.fillStyle = "#fff";
        ctx.fillRect(cx+2, cy+12, 2, 2); ctx.fillRect(cx+36, cy+12, 2, 2);
        ctx.fillRect(cx+2, cy+36, 2, 2); ctx.fillRect(cx+36, cy+36, 2, 2);

        // Head
        ctx.fillStyle = metalColor;
        ctx.fillRect(cx + 10, cy - 5, 20, 15);
        ctx.strokeRect(cx + 10, cy - 5, 20, 15);

        // Eye (Cyclops)
        ctx.fillStyle = "#e74c3c"; // Glowing red
        ctx.beginPath(); ctx.arc(cx + 20 + (this.facing*2), cy + 2, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.fillRect(cx + 20 + (this.facing*2) - 1, cy + 1, 2, 2); // Shine

        // Arms (Clamps)
        ctx.fillStyle = metalColor;
        // Front arm based on facing
        let armX = this.facing === 1 ? cx + 30 : cx - 10;
        ctx.fillRect(armX, cy + 15, 20, 8); // Arm

        // Gun/Weapon
        ctx.fillStyle = "#222";
        ctx.fillRect(armX + (this.facing===1?20:-5), cy + 12, 5, 14); // Hand/Gun
    }
}

class FlyingEnemy extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.type = 'fly';
        this.hp = 2;
        this.w = 40; this.h = 40;
    }
    update() {
        if (!player) return;
        let dist = Math.sqrt(Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2));

        let targetVx = 0;
        let targetVy = 0;

        if (dist < 500) {
            // Move towards player
            targetVx = (player.x - this.x) * 0.02; // Reduced speed for smoother flight
            targetVy = (player.y - this.y - 100) * 0.02; // Hover above

            this.shootTimer++;
            if (this.shootTimer > 100) {
                this.shoot();
                this.shootTimer = 0;
            }
        } else {
            // Idle hover
            targetVx *= 0.9;
            targetVy = Math.sin(Date.now() * 0.005) * 1;
        }

        // Soft Collision with walls (Bounce)
        let nextX = this.x + targetVx;
        let nextY = this.y + targetVy;
        let r = Math.floor((nextY + this.h/2) / TILE_SIZE);
        let c = Math.floor((nextX + this.w/2) / TILE_SIZE);

        if (r >= 0 && r < LEVEL_HEIGHT && c >= 0 && c < LEVEL_WIDTH && tiles[r] && tiles[r][c] && (tiles[r][c].type === 1 || tiles[r][c].type === 2)) {
             // Hit wall, bounce back
             targetVx *= -1.5;
             targetVy *= -1.5;
        }

        this.vx += (targetVx - this.vx) * 0.1;
        this.vy += (targetVy - this.vy) * 0.1;

        this.x += this.vx;
        this.y += this.vy;
    }
    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        // UFO / DRONE
        // Dome
        ctx.fillStyle = "rgba(142, 68, 173, 0.6)"; // Purple glass
        ctx.beginPath(); ctx.arc(cx + 20, cy + 15, 15, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();

        // Brain/Pilot inside
        ctx.fillStyle = "#8e44ad";
        ctx.beginPath(); ctx.arc(cx + 20, cy + 12, 6, 0, Math.PI*2); ctx.fill();

        // Ring Body
        ctx.fillStyle = "#bdc3c7"; // Silver
        ctx.beginPath(); ctx.ellipse(cx + 20, cy + 20, 20, 8, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "#7f8c8d"; ctx.stroke();

        // Lights
        let time = Date.now();
        for(let i=0; i<3; i++) {
            ctx.fillStyle = (Math.floor(time / 200) % 3 === i) ? "red" : "#550000";
            ctx.beginPath(); ctx.arc(cx + 10 + (i*10), cy + 20, 2, 0, Math.PI*2); ctx.fill();
        }

        // Thruster
        ctx.fillStyle = "#333";
        ctx.fillRect(cx + 15, cy + 25, 10, 5);
        if (Math.random() < 0.5) {
             ctx.fillStyle = "cyan";
             ctx.beginPath(); ctx.moveTo(cx+15, cy+30); ctx.lineTo(cx+20, cy+40); ctx.lineTo(cx+25, cy+30); ctx.fill();
        }
    }
}

class KamikazeEnemy extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.hp = 1;
        this.speed = 4;
        this.chaseSpeed = 5;
        this.color = "#d35400";
    }
    update() {
        // Use standard logic for movement, but override chase behavior slightly
        super.update();

        // Special Explode Logic
        if (player) {
            let dist = Math.sqrt(Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2));
            if (dist < 50) this.explode();
        }
    }
    explode() {
        let ex = this.x; let ey = this.y;
        this.x = -9999;
        createExplosion(ex + 20, ey + 30, 2, 50);
    }
    takeDamage(amt, sourceX) {
        super.takeDamage(amt, sourceX);
        if (this.hp <= 0) this.explode();
    }
    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        // WALKING BOMB BOT
        // Legs
        ctx.fillStyle = "#333";
        ctx.fillRect(cx + 10, cy + 40, 5, 20);
        ctx.fillRect(cx + 25, cy + 40, 5, 20);

        // Body (Bomb Shape)
        ctx.fillStyle = "#2c3e50"; // Dark body
        ctx.beginPath(); ctx.arc(cx + 20, cy + 25, 18, 0, Math.PI*2); ctx.fill();

        // Fuse / Antenna
        ctx.fillStyle = "#7f8c8d";
        ctx.fillRect(cx + 18, cy, 4, 10);
        // Spark
        if (Math.random() < 0.5) {
             ctx.fillStyle = "yellow";
             ctx.beginPath(); ctx.arc(cx + 20, cy, 4, 0, Math.PI*2); ctx.fill();
        }

        // Face (Screen)
        ctx.fillStyle = "#000";
        ctx.fillRect(cx + 10, cy + 20, 20, 10);
        // Digital Face
        ctx.fillStyle = "red";
        ctx.font = "10px monospace";
        let blink = Math.floor(Date.now() / 100) % 2 === 0;
        ctx.fillText(blink ? ":(" : "X(", cx + 12, cy + 28);

        // Chest Light
        ctx.fillStyle = blink ? "red" : "#500";
        ctx.beginPath(); ctx.arc(cx + 20, cy + 35, 3, 0, Math.PI*2); ctx.fill();
    }
}

class HeavyGunner extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.hp = 10;
        this.w = 50; this.h = 70;
        this.color = "#27ae60";
        this.speed = 0; // Stationary usually, or very slow
        this.chaseSpeed = 0; // Doesn't chase
    }
    update() {
        this.vy += GRAVITY;
        this.y += this.vy;

        // Ground Collision
        let r = Math.floor((this.y + this.h) / TILE_SIZE);
        let c = Math.floor((this.x + this.w / 2) / TILE_SIZE);
        if (r >= 0 && r < LEVEL_HEIGHT && c >= 0 && c < LEVEL_WIDTH && tiles[r] && tiles[r][c] && (tiles[r][c].type === 1 || tiles[r][c].type === 2)) {
            this.y = r * TILE_SIZE - this.h;
            this.vy = 0;
        }

        if (player) {
            let dist = Math.abs(player.x - this.x);
            if (dist < 500) {
                this.facing = player.x < this.x ? -1 : 1;
                this.shootTimer++;
                if (this.shootTimer > 10) {
                     this.shoot();
                     this.shootTimer = 0;
                }
            }
        }
    }
    shoot() {
        if (!player) return;
        let angle = Math.atan2(player.y - this.y, player.x - this.x);
        angle += (Math.random() - 0.5) * 0.4;
        let b = new Bullet(this.x + this.w/2, this.y + 30, 1, false, { pColor: this.color, pType: 'normal', isEnemy: true });
        b.vx = Math.cos(angle) * 10;
        b.vy = Math.sin(angle) * 10;
        entities.push(b);
    }
    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        // TANK BOT
        // Treads
        ctx.fillStyle = "#2c3e50";
        drawRoundedRect(ctx, cx, cy + 50, 50, 20, 5);
        // Tread wheels
        ctx.fillStyle = "#7f8c8d";
        for(let i=0; i<3; i++) ctx.beginPath(), ctx.arc(cx + 10 + i*15, cy + 60, 6, 0, Math.PI*2), ctx.fill();

        // Torso
        ctx.fillStyle = "#27ae60"; // Green Armor
        ctx.fillRect(cx + 5, cy + 10, 40, 40);

        // Head (Small, armored)
        ctx.fillStyle = "#1e8449";
        ctx.fillRect(cx + 15, cy, 20, 10);
        // Visor
        ctx.fillStyle = "#f1c40f";
        ctx.fillRect(cx + 18, cy + 2, 14, 4);

        // Minigun Arm
        ctx.fillStyle = "#333";
        let gunX = this.facing === 1 ? cx + 40 : cx - 20;
        ctx.fillRect(gunX, cy + 25, 30, 10); // Barrel
        // Rotation
        let spin = Math.sin(Date.now() * 0.5) * 2;
        ctx.fillStyle = "#111";
        ctx.fillRect(gunX + (this.facing===1?30:0), cy + 22 + spin, 5, 16);
    }
}

class SniperEnemy extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.hp = 2;
        this.range = 800;
        this.aimTimer = 0;
        this.color = "#3498db";
        this.speed = 1;
        this.chaseSpeed = 0; // Holds position
    }
    update() {
        this.vy += GRAVITY;
        this.y += this.vy;

        // Collision
        let r = Math.floor((this.y + this.h) / TILE_SIZE);
        let c = Math.floor((this.x + this.w / 2) / TILE_SIZE);
        if (r >= 0 && r < LEVEL_HEIGHT && c >= 0 && c < LEVEL_WIDTH && tiles[r] && tiles[r][c] && (tiles[r][c].type === 1 || tiles[r][c].type === 2)) {
            this.y = r * TILE_SIZE - this.h;
            this.vy = 0;
        }

        if (player) {
            let dist = Math.abs(player.x - this.x);
            if (dist < this.range) {
                 this.facing = player.x < this.x ? -1 : 1;
                 this.aimTimer++;
                 if (this.aimTimer > 180) {
                     this.shoot();
                     this.aimTimer = 0;
                 }
            } else {
                this.aimTimer = 0;
                // Maybe patrol if player far?
                super.update(); // Use default patrol if out of range
            }
        }
    }
    shoot() {
        if (!player) return;
        let angle = Math.atan2(player.y - this.y, player.x - this.x);
        let b = new Bullet(this.x + this.w/2, this.y + 20, 2, false, { pColor: this.color, pType: 'normal', isEnemy: true });
        b.vx = Math.cos(angle) * 20;
        b.vy = Math.sin(angle) * 20;
        entities.push(b);
    }
    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        // SNIPER BOT (Tall, Thin)
        // Legs
        ctx.fillStyle = "#34495e";
        ctx.fillRect(cx + 15, cy + 40, 4, 20);
        ctx.fillRect(cx + 25, cy + 40, 4, 20);

        // Body
        ctx.fillStyle = "#3498db"; // Blue
        ctx.fillRect(cx + 15, cy + 15, 14, 25);

        // Head
        ctx.fillStyle = "#2c3e50";
        ctx.beginPath(); ctx.arc(cx + 22, cy + 10, 8, 0, Math.PI*2); ctx.fill();

        // Eye (Scope)
        ctx.fillStyle = "#000";
        let eyeX = cx + 22 + (this.facing * 4);
        ctx.beginPath(); ctx.arc(eyeX, cy + 10, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "red";
        ctx.beginPath(); ctx.arc(eyeX, cy + 10, 2, 0, Math.PI*2); ctx.fill();

        // Rifle
        ctx.fillStyle = "#111";
        let gunLen = 40;
        if(this.facing === 1) {
             ctx.fillRect(cx + 20, cy + 20, gunLen, 4);
             ctx.fillRect(cx + 20, cy + 22, 10, 6); // Stock
        } else {
             ctx.fillRect(cx + 24 - gunLen, cy + 20, gunLen, 4);
             ctx.fillRect(cx + 14, cy + 22, 10, 6);
        }

        // Laser Sight
        if (this.aimTimer > 100 && player) {
            ctx.strokeStyle = "rgba(231, 76, 60, 0.5)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx+this.w/2, cy+22);
            ctx.lineTo(player.x - camX + player.w/2, player.y - camY + player.h/2);
            ctx.stroke();
        }
    }
}

class ShieldBearer extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.hp = 8;
        this.shieldUp = true;
        this.color = "#7f8c8d";
        this.speed = 1;
        this.chaseSpeed = 1;
    }
    update() {
        super.update(); // Use standard wall/ledge logic

        if (player) {
            this.shieldUp = (player.x < this.x && this.facing === -1) || (player.x > this.x && this.facing === 1);
        }
    }
    takeDamage(amt, sourceX) {
        let hitFromFront = (sourceX < this.x && this.facing === -1) || (sourceX > this.x && this.facing === 1);
        if (this.shieldUp && hitFromFront) {
            spawnExplosion(this.x + 20, this.y + 20, "blue", 1);
            spawnDamageNumber(this.x, this.y - 20, "BLOCKED!", "blue");
            this.hp -= amt * 0.1;
        } else {
            this.hp -= amt;
            spawnExplosion(this.x + 20, this.y + 20, "red", 2);
            spawnDamageNumber(this.x, this.y, amt * 10);
        }
        if (this.hp <= 0) {
             this.x = -9999;
             spawnExplosion(this.x, this.y, "red", 3);
        }
    }
    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        // RIOT BOT
        // Legs
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(cx + 5, cy + 40, 10, 20);
        ctx.fillRect(cx + 25, cy + 40, 10, 20);

        // Body
        ctx.fillStyle = "#95a5a6";
        ctx.fillRect(cx + 5, cy + 10, 30, 30);

        // Head
        ctx.fillStyle = "#2c3e50";
        drawRoundedRect(ctx, cx + 10, cy - 5, 20, 15, 5);
        // Visor slit
        ctx.fillStyle = "cyan";
        ctx.fillRect(cx + 12, cy, 16, 2);

        // SHIELD (Draw last so it covers)
        ctx.fillStyle = "rgba(52, 152, 219, 0.6)"; // Energy Blue
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;

        let shieldX = this.facing === 1 ? cx + 25 : cx - 15;
        drawRoundedRect(ctx, shieldX, cy, 30, 60, 5);
        ctx.stroke();

        // Shield details
        ctx.fillStyle = "white";
        ctx.font = "10px Arial";
        ctx.fillText("POLICE", shieldX + 2, cy + 30);
    }
}

class CaptainEnemy extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.hp = 15 + (gameState.currentLevel * 2);
        this.w = 50; this.h = 70;
        this.color = "#9b59b6";
    }
    update() {
        this.vy += GRAVITY;
        this.y += this.vy;

        let r = Math.floor((this.y + this.h) / TILE_SIZE);
        let c = Math.floor((this.x + this.w / 2) / TILE_SIZE);
        if (r >= 0 && r < LEVEL_HEIGHT && c >= 0 && c < LEVEL_WIDTH && tiles[r] && tiles[r][c] && (tiles[r][c].type === 1 || tiles[r][c].type === 2)) {
            this.y = r * TILE_SIZE - this.h;
            this.vy = 0;
        }

        if (player) {
            let dist = Math.abs(player.x - this.x);
            if (dist < 600) {
                this.facing = player.x < this.x ? -1 : 1;
                this.shootTimer++;
                if (this.shootTimer > 90) {
                     this.shootBurst();
                     this.shootTimer = 0;
                }
            }
        }
    }
    shootBurst() {
        if (!player) return;
        for(let i=0; i<3; i++) {
            setTimeout(() => {
                if(this.hp <= 0 || !player) return;
                let angle = Math.atan2(player.y - this.y, player.x - this.x);
                let b = new Bullet(this.x + this.w/2, this.y + 20, 1, false, { pColor: this.color, pType: 'normal', isEnemy: true });
                b.vx = Math.cos(angle) * 12;
                b.vy = Math.sin(angle) * 12;
                b.color = "gold";
                entities.push(b);
            }, i * 100);
        }
    }
    takeDamage(amt, sourceX) {
        this.hp -= amt;
        spawnDamageNumber(this.x, this.y, amt * 10, "gold");
        if (this.hp <= 0) {
             let deathX = this.x;
             let deathY = this.y;
             spawnExplosion(deathX + this.w/2, deathY + this.h/2, "gold", 3);
             this.x = -9999;
             entities.push(new Helicopter(deathX, deathY - 50));
        }
    }
    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        // CAPTAIN ROBOT
        // Gold Plating
        ctx.fillStyle = "#f1c40f"; // Gold
        drawRoundedRect(ctx, cx, cy, this.w, this.h, 10);

        // Trim
        ctx.fillStyle = "#8e44ad"; // Purple Royal
        ctx.fillRect(cx + 20, cy, 10, this.h);

        // Head
        ctx.fillStyle = "#f39c12";
        ctx.beginPath(); ctx.arc(cx + 25, cy - 10, 15, 0, Math.PI*2); ctx.fill();

        // Crown/Antenna
        ctx.fillStyle = "gold";
        ctx.beginPath(); ctx.moveTo(cx+15, cy-20); ctx.lineTo(cx+25, cy-35); ctx.lineTo(cx+35, cy-20); ctx.fill();

        // Eyes
        ctx.fillStyle = "red";
        ctx.beginPath(); ctx.arc(cx + 20, cy - 10, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 30, cy - 10, 3, 0, Math.PI*2); ctx.fill();
    }
}

class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 120;
        this.h = 120;
        this.hp = 50 + (gameState.currentLevel * 15); // Increased scaling
        this.maxHp = this.hp;
        this.state = 'idle';
        this.timer = 0;
        this.dirY = 1;
    }
    update() {
        if (!gameState.bossActive && Math.abs(player.x - this.x) < 800) {
            gameState.bossActive = true;
            if(document.getElementById('bossHealthContainer')) document.getElementById('bossHealthContainer').style.display = 'block';
        }
        if (!gameState.bossActive) return;

        // Hover
        this.y += this.dirY * 2;
        if (this.y > (LEVEL_HEIGHT * TILE_SIZE) - this.h - 100 || this.y < 50) this.dirY *= -1;

        this.timer++;

        // Attack Pattern Scaling
        let difficulty = gameState.currentLevel;
        let fireRate = 100;
        if (difficulty >= 5) fireRate = 80;
        if (difficulty >= 10) fireRate = 60;
        if (difficulty >= 15) fireRate = 40;

        if (this.timer > fireRate) {
            let angle = Math.atan2(player.y - this.y, player.x - this.x);
            let speed = 8 + (difficulty * 0.2);

            // Attack 1: Standard Shot
            let b = new Bullet(this.x + 60, this.y + 60, 2, false, { pColor: '#c0392b', pType: 'normal', isEnemy: true });
            b.vx = Math.cos(angle) * speed;
            b.vy = Math.sin(angle) * speed;
            entities.push(b);

            // Attack 2: Spread (Level 3+)
            if (difficulty >= 3) {
                 let spread = 0.2;
                 let b1 = new Bullet(this.x + 60, this.y + 60, 2, false, { pColor: '#c0392b', pType: 'normal', isEnemy: true });
                 b1.vx = Math.cos(angle - spread) * speed;
                 b1.vy = Math.sin(angle - spread) * speed;

                 let b2 = new Bullet(this.x + 60, this.y + 60, 2, false, { pColor: '#c0392b', pType: 'normal', isEnemy: true });
                 b2.vx = Math.cos(angle + spread) * speed;
                 b2.vy = Math.sin(angle + spread) * speed;

                 entities.push(b1);
                 entities.push(b2);
            }

            // Attack 3: Shotgun (Level 6+)
            if (difficulty >= 6) {
                 let spread = 0.4;
                 let b3 = new Bullet(this.x + 60, this.y + 60, 2, false, { pColor: '#c0392b', pType: 'normal', isEnemy: true });
                 b3.vx = Math.cos(angle - spread) * speed;
                 b3.vy = Math.sin(angle - spread) * speed;
                 entities.push(b3);

                 let b4 = new Bullet(this.x + 60, this.y + 60, 2, false, { pColor: '#c0392b', pType: 'normal', isEnemy: true });
                 b4.vx = Math.cos(angle + spread) * speed;
                 b4.vy = Math.sin(angle + spread) * speed;
                 entities.push(b4);
            }

            // Attack 4: Explosive (Level 10+)
            if (difficulty >= 10 && this.timer % (fireRate*2) === 0) {
                // Drop a propane tank
                let tank = new PropaneTank(this.x + 60, this.y + 60);
                tank.vx = (player.x - this.x) * 0.05;
                tank.vy = -5;
                entities.push(tank);
            }

            this.timer = 0;
        }
    }
    takeDamage(amt, sourceX) {
        if (!gameState.bossActive) return;
        this.hp -= amt;
        shakeCamera(2);
        let pct = (this.hp / this.maxHp) * 100;
        if(document.getElementById('bossHealthBar')) document.getElementById('bossHealthBar').style.width = pct + "%";
        spawnDamageNumber(this.x + 60, this.y + 60, amt * 10);
        if (this.hp <= 0) {
            shakeCamera(50);
            spawnExplosion(this.x + 60, this.y + 60, "#ff00de", 5);
            gameState.bossActive = false;
            if(document.getElementById('bossHealthContainer')) document.getElementById('bossHealthContainer').style.display = 'none';

            // Spawn Extraction
            entities.push(new Helicopter(this.x, this.y));

            this.x = -9999;
            gameState.slowMo = 0.2;
            setTimeout(() => gameState.slowMo = 1.0, 2000);
        }
    }
    draw(ctx, camX, camY) {
        if (this.hp <= 0) return;
        let cx = this.x - camX;
        let cy = this.y - camY;

        let shake = 0;
        if (this.hp < this.maxHp * 0.5) shake = (Math.random()-0.5)*4;

        ctx.save();
        ctx.translate(cx + this.w/2 + shake, cy + this.h/2 + shake);

        // Main Canister
        ctx.fillStyle = "#c0392b"; // Red vacuum
        drawRoundedRect(ctx, -40, -50, 80, 100, 10);

        // Shine
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(-30, -40, 10, 80);

        // Wheels
        ctx.fillStyle = "#222";
        ctx.beginPath(); ctx.arc(-45, 45, 15, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(45, 45, 15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#555";
        ctx.beginPath(); ctx.arc(-45, 45, 5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(45, 45, 5, 0, Math.PI*2); ctx.fill();

        // Hose (Snake like)
        ctx.strokeStyle = "#333"; ctx.lineWidth = 15; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(0, -50);
        ctx.bezierCurveTo(0, -100, -80, -50, -60, 0);
        ctx.stroke();

        // Nozzle head
        ctx.fillStyle = "#222";
        ctx.save();
        ctx.translate(-60, 0);
        ctx.rotate(Math.sin(this.timer*0.1)*0.5);
        ctx.fillRect(-15, -10, 30, 40); // Nozzle
        ctx.fillStyle = "#111";
        ctx.fillRect(-20, 30, 40, 10); // Brush part
        ctx.restore();

        // Face
        // Evil Eyes
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.moveTo(-20, -20); ctx.lineTo(-5, -10); ctx.lineTo(-20, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(20, -20); ctx.lineTo(5, -10); ctx.lineTo(20, 0); ctx.fill();

        // Grill/Mouth
        ctx.fillStyle = "#222";
        for(let i=0; i<3; i++) {
            ctx.fillRect(-15, 20 + i*8, 30, 4);
        }

        // Name Tag
        ctx.fillStyle = "#fff"; ctx.font = "bold 20px Arial"; ctx.fillText("VACUUM KING", -70, -70);

        ctx.restore();
    }
}

class HelicopterBoss {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.w = 150; this.h = 80;
        this.hp = 200 + (gameState.currentLevel * 20);
        this.maxHp = this.hp;
        this.state = 'fly';
        this.timer = 0;
        this.vx = 2; this.vy = 0;
        this.targetX = x;
    }
    update() {
        if (!gameState.bossActive && Math.abs(player.x - this.x) < 800) {
            gameState.bossActive = true;
            if(document.getElementById('bossHealthContainer')) document.getElementById('bossHealthContainer').style.display = 'block';
        }
        if (!gameState.bossActive) return;

        // Hover Movement
        this.timer++;
        this.y += Math.sin(this.timer * 0.05) * 2;

        // Follow Player (Laggy)
        if (this.timer % 60 === 0) {
            this.targetX = player.x;
        }
        this.x += (this.targetX - this.x) * 0.02;

        let difficulty = gameState.currentLevel;

        // Attack 1: Minigun (Rapid Fire)
        if (this.timer % 10 === 0) {
             let angle = Math.atan2(player.y - this.y, player.x - this.x);
             // Spread
             angle += (Math.random() - 0.5) * 0.2;
             let b = new Bullet(this.x + 75, this.y + 60, 1, false, { pColor: '#f1c40f', pType: 'normal', isEnemy: true });
             // Manually set velocities
             b.vx = Math.cos(angle) * 15;
             b.vy = Math.sin(angle) * 15;
             entities.push(b);
        }

        // Attack 2: Bomb Drop (Every 3s)
        let bombRate = 180;
        if (difficulty >= 10) bombRate = 120;

        if (this.timer % bombRate === 0) {
            // Drop bomb
            let bomb = new PropaneTank(this.x + 75, this.y + 80);
            if (difficulty >= 5) {
                bomb.vx = (player.x - this.x) * 0.05; // Toss it
            }
            entities.push(bomb);
        }

        // Attack 3: Strafing Run (Level 15+)
        // (Simplified: just moves faster towards player)
        if (difficulty >= 15) {
             this.x += (player.x - this.x) * 0.01;
        }
    }
    takeDamage(amt, sourceX) {
        if (!gameState.bossActive) return;
        this.hp -= amt;
        let pct = (this.hp / this.maxHp) * 100;
        if(document.getElementById('bossHealthBar')) document.getElementById('bossHealthBar').style.width = pct + "%";
        spawnDamageNumber(this.x + 75, this.y + 40, amt * 10, "cyan");
        shakeCamera(2);

        if (this.hp <= 0) {
            shakeCamera(100);
            spawnExplosion(this.x + 75, this.y + 40, "orange", 10);
            gameState.bossActive = false;
            if(document.getElementById('bossHealthContainer')) document.getElementById('bossHealthContainer').style.display = 'none';
            this.x = -9999;
            entities.push(new Helicopter((LEVEL_WIDTH - 15) * TILE_SIZE, 8 * TILE_SIZE)); // Extraction Heli
            gameState.slowMo = 0.1;
            setTimeout(() => gameState.slowMo = 1.0, 3000);
        }
    }
    draw(ctx, camX, camY) {
        if (this.hp <= 0) return;
        let cx = this.x - camX;
        let cy = this.y - camY;

        // Chopper Body (Dark Green/Camo)
        ctx.fillStyle = "#2f4f4f";
        drawRoundedRect(ctx, cx, cy, 140, 70, 20);

        // Cockpit
        ctx.fillStyle = "#3498db";
        ctx.beginPath(); ctx.moveTo(cx+10, cy+20); ctx.lineTo(cx+40, cy+20); ctx.lineTo(cx+40, cy+50); ctx.lineTo(cx+15, cy+50); ctx.fill();

        // Rotor
        ctx.fillStyle = "#000";
        ctx.fillRect(cx+60, cy-10, 20, 10);
        // Blade blur
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(cx-20, cy-15, 180, 5);

        // Gun Mount
        ctx.fillStyle = "#111";
        ctx.fillRect(cx+60, cy+70, 30, 10); // Gun
        if (this.timer % 10 < 5) {
             ctx.fillStyle = "yellow"; // Muzzle flash
             ctx.beginPath(); ctx.arc(cx+75, cy+85, 10, 0, Math.PI*2); ctx.fill();
        }

        // Side Doors (Open with Gunner?)
        ctx.fillStyle = "#111";
        ctx.fillRect(cx+80, cy+20, 40, 30);
    }
}

// Expose for testing
