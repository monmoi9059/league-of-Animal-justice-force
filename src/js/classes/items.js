class PropaneTank {
    constructor(x, y) { this.x = x; this.y = y; this.w = 30; this.h = 40; this.hp = 1; this.vy=0; }
    update() {
        this.vy += GRAVITY; this.y += this.vy;
        let c = Math.floor((this.x+this.w/2)/TILE_SIZE); let r = Math.floor((this.y+this.h)/TILE_SIZE);
        if(r>=0 && r<LEVEL_HEIGHT && c>=0 && c<LEVEL_WIDTH && tiles[r] && tiles[r][c] && (tiles[r][c].type===1||tiles[r][c].type===2)) {
            if(this.vy>0) { this.y=(r*TILE_SIZE)-this.h; this.vy=0; }
        }
    }
    takeDamage() {
        if(this.hp <= 0) return; // Prevent double explosion / infinite recursion
        this.hp = 0;
        shakeCamera(20);
        spawnExplosion(this.x+15, this.y+20, "orange", 3);

        let c = Math.floor(this.x / TILE_SIZE);
        let r = Math.floor(this.y / TILE_SIZE);
        destroyRadius(c, r, 4); // Increased radius for more chaos

        // Chain Reaction
        entities.forEach(e => {
            let dist = Math.hypot(e.x - this.x, e.y - this.y);
            // Increased range to 200 to ensure chains happen easier
            if(dist < 200 && e !== this && e.takeDamage) {
                // If it's another tank or explosive, this will trigger it
                e.takeDamage(10);
            }
        });

        if(Math.hypot(player.x - this.x, player.y - this.y) < 150) player.takeDamage();
        spawnDamageNumber(this.x, this.y, "BOOM!", "red");
    }
    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        // Tank Body
        let grd = ctx.createLinearGradient(cx, cy, cx+this.w, cy);
        grd.addColorStop(0, "#c0392b"); grd.addColorStop(0.5, "#e74c3c"); grd.addColorStop(1, "#922b21");
        ctx.fillStyle = grd;
        drawRoundedRect(ctx, cx, cy, this.w, this.h, 8);

        // Valve
        ctx.fillStyle = "#95a5a6";
        ctx.fillRect(cx + 10, cy - 5, 10, 5);
        ctx.beginPath(); ctx.arc(cx+15, cy-8, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#ecf0f1"; ctx.beginPath(); ctx.arc(cx+15, cy-8, 2, 0, Math.PI*2); ctx.fill();

        // Label
        ctx.fillStyle = "white";
        ctx.save();
        ctx.translate(cx+15, cy+25);
        ctx.rotate(-Math.PI/4);
        ctx.font = "bold 10px Arial"; ctx.fillText("TNT", -10, 4);
        ctx.restore();
    }
}

class FallingBlock {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.w = 40; this.h = 40;
        this.vy = 0; this.active = false;
        this.hp = 999;
    }
    update() {
        if (!this.active) {
            // Check trigger
            if (Math.abs(player.x - this.x) < 30 && player.y > this.y && player.y < this.y + 300) {
                this.active = true;
                shakeCamera(2);
            }
        } else {
            this.vy += GRAVITY;
            this.y += this.vy;

            // Collision with entities
            entities.forEach(e => {
                if (e !== this && rectIntersect(this.x, this.y, this.w, this.h, e.x, e.y, e.w, e.h)) {
                     if (e.takeDamage) e.takeDamage(10); // Crush them
                }
            });
            if (rectIntersect(this.x, this.y, this.w, this.h, player.x, player.y, player.w, player.h)) {
                player.takeDamage(1);
            }

            // Hit ground
            let c = Math.floor((this.x+this.w/2)/TILE_SIZE);
            let r = Math.floor((this.y+this.h)/TILE_SIZE);
            if(r>=0 && r<LEVEL_HEIGHT && c>=0 && c<LEVEL_WIDTH && tiles[r] && tiles[r][c] && tiles[r][c].type !== 0) {
                this.hp = 0; // Destroy self
                spawnExplosion(this.x + 20, this.y + 20, "#777", 2);
                shakeCamera(5);
                // Maybe destroy the tile it hit?
                // destroyRadius(c, r, 1);
            }
        }
    }
    takeDamage() {
        this.active = true; // Fall if shot
    }
    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        ctx.fillStyle = "#555"; // Stone color
        ctx.fillRect(cx, cy, this.w, this.h);

        // Cracks / Detail
        ctx.strokeStyle = "#333";
        ctx.beginPath(); ctx.moveTo(cx+5, cy+5); ctx.lineTo(cx+15, cy+25); ctx.lineTo(cx+35, cy+10); ctx.stroke();

        // Spikes on bottom?
        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.moveTo(cx, cy+this.h);
        ctx.lineTo(cx+10, cy+this.h+5);
        ctx.lineTo(cx+20, cy+this.h);
        ctx.lineTo(cx+30, cy+this.h+5);
        ctx.lineTo(cx+40, cy+this.h);
        ctx.fill();
    }
}

class Helicopter {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.w = 160; this.h = 60;
        this.hp = 9999;
        this.frame = 0;
        this.state = 'waiting'; // waiting, taking_off
        this.timer = 0;
    }
    update() {
        this.frame++;

        if (this.state === 'waiting') {
            // Hover effect
            this.y = this.y + Math.sin(this.frame * 0.1) * 0.5;

            // Check player entry
            // Hitbox for entry is smaller, near the door
            if (rectIntersect(this.x + 40, this.y + 10, 80, 50, player.x, player.y, player.w, player.h)) {
                if (keys['arrowup'] || keys['w'] || Math.abs(player.x - (this.x+80)) < 10) {
                    this.state = 'taking_off';
                    player.x = -9999; // Hide player
                    gameState.hitStop = 60; // Pause briefly for drama
                    shakeCamera(10);
                }
            }
        } else if (this.state === 'taking_off') {
            this.timer++;
            this.y -= 2 + (this.timer * 0.05); // Accelerate up

            // EXPLOSIONS
            if (this.timer % 10 === 0) {
                let ex = this.x + (secureRandom() - 0.5) * 400;
                let ey = this.y + 200 + (secureRandom() * 100);
                shakeCamera(20);
                spawnExplosion(ex, ey, "orange", 5);
                spawnDamageNumber(ex, ey, "BOOM!", "red");
            }

            if (this.timer > 180) {
                winGame();
            }
        }
    }
    takeDamage() {}
    draw(ctx, camX, camY) {
        let cx = this.x - camX;
        let cy = this.y - camY;

        // Propeller
        ctx.fillStyle = "#111";
        ctx.fillRect(cx + 10, cy - 10, 140, 5);
        // Blurring prop
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        let blur = Math.sin(this.frame) * 10;
        ctx.fillRect(cx - 10, cy - 10, 180, 5);

        // Body
        ctx.fillStyle = "#2c3e50";
        drawRoundedRect(ctx, cx, cy, 120, 60, 20);

        // Tail
        ctx.fillStyle = "#34495e";
        ctx.fillRect(cx + 110, cy + 20, 50, 10);
        ctx.fillRect(cx + 150, cy + 10, 5, 30); // Tail rotor

        // Cockpit window
        ctx.fillStyle = "#3498db";
        ctx.beginPath();
        ctx.moveTo(cx + 10, cy + 10);
        ctx.lineTo(cx + 40, cy + 10);
        ctx.lineTo(cx + 40, cy + 40);
        ctx.lineTo(cx + 20, cy + 40);
        ctx.fill();

        // Skids
        ctx.strokeStyle = "#7f8c8d";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx + 20, cy + 60); ctx.lineTo(cx + 20, cy + 70); ctx.lineTo(cx + 100, cy + 70); ctx.lineTo(cx + 100, cy + 60);
        ctx.stroke();

        // Door (open)
        ctx.fillStyle = "#111";
        ctx.fillRect(cx + 50, cy + 10, 40, 40);

        if (this.state === 'waiting') {
            // Arrow pointing down
            let bob = Math.sin(this.frame * 0.2) * 5;
            ctx.fillStyle = "gold";
            ctx.beginPath(); ctx.moveTo(cx+70, cy-30+bob); ctx.lineTo(cx+80, cy-40+bob); ctx.lineTo(cx+60, cy-40+bob); ctx.fill();
            ctx.fillRect(cx+67, cy-50+bob, 6, 10);
        }
    }
}

class Dumpster {
    constructor(x, y) { this.x = x; this.y = y; this.w = 60; this.h = 50; this.vy = 0; this.hp = 999; this.active = true; }
    update() {
        if(!this.active) return;
        this.vy += GRAVITY * 2; this.y += this.vy;
        let r = Math.floor((this.y + this.h) / TILE_SIZE); let c = Math.floor((this.x + this.w/2) / TILE_SIZE);
        if (r>=0 && r<LEVEL_HEIGHT && c>=0 && c<LEVEL_WIDTH && tiles[r] && tiles[r][c] && tiles[r][c].type !== 0) {
            shakeCamera(15); spawnExplosion(this.x + 30, this.y + 50, "grey", 2);
            destroyRadius(c, r, 2);
            entities.forEach(e => { if(e !== this && Math.abs(e.x - this.x) < 80 && Math.abs(e.y - this.y) < 80) if(e.takeDamage) e.takeDamage(100); });
            this.active = false; this.hp = 0;
        }
    }
    takeDamage() {}
    draw(ctx, camX, camY) {
        let cx = this.x - camX; let cy = this.y - camY;
        ctx.fillStyle = "#27ae60"; // Green
        drawRoundedRect(ctx, cx, cy, this.w, this.h, 4);
        ctx.fillStyle = "#2ecc71";
        ctx.fillRect(cx+5, cy+5, this.w-10, 5); // Lid hinge
        ctx.fillStyle = "#fff"; ctx.font = "12px Arial"; ctx.fillText("TRASH", cx + 10, cy + 30);
    }
}

class TrappedBeast {
    constructor(x, y, anchorR, anchorC) {
        this.x = x; this.y = y; this.w = 30; this.h = 30;
        this.anchorR = anchorR; this.anchorC = anchorC;
        this.hp = 999; this.frame = 0; this.bobOffset = secureRandom() * 10;
        let rnd = Math.floor(secureRandom() * CHARACTERS.length);
        this.heroData = CHARACTERS[rnd];
    }
    update() {
        this.frame++;
        if (this.anchorR >= 0 && this.anchorR < LEVEL_HEIGHT && this.anchorC >= 0 && this.anchorC < LEVEL_WIDTH) {
            if (tiles[this.anchorR] && tiles[this.anchorR][this.anchorC] && tiles[this.anchorR][this.anchorC].type === 0) this.liberate();
        }
    }
    liberate() {
        this.hp = 0; gameState.score += 500; gameState.rescues++; gameState.lives++;
        spawnDamageNumber(this.x, this.y, "SAVED!", "gold", 30);
        player.setCharacter(this.heroData.id);
        spawnExplosion(this.x + 15, this.y + 15, "gold", 2);

        if (globalUnlocked < CHARACTERS.length) {
            globalUnlocked++;
        }

        if (player.health < 3) player.health = 3;
        updateUI();
    }
    takeDamage() {}
    draw(ctx, camX, camY) {
        let cx = this.x - camX; let cy = this.y - camY;
        cy += Math.sin((this.frame + this.bobOffset) * 0.1) * 3;
        let ax = (this.anchorC * TILE_SIZE) - camX + 20; let ay = (this.anchorR * TILE_SIZE) - camY + 20;
        ctx.strokeStyle = C.leash; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(cx + 15, cy + 5); ctx.stroke();
        ctx.save(); ctx.translate(cx + 15, cy + 15); ctx.scale(0.8, 0.8);
        drawAnatomicalHero(ctx, this.heroData, this.frame); ctx.restore();
        ctx.fillStyle = "#fff"; ctx.font = "10px monospace"; ctx.fillText("HELP", cx+2, cy+35);
    }
}
