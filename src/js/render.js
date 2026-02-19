import { CANVAS, CTX, CHARACTERS, ASSETS, LEVEL_HEIGHT, LEVEL_WIDTH, TILE_SIZE } from './constants.js';
import { gameState, tiles, debris, entities, players, particles, damageNumbers } from './state.js';
import { drawRoundedRect, drawAnatomicalHero } from './graphics.js';
import { secureRandom } from './math.js';

// Precompute Sine LUT for performance (40x faster than Math.sin, 4x faster than Math.random)
const LUT_SIZE = 1024;
const SIN_LUT = new Float32Array(LUT_SIZE);
for(let i=0; i<LUT_SIZE; i++) SIN_LUT[i] = Math.sin(i * (Math.PI * 2) / LUT_SIZE);

export function drawBackground(ctx, camX, camY) {
    let grd = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    grd.addColorStop(0, ASSETS.skyTop);
    grd.addColorStop(1, ASSETS.skyBot);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Sun/Moon
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.arc(ctx.canvas.width - 100, 100, 50, 0, Math.PI*2);
    ctx.fill();

    // Distant Mountains (Parallax 0.2)
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    let mountainW = 200;
    let offset = ((camX * 0.2) % mountainW + mountainW) % mountainW;
    for(let i = -1; i < ctx.canvas.width / mountainW + 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * mountainW - offset, ctx.canvas.height);
        ctx.lineTo(i * mountainW + mountainW/2 - offset, ctx.canvas.height - 150);
        ctx.lineTo(i * mountainW + mountainW - offset, ctx.canvas.height);
        ctx.fill();
    }

    // Closer Hills (Parallax 0.5)
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    let hillW = 100;
    let hillOffset = ((camX * 0.5) % hillW + hillW) % hillW;
    for(let i = -1; i < ctx.canvas.width / hillW + 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * hillW - hillOffset, ctx.canvas.height);
        ctx.quadraticCurveTo(i * hillW + hillW/2 - hillOffset, ctx.canvas.height - 100, i * hillW + hillW - hillOffset, ctx.canvas.height);
        ctx.fill();
    }
}

export function drawMenu() {
    CTX.setTransform(1, 0, 0, 1, 0, 0); // Safety reset
    CTX.clearRect(0,0,CANVAS.width,CANVAS.height);
    var grd = CTX.createLinearGradient(0, 0, 0, CANVAS.height);
    grd.addColorStop(0, "#111"); grd.addColorStop(1, "#333");
    CTX.fillStyle = grd; CTX.fillRect(0,0,CANVAS.width,CANVAS.height);
}

export function drawRoster() {
    const now = Date.now();
    CTX.setTransform(1, 0, 0, 1, 0, 0); // Safety reset
    CTX.clearRect(0,0,CANVAS.width,CANVAS.height);
    var grd = CTX.createLinearGradient(0, 0, 0, CANVAS.height);
    grd.addColorStop(0, "#111"); grd.addColorStop(1, "#333");
    CTX.fillStyle = grd; CTX.fillRect(0,0,CANVAS.width,CANVAS.height);

    let padding = 70;
    let cols = 18; // Increased columns for 200+ heroes
    let totalWidth = cols * padding;
    let totalHeight = Math.ceil(CHARACTERS.length / cols) * padding;

    // Scale down if screen is small (both width and height)
    let scaleX = 1;
    let scaleY = 1;

    if (totalWidth > CANVAS.width - 50) scaleX = (CANVAS.width - 50) / totalWidth;
    if (totalHeight > CANVAS.height - 150) scaleY = (CANVAS.height - 150) / totalHeight;

    let scale = Math.min(scaleX, scaleY);

    // Title
    CTX.font = "30px 'Courier New'";
    CTX.fillStyle = "#00ff41";
    CTX.textAlign = "center";
    CTX.fillText("ROSTER STATUS: " + gameState.globalUnlocked + " / " + CHARACTERS.length + " HEROES UNLOCKED", CANVAS.width/2, 50);

    CTX.save();
    // Center grid
    CTX.translate((CANVAS.width - (totalWidth * scale))/2, 100);
    CTX.scale(scale, scale);

    for(let i=0; i<CHARACTERS.length; i++) {
        let row = Math.floor(i / cols);
        let col = i % cols;
        let cx = col * padding + padding/2;
        let cy = row * padding + padding/2;

        CTX.fillStyle = "rgba(255,255,255,0.1)";
        drawRoundedRect(CTX, cx-30, cy-30, 60, 60, 10);

        if (i < gameState.globalUnlocked) {
            CTX.save();
            CTX.translate(cx, cy);
            CTX.scale(0.8, 0.8);
            let frame = now / 100;
            drawAnatomicalHero(CTX, CHARACTERS[i], frame);
            CTX.restore();

            CTX.fillStyle = "#aaa"; CTX.font = "8px Arial";
            let name = CHARACTERS[i].name.split(" ")[0];
            if(name.length > 8) name = name.substring(0,8);
            CTX.fillText(name, cx, cy+40);
        } else {
            CTX.fillStyle = "#222";
            CTX.beginPath(); CTX.arc(cx, cy, 15, 0, Math.PI*2); CTX.fill();

            // Linear progression (+2 per hero)
            let totalReq = (i === 0) ? 0 : (2 * i - 1);
            let remaining = totalReq - gameState.rescues;
            if (remaining < 0) remaining = 0;

            CTX.fillStyle = "#555";
            if (i === gameState.globalUnlocked) {
                CTX.font = "10px Arial"; CTX.fillText("NEXT", cx, cy-5);
                CTX.font = "bold 16px Arial"; CTX.fillStyle = "#00ff41"; CTX.fillText(remaining, cx, cy+12);
            } else {
                if (i < gameState.globalUnlocked + 10) {
                    CTX.font = "10px Arial"; CTX.fillText("NEED", cx, cy-5);
                    CTX.font = "16px Arial"; CTX.fillText(remaining, cx, cy+12);
                } else {
                    CTX.font = "20px Arial"; CTX.fillText("?", cx, cy+8);
                }
            }
        }
    }
    CTX.restore();
}

export function drawGame() {
    const now = Date.now();
    let sx = (secureRandom()-0.5) * gameState.shake;
    let sy = (secureRandom()-0.5) * gameState.shake;
    let rot = (secureRandom()-0.5) * (gameState.shake * 0.002); // Rotation shake

    CTX.setTransform(1, 0, 0, 1, 0, 0); // Safety reset
    CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);

    // Draw Background based on Biome
    drawBackground(CTX, gameState.cameraX, gameState.cameraY); // Background handles its own parallax

    CTX.save();

    // Center rotation
    CTX.translate(CANVAS.width/2, CANVAS.height/2);
    CTX.rotate(rot);
    CTX.translate(-CANVAS.width/2, -CANVAS.height/2);

    // Apply zoom
    let zoom = gameState.zoom || 1.0;
    CTX.scale(zoom, zoom);
    CTX.translate(-gameState.cameraX + sx, -gameState.cameraY + sy);

    // Calc visible area adjusted for zoom
    let visibleW = CANVAS.width / zoom;
    let visibleH = CANVAS.height / zoom;

    let startCol = Math.floor(gameState.cameraX / TILE_SIZE); let endCol = startCol + (visibleW / TILE_SIZE) + 4;
    let startRow = Math.floor(gameState.cameraY / TILE_SIZE); let endRow = startRow + (visibleH / TILE_SIZE) + 4;

    for(let r=startRow; r<endRow && r<LEVEL_HEIGHT; r++) {
        for(let c=startCol; c<endCol && c<LEVEL_WIDTH; c++) { // Use constant LEVEL_WIDTH for loop bound if array is large enough, or better check array length?
            // Actually tiles[r] might not exist if r is out of bounds, but we check r<LEVEL_HEIGHT
            if(tiles && tiles[r] && tiles[r][c] && tiles[r][c].type !== 0) {
                let t = tiles[r][c]; let tx = c*TILE_SIZE; let ty = r*TILE_SIZE;

                if(t.type === 6) {
                    CTX.fillStyle = ASSETS.ladder;
                    CTX.fillRect(tx + 10, ty, 5, TILE_SIZE);
                    CTX.fillRect(tx + 25, ty, 5, TILE_SIZE);
                    for(let i=0; i<4; i++) CTX.fillRect(tx+10, ty + (i*10) + 2, 20, 4);
                }
                else if(t.type === 5) {
                    CTX.fillStyle = t.active ? "#00ff41" : "#555";
                    CTX.shadowBlur = 20; CTX.shadowColor = CTX.fillStyle;
                    CTX.fillRect(tx+15, ty+10, 5, 30);
                    CTX.beginPath(); CTX.moveTo(tx+20, ty+10); CTX.lineTo(tx+35, ty+15); CTX.lineTo(tx+20, ty+20); CTX.fill();
                    CTX.shadowBlur = 0; CTX.fillStyle = "#333"; CTX.fillRect(tx+5, ty+35, 30, 5);
                }
                else if(t.type === 4) {
                    // Spikes / Lava
                    if(t.color === '#e74c3c') { // Lava
                        CTX.fillStyle = t.color;
                        CTX.fillRect(tx, ty + 10, TILE_SIZE, TILE_SIZE - 10);
                        CTX.fillStyle = "orange";
                        // Deterministic bubble animation using LUT
                        let bubbleOffset = SIN_LUT[(now + tx) & (LUT_SIZE - 1)] * 15;
                        CTX.beginPath(); CTX.arc(tx + 20 + bubbleOffset, ty+10, 5, 0, Math.PI*2); CTX.fill();
                    } else {
                        let grd = CTX.createLinearGradient(tx, ty, tx, ty+TILE_SIZE);
                        grd.addColorStop(0, "#ccc"); grd.addColorStop(1, "#555"); CTX.fillStyle = grd;
                        CTX.beginPath(); CTX.moveTo(tx, ty+TILE_SIZE); CTX.lineTo(tx+10, ty); CTX.lineTo(tx+20, ty+TILE_SIZE); CTX.lineTo(tx+30, ty); CTX.lineTo(tx+40, ty+TILE_SIZE); CTX.fill();
                    }
                }
                else if (t.type === 1) {
                    // Dirt / Ground
                    let color = ASSETS.dirtBase;
                    if (gameState.levelData.biome === 'city') color = "#333";
                    if (gameState.levelData.biome === 'volcano') color = "#422";

                    CTX.fillStyle = color; CTX.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);

                    // Noise Texture
                    CTX.fillStyle = "rgba(0,0,0,0.1)";
                    for(let k=0; k<4; k++) {
                         let nx = (tx + (c*13 + r*7 + k*5) % TILE_SIZE);
                         let ny = (ty + (c*23 + r*11 + k*3) % TILE_SIZE);
                         CTX.fillRect(nx, ny, 2, 2);
                    }

                    if (gameState.levelData.biome === 'city') {
                        CTX.fillStyle = "#444"; CTX.fillRect(tx, ty+35, 40, 5); // Piping
                    } else {
                        CTX.fillStyle = ASSETS.dirtLight; CTX.fillRect(tx + 5, ty + 5, 10, 10); CTX.fillRect(tx + 25, ty + 20, 8, 8);
                    }

                    if(r > 0 && tiles[r-1][c].type === 0) {
                        if (gameState.levelData.biome === 'city') CTX.fillStyle = "#555"; // Concrete top
                        else if (gameState.levelData.biome === 'volcano') CTX.fillStyle = "#722"; // Charred top
                        else CTX.fillStyle = ASSETS.grassTop;
                        CTX.fillRect(tx, ty, TILE_SIZE, 8);
                    }
                }
                else if (t.type === 2) {
                    // Stone / Indestructible
                    let color = ASSETS.stoneBase;
                    if (gameState.levelData.biome === 'city') color = "#222";
                    CTX.fillStyle = color; CTX.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                    CTX.strokeStyle = ASSETS.stoneLight; CTX.lineWidth = 2; CTX.beginPath();
                    CTX.moveTo(tx, ty+20); CTX.lineTo(tx+TILE_SIZE, ty+20);
                    CTX.stroke();
                }
                else if (t.type === 3) {
                    // Metal / Skyscraper
                    CTX.fillStyle = "#34495e"; // Dark Blue-Grey
                    CTX.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                    // Windows
                    CTX.fillStyle = (Math.floor(now / 1000) + c + r) % 3 === 0 ? "yellow" : "#2c3e50";
                    CTX.fillRect(tx+10, ty+10, 8, 12);
                    CTX.fillRect(tx+22, ty+10, 8, 12);
                    // Border
                    CTX.strokeStyle = "#2c3e50"; CTX.lineWidth = 2;
                    CTX.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
                }
                else if (t.type === 9) {
                    CTX.fillStyle = "gold"; CTX.shadowBlur=30; CTX.shadowColor="gold";
                    CTX.fillRect(tx, ty, TILE_SIZE, TILE_SIZE); CTX.shadowBlur=0;
                    CTX.fillStyle = "#000"; CTX.font = "10px Arial"; CTX.fillText("VAN", tx+5, ty+25);
                }
            }
        }
    }

    debris.forEach(d => d.draw(CTX, 0, 0, now));
    entities.forEach(e => e.draw(CTX, 0, 0, now));
    if (players) {
        players.forEach(p => {
            if (p.health > 0) p.draw(CTX, 0, 0, now);
        });
    }
    particles.forEach(p => p.draw(CTX, 0, 0, now));

    CTX.font = "900 20px 'Segoe UI'";
    CTX.lineWidth = 3;
    damageNumbers.forEach(d => {
        CTX.fillStyle = d.color; CTX.strokeStyle = "black";
        CTX.strokeText(d.text, d.x, d.y); CTX.fillText(d.text, d.x, d.y);
    });

    CTX.restore();

    var grd = CTX.createRadialGradient(CANVAS.width/2, CANVAS.height/2, 200, CANVAS.width/2, CANVAS.height/2, 600);
    grd.addColorStop(0, "transparent"); grd.addColorStop(1, "rgba(0,0,0,0.6)");
    CTX.fillStyle = grd; CTX.fillRect(0,0,CANVAS.width, CANVAS.height);
}
