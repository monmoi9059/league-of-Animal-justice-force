
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
        this.state = 'patrol'; // patrol, chase, attack
        this.timer = 0;
        this.shootTimer = 0;
    }

    update() {
        // Gravity
        this.vy += GRAVITY;
        this.y += this.vy;

        // Collision with map
        let r = Math.floor((this.y + this.h) / TILE_SIZE);
        let c = Math.floor((this.x + this.w / 2) / TILE_SIZE);

        if (r >= 0 && r < LEVEL_HEIGHT && c >= 0 && c < LEVEL_WIDTH && tiles[r] && tiles[r][c] && tiles[r][c].solid) {
            this.y = r * TILE_SIZE - this.h;
            this.vy = 0;
        }

        // AI Logic
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
                this.vx = this.facing * 2;
            }
            this.timer--;

            // Turn at walls/edges
            let nextC = Math.floor((this.x + this.w/2 + this.vx*20) / TILE_SIZE);
            if (tiles[r] && tiles[r][nextC] && tiles[r][nextC].solid) {
                this.vx *= -1; this.facing *= -1;
            }
        } else if (this.state === 'chase') {
            this.facing = player.x < this.x ? -1 : 1;
            this.vx = this.facing * 3;

            // Shoot
            this.shootTimer++;
            if (this.shootTimer > 60) {
                this.shoot();
                this.shootTimer = 0;
            }
        }

        this.x += this.vx;
    }

    shoot() {
        let angle = Math.atan2(player.y - this.y, player.x - this.x);
        // Add inaccuracy
        angle += (Math.random() - 0.5) * 0.2;
        let b = new Bullet(this.x + this.w/2, this.y + 20, 1, false);
        b.vx = Math.cos(angle) * 8;
        b.vy = Math.sin(angle) * 8;
        entities.push(b);
    }

    takeDamage(amt, sourceX) {
        this.hp -= amt;
        spawnDamageNumber(this.x, this.y, amt * 10);
        // Knockback
        this.vx = (this.x - sourceX) > 0 ? 5 : -5;
        this.vy = -3;

        if (this.hp <= 0) {
            spawnExplosion(this.x + this.w/2, this.y + this.h/2, "red", 1);
            this.x = -9999; // Remove
        }
    }

    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        // Body
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(cx, cy, this.w, this.h);

        // Head band
        ctx.fillStyle = "#c0392b";
        ctx.fillRect(cx, cy + 10, this.w, 10);

        // Gun
        ctx.fillStyle = "#2c3e50";
        if (this.facing === 1) {
            ctx.fillRect(cx + 20, cy + 30, 30, 10);
        } else {
            ctx.fillRect(cx - 10, cy + 30, 30, 10);
        }
    }
}

class FlyingEnemy extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.type = 'fly';
        this.hp = 2;
    }
    update() {
        // Fly logic: hover towards player
        let dist = Math.sqrt(Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2));
        if (dist < 500) {
            this.vx = (player.x - this.x) * 0.01;
            this.vy = (player.y - this.y - 100) * 0.01;

            this.shootTimer++;
            if (this.shootTimer > 100) {
                this.shoot();
                this.shootTimer = 0;
            }
        } else {
            this.vx *= 0.9;
            this.vy *= 0.9;
        }

        this.x += this.vx;
        this.y += this.vy;
    }
    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;
        ctx.fillStyle = "#8e44ad";
        ctx.beginPath();
        ctx.arc(cx + 20, cy + 20, 20, 0, Math.PI*2);
        ctx.fill();
        // Wings
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.beginPath(); ctx.ellipse(cx, cy+10, 20, 10, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx+40, cy+10, 20, 10, 0, 0, Math.PI*2); ctx.fill();
    }
}

class KamikazeEnemy extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.hp = 1;
        this.speed = 4;
    }
    update() {
        this.vy += GRAVITY;
        this.y += this.vy;

        let r = Math.floor((this.y + this.h) / TILE_SIZE);
        let c = Math.floor((this.x + this.w / 2) / TILE_SIZE);
        if (r >= 0 && r < LEVEL_HEIGHT && c >= 0 && c < LEVEL_WIDTH && tiles[r] && tiles[r][c] && tiles[r][c].solid) {
            this.y = r * TILE_SIZE - this.h;
            this.vy = 0;
        }

        let dist = Math.sqrt(Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2));
        if (dist < 400) {
            this.facing = player.x < this.x ? -1 : 1;
            this.vx = this.facing * this.speed;

            // Scream?
            if (dist < 50) {
                this.explode();
            }
        }
        this.x += this.vx;
    }
    explode() {
        spawnExplosion(this.x + 20, this.y + 30, "orange", 3);
        this.x = -9999;
    }
    takeDamage(amt, sourceX) {
        super.takeDamage(amt, sourceX);
        if (this.hp <= 0) this.explode();
    }
    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;
        ctx.fillStyle = "#d35400"; // Pumpkin orange
        ctx.fillRect(cx, cy, this.w, this.h);
        // Bomb strapped
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(cx+5, cy+20, 30, 20);
        // Fuse spark
        if (Math.random() < 0.5) {
             ctx.fillStyle = "yellow";
             ctx.fillRect(cx+15, cy+10, 5, 5);
        }
    }
}

class HeavyGunner extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.hp = 10;
        this.w = 50; this.h = 70;
    }
    update() {
        this.vy += GRAVITY;
        this.y += this.vy;

        let r = Math.floor((this.y + this.h) / TILE_SIZE);
        let c = Math.floor((this.x + this.w / 2) / TILE_SIZE);
        if (r >= 0 && r < LEVEL_HEIGHT && c >= 0 && c < LEVEL_WIDTH && tiles[r] && tiles[r][c] && tiles[r][c].solid) {
            this.y = r * TILE_SIZE - this.h;
            this.vy = 0;
        }

        let dist = Math.abs(player.x - this.x);
        if (dist < 500) {
            this.facing = player.x < this.x ? -1 : 1;
            // Does not move, just shoots minigun
            this.shootTimer++;
            if (this.shootTimer > 10) { // Fast fire
                 this.shoot();
                 this.shootTimer = 0;
            }
        }
    }
    shoot() {
        let angle = Math.atan2(player.y - this.y, player.x - this.x);
        angle += (Math.random() - 0.5) * 0.4; // Wide spread
        let b = new Bullet(this.x + this.w/2, this.y + 30, 1, false);
        b.vx = Math.cos(angle) * 10;
        b.vy = Math.sin(angle) * 10;
        entities.push(b);
    }
    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;
        ctx.fillStyle = "#27ae60"; // Green armor
        ctx.fillRect(cx, cy, this.w, this.h);
        // Minigun
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(cx - 10, cy + 30, 70, 20);
    }
}

class SniperEnemy extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.hp = 2;
        this.range = 800;
        this.aimTimer = 0;
    }
    update() {
        this.vy += GRAVITY;
        this.y += this.vy;

        let r = Math.floor((this.y + this.h) / TILE_SIZE);
        let c = Math.floor((this.x + this.w / 2) / TILE_SIZE);
        if (r >= 0 && r < LEVEL_HEIGHT && c >= 0 && c < LEVEL_WIDTH && tiles[r] && tiles[r][c] && tiles[r][c].solid) {
            this.y = r * TILE_SIZE - this.h;
            this.vy = 0;
        }

        let dist = Math.abs(player.x - this.x);
        if (dist < this.range) {
             this.aimTimer++;
             if (this.aimTimer > 180) { // 3 seconds aim
                 this.shoot();
                 this.aimTimer = 0;
             }
        } else {
            this.aimTimer = 0;
        }
    }
    shoot() {
        // High velocity, accurate
        let angle = Math.atan2(player.y - this.y, player.x - this.x);
        let b = new Bullet(this.x + this.w/2, this.y + 20, 2, false); // 2 dmg
        b.vx = Math.cos(angle) * 20;
        b.vy = Math.sin(angle) * 20;
        entities.push(b);
        // Laser effect?
    }
    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;
        ctx.fillStyle = "#34495e"; // Camo
        ctx.fillRect(cx, cy, this.w, this.h);
        // Laser sight
        if (this.aimTimer > 100) {
            ctx.strokeStyle = "rgba(231, 76, 60, 0.5)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx+this.w/2, cy+20);
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
    }
    update() {
        this.vy += GRAVITY;
        this.y += this.vy;

        let r = Math.floor((this.y + this.h) / TILE_SIZE);
        let c = Math.floor((this.x + this.w / 2) / TILE_SIZE);
        if (r >= 0 && r < LEVEL_HEIGHT && c >= 0 && c < LEVEL_WIDTH && tiles[r] && tiles[r][c] && tiles[r][c].solid) {
            this.y = r * TILE_SIZE - this.h;
            this.vy = 0;
        }

        // Patrol / Chase slowly
        if (Math.abs(player.x - this.x) < 300) {
            this.facing = player.x < this.x ? -1 : 1;
            this.vx = this.facing * 1; // Slow march
        }
        this.x += this.vx;

        // Block Logic: Shield is up if facing player
        this.shieldUp = (player.x < this.x && this.facing === -1) || (player.x > this.x && this.facing === 1);
    }
    takeDamage(amt, sourceX) {
        // Check if hit from front
        let hitFromFront = (sourceX < this.x && this.facing === -1) || (sourceX > this.x && this.facing === 1);

        if (this.shieldUp && hitFromFront) {
            spawnExplosion(this.x + 20, this.y + 20, "blue", 1); // Spark off shield
            spawnDamageNumber(this.x, this.y - 20, "BLOCKED!", "blue");
            this.hp -= amt * 0.1; // Chip damage
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

        // Body
        ctx.fillStyle = "#7f8c8d";
        drawRoundedRect(ctx, cx, cy, this.w, this.h, 5);

        // Shield
        ctx.fillStyle = "#3498db"; // Energy Shield
        if (this.facing === -1) {
            ctx.fillRect(cx - 10, cy, 10, this.h);
        } else {
            ctx.fillRect(cx + this.w, cy, 10, this.h);
        }

        // Helmet
        ctx.fillStyle = "#2c3e50";
        ctx.beginPath(); ctx.arc(cx+20, cy-5, 12, 0, Math.PI*2); ctx.fill();
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
            let b = new Bullet(this.x + 60, this.y + 60, 2, false);
            b.vx = Math.cos(angle) * speed;
            b.vy = Math.sin(angle) * speed;
            entities.push(b);

            // Attack 2: Spread (Level 3+)
            if (difficulty >= 3) {
                 let spread = 0.2;
                 let b1 = new Bullet(this.x + 60, this.y + 60, 2, false);
                 b1.vx = Math.cos(angle - spread) * speed;
                 b1.vy = Math.sin(angle - spread) * speed;

                 let b2 = new Bullet(this.x + 60, this.y + 60, 2, false);
                 b2.vx = Math.cos(angle + spread) * speed;
                 b2.vy = Math.sin(angle + spread) * speed;

                 entities.push(b1);
                 entities.push(b2);
            }

            // Attack 3: Shotgun (Level 6+)
            if (difficulty >= 6) {
                 let spread = 0.4;
                 let b3 = new Bullet(this.x + 60, this.y + 60, 2, false);
                 b3.vx = Math.cos(angle - spread) * speed;
                 b3.vy = Math.sin(angle - spread) * speed;
                 entities.push(b3);

                 let b4 = new Bullet(this.x + 60, this.y + 60, 2, false);
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
             let b = new Bullet(this.x + 75, this.y + 60, 1, false);
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
