class Mailman {
    constructor(x, y) { this.x = x; this.y = y; this.w = 40; this.h = 40; this.vx = 0; this.hp = 3; this.cooldown = 100; this.facing = -1; this.vy=0; }
    update() {
        this.vy += GRAVITY; this.y += this.vy;
        let c = Math.floor((this.x+this.w/2)/TILE_SIZE); let r = Math.floor((this.y+this.h)/TILE_SIZE);
        if(r>=0 && r<LEVEL_HEIGHT && c>=0 && c<LEVEL_WIDTH && tiles[r] && tiles[r][c] && (tiles[r][c].type===1||tiles[r][c].type===2)) {
            if(this.vy>0) { this.y=(r*TILE_SIZE)-this.h; this.vy=0; }
        }
        this.cooldown--; this.facing = player.x < this.x ? -1 : 1;
        if (this.cooldown <= 0 && Math.abs(player.x - this.x) < 400) {
            let throwX = (player.x - this.x) * 0.03; if(throwX > 8) throwX = 8; if(throwX < -8) throwX = -8;
            entities.push(new Package(this.x + 20, this.y, throwX, -8)); this.cooldown = 120;
        }
    }
    takeDamage(amt=1) {
        this.hp-=amt; shakeCamera(2); spawnExplosion(this.x+20, this.y+20, "#fff", 0.5);
        spawnDamageNumber(this.x, this.y, amt * 100); if(this.hp <= 0) gameState.score += 200;
    }
    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        // Body (Blue Uniform)
        ctx.fillStyle = "#3498db";
        drawRoundedRect(ctx, cx, cy, this.w, this.h, 5);

        // Bag
        ctx.fillStyle = "#e67e22";
        ctx.fillRect(cx - 5, cy + 20, 10, 15);
        ctx.strokeStyle = "#e67e22"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx, cy+20); ctx.lineTo(cx+this.w, cy+5); ctx.stroke();

        // Head
        ctx.fillStyle = "#ffcd94";
        ctx.beginPath(); ctx.arc(cx + this.w/2, cy - 5, 10, 0, Math.PI*2); ctx.fill();

        // Cap
        ctx.fillStyle = "#2980b9";
        ctx.beginPath(); ctx.arc(cx + this.w/2, cy - 8, 10, Math.PI, 0); ctx.fill();
        ctx.fillRect(cx + this.w/2 - 10, cy-8, 20, 3);

        // Face
        drawCartoonEye(ctx, cx + this.w/2 - 3, cy-5, 3, 0, 0);
        drawCartoonEye(ctx, cx + this.w/2 + 3, cy-5, 3, 0, 0);
    }
}

class FlyingEnemy {
    constructor(x, y) { this.x = x; this.y = y; this.w = 40; this.h = 40; this.hp = 2; this.startX = x; this.startY = y; this.frame = secureRandom() * 100; }
    update() {
        this.frame++; this.y = this.startY + Math.sin(this.frame * 0.05) * 40;
        if (Math.abs(player.x - this.x) < 400) this.x += (player.x > this.x ? 1 : -1) * 1.5;
        if (rectIntersect(this.x, this.y, this.w, this.h, player.x, player.y, player.w, player.h)) player.takeDamage();
    }
    takeDamage(amt=1) {
        this.hp-=amt; shakeCamera(5); spawnExplosion(this.x+15, this.y+15, "#555", 0.5);
        spawnDamageNumber(this.x, this.y, amt * 100); if(this.hp <= 0) gameState.score += 150;
    }
    draw(ctx, camX, camY) {
        let cx = this.x - camX + 20;
        let cy = this.y - camY + 20;

        let bob = Math.sin(this.frame * 0.1) * 5;
        cy += bob;

        ctx.save();
        ctx.translate(cx, cy);

        // Propellers
        ctx.fillStyle = "#ccc";
        ctx.save();
        ctx.translate(-15, -15);
        ctx.rotate(this.frame * 0.5);
        ctx.fillRect(-10, -2, 20, 4);
        ctx.restore();

        ctx.save();
        ctx.translate(15, -15);
        ctx.rotate(-this.frame * 0.5);
        ctx.fillRect(-10, -2, 20, 4);
        ctx.restore();

        // Arms to props
        ctx.strokeStyle = "#555"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-15, -15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(15, -15); ctx.stroke();

        // Main Body
        ctx.fillStyle = "#95a5a6";
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();

        // Camera Eye
        ctx.fillStyle = "#e74c3c"; // Red lens
        ctx.beginPath(); ctx.arc(0, 2, 6, 0, Math.PI*2); ctx.fill();
        // Lens reflection
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(2, 0, 2, 0, Math.PI*2); ctx.fill();

        // Antenna
        ctx.strokeStyle = "#555"; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -20); ctx.stroke();
        if (this.frame % 20 < 10) {
            ctx.fillStyle = "red"; ctx.beginPath(); ctx.arc(0, -22, 2, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();
    }
}

class Boss {
    constructor(x, y) { this.x = x; this.y = y; this.w = 120; this.h = 120; this.hp = 50; this.maxHp = 50; this.state = 'idle'; this.timer = 0; this.dirY = 1; }
    update() {
        if (!gameState.bossActive && Math.abs(player.x - this.x) < 600) {
            gameState.bossActive = true; document.getElementById('bossHealthContainer').style.display = 'block';
        }
        if (!gameState.bossActive) return;
        this.y += this.dirY * 2; if (this.y > (12 * TILE_SIZE) - this.h - 10 || this.y < 50) this.dirY *= -1;
        this.timer++;
        if (this.timer > 100) {
            let angle = Math.atan2(player.y - this.y, player.x - this.x); let speed = 8;
            entities.push(new DebrisProjectile(this.x, this.y + 60, Math.cos(angle)*speed, Math.sin(angle)*speed));
            this.timer = 0;
        }
    }
    takeDamage(amt = 1) {
        if (!gameState.bossActive) return;
        this.hp -= amt; shakeCamera(2);
        let pct = (this.hp / this.maxHp) * 100;
        document.getElementById('bossHealthBar').style.width = pct + "%";
        spawnDamageNumber(this.x + 60, this.y + 60, amt * 100);
        if (this.hp <= 0) {
            shakeCamera(50); spawnExplosion(this.x + 60, this.y + 60, "#ff00de", 5);
            gameState.bossActive = false; document.getElementById('bossHealthContainer').style.display = 'none';
            // Spawn Helicopter
            entities.push(new Helicopter((LEVEL_WIDTH - 15) * TILE_SIZE, 8 * TILE_SIZE));
            this.x = -9999;
        }
    }
    draw(ctx, camX, camY) {
        if (this.hp <= 0) return;
        let cx = this.x - camX;
        let cy = this.y - camY;

        let shake = 0;
        if (this.hp < this.maxHp * 0.5) shake = (secureRandom()-0.5)*4;

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

class KamikazeEnemy {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.w = 30; this.h = 40;
        this.vx = 0; this.vy = 0;
        this.hp = 2;
        this.state = 'idle';
        this.timer = 0;
    }
    update() {
        this.vy += GRAVITY;
        this.y += this.vy;

        let c = Math.floor((this.x+this.w/2)/TILE_SIZE); let r = Math.floor((this.y+this.h)/TILE_SIZE);
        if(r>=0 && r<LEVEL_HEIGHT && c>=0 && c<LEVEL_WIDTH && tiles[r] && tiles[r][c] && (tiles[r][c].type===1||tiles[r][c].type===2)) {
            if(this.vy>0) { this.y=(r*TILE_SIZE)-this.h; this.vy=0; }
        }

        // Logic
        let dist = Math.abs(player.x - this.x);
        if (dist < 300 && Math.abs(player.y - this.y) < 100) {
            this.state = 'run';
        }

        if (this.state === 'run') {
            this.timer++;
            let dir = player.x > this.x ? 1 : -1;
            this.vx = dir * 6; // Very fast
            this.x += this.vx;

            // Explode on contact
            if (rectIntersect(this.x, this.y, this.w, this.h, player.x, player.y, player.w, player.h)) {
                this.hp = 0;
                shakeCamera(20);
                spawnExplosion(this.x, this.y, "red", 3);
                player.takeDamage();
                destroyRadius(c, r, 3);
            }
        }
    }
    takeDamage(amt=1) {
        this.hp -= amt;
        if (this.hp <= 0) {
            // Explode prematurely
             shakeCamera(15);
             spawnExplosion(this.x, this.y, "orange", 3);
             // Damage player if close
             if (Math.hypot(player.x - this.x, player.y - this.y) < 100) player.takeDamage();
             let c = Math.floor(this.x/TILE_SIZE); let r = Math.floor(this.y/TILE_SIZE);
             destroyRadius(c, r, 3);
        }
    }
    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        // Blink red if running
        let color = "#aaa";
        if (this.state === 'run' && Math.floor(Date.now() / 50) % 2 === 0) color = "#ff0000";

        ctx.fillStyle = color;
        drawRoundedRect(ctx, cx, cy, this.w, this.h, 5);

        // Head
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(cx+this.w/2, cy-5, 10, 0, Math.PI*2); ctx.fill();

        // Bandana
        ctx.fillStyle = "red";
        ctx.fillRect(cx+this.w/2-10, cy-12, 20, 4);

        // Scream Face
        ctx.fillStyle = "black";
        ctx.beginPath(); ctx.arc(cx+this.w/2, cy, 6, 0, Math.PI*2); ctx.fill();

        if (this.state === 'run') {
            ctx.fillStyle = "white";
            ctx.font = "10px monospace";
            ctx.fillText("AHHHHH!", cx, cy-20);
        }
    }
}

class HeavyGunner {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.w = 50; this.h = 50;
        this.vx = 0; this.vy = 0;
        this.hp = 10;
        this.cooldown = 60;
        this.facing = -1;
    }
    update() {
        this.vy += GRAVITY; this.y += this.vy;
        let c = Math.floor((this.x+this.w/2)/TILE_SIZE); let r = Math.floor((this.y+this.h)/TILE_SIZE);
        if(r>=0 && r<LEVEL_HEIGHT && c>=0 && c<LEVEL_WIDTH && tiles[r] && tiles[r][c] && (tiles[r][c].type===1||tiles[r][c].type===2)) {
            if(this.vy>0) { this.y=(r*TILE_SIZE)-this.h; this.vy=0; }
        }

        // Face player
        this.facing = player.x < this.x ? -1 : 1;

        // Shoot
        if (Math.abs(player.x - this.x) < 500 && Math.abs(player.y - this.y) < 100) {
            if (this.cooldown > 0) this.cooldown--;
            else {
                // Burst Fire
                if (this.cooldown > -20) {
                     this.cooldown--;
                     if (Math.abs(this.cooldown) % 5 === 0) {
                         let b = new Bullet(this.x + this.w/2 + (20*this.facing), this.y + 20, this.facing, false, { pColor: 'yellow', pType: 'gun' });
                         b.vx = this.facing * 10;
                         entities.push(b);
                         spawnExplosion(this.x + (this.facing*30), this.y+20, "yellow", 0.5);
                     }
                } else {
                    this.cooldown = 120; // Reload
                }
            }
        }
    }
    takeDamage(amt=1) {
        this.hp -= amt;
        spawnDamageNumber(this.x, this.y, amt * 100);
        if (this.hp <= 0) {
            spawnExplosion(this.x + 25, this.y + 25, "#333", 4);
            gameState.score += 300;
        }
    }
    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        // Big Body
        ctx.fillStyle = "#2c3e50";
        drawRoundedRect(ctx, cx, cy, this.w, this.h, 10);

        // Armor
        ctx.fillStyle = "#7f8c8d";
        ctx.fillRect(cx+5, cy+5, 40, 30);

        // Gun
        ctx.fillStyle = "#000";
        ctx.fillRect(cx + (this.facing === 1 ? 30 : -20), cy+20, 40, 10);

        // Head
        ctx.fillStyle = "#95a5a6"; // Helmet
        ctx.beginPath(); ctx.arc(cx+this.w/2, cy-5, 12, 0, Math.PI*2); ctx.fill();

        // Visor
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(cx+this.w/2 - 5, cy-8, 10, 4);
    }
}

class Enemy {
    constructor(x, y) { this.x = x; this.y = y; this.w = 50; this.h = 50; this.vx = 2; this.vy = 0; this.hp = 2; this.startX = x; this.patrolDist = 120; }
    update() {
        // GRAVITY
        this.vy += GRAVITY;
        this.y += this.vy;

        let grounded = false;
        let c = Math.floor((this.x + this.w/2) / TILE_SIZE);
        let r = Math.floor((this.y + this.h) / TILE_SIZE);

        if (r>=0 && r<LEVEL_HEIGHT && c>=0 && c<LEVEL_WIDTH && tiles[r] && tiles[r][c] && (tiles[r][c].type === 1 || tiles[r][c].type === 2)) {
            if (this.vy > 0) {
                this.y = (r * TILE_SIZE) - this.h;
                this.vy = 0;
                grounded = true;
            }
        }

        // Move only if grounded (dumb patrol logic)
        if (grounded) {
            this.x += this.vx;
            if (Math.abs(this.x - this.startX) > this.patrolDist) this.vx *= -1;

            // Wall Check
            let tileAhead = Math.floor((this.x + (this.vx > 0 ? this.w : 0) + this.vx) / TILE_SIZE);
            let rHead = Math.floor((this.y + this.h/2) / TILE_SIZE);
            if (rHead>=0 && rHead<LEVEL_HEIGHT && tileAhead>=0 && tileAhead<LEVEL_WIDTH && tiles[rHead] && tiles[rHead][tileAhead] && tiles[rHead][tileAhead].type !== 0 && tiles[rHead][tileAhead].type !== 5) {
                this.vx *= -1;
            }

            // Cliff Check (Turn around unless falling)
            let tileBelowAhead = Math.floor((this.y + this.h + 5) / TILE_SIZE);
            if (tileBelowAhead>=0 && tileBelowAhead<LEVEL_HEIGHT && tileAhead>=0 && tileAhead<LEVEL_WIDTH && tiles[tileBelowAhead] && (!tiles[tileBelowAhead][tileAhead] || tiles[tileBelowAhead][tileAhead].type === 0)) {
                this.vx *= -1;
            }
        }

        if (rectIntersect(this.x, this.y, this.w, this.h, player.x, player.y, player.w, player.h)) player.takeDamage();
        if (this.y > (LEVEL_HEIGHT * TILE_SIZE)) this.hp = 0;
    }
    takeDamage(amt=1) {
        this.hp-=amt; shakeCamera(5); spawnExplosion(this.x + 20, this.y + 20, "#555", 8);
        spawnDamageNumber(this.x, this.y, amt * 100); if(this.hp <= 0) gameState.score += 100;
    }
    draw(ctx, camX, camY) {
        let cx = this.x - camX + 25;
        let cy = this.y - camY + 25;

        // Animation
        let bob = Math.sin(Date.now() * 0.01) * 2;
        let walk = Math.sin(this.x * 0.1) * 5;

        ctx.save();
        ctx.translate(cx, cy);
        if(this.vx < 0) ctx.scale(-1, 1); // Face direction

        // Legs
        ctx.fillStyle = "#222";
        // Back Leg
        ctx.fillRect(-8, 15, 6, 12 + walk);
        // Front Leg
        ctx.fillRect(2, 15, 6, 12 - walk);

        // Body (Uniform)
        ctx.fillStyle = "#2c3e50"; // Dark Blue Uniform
        drawRoundedRect(ctx, -12, -5+bob, 24, 25, 5);

        // Badge
        ctx.fillStyle = "gold";
        ctx.beginPath(); ctx.arc(5, 0+bob, 3, 0, Math.PI*2); ctx.fill();

        // Head
        ctx.fillStyle = "#ffcd94";
        ctx.beginPath(); ctx.arc(0, -12+bob, 10, 0, Math.PI*2); ctx.fill();

        // Cap
        ctx.fillStyle = "#2c3e50";
        ctx.beginPath(); ctx.arc(0, -16+bob, 10, Math.PI, 0); ctx.fill();
        ctx.fillRect(-12, -16+bob, 24, 4); // Brim

        // Angry Eyes
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(-3, -12+bob, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(3, -12+bob, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#000"; // Pupils
        ctx.beginPath(); ctx.arc(-3, -12+bob, 1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(3, -12+bob, 1, 0, Math.PI*2); ctx.fill();

        // Eyebrows (Angry)
        ctx.strokeStyle = "#000"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-6, -15+bob); ctx.lineTo(-1, -13+bob); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(6, -15+bob); ctx.lineTo(1, -13+bob); ctx.stroke();

        // Arm holding Net
        ctx.fillStyle = "#2c3e50";
        ctx.save();
        ctx.translate(5, 0+bob);
        ctx.rotate(-0.5);
        drawRoundedRect(ctx, -3, 0, 6, 15, 3);
        // Net Pole
        ctx.fillStyle = "#7f8c8d";
        ctx.fillRect(-2, 12, 4, 30);
        // Net
        ctx.strokeStyle = "#fff"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.arc(0, 42, 8, 0, Math.PI, true); ctx.stroke();
        ctx.restore();

        ctx.restore();
    }
}
