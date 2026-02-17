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

function drawLimb(ctx, x, y, width, len1, len2, angle1, angle2, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle1);
    ctx.fillStyle = color;
    drawRoundedRect(ctx, -width/2, 0, width, len1, width/2); // Upper

    ctx.translate(0, len1 - 2);
    ctx.rotate(angle2);
    drawRoundedRect(ctx, -width/2, 0, width, len2, width/2); // Lower
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
// STANCE SPECIFIC RENDERERS
// ---------------------------------------------------------

function drawQuadruped(ctx, char, frame, bob, skin, dark, suit, attackAnim, vy) {
    let w = char.w || 36;
    let h = char.h || 24;

    // Movement States
    let isMoving = frame > 0;
    let isAir = Math.abs(vy) > 0.5;

    // Leg Cycles
    // Gallop: Front legs and back legs have phase offsets
    let cycle = frame * 0.5;

    // Default angles (standing)
    let blA = 0, brA = 0, flA = 0, frA = 0; // Back-Left, Back-Right, Front-Left, Front-Right

    if (isAir) {
        // Jump/Fall pose
        if (vy < 0) { // Jump: Legs tucked
             blA = 0.5; brA = 0.6; flA = -0.5; frA = -0.6;
        } else { // Fall: Legs stretched
             blA = -0.2; brA = -0.2; flA = 0.2; frA = 0.2;
        }
    } else if (isMoving) {
        // Running cycle (Gallop/Trot mix)
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

    // 2. FAR LEGS (Left) - Darker
    ctx.fillStyle = dark;
    // Back-Left
    drawLimb(ctx, -w/2 + 8, 10+bob, 6, 8, 8, blA, blA*0.5, dark);
    // Front-Left
    drawLimb(ctx, w/2 - 8, 10+bob, 6, 8, 8, flA, flA*0.5, dark);

    // 3. BODY
    ctx.fillStyle = suit;
    let bodyShape = char.body || 'standard';

    if (bodyShape === 'orb' || bodyShape === 'pumpkin') {
        ctx.beginPath(); ctx.ellipse(0, bob, w/2, h/2, 0, 0, Math.PI*2); ctx.fill();
    } else if (bodyShape === 'muscular') {
        // Thicker front (chest), tapered back
        ctx.beginPath();
        ctx.moveTo(-w/2 + 5, -h/2 + bob + 4); // Back top
        ctx.lineTo(w/2, -h/2 + bob - 2); // Front top (higher shoulders)
        ctx.lineTo(w/2 + 2, h/2 + bob); // Front bot
        ctx.lineTo(-w/2 + 5, h/2 + bob - 2); // Back bot
        ctx.fill();
    } else if (bodyShape === 'brute') {
        // Large, boxy
        drawRoundedRect(ctx, -w/2 - 5, -h/2 + bob - 5, w + 10, h + 10, 6);
    } else if (bodyShape === 'stick') {
        ctx.lineWidth = 4; ctx.strokeStyle = suit;
        ctx.beginPath(); ctx.moveTo(-w/2, bob); ctx.lineTo(w/2, bob); ctx.stroke();
    } else {
        drawRoundedRect(ctx, -w/2, -h/2 + bob, w, h, 8);
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
    // Head bob/tilt based on run
    if (isMoving) ctx.rotate(Math.sin(cycle*2) * 0.05);
    drawHeroHead(ctx, char);
    ctx.restore();

    // 5. NEAR LEGS (Right)
    ctx.fillStyle = skin;
    // Back-Right
    drawLimb(ctx, -w/2 + 8, 15+bob, 6, 8, 8, brA, brA*0.5, skin);
    // Front-Right
    drawLimb(ctx, w/2 - 8, 15+bob, 6, 8, 8, frA, frA*0.5, skin);
}

function drawSnake(ctx, char, frame, bob, skin, dark, suit, attackAnim, vy) {
    let w = char.w || 36;
    let h = char.h || 18;

    // Slither motion enhanced
    let waveFreq = 0.5;
    let waveAmp = 5;
    if (Math.abs(vy) > 0.5) waveAmp = 2; // Stiffen in air

    // Tail/Body Segments
    ctx.fillStyle = suit;
    // Draw continuous body with circles for better flexibility
    for(let i=0; i<8; i++) {
        let x = (w/2) - (i * (w/8));
        let y = bob + Math.sin((frame*waveFreq) + i)*waveAmp;
        let size = h/2 + (2-Math.abs(i-2));
        ctx.beginPath(); ctx.arc(x, y + 10, size, 0, Math.PI*2); ctx.fill();
    }

    // Head
    ctx.save();
    ctx.translate(w/2 + 5, bob + Math.sin(frame*waveFreq)*waveAmp);
    drawHeroHead(ctx, char);
    ctx.restore();
}

function drawFish(ctx, char, frame, bob, skin, dark, suit, attackAnim, vy) {
    let w = char.w || 36;
    let h = char.h || 18;

    // Swim motion
    ctx.save();
    ctx.translate(0, bob);
    let pitch = vy * 0.05; // Tilt with vertical movement
    ctx.rotate(pitch);

    let tailWag = Math.sin(frame * 0.3);

    // 1. REAR BODY / TAIL SECTION (Rotates)
    ctx.save();
    ctx.translate(-w/4, 0); // Pivot at rear of main body
    ctx.rotate(tailWag * 0.3); // Tail wag

    // Tail Peduncle (tapered)
    ctx.fillStyle = suit;
    ctx.beginPath();
    ctx.moveTo(0, -h/2 + 2);
    ctx.lineTo(-w/2, -h/4);
    ctx.lineTo(-w/2, h/4);
    ctx.lineTo(0, h/2 - 2);
    ctx.fill();

    // Caudal Fin (Tail Fin)
    ctx.translate(-w/2, 0);
    ctx.rotate(tailWag * 0.5); // Extra flick
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, -12); // Top tip
    ctx.quadraticCurveTo(-5, 0, -10, 12); // Bot tip
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.restore();

    // 2. MAIN BODY
    ctx.fillStyle = suit;
    // Ovalish shape
    ctx.beginPath();
    ctx.ellipse(w/8, 0, w/2.5, h/2, 0, 0, Math.PI*2);
    ctx.fill();

    // Dorsal Fin (Top)
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(0, -h/2 + 2);
    ctx.quadraticCurveTo(-5, -h/2 - 10, -15, -h/2);
    ctx.fill();

    // 3. PECTORAL FIN (Side Flapper)
    ctx.save();
    ctx.translate(w/4, 5);
    ctx.rotate(Math.sin(frame * 0.5) * 0.5); // Flap
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-5, 10, -10, 2);
    ctx.fill();
    ctx.restore();

    // 4. HEAD (Integrated)
    ctx.save();
    ctx.translate(w/2 - 5, -2);
    drawCartoonEye(ctx, 0, 0, 4, 0.5, 0);
    ctx.restore();

    ctx.restore();
}

function drawBiped(ctx, char, frame, bob, skin, dark, suit, attackAnim, vy) {
    let isMoving = frame > 0;
    let isAir = Math.abs(vy) > 0.5;
    let isBird = ['bird', 'duck', 'chicken', 'owl', 'penguin', 'bee'].some(t => char.type.includes(t)) || char.type === 'bird';

    let legL_Upper = 0, legL_Lower = 0;
    let legR_Upper = 0, legR_Lower = 0;
    let armL = 0, armR = 0;

    // Animation Cycle
    let cycle = frame * 0.5;

    if (isAir) {
        if (vy < 0) { // Jump
            legL_Upper = -0.5; legL_Lower = 1.0; // Tuck
            legR_Upper = 0.2; legR_Lower = 0.5;
            armL = isBird ? -2.0 : -2.5; armR = isBird ? -2.0 : -2.5; // Arms/Wings up
        } else { // Fall
            legL_Upper = 0.2; legL_Lower = 0.1;
            legR_Upper = -0.2; legR_Lower = 0.1;
            armL = isBird ? -1.0 : -0.5; armR = isBird ? -1.0 : -0.5; // Arms/Wings out
        }
    } else if (isMoving) {
        // Run Cycle
        let lPhase = Math.sin(cycle);
        let rPhase = Math.sin(cycle + Math.PI);

        legL_Upper = lPhase * 0.8;
        legL_Lower = lPhase > 0 ? 0.2 : 1.0 + (lPhase * 0.5); // Bend knee on backswing

        legR_Upper = rPhase * 0.8;
        legR_Lower = rPhase > 0 ? 0.2 : 1.0 + (rPhase * 0.5);

        armL = rPhase * 1.0; // Opposite to leg
        armR = lPhase * 1.0;
    } else {
        // Idle
        let breath = Math.sin(Date.now() / 500) * 0.05;
        armL = breath; armR = -breath;
        if(isBird) { armL += 0.5; armR += 0.5; } // Wings fold back slightly
    }

    // ATTACK OVERRIDES
    if (attackAnim && attackAnim.timer > 0) {
        let t = attackAnim.timer / attackAnim.max; // 1.0 to 0.0
        // Elastic snap
        let snap = Math.sin(t * Math.PI); // 0 -> 1 -> 0

        if (attackAnim.type === 'shoot') {
             armR = -Math.PI/2; // Aim straight
        } else if (attackAnim.type === 'kick') {
             legR_Upper = -1.5 * snap;
             legR_Lower = 0;
             // Lean back
             ctx.rotate(-0.2 * snap);
        } else if (attackAnim.type === 'punch') {
             armR = -Math.PI/2 + (snap * 0.5);
        }
    }

    // DRAW
    // Back Leg (Left)
    drawLimb(ctx, -4, 25+bob, 6, 8, 8, legL_Upper, legL_Lower, dark);

    // Back Arm (Left)
    if (isBird) {
        drawWing(ctx, -5, 15+bob, 6, 18, armL, dark);
    } else {
        ctx.save(); ctx.translate(0, 15+bob); ctx.rotate(armL);
        ctx.fillStyle = dark; drawRoundedRect(ctx, -3, 0, 6, 12, 3);
        ctx.restore();
    }

    // Body
    ctx.fillStyle = suit;
    let bodyShape = char.body || 'standard';

    if (bodyShape === 'brute') {
         // Triangular/Wide top
         ctx.beginPath(); ctx.moveTo(-15, 0+bob); ctx.lineTo(15, 0+bob); ctx.lineTo(6, 25+bob); ctx.lineTo(-6, 25+bob); ctx.fill();
    } else if (bodyShape === 'orb' || bodyShape === 'pumpkin') {
         ctx.beginPath(); ctx.arc(0, 15+bob, 14, 0, Math.PI*2); ctx.fill();
    } else if (bodyShape === 'teardrop') {
         // Bird-like body
         ctx.beginPath();
         ctx.moveTo(0, 5+bob);
         ctx.quadraticCurveTo(12, 5+bob, 12, 18+bob);
         ctx.quadraticCurveTo(0, 30+bob, -12, 18+bob);
         ctx.quadraticCurveTo(-12, 5+bob, 0, 5+bob);
         ctx.fill();
    } else if (bodyShape === 'muscular') {
         // V-shape torso
         ctx.beginPath();
         ctx.moveTo(-12, 5+bob); ctx.lineTo(12, 5+bob); // Shoulders
         ctx.lineTo(8, 20+bob); ctx.lineTo(-8, 20+bob); // Waist
         ctx.lineTo(-12, 5+bob);
         ctx.fill();
         // Abs/Pecks detail
         ctx.fillStyle = "rgba(0,0,0,0.1)";
         ctx.fillRect(-4, 8+bob, 8, 4);
         ctx.fillRect(-3, 13+bob, 6, 4);
         ctx.fillStyle = suit;
    } else if (bodyShape === 'stick') {
         ctx.lineWidth = 4; ctx.strokeStyle = suit;
         ctx.beginPath(); ctx.moveTo(0, 5+bob); ctx.lineTo(0, 25+bob); ctx.stroke();
         ctx.lineWidth = 1; // Reset
    } else if (bodyShape === 'block') {
         ctx.fillRect(-12, 5+bob, 24, 20);
    } else {
         drawRoundedRect(ctx, -10, 8+bob, 20, 18, 5);
    }

    // Head
    ctx.save(); ctx.translate(0, bob);
    // Head tilt
    if (isMoving) ctx.rotate(0.1);
    drawHeroHead(ctx, char);
    ctx.restore();

    // Front Leg (Right)
    drawLimb(ctx, 4, 25+bob, 6, 8, 8, legR_Upper, legR_Lower, dark);

    // Front Arm (Right)
    if (isBird) {
        drawWing(ctx, 5, 15+bob, 6, 18, armR, suit);
        // Weapon held? (Attached to wing tip or body?)
        if (char.mount === 'hand') {
            ctx.save();
            ctx.translate(5, 15+bob);
            ctx.rotate(armR);
            ctx.translate(0, 15); // Wing tip
            ctx.fillStyle = char.pColor;
            // ctx.fillRect(-2, -2, 4, 4); // Minimal weapon
            ctx.restore();
        }
    } else {
        ctx.save(); ctx.translate(0, 15+bob); ctx.rotate(armR);
        ctx.fillStyle = suit; drawRoundedRect(ctx, -3, 0, 6, 12, 3); // Sleeve
        ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, 12, 4, 0, Math.PI*2); ctx.fill(); // Hand
        // Weapon held?
        if (char.mount === 'hand') {
            // Simple gun/item representation if needed, but projectiles usually handle this.
            // Let's add a small item
            ctx.fillStyle = char.pColor;
            ctx.translate(0, 12);
            // ctx.rotate(-Math.PI/2);
            // ctx.fillRect(0, -2, 10, 4);
        }
        ctx.restore();
    }
}

// ---------------------------------------------------------
// HEAD RENDERER (Reused)
// ---------------------------------------------------------
export function drawHeroHead(ctx, char) {
    let skin = char.cSkin;
    let dark = char.cDark;

    ctx.fillStyle = skin;

    // 1. CANIDS (Dogs, Wolves, Foxes)
    if (['dog_pointy', 'wolf', 'fox', 'dog_long', 'dog_flat'].includes(char.type)) {
        if (char.type === 'dog_flat') {
            drawRoundedRect(ctx, -13, -12, 26, 22, 6);
        } else {
            // Snout pointing right
            ctx.beginPath();
            ctx.moveTo(-10, -10); ctx.lineTo(8, -10);
            ctx.lineTo(14, 0); // Nose tip
            ctx.lineTo(8, 8); // Jaw
            ctx.lineTo(-10, 8);
            ctx.fill();
            // Nose
            ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(14, 0, 2, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = skin;
        }
        // Ears
        ctx.fillStyle = skin;
        if (['dog_pointy', 'wolf', 'fox'].includes(char.type)) {
            ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-10, -22); ctx.lineTo(2, -10); ctx.fill();
        } else {
            ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(0, -6, 12, 6, 0, 0, Math.PI*2); ctx.fill();
        }
    }
    // 2. FELINES
    else if (['cat', 'lion', 'panther'].includes(char.type)) {
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI*2); ctx.fill();
        // Ears
        ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-12, -18); ctx.lineTo(0, -10); ctx.fill();
        ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(12, -18); ctx.lineTo(0, -10); ctx.fill();
        if(char.type === 'lion') {
             ctx.globalCompositeOperation = 'destination-over';
             ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.fill();
             ctx.globalCompositeOperation = 'source-over';
        }
    }
    // 3. HEAVY
    else if (['cow', 'bull', 'buffalo', 'rhino', 'elephant', 'bear', 'pig'].includes(char.type)) {
        drawRoundedRect(ctx, -12, -12, 24, 24, 8);
        if(char.type === 'rhino') {
            ctx.fillStyle = "#eee"; ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(18, -12); ctx.lineTo(10, 0); ctx.fill();
        }
        if(char.type === 'elephant') {
            ctx.lineWidth=5; ctx.strokeStyle=skin; ctx.beginPath(); ctx.moveTo(10, 5); ctx.quadraticCurveTo(20, 20, 15, 25); ctx.stroke();
        }
    }
    // 4. BIRDS
    else if (['bird', 'duck', 'chicken', 'penguin', 'owl'].includes(char.type)) {
        ctx.beginPath(); ctx.arc(0, -5, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "orange";
        ctx.beginPath(); ctx.moveTo(8, -5); ctx.lineTo(16, -2); ctx.lineTo(8, 1); ctx.fill();
    }
    else {
        // Generic
        drawRoundedRect(ctx, -10, -10, 20, 20, 6);
    }

    // Eyes (Generic placement)
    if (!char.name.includes("DARE")) {
        drawCartoonEye(ctx, 2, -4, 4, 0.5, 0);
    }
}

// ---------------------------------------------------------
// MAIN RENDER FUNCTION
// ---------------------------------------------------------
export function drawAnatomicalHero(ctx, char, frame, attackAnim = null, vy = 0) {
    let skin = char.cSkin;
    let dark = char.cDark;
    let suit = char.cSuit;
    let stance = char.stance || 'biped';

    // Animation Math (Idle Bob)
    let bob = Math.sin(Date.now() / 300) * 1.5;
    if (frame > 0) bob = Math.sin(frame * 0.5) * 2; // Run bob

    if (stance === 'quadruped') {
        drawQuadruped(ctx, char, frame, bob, skin, dark, suit, attackAnim, vy);
    } else if (stance === 'snake') {
        drawSnake(ctx, char, frame, bob, skin, dark, suit, attackAnim, vy);
    } else if (stance === 'fish') {
        drawFish(ctx, char, frame, bob, skin, dark, suit, attackAnim, vy);
    } else {
        drawBiped(ctx, char, frame, bob, skin, dark, suit, attackAnim, vy);
    }
}
