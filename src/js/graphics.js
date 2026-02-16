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

// ---------------------------------------------------------
// STANCE SPECIFIC RENDERERS
// ---------------------------------------------------------

function drawQuadruped(ctx, char, frame, bob, skin, dark, suit, attackAnim) {
    let legCycle = Math.sin(frame * 0.8);
    let backLegAngle = legCycle * 0.5;
    let frontLegAngle = -legCycle * 0.5;

    // Dimensions (Horizontal)
    let w = char.w || 36;
    let h = char.h || 24;

    // 1. TAIL
    ctx.strokeStyle = skin; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-w/2, 5 + bob);
    ctx.quadraticCurveTo(-w/2 - 10, 5 + bob - 10, -w/2 - 20, 5 + bob + Math.sin(frame*0.3)*5);
    ctx.stroke();

    // 2. FAR LEGS (Back & Front) - Darker
    ctx.fillStyle = dark;
    // Back-Far
    ctx.save(); ctx.translate(-w/2 + 6, 10 + bob); ctx.rotate(-backLegAngle);
    drawRoundedRect(ctx, -3, 0, 6, 12, 3); ctx.restore();
    // Front-Far
    ctx.save(); ctx.translate(w/2 - 6, 10 + bob); ctx.rotate(-frontLegAngle);
    drawRoundedRect(ctx, -3, 0, 6, 12, 3); ctx.restore();

    // 3. BODY (Horizontal Rounded Rect)
    ctx.fillStyle = suit;
    drawRoundedRect(ctx, -w/2, -h/2 + bob, w, h, 8);

    // Weapon Mount (Back)
    if (char.mount === 'back') {
        ctx.fillStyle = "#555";
        ctx.fillRect(-5, -h/2 + bob - 6, 10, 6); // Mount base
        // Actual weapon drawn by projectile system usually, but visual indicator:
        ctx.fillStyle = char.pColor;
        ctx.beginPath(); ctx.arc(0, -h/2 + bob - 6, 4, 0, Math.PI*2); ctx.fill();
    }

    // 4. HEAD (Attached to Front)
    ctx.save();
    ctx.translate(w/2, -5 + bob); // Front of body, slightly up
    drawHeroHead(ctx, char);
    ctx.restore();

    // 5. NEAR LEGS (Back & Front)
    ctx.fillStyle = skin; // or suit? usually legs match skin or pants. Let's say dark for consistency or skin.
    ctx.fillStyle = dark;
    // Back-Near
    ctx.save(); ctx.translate(-w/2 + 6, 15 + bob); ctx.rotate(backLegAngle);
    drawRoundedRect(ctx, -3, 0, 6, 12, 3); ctx.restore();
    // Front-Near
    ctx.save(); ctx.translate(w/2 - 6, 15 + bob); ctx.rotate(frontLegAngle);
    drawRoundedRect(ctx, -3, 0, 6, 12, 3); ctx.restore();
}

function drawSnake(ctx, char, frame, bob, skin, dark, suit) {
    let w = char.w || 36;
    let h = char.h || 18;

    // Slither motion
    let wave = Math.sin(frame * 0.5) * 5;

    // Tail/Body Segments
    ctx.fillStyle = suit;
    ctx.beginPath();
    ctx.moveTo(w/2, bob);
    // Draw S-curve body
    for(let i=0; i<=10; i++) {
        let x = (w/2) - (i * (w/10));
        let y = bob + Math.sin((frame*0.5) + i)*5;
        ctx.lineTo(x, y + h/2); // Bottom edge roughly
    }
    // Just draw a series of circles for ease
    for(let i=0; i<6; i++) {
        let x = (w/2) - (i * 8);
        let y = bob + Math.sin((frame*0.2) + i)*4;
        let size = h/2 + (2-Math.abs(i-2));
        ctx.beginPath(); ctx.arc(x, y + 10, size, 0, Math.PI*2); ctx.fill();
    }

    // Head
    ctx.save();
    ctx.translate(w/2 + 5, bob + Math.sin(frame*0.2)*4);
    drawHeroHead(ctx, char);
    ctx.restore();
}

function drawFish(ctx, char, frame, bob, skin, dark, suit) {
    let w = char.w || 30;

    // Swim motion
    ctx.save();
    ctx.translate(0, bob);
    ctx.rotate(Math.sin(frame*0.2)*0.1); // Pitch tilt

    // Tail fin
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(-w/2, 0);
    ctx.lineTo(-w/2 - 10, -10);
    ctx.lineTo(-w/2 - 10, 10);
    ctx.fill();

    // Body
    ctx.fillStyle = suit;
    ctx.beginPath();
    ctx.ellipse(0, 0, w/2, w/3, 0, 0, Math.PI*2);
    ctx.fill();

    // Side Fin
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.quadraticCurveTo(-5, 15, -10, 5);
    ctx.fill();

    // Head (Integrated)
    // Draw face details directly on body front
    ctx.save();
    ctx.translate(w/3, -5);
    drawCartoonEye(ctx, 0, 0, 4, 0.5, 0);
    ctx.restore();

    ctx.restore();
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
export function drawAnatomicalHero(ctx, char, frame, attackAnim = null) {
    let skin = char.cSkin;
    let dark = char.cDark;
    let suit = char.cSuit;
    let stance = char.stance || 'biped';

    // Animation Math
    let bob = Math.sin(frame * 0.5) * 2;

    if (stance === 'quadruped') {
        drawQuadruped(ctx, char, frame, bob, skin, dark, suit, attackAnim);
    } else if (stance === 'snake') {
        drawSnake(ctx, char, frame, bob, skin, dark, suit);
    } else if (stance === 'fish') {
        drawFish(ctx, char, frame, bob, skin, dark, suit);
    } else {
        // BIPEDAL (Standard)
        // Re-use logic from previous step but simplified/cleaned for biped
        let runCycle = Math.sin(frame * 0.5);
        let legAngle = runCycle * 0.8;
        let armAngle = -runCycle * 0.8;

        // Attack overrides
        let armOffsetX = 0, armOffsetY = 0;
        if (attackAnim && attackAnim.timer > 0) {
             let t = attackAnim.timer / attackAnim.max;
             let p = Math.sin(t * Math.PI);
             if (attackAnim.type === 'shoot') { armAngle = -Math.PI/2; }
        }

        ctx.save();
        // Cape
        if (['dog_pointy', 'cat', 'bird'].includes(char.type) || char.name.includes("SUPER")) {
             ctx.fillStyle = char.pColor;
             ctx.beginPath(); ctx.moveTo(-10, 5+bob); ctx.lineTo(10, 5+bob); ctx.lineTo(0, 35+bob); ctx.fill();
        }

        // Back Leg
        ctx.fillStyle = dark;
        ctx.save(); ctx.translate(-4, 25+bob); ctx.rotate(legAngle); drawRoundedRect(ctx, -3, 0, 6, 12, 3); ctx.restore();

        // Body
        ctx.fillStyle = suit;
        let bodyShape = char.body || 'standard';
        if(bodyShape === 'brute') {
             ctx.beginPath(); ctx.moveTo(-15,0+bob); ctx.lineTo(15,0+bob); ctx.lineTo(5,25+bob); ctx.lineTo(-5,25+bob); ctx.fill();
        } else if (bodyShape === 'orb') {
             ctx.beginPath(); ctx.arc(0, 15+bob, 15, 0, Math.PI*2); ctx.fill();
        } else {
             drawRoundedRect(ctx, -10, 8+bob, 20, 18, 5);
        }

        // Head
        ctx.save(); ctx.translate(0, bob); drawHeroHead(ctx, char); ctx.restore();

        // Front Leg
        ctx.fillStyle = dark;
        ctx.save(); ctx.translate(4, 25+bob); ctx.rotate(-legAngle); drawRoundedRect(ctx, -3, 0, 6, 12, 3); ctx.restore();

        // Front Arm
        ctx.fillStyle = suit;
        ctx.save(); ctx.translate(0 + armOffsetX, 15 + bob + armOffsetY); ctx.rotate(armAngle); drawRoundedRect(ctx, -3, 0, 6, 12, 3);
        ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, 12, 4, 0, Math.PI*2); ctx.fill(); // Hand
        ctx.restore();

        ctx.restore();
    }
}
