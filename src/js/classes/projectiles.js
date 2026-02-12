class Bullet {
    constructor(x, y, dir, isSpecial, charData, isDown = false, isSecondary = false, isUp = false) {
        this.x = x; this.y = y;
        this.life = 80; this.isSpecial = isSpecial; this.w = 15; this.h = 5;
        this.color = charData.pColor;
        this.type = charData.pType;
        this.isEnemy = charData.isEnemy || false;
        this.returnState = 0;

        // DEFAULT VELOCITIES
        this.vx = dir * 15;
        this.vy = (secureRandom() - 0.5) * 2;

        // DOWNWARD SHOT OVERRIDE
        if (isDown) {
            this.vx = 0;
            this.vy = 15;
            this.w = 8; this.h = 20; // Thin vertical projectile
        }

        // UPWARD SHOT OVERRIDE
        if (isUp) {
            this.vx = 0;
            this.vy = -15;
            this.w = 8; this.h = 20; // Thin vertical projectile
        }

        // SECONDARY THROW OVERRIDE (Melee chars)
        if (isSecondary) {
             this.vx = dir * 12;
             this.vy = -5; // Arcing? No, prompt said throw forward. Gravity applied in update for grenades/rockets anyway.
             this.w = 12; this.h = 12;
             this.color = "#ccc"; // Generic projectile color
        }

        // TYPE SPECIFIC ADJUSTMENTS (Overrides defaults unless specific action like Down/Secondary)
        if (!isDown && !isSecondary && !isUp) {
            if (this.type === 'spread') { this.w = 8; this.h = 8; this.vx = dir * 15 + (secureRandom()-0.5)*5; this.vy = (secureRandom()-0.5)*10; }
            if (this.type === 'rocket' || this.type === 'grenade') { this.w = 12; this.h = 12; this.vy = -5; }
            if (this.type === 'boomerang') { this.w = 20; this.h = 20; this.life = 100; }
            if (this.type === 'bolt') { this.w = 25; this.h = 10; }
            if (this.type === 'laser') { this.w = 40; this.h = 5; this.vx = dir * 25; }
            if (this.type === 'magic') { this.w = 10; this.h = 10; this.baseY = y; this.timer = 0; }

            // NEW WEAPONS
            if (this.type === 'fireball') { this.w = 20; this.h = 20; this.vx = dir * 12; }
            if (this.type === 'ice_beam') { this.w = 30; this.h = 6; this.vx = dir * 20; }
            if (this.type === 'sonic_wave') { this.w = 10; this.h = 40; this.vx = dir * 8; this.life = 120; }
            if (this.type === 'lightning') { this.w = 50; this.h = 4; this.vx = dir * 40; } // Very fast
            if (this.type === 'shuriken') { this.w = 15; this.h = 15; this.vx = dir * 18; this.rotation = 0; }
            if (this.type === 'water_gun') { this.w = 12; this.h = 12; this.vx = dir * 14; this.vy = (secureRandom()-0.5)*5; }
            if (this.type === 'acid_spit') { this.w = 10; this.h = 10; this.vx = dir * 10; this.vy = -8; } // Arc
            if (this.type === 'card_throw') { this.w = 12; this.h = 4; this.vx = dir * 22; }
        }
    }
    update() {
        // MOVEMENT LOGIC
        if (this.type === 'grenade' || this.type === 'rocket' || this.type === 'acid_spit') {
            this.vy += 0.3; // Gravity
            this.x += this.vx; this.y += this.vy;
        }
        else if (this.type === 'boomerang' && this.vx !== 0) { // Only boomerang behavior if moving horizontally (not down-shot)
            if (this.returnState === 0) {
                this.x += this.vx; this.vx *= 0.95;
                if (Math.abs(this.vx) < 1) { this.returnState = 1; }
            } else {
                let dx = player.x - this.x; let dy = player.y - this.y;
                let angle = Math.atan2(dy, dx);
                this.x += Math.cos(angle) * 15; this.y += Math.sin(angle) * 15;
                if (Math.abs(dx) < 20 && Math.abs(dy) < 20) this.life = 0;
            }
        }
        else if (this.type === 'magic' && this.vx !== 0) {
            this.timer++; this.x += this.vx; this.y = this.baseY + Math.sin(this.timer * 0.2) * 20;
        }
        else if (this.type === 'shuriken') {
            this.x += this.vx; this.y += this.vy;
            this.rotation += 0.5;
        }
        else if (this.type === 'sonic_wave') {
             this.x += this.vx; this.w += 0.5; this.h += 1; // Grow
             this.y -= 0.5; // Center growth approx
        }
        else { // Standard Linear (includes Down Shot)
            this.x += this.vx; this.y += this.vy;
        }

        this.life--;

        // COLLISIONS
        let c = Math.floor(this.x / TILE_SIZE); let r = Math.floor(this.y / TILE_SIZE);
        let hitWall = false;

        if (r>=0 && r<LEVEL_HEIGHT && c>=0 && c<LEVEL_WIDTH && tiles[r] && tiles[r][c] && tiles[r][c].type !== 0) {
            let t = tiles[r][c];
            // Sonic wave passes through walls but eventually dies? Or just passes?
            if (this.type === 'sonic_wave') {
                 // Pass through, but maybe small visual effect?
            }
            else if (t.type === 1 || t.type === 2) {
                if(this.type === 'boomerang' && this.vx !== 0) {
                    this.returnState = 1;
                    if (t.type === 1) {
                        spawnExplosion(this.x, this.y, C.dirtLight, 1);
                        tiles[r][c] = { type: 0 };
                    }
                }
                else {
                    spawnExplosion(this.x, this.y, C.dirtLight, 1);
                    this.life = 0;
                    if (t.type === 1) { tiles[r][c] = { type: 0 }; }
                    // Reduced destroy radius from 2 to 1 for smaller destruction
                    if (this.isSpecial || this.type === 'rocket' || this.type === 'grenade' || this.type === 'fireball' || this.vy > 0) destroyRadius(c, r, 1);
                }
            }
        }

        // ENEMY COLLISIONS (Player Bullets Only)
        if (!this.isEnemy) {
            for(let i=0; i<entities.length; i++) {
                let e = entities[i];
                if((e.hp !== undefined && e.hp > 0)) {
                    if(rectIntersect(this.x, this.y, this.w, this.h, e.x, e.y, e.w, e.h)) {
                        if(e.takeDamage) e.takeDamage(this.isSpecial ? 5 : 1);
                        if (this.type !== 'boomerang') this.life = 0;
                        else this.returnState = 1;
                    }
                }
            }
        }

        // PLAYER COLLISION (Enemy Bullets Only)
        if (this.isEnemy && player) {
             if(rectIntersect(this.x, this.y, this.w, this.h, player.x, player.y, player.w, player.h)) {
                  player.takeDamage(this.isSpecial ? 2 : 1);
                  if (this.type !== 'boomerang') this.life = 0;
                  else this.returnState = 1;
             }
        }
    }

    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        if (this.type === 'boomerang') {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(Date.now() * 0.2);
            ctx.fillStyle = this.color;
            // Draw V shape
            ctx.beginPath();
            ctx.moveTo(0,0); ctx.lineTo(15, -10); ctx.lineTo(10, 0); ctx.lineTo(15, 10); ctx.fill();
            ctx.restore();
        }
        else if (this.type === 'grenade' || this.type === 'rocket') {
             ctx.fillStyle = "#2ecc71"; // Green grenade
             ctx.beginPath(); ctx.arc(cx+this.w/2, cy+this.h/2, 6, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = "#27ae60";
             ctx.fillRect(cx+this.w/2-2, cy-2, 4, 4); // Pin
        }
        else if (this.type === 'bolt' || this.type === 'laser' || this.type === 'ice_beam' || this.type === 'lightning') {
             ctx.fillStyle = this.color;
             ctx.shadowBlur = 10; ctx.shadowColor = this.color;
             drawRoundedRect(ctx, cx, cy, this.w, this.h, 2);
             ctx.shadowBlur = 0;
        }
        else if (this.type === 'fireball') {
             ctx.fillStyle = "#FF4500";
             ctx.beginPath(); ctx.arc(cx+this.w/2, cy+this.h/2, 10, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = "#FFFF00";
             ctx.beginPath(); ctx.arc(cx+this.w/2, cy+this.h/2, 6, 0, Math.PI*2); ctx.fill();
        }
        else if (this.type === 'shuriken') {
             ctx.save();
             ctx.translate(cx + this.w/2, cy + this.h/2);
             ctx.rotate(this.rotation || 0);
             ctx.fillStyle = "#C0C0C0";
             ctx.beginPath();
             for(let i=0; i<4; i++) {
                 ctx.rotate(Math.PI/2);
                 ctx.moveTo(0,0); ctx.lineTo(8, 0); ctx.lineTo(2, 2); ctx.lineTo(0, 0);
             }
             ctx.fill();
             ctx.restore();
        }
        else if (this.type === 'sonic_wave') {
             ctx.strokeStyle = this.color; ctx.lineWidth = 2;
             ctx.beginPath(); ctx.arc(cx, cy+this.h/2, this.h, -Math.PI/4, Math.PI/4); ctx.stroke();
             ctx.beginPath(); ctx.arc(cx-10, cy+this.h/2, this.h-10, -Math.PI/4, Math.PI/4); ctx.stroke();
        }
        else if (this.type === 'card_throw') {
             ctx.fillStyle = "#fff";
             ctx.fillRect(cx, cy, this.w, this.h);
             ctx.fillStyle = "red";
             ctx.beginPath(); ctx.arc(cx+this.w/2, cy+this.h/2, 2, 0, Math.PI*2); ctx.fill();
        }
        else {
            // Standard
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(cx+this.w/2, cy+this.h/2, 5, 0, Math.PI*2); ctx.fill();
        }
    }
}

class MeleeHitbox {
    constructor(x, y, w, h, owner, power=1) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.life = 15; this.power = power;
        this.hp = 1;
        spawnExplosion(x + w/2, y + h/2, "#fff", 0.5);
    }
    update() {
        this.life--;
        if (this.life <= 0) this.hp = 0;
        let c = Math.floor((this.x + this.w/2) / TILE_SIZE);
        let r = Math.floor((this.y + this.h/2) / TILE_SIZE);
        destroyRadius(c, r, 1);
        for(let i=0; i<entities.length; i++) {
            let e = entities[i];
            if(e !== this && ((e.hp !== undefined && e.hp > 0))) {
                if(rectIntersect(this.x, this.y, this.w, this.h, e.x, e.y, e.w, e.h)) {
                    if(e.takeDamage) e.takeDamage(this.power * 2);
                }
            }
        }
    }
    draw(ctx, camX, camY) {
        // Invisible Hitbox
        // ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        // ctx.fillRect(this.x - camX, this.y - camY, this.w, this.h);
    }
    takeDamage() {}
}

class Package {
    constructor(x, y, vx, vy) { this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.w = 20; this.h = 20; this.life = 120; this.hp = 1; }
    update() {
        this.x += this.vx; this.y += this.vy; this.vy += 0.3; this.life--;
        let c = Math.floor(this.x / TILE_SIZE); let r = Math.floor(this.y / TILE_SIZE);
        let hit = false;
        if (r>=0 && r<LEVEL_HEIGHT && c>=0 && c<LEVEL_WIDTH && tiles[r] && tiles[r][c] && tiles[r][c].type !== 0) hit = true;
        if (rectIntersect(this.x, this.y, this.w, this.h, player.x, player.y, player.w, player.h)) hit = true;
        if (hit || this.life <= 0) {
            spawnExplosion(this.x, this.y, "#e67e22", 1);
            if (Math.hypot(player.x - this.x, player.y - this.y) < 60) player.takeDamage();
            destroyRadius(c, r, 1);
            this.life = 0; this.hp = 0;
        }
    }
    takeDamage() { this.life = 0; }
    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        ctx.fillStyle = "#d35400"; // Box color
        drawRoundedRect(ctx, cx, cy, this.w, this.h, 2);

        // Tape
        ctx.fillStyle = "#f1c40f";
        ctx.fillRect(cx + 8, cy, 4, this.h);
        ctx.fillRect(cx, cy + 8, this.w, 4);
    }
}

class DebrisProjectile {
    constructor(x, y, vx, vy) { this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.life = 120; this.w = 20; this.h = 20; this.hp = 1; }
    update() {
        this.x += this.vx; this.y += this.vy; this.life--;
        if (rectIntersect(this.x, this.y, this.w, this.h, player.x, player.y, player.w, player.h)) {
            player.takeDamage(); this.life = 0;
        }
    }
    takeDamage() { this.life = 0; }
    draw(ctx, camX, camY) {
        ctx.fillStyle = "#7f8c8d";
        ctx.beginPath(); ctx.arc(this.x - camX + 10, this.y - camY + 10, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#95a5a6";
        ctx.beginPath(); ctx.arc(this.x - camX + 8, this.y - camY + 8, 3, 0, Math.PI*2); ctx.fill();
    }
}
