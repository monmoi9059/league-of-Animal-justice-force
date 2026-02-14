import { tiles } from '../state.js';
import { TILE_SIZE, LEVEL_HEIGHT } from '../constants.js';

export class Particle {
    constructor(x, y, color) { this.x=x; this.y=y; this.color=color; this.life=1.0; this.vx = (Math.random()-0.5)*8; this.vy = (Math.random()-0.5)*8; this.size = Math.random()*6+3; }
    update() { this.x+=this.vx; this.y+=this.vy; this.vy+=0.4; this.life-=0.05; }
    draw(ctx, camX, camY, now) { ctx.save(); ctx.fillStyle=this.color; ctx.globalAlpha=Math.max(0,this.life); ctx.beginPath(); ctx.arc(this.x - camX,this.y - camY,this.size,0,Math.PI*2); ctx.fill(); ctx.restore(); }
}

export class RockChunk {
    constructor(x, y, color) { this.x=x; this.y=y; this.color=color; this.vx=(Math.random()-0.5)*8; this.vy=-Math.random()*5-2; this.life=120; this.angle=Math.random(); this.rotSpeed=(Math.random()-0.5)*0.5; this.size=Math.random()*8+4; }
    update() {
        this.x+=this.vx; this.y+=this.vy; this.vy+=0.5; this.angle+=this.rotSpeed; this.life--;
        let r=Math.floor(this.y/TILE_SIZE); let c=Math.floor(this.x/TILE_SIZE);
        if(r>=0 && r<LEVEL_HEIGHT && c>=0 && c<gameState.levelData.width && tiles[r] && tiles[r][c] && tiles[r][c].type!==0) { this.vy=0; this.vx*=0.8; this.rotSpeed*=0.8; this.y=r*TILE_SIZE-2; }
    }
    draw(ctx, camX, camY, now) { ctx.save(); ctx.translate(this.x - camX,this.y - camY); ctx.rotate(this.angle); ctx.fillStyle=this.color; ctx.fillRect(-this.size/2,-this.size/2,this.size,this.size); ctx.restore(); }
}
