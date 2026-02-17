export function drawRoundedRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
}

export function drawCartoonEye(ctx, x, y, size, lookX, lookY) {
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.stroke();

    // Pupil
    let pupilSize = size * 0.4;
    let px = x + lookX * (size * 0.3);
    let py = y + lookY * (size * 0.3);
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(px, py, pupilSize, 0, Math.PI*2); ctx.fill();

    // Shine
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(px + pupilSize*0.3, py - pupilSize*0.3, pupilSize*0.3, 0, Math.PI*2); ctx.fill();
}

function drawWheel(ctx, x, y, r, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = "#ccc"; // Wheel color
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#333"; // Hub
    ctx.beginPath(); ctx.arc(0, 0, r*0.3, 0, Math.PI*2); ctx.fill();
    // Spokes
    ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    ctx.restore();
}

function drawLimb(ctx, x, y, width, len1, len2, angle1, angle2, color, style = null, isLeg = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle1);

    // Upper Limb
    ctx.fillStyle = color;
    drawRoundedRect(ctx, -width/2, 0, width, len1, width/2);

    // Shoulder/Hip Armor (Simple)
    if (style && (style.clothing === 'armor' || style.clothing === 'suit')) {
         ctx.fillStyle = style.texture === 'metal' ? '#999' : '#333';
         ctx.beginPath(); ctx.arc(0, 0, width*0.8, 0, Math.PI*2); ctx.fill();
    }

    ctx.translate(0, len1 - 2);
    ctx.rotate(angle2);

    // Lower Limb
    ctx.fillStyle = color;
    drawRoundedRect(ctx, -width/2, 0, width, len2, width/2);

    // Boots / Gloves (if style provided)
    if (style && style.clothing !== 'none') {
        let bootColor = "#333";
        if (style.clothing === 'armor') bootColor = "#555";
        else if (style.clothing === 'sash') bootColor = "#222"; // Ninja boots

        // Draw over the lower half of the lower limb
        ctx.fillStyle = bootColor;
        ctx.fillRect(-width/2, len2/2, width, len2/2);
    }

    ctx.restore();
}

function drawWing(ctx, x, y, width, length, angle, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.moveTo(0, 0); // Shoulder
    // Wing shape (teardrop)
    ctx.quadraticCurveTo(width*3, length/2, 0, length);
    ctx.quadraticCurveTo(-width, length/2, 0, 0);
    ctx.fill();

    // Feather details
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width, length*0.3); ctx.lineTo(width*2, length*0.4);
    ctx.moveTo(width*0.5, length*0.6); ctx.lineTo(width*1.5, length*0.7);
    ctx.stroke();

    ctx.restore();
}

// ---------------------------------------------------------
// STYLE INFERENCE & UTILS
// ---------------------------------------------------------

function pseudoRandom(seed) {
    let value = seed;
    return function() {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
    }
}

function getCharacterStyle(char) {
    // Generate a consistent seed from the character ID string
    let seed = 0;
    for (let i = 0; i < char.id.length; i++) {
        seed = (seed << 5) - seed + char.id.charCodeAt(i);
        seed |= 0; // Convert to 32bit integer
    }
    const rng = pseudoRandom(Math.abs(seed));

    const name = char.name.toUpperCase();
    const type = char.type.toLowerCase();

    let style = {
        texture: 'smooth', // fur, scales, metal, stone, wood, smooth
        clothing: 'none',  // vest, sash, belt, cape, armor
        headgear: 'none',  // helmet, hat, bandana, mask, crown, glasses
        expression: 'neutral', // angry, happy, serious, crazy
        eyeType: 'normal', // robot, beast, slit, glow
        hasScars: rng() > 0.8,
        hasAccessories: rng() > 0.7,
        dirty: rng() > 0.5, // Gritty factor
        rng: rng,
        seed: Math.abs(seed)
    };

    // --- TEXTURE INFERENCE ---
    if (['dog', 'wolf', 'fox', 'cat', 'lion', 'panther', 'bear', 'rodent', 'rabbit', 'skunk', 'poodle', 'raccoon', 'monkey', 'sheep', 'goat', 'cow', 'buffalo', 'pig', 'horse', 'donkey', 'hamster', 'mouse'].some(t => type.includes(t))) {
        style.texture = 'fur';
    } else if (['lizard', 'snake', 'croc', 'turtle', 'fish', 'shark', 'gecko', 'frog', 'toad'].some(t => type.includes(t))) {
        style.texture = 'scales';
    } else if (['robot', 'cyborg', 'stone', 'rock'].some(t => type.includes(t) || name.includes(t.toUpperCase()))) {
        style.texture = type.includes('stone') || type.includes('rock') ? 'stone' : 'metal';
    } else if (['tree', 'wood'].some(t => type.includes(t))) {
        style.texture = 'wood';
    } else if (['bee', 'ant', 'insect'].some(t => type.includes(t))) {
        style.texture = 'chitin';
    }

    // --- CLOTHING INFERENCE ---
    if (name.includes('NINJA') || name.includes('KARATE') || name.includes('MONK')) style.clothing = 'sash';
    else if (name.includes('KNIGHT') || name.includes('ARMOR') || name.includes('IRON')) style.clothing = 'armor';
    else if (name.includes('AGENT') || name.includes('DETECTIVE') || name.includes('POLICE') || name.includes('SOLDIER') || name.includes('RAMBO') || name.includes('COMMANDO')) style.clothing = 'vest';
    else if (name.includes('SUPER') || name.includes('BAT') || name.includes('THOR') || name.includes('DOCTOR') || name.includes('MAGIC') || name.includes('WONDER') || name.includes('VAMPIRE')) style.clothing = 'cape';
    else if (name.includes('COWBOY') || name.includes('SHERIFF') || name.includes('WEST') || name.includes('RANCH')) style.clothing = 'vest';
    else if (rng() > 0.6) style.clothing = 'belt'; // Random belt for others

    // --- HEADGEAR INFERENCE ---
    if (name.includes('KNIGHT') || name.includes('HELMET') || name.includes('CYBORG')) style.headgear = 'helmet';
    else if (name.includes('NINJA') || name.includes('TURTLE') || name.includes('SPIDER')) style.headgear = 'mask';
    else if (name.includes('DETECTIVE') || name.includes('COWBOY') || name.includes('INDIANA') || name.includes('CAPTAIN') || name.includes('WITCH') || name.includes('WIZARD')) style.headgear = 'hat';
    else if (name.includes('RAMBO') || name.includes('KARATE') || name.includes('PIRATE')) style.headgear = 'bandana';
    else if (name.includes('KING') || name.includes('PRINCE') || name.includes('QUEEN') || name.includes('PRINCESS') || name.includes('LORD')) style.headgear = 'crown';
    else if (name.includes('DOC') || name.includes('PROFESSOR') || name.includes('NERD')) style.headgear = 'glasses';

    // --- EXPRESSION INFERENCE ---
    if (char.melee || name.includes('VILLAIN') || name.includes('KILLER') || name.includes('DEAD') || name.includes('WAR') || name.includes('ANGRY')) style.expression = 'angry';
    else if (name.includes('HAPPY') || name.includes('CLOWN') || name.includes('JOKER') || name.includes('MAD')) style.expression = 'crazy';
    else if (type.includes('dog') || type.includes('cat') || type.includes('monkey')) style.expression = 'happy';

    // --- EYE TYPE INFERENCE ---
    if (type.includes('robot') || name.includes('CYBORG') || name.includes('IRON') || name.includes('TERMINATOR')) style.eyeType = 'robot';
    else if (type.includes('lizard') || type.includes('snake') || type.includes('croc') || type.includes('dragon')) style.eyeType = 'slit';
    else if (name.includes('ZOMBIE') || name.includes('GHOST') || name.includes('SPECTRE')) style.eyeType = 'glow';

    return style;
}

function drawClothing(ctx, style, x, y, w, h) {
    if (!style) return;

    if (style.clothing === 'vest') {
        ctx.fillStyle = "#333";
        // Vest is usually open or closed. Let's do closed tactical vest.
        ctx.fillRect(x, y, w, h*0.6);
        // Pockets
        ctx.fillStyle = "#555";
        ctx.fillRect(x + w*0.2, y + h*0.3, w*0.2, h*0.2);
        ctx.fillRect(x + w*0.6, y + h*0.3, w*0.2, h*0.2);
    } else if (style.clothing === 'sash') {
        ctx.fillStyle = "#b00";
        ctx.beginPath();
        // Diagonal sash
        ctx.moveTo(x + w, y);
        ctx.lineTo(x + w, y + 10);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + h - 10);
        ctx.fill();
        // Waist sash
        ctx.fillRect(x, y + h*0.6, w, 6);
    } else if (style.clothing === 'belt') {
        ctx.fillStyle = "#420";
        ctx.fillRect(x, y + h - 8, w, 6);
        ctx.fillStyle = "gold";
        ctx.fillRect(x + w/2 - 3, y + h - 9, 6, 8);
    } else if (style.clothing === 'armor') {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        // Chest highlight
        ctx.beginPath(); ctx.arc(x + w/2, y + h*0.3, w*0.25, 0, Math.PI*2); ctx.fill();
        // Belt
        ctx.fillStyle = "#555";
        ctx.fillRect(x, y + h - 5, w, 5);
    }
}

function drawBackAccessories(ctx, char, style, x, y, frame, vy) {
    if (style.clothing === 'cape') {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = char.cDark || "#c00";

        let wave = Math.sin(frame * 0.2);
        let lift = Math.min(Math.max(vy * 0.5, -0.5), 1.0);
        if (Math.abs(vy) > 0.5) lift -= 0.5; // Fly up

        // --- QUADRUPED CAPE LOGIC ---
        if (char.stance === 'quadruped') {
            // We are now positioned at the neck/shoulder (approx w/2 - 8)
            // Adjust translation slightly up
            ctx.translate(-2, -5);

            // Rotate less, flow backwards along the back
            ctx.rotate(0.1 + lift * 0.5);

            ctx.beginPath();
            ctx.moveTo(0, 0); // Neck attachment

            // Top edge flows back (negative x direction)
            ctx.lineTo(-28 - lift*5, 5 + wave*2);

            // Trailing edge
            ctx.lineTo(-32 - lift*8, 20 + wave*5);

            // Bottom edge curves back under toward the body
            ctx.quadraticCurveTo(-15, 12, 0, 8);

            ctx.fill();
        }
        // --- BIPED CAPE LOGIC ---
        else {
            ctx.rotate(0.2 + lift + wave * 0.1);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-20 - lift*10, 40); // Bottom left
            ctx.quadraticCurveTo(-10, 45 + wave*5, 0, 40); // Bottom curve
            ctx.lineTo(5, 0);
            ctx.fill();
        }

        ctx.restore();
    }

    // Backpack (if agent/soldier)
    if (style.clothing === 'vest') {
        ctx.fillStyle = "#222";
        ctx.fillRect(x-6, y+5, 12, 16);
        ctx.fillStyle = "#333";
        ctx.fillRect(x-4, y+7, 8, 12);
    }
}

function drawTexture(ctx, style, x, y, w, h) {
    let rng = style.rng;
    ctx.save();

    // Slight noise rotation for organic feel
    if (style.texture !== 'metal') ctx.rotate((rng() - 0.5) * 0.1);

    if (style.texture === 'fur') {
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1;
        let count = w*h/50;
        for(let i=0; i<count; i++) {
            let tx = x + rng() * w;
            let ty = y + rng() * h;
            ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + 2, ty + 2); ctx.stroke();
        }
    } else if (style.texture === 'scales') {
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = 1;
        let count = w*h/40;
        for(let i=0; i<count; i++) {
            let tx = x + rng() * w;
            let ty = y + rng() * h;
            ctx.beginPath(); ctx.arc(tx, ty, 2, 0, Math.PI); ctx.stroke();
        }
    } else if (style.texture === 'metal') {
        // Rivets
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        for(let i=0; i<4; i++) {
             ctx.beginPath(); ctx.arc(x + rng()*w, y + rng()*h, 1.5, 0, Math.PI*2); ctx.fill();
        }
        // Shine
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fillRect(x, y, w/2, h);
    } else if (style.texture === 'stone') {
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1;
        for(let i=0; i<3; i++) {
             let tx = x + rng() * w;
             let ty = y + rng() * h;
             ctx.beginPath(); ctx.moveTo(tx, ty);
             ctx.lineTo(tx + (rng()-0.5)*10, ty + (rng()-0.5)*10);
             ctx.lineTo(tx + (rng()-0.5)*20, ty + (rng()-0.5)*20);
             ctx.stroke();
        }
    } else if (style.texture === 'wood') {
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = 1;
        let count = w/4;
        for(let i=0; i<count; i++) {
             let tx = x + i*4;
             ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx, y+h); ctx.stroke();
        }
    }

    // Gritty dirt overlay
    if (style.dirty) {
         ctx.fillStyle = "rgba(60, 40, 20, 0.1)"; // Mud/Dust
         for(let i=0; i<10; i++) {
             ctx.beginPath(); ctx.arc(x + rng()*w, y + rng()*h, rng()*3, 0, Math.PI*2); ctx.fill();
         }
    }

    ctx.restore();
}

function drawShading(ctx, x, y, w, h) {
    let grd = ctx.createLinearGradient(x, y, x+w, y+h);
    grd.addColorStop(0, "rgba(255,255,255,0.1)"); // Highlight top-left
    grd.addColorStop(0.5, "transparent");
    grd.addColorStop(1, "rgba(0,0,0,0.3)"); // Shadow bottom-right
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, w, h);
}

function drawFaceFeatures(ctx, style, x, y, size = 1) {
    let rng = style.rng;

    // Blink Logic
    if ((Date.now() % 4000) < 150) {
        ctx.strokeStyle = "#000"; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 4*size, y); ctx.lineTo(x - size, y);
        ctx.moveTo(x + size, y); ctx.lineTo(x + 4*size, y);
        ctx.stroke();
        return; // Eyes closed
    }

    let eyeColor = "#fff";
    let pupilColor = "#000";

    if (style.eyeType === 'robot') { eyeColor = "#0ff"; pupilColor = "#fff"; }
    else if (style.eyeType === 'glow') { eyeColor = "#afa"; pupilColor = "#afa"; }
    else if (style.eyeType === 'slit') { eyeColor = "#ff0"; pupilColor = "#000"; }

    // Left Eye
    let lx = x - 4*size;
    let ly = y;
    // Right Eye
    let rx = x + 4*size;
    let ry = y;

    // Draw Eyes
    if (style.eyeType === 'robot') {
        ctx.fillStyle = eyeColor;
        ctx.shadowBlur = 5; ctx.shadowColor = eyeColor;
        ctx.fillRect(lx-2, ly-1, 4*size, 2*size);
        ctx.fillRect(rx-2, ry-1, 4*size, 2*size);
        ctx.shadowBlur = 0;
    } else {
        // Sclera
        ctx.fillStyle = eyeColor;
        ctx.beginPath(); ctx.arc(lx, ly, 3*size, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(rx, ry, 3*size, 0, Math.PI*2); ctx.fill();

        // Pupil
        ctx.fillStyle = pupilColor;
        if (style.eyeType === 'slit') {
            ctx.fillRect(lx-0.5, ly-3, 1, 6);
            ctx.fillRect(rx-0.5, ry-3, 1, 6);
        } else {
            ctx.beginPath(); ctx.arc(lx+1, ly, 1.5*size, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(rx+1, ry, 1.5*size, 0, Math.PI*2); ctx.fill();
        }
    }

    // Brows
    ctx.strokeStyle = style.texture === 'fur' ? style.cDark || '#000' : "#000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (style.expression === 'angry') {
        ctx.moveTo(lx-3, ly-4); ctx.lineTo(lx+2, ly-2);
        ctx.moveTo(rx+3, ly-4); ctx.lineTo(rx-2, ly-2);
    } else if (style.expression === 'crazy') {
        ctx.moveTo(lx-3, ly-5); ctx.lineTo(lx+2, ly-3);
        ctx.moveTo(rx-2, ly-4); ctx.lineTo(rx+3, ly-6);
    } else {
        // Neutral/Happy
        ctx.moveTo(lx-2, ly-4); ctx.lineTo(lx+2, ly-4);
        ctx.moveTo(rx-2, ly-4); ctx.lineTo(rx+2, ly-4);
    }
    ctx.stroke();

    // Mouth
    ctx.beginPath();
    let my = y + 6*size;
    if (style.expression === 'angry') {
        ctx.moveTo(x-3, my); ctx.lineTo(x+3, my); // Line mouth
        // Teeth
        ctx.strokeStyle = "#fff"; ctx.lineWidth=2; ctx.stroke(); ctx.lineWidth=1;
    } else if (style.expression === 'happy') {
        ctx.arc(x, my-2, 4, 0.2, Math.PI-0.2); // Smile
        ctx.strokeStyle = "#000"; ctx.stroke();
    } else {
        ctx.moveTo(x-2, my); ctx.lineTo(x+2, my);
        ctx.strokeStyle = "#000"; ctx.stroke();
    }
}

function drawHeadgear(ctx, style, x, y, size=1) {
    if (style.headgear === 'none') return;

    if (style.headgear === 'helmet') {
        ctx.fillStyle = style.texture === 'metal' ? "#aaa" : "#444";
        ctx.beginPath();
        ctx.arc(x, y-2, 12*size, Math.PI, 0); // Top dome
        ctx.lineTo(x+12*size, y+5);
        ctx.lineTo(x+4, y+5); // Eye cutout right
        ctx.lineTo(x, y+2);   // Nose bridge
        ctx.lineTo(x-4, y+5); // Eye cutout left
        ctx.lineTo(x-12*size, y+5);
        ctx.fill();
        // Plume?
        if (style.rng() > 0.5) {
             ctx.fillStyle = "red";
             ctx.beginPath(); ctx.moveTo(x, y-12); ctx.quadraticCurveTo(x+10, y-20, x+5, y-5); ctx.fill();
        }
    } else if (style.headgear === 'hat') {
        ctx.fillStyle = "#321"; // Brown hat
        ctx.fillRect(x-14, y-2, 28, 4); // Brim
        ctx.fillRect(x-8, y-12, 16, 10); // Top
    } else if (style.headgear === 'bandana') {
        ctx.fillStyle = "red";
        ctx.fillRect(x-11, y-8, 22, 6);
        // Knot
        ctx.fillRect(x+10, y-8, 4, 4);
    } else if (style.headgear === 'crown') {
        ctx.fillStyle = "gold";
        ctx.beginPath();
        ctx.moveTo(x-8, y); ctx.lineTo(x-8, y-10);
        ctx.lineTo(x-4, y-4); ctx.lineTo(x, y-12);
        ctx.lineTo(x+4, y-4); ctx.lineTo(x+8, y-10);
        ctx.lineTo(x+8, y);
        ctx.fill();
    } else if (style.headgear === 'mask') {
        ctx.fillStyle = style.clothing === 'sash' ? (style.cSuit || '#222') : "#222";
        ctx.fillRect(x-11, y-5, 22, 10); // Eye mask
    } else if (style.headgear === 'glasses') {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(x-10, y-4, 8, 6);
        ctx.fillRect(x+2, y-4, 8, 6);
        ctx.strokeStyle="#000"; ctx.beginPath(); ctx.moveTo(x-2,y-1); ctx.lineTo(x+2,y-1); ctx.stroke();
    }
}

// ---------------------------------------------------------
// STANCE SPECIFIC RENDERERS
// ---------------------------------------------------------

function drawQuadruped(ctx, char, frame, bob, skin, dark, suit, attackAnim, vy, style) {
    let w = char.w || 36;
    let h = char.h || 24;

    let isMoving = frame > 0;
    let isAir = Math.abs(vy) > 0.5;
    let cycle = frame * 0.5;
    let blA = 0, brA = 0, flA = 0, frA = 0;

    if (isAir) {
        if (vy < 0) { blA = 0.5; brA = 0.6; flA = -0.5; frA = -0.6; }
        else { blA = -0.2; brA = -0.2; flA = 0.2; frA = 0.2; }
    } else if (isMoving) {
        blA = Math.sin(cycle) * 0.6;
        brA = Math.sin(cycle + Math.PI) * 0.6;
        flA = Math.sin(cycle + Math.PI*0.5) * 0.6;
        frA = Math.sin(cycle + Math.PI*1.5) * 0.6;
    }

    // 1. TAIL
    ctx.strokeStyle = skin; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-w/2, 5 + bob);
    ctx.quadraticCurveTo(-w/2 - 10, 5 + bob - 10, -w/2 - 20, 5 + bob + Math.sin(frame*0.3)*5);
    ctx.stroke();

    // 2. FAR LEGS
    ctx.fillStyle = dark;
    drawLimb(ctx, -w/2 + 8, 10+bob, 6, 8, 8, blA, blA*0.5, dark, style, true);
    drawLimb(ctx, w/2 - 8, 10+bob, 6, 8, 8, flA, flA*0.5, dark, style, true);

    // BACK ACCESSORIES
    drawBackAccessories(ctx, char, style, w/2 - 8, bob+5, frame, vy);

    // 3. BODY with TEXTURE
    let bodyShape = char.body || 'standard';

    // Define Path
    ctx.beginPath();
    if (bodyShape === 'orb' || bodyShape === 'pumpkin') {
        ctx.ellipse(0, bob, w/2, h/2, 0, 0, Math.PI*2);
    } else if (bodyShape === 'muscular') {
        ctx.moveTo(-w/2 + 5, -h/2 + bob + 4);
        ctx.lineTo(w/2, -h/2 + bob - 2);
        ctx.lineTo(w/2 + 2, h/2 + bob);
        ctx.lineTo(-w/2 + 5, h/2 + bob - 2);
    } else if (bodyShape === 'brute') {
        let r=6; let x=-w/2 - 5, y=-h/2 + bob - 5, bw=w + 10, bh=h + 10;
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + bw, y, x + bw, y + bh, r);
        ctx.arcTo(x + bw, y + bh, x, y + bh, r);
        ctx.arcTo(x, y + bh, x, y, r);
        ctx.arcTo(x, y, x + bw, y, r);
    } else if (bodyShape === 'stick') {
        // Stick has no fill usually, but let's give it a thin body for texture
        ctx.rect(-w/2, bob - 2, w, 4);
    } else {
        let r=8; let x=-w/2, y=-h/2 + bob, bw=w, bh=h;
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + bw, y, x + bw, y + bh, r);
        ctx.arcTo(x + bw, y + bh, x, y + bh, r);
        ctx.arcTo(x, y + bh, x, y, r);
        ctx.arcTo(x, y, x + bw, y, r);
    }
    ctx.closePath();

    ctx.fillStyle = suit;
    ctx.fill();

    // TEXTURE LAYER
    if (bodyShape !== 'stick') {
        ctx.save();
        ctx.clip();
        drawTexture(ctx, style, -w, bob-h, w*2, h*2);
        drawShading(ctx, -w, bob-h, w*2, h*2);
        drawClothing(ctx, style, -w, bob-h, w*2, h*2);
        ctx.restore();
    } else {
         ctx.lineWidth = 4; ctx.strokeStyle = suit;
         ctx.beginPath(); ctx.moveTo(-w/2, bob); ctx.lineTo(w/2, bob); ctx.stroke();
    }

    // Weapon Mount (Back)
    if (char.mount === 'back') {
        ctx.fillStyle = "#555";
        ctx.fillRect(-5, -h/2 + bob - 6, 10, 6);
        ctx.fillStyle = char.pColor;
        ctx.beginPath(); ctx.arc(0, -h/2 + bob - 6, 4, 0, Math.PI*2); ctx.fill();
    }

    // 4. HEAD
    ctx.save();
    ctx.translate(w/2, -5 + bob);
    if (isMoving) ctx.rotate(Math.sin(cycle*2) * 0.05);
    drawHeroHead(ctx, char, style);
    ctx.restore();

    // 5. NEAR LEGS
    ctx.fillStyle = skin;
    drawLimb(ctx, -w/2 + 8, 15+bob, 6, 8, 8, brA, brA*0.5, skin, style, true);
    drawLimb(ctx, w/2 - 8, 15+bob, 6, 8, 8, frA, frA*0.5, skin, style, true);
}

function drawSnake(ctx, char, frame, bob, skin, dark, suit, attackAnim, vy, style) {
    let w = char.w || 36;
    let h = char.h || 18;
    let waveFreq = 0.5;
    let waveAmp = 5;
    if (Math.abs(vy) > 0.5) waveAmp = 2;

    ctx.fillStyle = suit;
    // Draw continuous body segments with texture
    for(let i=0; i<8; i++) {
        let x = (w/2) - (i * (w/8));
        let y = bob + Math.sin((frame*waveFreq) + i)*waveAmp;
        let size = h/2 + (2-Math.abs(i-2));

        ctx.beginPath(); ctx.arc(x, y + 10, size, 0, Math.PI*2); ctx.fill();

        ctx.save();
        ctx.clip();
        drawTexture(ctx, style, x-size, y+10-size, size*2, size*2);
        if (i===2 || i===3) drawClothing(ctx, style, x-size, y+10-size, size*2, size*2);
        ctx.restore();
    }

    // Head
    ctx.save();
    ctx.translate(w/2 + 5, bob + Math.sin(frame*waveFreq)*waveAmp);
    drawHeroHead(ctx, char, style);
    ctx.restore();
}

function drawFish(ctx, char, frame, bob, skin, dark, suit, attackAnim, vy, style) {
    let w = char.w || 36;
    let h = char.h || 18;

    ctx.save();
    ctx.translate(0, bob);
    let pitch = vy * 0.05;
    ctx.rotate(pitch);

    let boardY = 14;
    let wheelY = boardY + 4;
    let wheelSpin = frame * 0.4;

    ctx.fillStyle = "#222";
    drawRoundedRect(ctx, -w/2 - 2, boardY, w + 4, 5, 2);
    drawWheel(ctx, -w/3, wheelY, 4, wheelSpin);
    drawWheel(ctx, w/3, wheelY, 4, wheelSpin);

    let tailWag = Math.sin(frame * 0.3);

    ctx.save();
    ctx.translate(-w/4, 0);
    ctx.rotate(tailWag * 0.3);

    // Tail Peduncle
    ctx.beginPath();
    ctx.moveTo(0, -h/2 + 2);
    ctx.lineTo(-w/2, -h/4);
    ctx.lineTo(-w/2, h/4);
    ctx.lineTo(0, h/2 - 2);
    ctx.fillStyle = suit;
    ctx.fill();
    // Texture on tail
    ctx.save(); ctx.clip(); drawTexture(ctx, style, -w, -h, w, h*2); ctx.restore();

    ctx.translate(-w/2, 0);
    ctx.rotate(tailWag * 0.5);
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, -12); ctx.quadraticCurveTo(-5, 0, -10, 12); ctx.lineTo(0, 0);
    ctx.fill();
    ctx.restore();

    // Main Body
    ctx.beginPath();
    ctx.ellipse(w/8, 0, w/2.5, h/2, 0, 0, Math.PI*2);
    ctx.fillStyle = suit;
    ctx.fill();

    // Texture on Body
    ctx.save();
    ctx.clip();
    drawTexture(ctx, style, -w/2, -h, w, h*2);
    drawShading(ctx, -w/2, -h, w, h*2);
    drawClothing(ctx, style, -w/2, -h, w, h*2);
    ctx.restore();

    // Dorsal
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(0, -h/2 + 2);
    ctx.quadraticCurveTo(-5, -h/2 - 10, -15, -h/2);
    ctx.fill();

    ctx.save();
    ctx.translate(w/4, 5);
    ctx.rotate(Math.sin(frame * 0.5) * 0.5);
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-5, 10, -10, 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(w/2 - 5, -2);
    drawFaceFeatures(ctx, style, 0, 0, 0.5);
    ctx.restore();

    ctx.restore();
}

function drawBiped(ctx, char, frame, bob, skin, dark, suit, attackAnim, vy, style) {
    let isMoving = frame > 0;
    let isAir = Math.abs(vy) > 0.5;
    let isBird = ['bird', 'duck', 'chicken', 'owl', 'penguin', 'bee'].some(t => char.type.includes(t)) || char.type === 'bird';

    let legL_Upper = 0, legL_Lower = 0;
    let legR_Upper = 0, legR_Lower = 0;
    let armL = 0, armR = 0;

    let cycle = frame * 0.5;

    if (isAir) {
        if (vy < 0) {
            legL_Upper = -0.5; legL_Lower = 1.0;
            legR_Upper = 0.2; legR_Lower = 0.5;
            armL = isBird ? -2.0 : -2.5; armR = isBird ? -2.0 : -2.5;
        } else {
            legL_Upper = 0.2; legL_Lower = 0.1;
            legR_Upper = -0.2; legR_Lower = 0.1;
            armL = isBird ? -1.0 : -0.5; armR = isBird ? -1.0 : -0.5;
        }
    } else if (isMoving) {
        let lPhase = Math.sin(cycle);
        let rPhase = Math.sin(cycle + Math.PI);
        legL_Upper = lPhase * 0.8;
        legL_Lower = lPhase > 0 ? 0.2 : 1.0 + (lPhase * 0.5);
        legR_Upper = rPhase * 0.8;
        legR_Lower = rPhase > 0 ? 0.2 : 1.0 + (rPhase * 0.5);
        armL = rPhase * 1.0; armR = lPhase * 1.0;
    } else {
        let breath = Math.sin(Date.now() / 500) * 0.05;
        armL = breath; armR = -breath;
        if(isBird) { armL += 0.5; armR += 0.5; }
    }

    if (attackAnim && attackAnim.timer > 0) {
        let t = attackAnim.timer / attackAnim.max;
        let snap = Math.sin(t * Math.PI);
        if (attackAnim.type === 'shoot') { armR = -Math.PI/2; }
        else if (attackAnim.type === 'kick') { legR_Upper = -1.5 * snap; legR_Lower = 0; ctx.rotate(-0.2 * snap); }
        else if (attackAnim.type === 'punch') { armR = -Math.PI/2 + (snap * 0.5); }
    }

    drawLimb(ctx, -4, 25+bob, 6, 8, 8, legL_Upper, legL_Lower, dark, style, true);

    if (isBird) {
        drawWing(ctx, -5, 15+bob, 6, 18, armL, dark);
    } else {
        ctx.save(); ctx.translate(0, 15+bob); ctx.rotate(armL);
        ctx.fillStyle = dark; drawRoundedRect(ctx, -3, 0, 6, 12, 3);
        ctx.restore();
    }

    // BACK ACCESSORIES
    drawBackAccessories(ctx, char, style, 0, 10+bob, frame, vy);

    // BODY WITH TEXTURE
    let bodyShape = char.body || 'standard';
    ctx.beginPath();
    if (bodyShape === 'brute') {
         ctx.moveTo(-15, 0+bob); ctx.lineTo(15, 0+bob); ctx.lineTo(6, 25+bob); ctx.lineTo(-6, 25+bob);
    } else if (bodyShape === 'orb' || bodyShape === 'pumpkin') {
         ctx.arc(0, 15+bob, 14, 0, Math.PI*2);
    } else if (bodyShape === 'teardrop') {
         ctx.moveTo(0, 5+bob);
         ctx.quadraticCurveTo(12, 5+bob, 12, 18+bob);
         ctx.quadraticCurveTo(0, 30+bob, -12, 18+bob);
         ctx.quadraticCurveTo(-12, 5+bob, 0, 5+bob);
    } else if (bodyShape === 'muscular') {
         ctx.moveTo(-12, 5+bob); ctx.lineTo(12, 5+bob);
         ctx.lineTo(8, 20+bob); ctx.lineTo(-8, 20+bob);
         ctx.lineTo(-12, 5+bob);
    } else if (bodyShape === 'stick') {
         // Special handling below
    } else if (bodyShape === 'block') {
         ctx.rect(-12, 5+bob, 24, 20);
    } else {
         let r=5; let x=-10, y=8+bob, w=20, h=18;
         ctx.moveTo(x + r, y);
         ctx.arcTo(x + w, y, x + w, y + h, r);
         ctx.arcTo(x + w, y + h, x, y + h, r);
         ctx.arcTo(x, y + h, x, y, r);
         ctx.arcTo(x, y, x + w, y, r);
    }
    ctx.closePath();

    if (bodyShape !== 'stick') {
        ctx.fillStyle = suit;
        ctx.fill();
        // Texture
        ctx.save();
        ctx.clip();
        drawTexture(ctx, style, -20, bob, 40, 40);
        drawShading(ctx, -20, bob, 40, 40);
        drawClothing(ctx, style, -20, bob, 40, 40);
        ctx.restore();

        // Muscular definition overlay
        if (bodyShape === 'muscular') {
             ctx.fillStyle = "rgba(0,0,0,0.1)";
             ctx.fillRect(-4, 8+bob, 8, 4);
             ctx.fillRect(-3, 13+bob, 6, 4);
        }
    } else {
         ctx.lineWidth = 4; ctx.strokeStyle = suit;
         ctx.beginPath(); ctx.moveTo(0, 5+bob); ctx.lineTo(0, 25+bob); ctx.stroke();
    }

    ctx.save(); ctx.translate(0, bob);
    if (isMoving) ctx.rotate(0.1);
    drawHeroHead(ctx, char, style);
    ctx.restore();

    drawLimb(ctx, 4, 25+bob, 6, 8, 8, legR_Upper, legR_Lower, dark, style, true);

    if (isBird) {
        drawWing(ctx, 5, 15+bob, 6, 18, armR, suit);
        if (char.mount === 'hand') {
            ctx.save(); ctx.translate(5, 15+bob); ctx.rotate(armR); ctx.translate(0, 15);
            ctx.fillStyle = char.pColor; ctx.restore();
        }
    } else {
        ctx.save(); ctx.translate(0, 15+bob); ctx.rotate(armR);
        ctx.fillStyle = suit; drawRoundedRect(ctx, -3, 0, 6, 12, 3);
        ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, 12, 4, 0, Math.PI*2); ctx.fill();

        // Manual Glove for Biped Arm (since it doesn't use drawLimb)
        if (style && style.clothing !== 'none') {
             let gloveColor = style.clothing === 'armor' ? '#555' : '#333';
             ctx.fillStyle = gloveColor;
             ctx.fillRect(-3.5, 8, 7, 4);
        }

        if (char.mount === 'hand') {
            ctx.fillStyle = char.pColor; ctx.translate(0, 12);
        }
        ctx.restore();
    }
}

// ---------------------------------------------------------
// HEAD RENDERER (Reused)
// ---------------------------------------------------------
export function drawHeroHead(ctx, char, style) {
    let skin = char.cSkin;
    let dark = char.cDark;
    let type = char.type;
    let name = char.name;

    ctx.fillStyle = skin;

    // Default Face Position
    let fx = 0, fy = -2;
    let headSize = 10;

    // --- 1. CANIDS (Wolves, Foxes, Dogs) ---
    if (['wolf', 'fox', 'dog_pointy', 'dog_long', 'dog_flat', 'poodle'].some(t => type.includes(t))) {
        // Head Shape
        if (type.includes('dog_flat') || type.includes('poodle')) {
            drawRoundedRect(ctx, -12, -12, 24, 24, 8); // Boxy head
            fx = 0; fy = -4;
        } else {
            // Pointy snout profile
            ctx.beginPath();
            ctx.moveTo(-10, -10); ctx.lineTo(6, -10);
            ctx.lineTo(16, 2); // Snout tip
            ctx.lineTo(6, 10);
            ctx.lineTo(-10, 8);
            ctx.fill();
            // Nose Tip
            ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(16, 2, 2.5, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = skin;
            fx = 2; fy = -5;
        }

        // Ears
        if (type.includes('poodle') || type.includes('dog_flat')) {
            // Floppy ears
            ctx.fillStyle = dark;
            ctx.beginPath(); ctx.ellipse(-12, -4, 4, 10, -0.2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(8, -4, 4, 10, 0.2, 0, Math.PI*2); ctx.fill(); // Wait, side view? Usually we draw 2 ears on top or side
        } else {
            // Pointy ears
            ctx.fillStyle = skin;
            ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-10, -24); ctx.lineTo(2, -10); ctx.fill(); // Back ear
            ctx.fillStyle = dark; // Inner ear
            ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(-9, -20); ctx.lineTo(0, -10); ctx.fill();
        }
    }

    // --- 2. FELIDS (Cats, Lions, Panthers) ---
    else if (['cat', 'lion', 'panther', 'tiger', 'cheetah', 'leopard'].some(t => type.includes(t))) {
        // Mane for Lions
        if (type.includes('lion') || name.includes('LION')) {
             ctx.fillStyle = dark;
             ctx.beginPath(); ctx.arc(-2, 0, 20, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = skin;
        }

        // Head Shape
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI*2); ctx.fill(); // Round head

        // Snout (Small muzzle)
        ctx.fillStyle = "#fff"; // Muzzle highlight
        if (skin === '#fff') ctx.fillStyle = "#eee";
        ctx.beginPath(); ctx.ellipse(2, 4, 5, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = skin;

        // Nose
        ctx.fillStyle = "#fba"; // Pink nose usually
        if (type.includes('panther') || skin === '#000') ctx.fillStyle = "#444";
        ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(4, 2); ctx.lineTo(2, 5); ctx.fill();

        // Ears
        ctx.fillStyle = skin;
        ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-12, -18); ctx.lineTo(-2, -10); ctx.fill();
        ctx.beginPath(); ctx.moveTo(2, -10); ctx.lineTo(8, -18); ctx.lineTo(10, -6); ctx.fill();

        fx = 0; fy = -3;
    }

    // --- 3. UNGULATES (Cows, Pigs, Horses, etc) ---
    else if (['cow', 'bull', 'buffalo', 'rhino', 'elephant', 'pig', 'boar', 'horse', 'donkey', 'deer', 'sheep', 'goat', 'llama', 'giraffe'].some(t => type.includes(t))) {
        // Elongated Head
        ctx.save();
        if (type.includes('horse') || type.includes('donkey') || type.includes('giraffe') || type.includes('llama')) {
            ctx.rotate(0.2); // Angle down slightly
            drawRoundedRect(ctx, -12, -10, 26, 18, 6);
        } else {
            drawRoundedRect(ctx, -12, -12, 24, 24, 8); // Boxy
        }

        // Snout / Nose
        if (type.includes('pig') || type.includes('boar')) {
            ctx.fillStyle = "#fcc"; // Pink snout
            if (skin !== '#ffc0cb' && skin !== '#ffe4c4') ctx.fillStyle = dark; // Match theme
            ctx.beginPath(); ctx.ellipse(12, 2, 4, 6, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#000"; // Nostrils
            ctx.beginPath(); ctx.arc(12, 0, 1.5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(12, 4, 1.5, 0, Math.PI*2); ctx.fill();
        } else if (type.includes('elephant')) {
            // Trunk
            ctx.lineWidth = 6; ctx.strokeStyle = skin; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(10, 4);
            ctx.bezierCurveTo(20, 4, 20, 20, 10, 25); // S-curve trunk
            ctx.stroke();
            // Tusks
            ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.moveTo(8, 8); ctx.quadraticCurveTo(15, 12, 18, 4); ctx.lineTo(16, 4); ctx.quadraticCurveTo(14, 10, 8, 6); ctx.fill();
        } else if (type.includes('rhino')) {
             ctx.fillStyle = "#eee"; // Horn
             ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(22, -14); ctx.lineTo(14, 2); ctx.fill();
             ctx.beginPath(); ctx.moveTo(16, -2); ctx.lineTo(20, -6); ctx.lineTo(18, 0); ctx.fill(); // Small second horn
        } else {
            // Horse/Cow Muzzle
            ctx.fillStyle = "#111"; // Nostrils
            ctx.beginPath(); ctx.arc(12, 0, 2, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();

        // Horns / Antlers
        ctx.fillStyle = "#eee";
        if (type.includes('cow') || type.includes('bull') || type.includes('buffalo')) {
             ctx.beginPath(); ctx.moveTo(-6, -10); ctx.quadraticCurveTo(-10, -20, 0, -18); ctx.lineTo(-2, -10); ctx.fill(); // Left
             ctx.beginPath(); ctx.moveTo(6, -10); ctx.quadraticCurveTo(10, -20, 0, -18); ctx.lineTo(2, -10); ctx.fill(); // Right
        } else if (type.includes('deer') || type.includes('moose')) {
             ctx.strokeStyle = "#deb887"; ctx.lineWidth=2;
             ctx.beginPath(); ctx.moveTo(-4, -10); ctx.lineTo(-8, -25); ctx.moveTo(-8, -20); ctx.lineTo(-12, -28); ctx.stroke();
        } else if (type.includes('goat') || type.includes('sheep') || type.includes('ram')) {
             ctx.strokeStyle = "#ccc"; ctx.lineWidth=3;
             ctx.beginPath(); ctx.moveTo(-2, -10); ctx.arc(-5, -12, 8, 0, Math.PI, true); ctx.stroke();
        }

        // Ears
        ctx.fillStyle = skin;
        if (type.includes('horse') || type.includes('donkey')) {
             ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-8, -22); ctx.lineTo(0, -10); ctx.fill();
        } else {
             // Side ears
             ctx.beginPath(); ctx.ellipse(-8, -8, 8, 4, -0.5, 0, Math.PI*2); ctx.fill();
        }

        fx = 2; fy = -4;
    }

    // --- 4. BIRDS (Beaks & Bills) ---
    else if (['bird', 'duck', 'chicken', 'owl', 'penguin', 'eagle', 'hawk', 'crow', 'raven', 'falcon', 'turkey', 'peacock'].some(t => type.includes(t))) {
        // Round head base
        ctx.beginPath(); ctx.arc(0, -4, 10, 0, Math.PI*2); ctx.fill();

        // Beak Type
        if (type.includes('duck') || type.includes('goose') || type.includes('penguin')) {
            // Flat Bill
            ctx.fillStyle = "orange";
            ctx.beginPath();
            ctx.moveTo(8, -2); ctx.quadraticCurveTo(18, -2, 18, 2);
            ctx.quadraticCurveTo(8, 4, 8, 2);
            ctx.fill();
            // Nostril
            ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(12, -1, 1, 0, Math.PI*2); ctx.fill();
        } else if (type.includes('chicken') || type.includes('rooster') || type.includes('turkey')) {
             // Short Beak
             ctx.fillStyle = "#eba";
             ctx.beginPath(); ctx.moveTo(8, -2); ctx.lineTo(14, 0); ctx.lineTo(8, 2); ctx.fill();
             // Comb
             ctx.fillStyle = "red";
             ctx.beginPath(); ctx.moveTo(-4, -12); ctx.quadraticCurveTo(0, -18, 4, -12); ctx.quadraticCurveTo(8, -16, 8, -10); ctx.lineTo(-4, -10); ctx.fill();
             // Wattle
             ctx.beginPath(); ctx.arc(10, 6, 3, 0, Math.PI*2); ctx.fill();
        } else {
             // Hooked Beak (Raptor/General)
             ctx.fillStyle = (type.includes('crow') || type.includes('raven')) ? "#333" : "orange";
             if (type.includes('eagle') || type.includes('hawk') || type.includes('falcon')) ctx.fillStyle = "#ffd700"; // Yellow beak

             ctx.beginPath();
             ctx.moveTo(8, -6);
             ctx.quadraticCurveTo(18, -6, 18, 2); // Hook down
             ctx.lineTo(8, 2);
             ctx.fill();
        }

        fx = 2; fy = -6;
    }

    // --- 5. RODENTS (Rats, Mice, Rabbits, etc) ---
    else if (['rodent', 'mouse', 'rat', 'hamster', 'rabbit', 'hare', 'squirrel', 'chipmunk', 'beaver', 'porcupine', 'skunk', 'raccoon', 'hedgehog', 'badger'].some(t => type.includes(t))) {
        // Pointy Snout
        ctx.beginPath();
        ctx.moveTo(-8, -8); ctx.lineTo(8, -6);
        ctx.lineTo(14, 2); // Snout tip
        ctx.lineTo(8, 8);
        ctx.lineTo(-8, 8);
        ctx.fill();

        // Nose
        ctx.fillStyle = "#fba";
        if (type.includes('rat') || type.includes('raccoon') || type.includes('skunk')) ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.arc(14, 2, 2, 0, Math.PI*2); ctx.fill();

        // Whiskers
        ctx.strokeStyle = "#000"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(10, 2); ctx.lineTo(18, -2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10, 4); ctx.lineTo(18, 8); ctx.stroke();

        // Ears
        ctx.fillStyle = skin;
        if (type.includes('rabbit') || type.includes('hare')) {
             // Long ears
             ctx.beginPath(); ctx.ellipse(-4, -18, 4, 12, -0.2, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = "#fba"; // Inner ear
             ctx.beginPath(); ctx.ellipse(-4, -18, 2, 8, -0.2, 0, Math.PI*2); ctx.fill();
        } else {
             // Round ears
             ctx.beginPath(); ctx.arc(-4, -10, 6, 0, Math.PI*2); ctx.fill();
        }

        fx = 2; fy = -4;
    }

    // --- 6. REPTILES/AMPHIBIANS (Lizards, Frogs, Crocs) ---
    else if (['lizard', 'snake', 'croc', 'turtle', 'frog', 'toad', 'gecko', 'chameleon', 'iguana'].some(t => type.includes(t))) {
         if (type.includes('frog') || type.includes('toad')) {
             // Wide flat head
             ctx.beginPath(); ctx.ellipse(0, -4, 14, 8, 0, 0, Math.PI*2); ctx.fill();
             // Eyes on top
             fx = 0; fy = -10;
             // Big Mouth Line
             ctx.strokeStyle = "#000"; ctx.beginPath(); ctx.moveTo(-8, 2); ctx.quadraticCurveTo(0, 4, 8, 2); ctx.stroke();
         } else if (type.includes('croc') || type.includes('alligator')) {
             // Long flat snout
             drawRoundedRect(ctx, -12, -8, 12, 16, 4); // Head back
             drawRoundedRect(ctx, 0, -4, 20, 10, 2); // Snout
             // Teeth
             ctx.fillStyle = "#fff";
             for(let i=0; i<4; i++) {
                 ctx.beginPath(); ctx.moveTo(2 + i*4, 6); ctx.lineTo(4+i*4, 10); ctx.lineTo(6+i*4, 6); ctx.fill();
             }
             fx = -4; fy = -6;
         } else {
             // Lizard/Snake head (Diamond shape)
             ctx.beginPath();
             ctx.moveTo(-10, -6); ctx.lineTo(4, -8);
             ctx.lineTo(12, 0); // Snout
             ctx.lineTo(4, 8);
             ctx.lineTo(-10, 6);
             ctx.fill();
             // Tongue?
             if (Math.random() < 0.1) {
                 ctx.strokeStyle = "red"; ctx.lineWidth=1;
                 ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(20, 0); ctx.lineTo(22, -2); ctx.moveTo(20, 0); ctx.lineTo(22, 2); ctx.stroke();
             }
             fx = 0; fy = -4;
         }
    }

    // --- 7. INSECTS (Bees, Ants) & SPECIAL ---
    else if (['bee', 'ant', 'insect', 'spider', 'anteater'].some(t => type.includes(t))) {
        if (type.includes('anteater')) {
            // Long curved snout
            ctx.beginPath();
            ctx.moveTo(-10, -8); ctx.lineTo(0, -8);
            ctx.quadraticCurveTo(15, -8, 20, 4); // Downward curve
            ctx.quadraticCurveTo(10, 0, -10, 8);
            ctx.fill();
            fx = 2; fy = -6;
        } else {
            // Insect Head (Oval)
            ctx.beginPath(); ctx.ellipse(0, -4, 10, 8, 0, 0, Math.PI*2); ctx.fill();

            // Antennae
            ctx.strokeStyle = "#000"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-4, -10); ctx.quadraticCurveTo(-8, -18, -12, -14); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(4, -10); ctx.quadraticCurveTo(8, -18, 12, -14); ctx.stroke();

            // Mandibles (for ants/spiders)
            if (type.includes('ant') || type.includes('spider')) {
                ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(-2, 8); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(2, 8); ctx.stroke();
            }
            fx = 0; fy = -4;
        }
    }

    // --- 8. PRIMATES / HUMANOIDS / ALIENS ---
    else {
        // Standard Head
        drawRoundedRect(ctx, -10, -12, 20, 24, 8);

        // Ears on side
        ctx.fillStyle = skin;
        ctx.beginPath(); ctx.arc(-10, 0, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(10, 0, 3, 0, Math.PI*2); ctx.fill();

        if (type.includes('monkey') || type.includes('ape')) {
            // Muzzle area
            ctx.fillStyle = "#deb887"; // Light muzzle
            ctx.beginPath(); ctx.ellipse(0, 4, 6, 4, 0, 0, Math.PI*2); ctx.fill();
            // Nostrils
            ctx.fillStyle = "#000";
            ctx.beginPath(); ctx.arc(-2, 4, 1, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(2, 4, 1, 0, Math.PI*2); ctx.fill();
            fx = 0; fy = -4;
        } else {
            fx = 0; fy = -2;
        }
    }

    if (!name.includes("DARE")) {
        // Use new Face Rendering
        drawFaceFeatures(ctx, style, fx, fy);
    }

    // Headgear on top
    drawHeadgear(ctx, style, 0, -10);
}

// ---------------------------------------------------------
// MAIN RENDER FUNCTION
// ---------------------------------------------------------
export function drawAnatomicalHero(ctx, char, frame, attackAnim = null, vy = 0) {
    let skin = char.cSkin;
    let dark = char.cDark;
    let suit = char.cSuit;
    let stance = char.stance || 'biped';
    let style = getCharacterStyle(char);

    // Animation Math (Idle Bob)
    let bob = Math.sin(Date.now() / 300) * 1.5;
    if (frame > 0) bob = Math.sin(frame * 0.5) * 2; // Run bob

    if (stance === 'quadruped') {
        drawQuadruped(ctx, char, frame, bob, skin, dark, suit, attackAnim, vy, style);
    } else if (stance === 'snake') {
        drawSnake(ctx, char, frame, bob, skin, dark, suit, attackAnim, vy, style);
    } else if (stance === 'fish') {
        drawFish(ctx, char, frame, bob, skin, dark, suit, attackAnim, vy, style);
    } else {
        drawBiped(ctx, char, frame, bob, skin, dark, suit, attackAnim, vy, style);
    }
}
