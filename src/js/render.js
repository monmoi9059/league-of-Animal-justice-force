import { CANVAS, CTX, CHARACTERS, ASSETS, LEVEL_HEIGHT, LEVEL_WIDTH, TILE_SIZE } from './constants.js';
import { gameState, tiles, debris, entities, players, particles, damageNumbers } from './state.js';
import { drawRoundedRect, drawAnatomicalHero } from './graphics.js';
import { secureRandom } from './math.js';

export function drawBackground(ctx, camX, camY) {
    // --- SURFACE SKY LAYER (Broforce Style) ---
    // Deep Blue -> Purple -> Orange Sunset Gradient
    let grd = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    grd.addColorStop(0, "#000033"); // Deep Night/Space Blue
    grd.addColorStop(0.5, "#4B0082"); // Indigo/Purple
    grd.addColorStop(0.8, "#FF4500"); // Orange Red
    grd.addColorStop(1, "#FFD700"); // Gold Horizon
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Sun (Massive, Low, Hazy)
    ctx.fillStyle = "rgba(255, 200, 50, 0.2)";
    ctx.beginPath();
    ctx.arc(ctx.canvas.width * 0.8, ctx.canvas.height * 0.8, 150, 0, Math.PI*2);
    ctx.fill();

    // Layer 1: Distant Mountains (Parallax 0.1) - Silhouette
    // Dark Purple/Black
    ctx.fillStyle = "rgba(20, 0, 40, 0.6)";
    let mtnW = 300;
    let mtnH = 400;
    let mtnOffset = ((camX * 0.1) % mtnW + mtnW) % mtnW;

    for(let i = -1; i < ctx.canvas.width / mtnW + 2; i++) {
        ctx.beginPath();
        let bx = i * mtnW - mtnOffset;
        let by = ctx.canvas.height + 600; // Much Lower ground
        ctx.moveTo(bx, by);
        // Jagged mountain silhouette
        ctx.lineTo(bx + mtnW*0.2, by - mtnH * 0.8);
        ctx.lineTo(bx + mtnW*0.5, by - mtnH);
        ctx.lineTo(bx + mtnW*0.8, by - mtnH * 0.7);
        ctx.lineTo(bx + mtnW, by);
        ctx.fill();
    }

    // Layer 2: Mid-Range Jungle (Parallax 0.3) - Deep Teal Silhouette
    ctx.fillStyle = "rgba(0, 40, 40, 0.8)";
    let jungleW = 150;
    let jungleH = 750; // Much Taller trees to compensate
    let jungleOffset = ((camX * 0.3) % jungleW + jungleW) % jungleW;

    for(let i = -1; i < ctx.canvas.width / jungleW + 2; i++) {
        let bx = i * jungleW - jungleOffset;
        let by = ctx.canvas.height + 600; // Much Lower ground

        // Draw Tree Trunks
        ctx.fillRect(bx + 20, by - jungleH + 50, 20, jungleH);
        ctx.fillRect(bx + 80, by - jungleH + 20, 15, jungleH);

        // Draw Canopy (Cluster of circles/leaves)
        ctx.beginPath();
        ctx.arc(bx + 30, by - jungleH + 50, 60, 0, Math.PI*2);
        ctx.arc(bx + 90, by - jungleH + 20, 45, 0, Math.PI*2);
        ctx.fill();
    }

    // Layer 3: Near Foliage (Parallax 0.6) - Black Silhouette
    ctx.fillStyle = "black";
    let nearW = 100;
    let nearH = 350; // Taller foliage
    let nearOffset = ((camX * 0.6) % nearW + nearW) % nearW;

    for(let i = -1; i < ctx.canvas.width / nearW + 2; i++) {
        let bx = i * nearW - nearOffset;
        let by = ctx.canvas.height + 600; // Much Lower ground

        // Grass/Bush shapes
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + 20, by - 50);
        ctx.lineTo(bx + 40, by - 20);
        ctx.lineTo(bx + 60, by - 80); // Tall grass blade
        ctx.lineTo(bx + 80, by - 30);
        ctx.lineTo(bx + 100, by);
        ctx.fill();
    }

    // --- UNDERGROUND LAYER (Overlay) ---
    // Sudden Transition at Y=600 (15 tiles)
    let caveAlpha = (camY > 600) ? 1.0 : 0.0;

    if (caveAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = caveAlpha;

        // Earthy Background (Broforce "Dirt" Style)
        ctx.fillStyle = "#2e1a0b"; // Dark Brown/Dirt Color
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Parallax Root/Rock Layer (Parallax 0.8)
        ctx.fillStyle = "#1a0f06"; // Darker brown
        let caveW = 400;
        let caveOffset = ((camX * 0.8) % caveW + caveW) % caveW;

        for(let i = -1; i < ctx.canvas.width / caveW + 2; i++) {
            let cx = i * caveW - caveOffset;

            // Random "Dirt Clumps" or "Rock Formations" in background
            ctx.beginPath();
            ctx.arc(cx + 100, 100, 60, 0, Math.PI*2);
            ctx.arc(cx + 250, 400, 80, 0, Math.PI*2);
            ctx.arc(cx + 50, 500, 50, 0, Math.PI*2);
            ctx.fill();

            // Hanging Roots (Ceiling)
            ctx.strokeStyle = "#3e2723";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cx + 150, 0);
            ctx.bezierCurveTo(cx + 140, 50, cx + 160, 100, cx + 150, 150);
            ctx.stroke();
        }

        // Darker Overlay Gradient for "Depth"
        let grd = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
        grd.addColorStop(0, "rgba(0,0,0,0.6)");
        grd.addColorStop(0.5, "transparent");
        grd.addColorStop(1, "rgba(0,0,0,0.6)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.restore();
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
                        CTX.beginPath(); CTX.arc(tx + secureRandom()*40, ty+10, 5, 0, Math.PI*2); CTX.fill();
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
