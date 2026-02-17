import { secureRandom } from '../math.js';
import { tiles } from '../state.js';
import { TILE_SIZE, LEVEL_HEIGHT, LEVEL_WIDTH } from '../constants.js';

export class Particle {
    constructor(x, y, color) {
        this.x=x;
        this.y=y;
        this.color=color;
        this.life=1.0;
        this.vx = (secureRandom()-0.5)*8;
        this.vy = (secureRandom()-0.5)*8;
        this.size = secureRandom()*6+3;
    }
    update() {
        this.x+=this.vx;
        this.y+=this.vy;
        this.vy+=0.4;
        this.life-=0.05;
    }
    draw(ctx, camX, camY, now) {
        ctx.save();
        ctx.fillStyle=this.color;
        ctx.globalAlpha=Math.max(0,this.life);
        ctx.beginPath();
        ctx.arc(this.x - camX,this.y - camY,this.size,0,Math.PI*2);
        ctx.fill();
        ctx.restore();
    }
}

export class SmokeParticle {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.vx = (secureRandom() - 0.5) * 2;
        this.vy = -secureRandom() * 2 - 1; // Rise up
        this.size = size || (secureRandom() * 10 + 5);
        this.life = 1.0;
        this.decay = secureRandom() * 0.02 + 0.01;
        this.color = `rgba(50, 50, 50, 0.5)`; // Dark smoke
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.size += 0.2; // Expand
        this.life -= this.decay;
    }
    draw(ctx, camX, camY, now) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life * 0.5);
        ctx.beginPath();
        ctx.arc(this.x - camX, this.y - camY, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export class DustParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (secureRandom() - 0.5) * 3;
        this.vy = -secureRandom() * 2; // Slight rise
        this.life = 1.0;
        this.size = secureRandom() * 5 + 2;
        this.color = color || "#fff";
        this.decay = 0.05 + secureRandom() * 0.03;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.9;
        this.size += 0.3; // Expand
        this.life -= this.decay;
    }
    draw(ctx, camX, camY, now) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life * 0.6;
        ctx.beginPath();
        ctx.arc(this.x - camX, this.y - camY, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export class SparkParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (secureRandom() - 0.5) * 15; // Fast burst
        this.vy = (secureRandom() - 0.5) * 15;
        this.life = 1.0;
        this.decay = 0.05 + secureRandom() * 0.05;
        this.color = color || "gold";
        this.size = secureRandom() * 3 + 1;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.5; // Gravity
        this.vx *= 0.9;
        this.life -= this.decay;

        // Bounce off floor
        let r = Math.floor(this.y / TILE_SIZE);
        let c = Math.floor(this.x / TILE_SIZE);
        if (r >= 0 && r < LEVEL_HEIGHT && c >= 0 && c < LEVEL_WIDTH && tiles[r] && tiles[r][c] && tiles[r][c].type !== 0) {
            this.vy *= -0.6;
            this.vx *= 0.6;
            this.y = r * TILE_SIZE - 2;
        }
    }
    draw(ctx, camX, camY, now) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillRect(this.x - camX, this.y - camY, this.size, this.size);
        ctx.restore();
    }
}

export class RockChunk {
    constructor(x, y, color) {
        this.x=x;
        this.y=y;
        this.color=color;
        this.vx=(secureRandom()-0.5)*8;
        this.vy=-secureRandom()*5-2;
        this.life=120;
        this.angle=secureRandom();
        this.rotSpeed=(secureRandom()-0.5)*0.5;
        this.size=secureRandom()*8+4;
    }
    update() {
        this.x+=this.vx;
        this.y+=this.vy;
        this.vy+=0.5;
        this.angle+=this.rotSpeed;
        this.life--;
        let r=Math.floor(this.y/TILE_SIZE);
        let c=Math.floor(this.x/TILE_SIZE);
        if(r>=0 && r<LEVEL_HEIGHT && c>=0 && c<LEVEL_WIDTH && tiles[r] && tiles[r][c] && tiles[r][c].type!==0) {
            this.vy=0;
            this.vx*=0.8;
            this.rotSpeed*=0.8;
            this.y=r*TILE_SIZE-2;
        }
    }
    draw(ctx, camX, camY, now) {
        ctx.save();
        ctx.translate(this.x - camX,this.y - camY);
        ctx.rotate(this.angle);
        ctx.fillStyle=this.color;
        ctx.fillRect(-this.size/2,-this.size/2,this.size,this.size);
        // Detail
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(-this.size/4, -this.size/4, this.size/2, this.size/2);
        ctx.restore();
    }
}
