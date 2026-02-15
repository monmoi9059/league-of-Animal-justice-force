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

function getDefaultBodyShape(type) {
    if (['rhino', 'elephant', 'bear', 'cow', 'buffalo', 'croc'].includes(type)) return 'brute';
    if (['pig', 'pumpkin', 'bee', 'wombat'].includes(type)) return 'orb';
    if (['robot', 'stone'].includes(type)) return 'block';
    if (['bird', 'duck', 'chicken', 'penguin', 'owl'].includes(type)) return 'teardrop';
    if (['rodent', 'hedgehog', 'frog'].includes(type)) return 'bean';
    if (['skeleton', 'stick_insect'].includes(type)) return 'stick';
    if (['cat', 'fox', 'wolf', 'lion', 'panther', 'monkey', 'lizard'].includes(type)) return 'muscular';
    return 'standard';
}

export function drawHeroHead(ctx, char) {
    let skin = char.cSkin;
    let dark = char.cDark;

    ctx.fillStyle = skin;

    // --- COMPLEX HEAD SHAPES ---

    // 1. CANIDS (Dogs, Wolves, Foxes)
    if (['dog_pointy', 'wolf', 'fox', 'dog_long', 'dog_flat'].includes(char.type)) {
        // Angular/Snouted Head
        ctx.beginPath();
        if (char.type === 'dog_flat') {
            // Pug/Bulldog Shape (Boxy)
            drawRoundedRect(ctx, -13, -12, 26, 22, 6);
        } else {
            // Snouted Shape
            ctx.moveTo(-10, -10);
            ctx.lineTo(10, -10);
            ctx.lineTo(12, 5);
            ctx.lineTo(0, 10); // Chin
            ctx.lineTo(-12, 5);
            ctx.fill();
        }

        // Ears
        ctx.fillStyle = skin; // or dark?
        if (['dog_pointy', 'wolf', 'fox'].includes(char.type)) {
            // Pointy Ears
            ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(-14, -24); ctx.lineTo(-2, -10); ctx.fill();
            ctx.beginPath(); ctx.moveTo(8, -10); ctx.lineTo(14, -24); ctx.lineTo(2, -10); ctx.fill();
            // Ear Inner
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(-12, -20); ctx.lineTo(-4, -12); ctx.fill();
            ctx.beginPath(); ctx.moveTo(8, -12); ctx.lineTo(12, -20); ctx.lineTo(4, -12); ctx.fill();
        } else {
             // Floppy Ears
             ctx.fillStyle = dark;
             ctx.beginPath(); ctx.ellipse(-14, -4, 5, 8, 0.5, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.ellipse(14, -4, 5, 8, -0.5, 0, Math.PI*2); ctx.fill();
        }
    }
    // 2. FELINES (Cats, Lions, Panthers)
    else if (['cat', 'lion', 'panther'].includes(char.type)) {
        // Wide Head with Cheeks
        ctx.beginPath();
        ctx.moveTo(-10, -8);
        ctx.quadraticCurveTo(0, -12, 10, -8); // Top
        ctx.quadraticCurveTo(14, 0, 10, 8); // Right Cheek
        ctx.lineTo(0, 10); // Chin
        ctx.quadraticCurveTo(-14, 0, -10, -8); // Left Cheek
        ctx.fill();

        // Ears (Triangular but wide)
        ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(-16, -18); ctx.lineTo(-4, -8); ctx.fill();
        ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(16, -18); ctx.lineTo(4, -8); ctx.fill();

        if (char.type === 'lion') {
            // Mane
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = dark;
            ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }
    }
    // 3. AVIAN (Birds, Ducks, Penguins)
    else if (['bird', 'duck', 'chicken', 'penguin', 'owl'].includes(char.type)) {
        // Streamlined Head
        ctx.beginPath();
        ctx.arc(0, -6, 11, 0, Math.PI*2);
        ctx.fill();

        if (char.type === 'owl') {
            // Owl "Horns"
             ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(-12, -22); ctx.lineTo(0, -12); ctx.fill();
             ctx.beginPath(); ctx.moveTo(8, -12); ctx.lineTo(12, -22); ctx.lineTo(0, -12); ctx.fill();
        } else if (char.type === 'chicken') {
            // Comb
            ctx.fillStyle = "#ff0000";
            ctx.beginPath(); ctx.arc(0, -16, 4, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(-5, -14, 3, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -14, 3, 0, Math.PI*2); ctx.fill();
        }
    }
    // 4. HEAVY (Bear, Cow, Rhino, Elephant)
    else if (['bear', 'cow', 'rhino', 'elephant', 'buffalo'].includes(char.type)) {
        // Blocky/Round Heavy Head
        drawRoundedRect(ctx, -14, -14, 28, 24, 10);

        // Ears
        if (char.type === 'cow' || char.type === 'buffalo') {
             // Horns
             ctx.fillStyle = "#eee";
             ctx.beginPath(); ctx.moveTo(-14, -10); ctx.quadraticCurveTo(-22, -20, -8, -16); ctx.fill();
             ctx.beginPath(); ctx.moveTo(14, -10); ctx.quadraticCurveTo(22, -20, 8, -16); ctx.fill();
             // Ears
             ctx.fillStyle = dark;
             ctx.beginPath(); ctx.ellipse(-16, -4, 6, 4, -0.2, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.ellipse(16, -4, 6, 4, 0.2, 0, Math.PI*2); ctx.fill();
        } else if (char.type === 'elephant') {
             // Big Flappy Ears
             ctx.fillStyle = skin;
             ctx.beginPath(); ctx.ellipse(-18, -4, 8, 12, -0.2, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.ellipse(18, -4, 8, 12, 0.2, 0, Math.PI*2); ctx.fill();
        } else {
             // Bear Ears
             ctx.beginPath(); ctx.arc(-14, -14, 5, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(14, -14, 5, 0, Math.PI*2); ctx.fill();
        }
    }
    // 5. RODENT/BEAN (Rodent, Hedgehog, Rabbit)
    else if (['rodent', 'hedgehog', 'rabbit'].includes(char.type)) {
        // Small Teardrop Head
         ctx.beginPath();
         ctx.moveTo(0, -12);
         ctx.quadraticCurveTo(10, -8, 10, 0);
         ctx.quadraticCurveTo(0, 10, -10, 0);
         ctx.quadraticCurveTo(-10, -8, 0, -12);
         ctx.fill();

         if (char.type === 'rabbit') {
             // Long Ears
             ctx.fillStyle = skin;
             ctx.beginPath(); ctx.ellipse(-6, -20, 4, 14, -0.1, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.ellipse(6, -20, 4, 14, 0.1, 0, Math.PI*2); ctx.fill();
         } else {
             // Round Ears
             ctx.beginPath(); ctx.arc(-8, -10, 5, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(8, -10, 5, 0, Math.PI*2); ctx.fill();
         }
    }
    // 6. SPECIALS
    else if (char.type === 'alien') {
         ctx.beginPath(); ctx.moveTo(0, 10); ctx.bezierCurveTo(20, 0, 20, -30, 0, -30); ctx.bezierCurveTo(-20, -30, -20, 0, 0, 10); ctx.fill();
    }
    else if (char.type === 'pumpkin') {
         ctx.fillStyle = "#FFA500"; ctx.beginPath(); ctx.arc(0, -5, 14, 0, Math.PI*2); ctx.fill();
         ctx.fillStyle = "green"; ctx.fillRect(-2, -20, 4, 6);
    }
    else if (char.type === 'robot') {
         drawRoundedRect(ctx, -12, -14, 24, 22, 2);
         // Antenna
         ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -22); ctx.stroke();
         ctx.fillStyle="red"; ctx.beginPath(); ctx.arc(0, -22, 2, 0, Math.PI*2); ctx.fill();
    }
    else {
        // DEFAULT / HUMAN
        drawRoundedRect(ctx, -11, -11, 22, 22, 8);
    }

    // --- FACE DETAILS ---

    // Snouts/Muzzles
    if (['dog_pointy', 'wolf', 'fox', 'bear', 'pig'].includes(char.type)) {
         ctx.fillStyle = dark;
         if (char.type === 'pig') {
             ctx.fillStyle = "#ffb6c1";
             ctx.beginPath(); ctx.ellipse(0, 2, 6, 4, 0, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = "#d16d7e";
             ctx.beginPath(); ctx.arc(-2, 2, 1.5, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(2, 2, 1.5, 0, Math.PI*2); ctx.fill();
         } else {
             // Classic Muzzle
             ctx.beginPath(); ctx.ellipse(0, 2, 5, 4, 0, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI*2); ctx.fill(); // Nose
         }
    } else if (['cat', 'lion', 'panther', 'rabbit', 'rodent'].includes(char.type)) {
         ctx.fillStyle = "#000";
         ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(2, 2); ctx.lineTo(0, 4); ctx.fill(); // Triangle nose
         // Whiskers
         ctx.strokeStyle = "#000"; ctx.lineWidth = 1;
         ctx.beginPath(); ctx.moveTo(4, 3); ctx.lineTo(12, 2); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(12, 5); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(-4, 3); ctx.lineTo(-12, 2); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(-12, 5); ctx.stroke();
    } else if (['bird', 'duck', 'chicken', 'penguin', 'owl'].includes(char.type)) {
         ctx.fillStyle = "orange";
         if (['duck', 'penguin'].includes(char.type)) {
             // Bill
             ctx.beginPath(); ctx.ellipse(0, 2, 6, 3, 0, 0, Math.PI*2); ctx.fill();
         } else {
             // Beak
             ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(6, 0); ctx.lineTo(0, -2); ctx.fill();
         }
    } else if (char.type === 'skeleton') {
         ctx.fillStyle = "#000";
         ctx.beginPath(); ctx.arc(-5, -6, 3, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(5, -6, 3, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-2, 5); ctx.lineTo(2, 5); ctx.fill();
    }

    // --- EYES ---
    if (!['skeleton', 'pumpkin', 'alien', 'robot'].includes(char.type)) {
        if (char.name.includes("DARE")) {
             ctx.fillStyle = char.cDark; ctx.fillRect(-12, -8, 24, 6);
        } else if (char.name.includes("SPIDER") || char.name.includes("DEAD") || char.name.includes("PANTHER") || char.name.includes("IRON")) {
             ctx.fillStyle = "#fff";
             ctx.beginPath(); ctx.ellipse(-5, -4, 4, 6, -0.2, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.ellipse(5, -4, 4, 6, 0.2, 0, Math.PI*2); ctx.fill();
             ctx.strokeStyle = "#000"; ctx.lineWidth=1; ctx.stroke();
        } else {
             drawCartoonEye(ctx, -6, -4, 4, 0.5, 0);
             drawCartoonEye(ctx, 6, -4, 4, 0.5, 0);
        }
    } else if (char.type === 'pumpkin') {
         ctx.fillStyle = "#000";
         ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-2, -2); ctx.lineTo(-10, -2); ctx.fill();
         ctx.beginPath(); ctx.moveTo(6, -6); ctx.lineTo(2, -2); ctx.lineTo(10, -2); ctx.fill();
         ctx.beginPath(); ctx.moveTo(-8, 5); ctx.lineTo(0, 8); ctx.lineTo(8, 5); ctx.fill();
    }
}

export function drawAnatomicalHero(ctx, char, frame, attackAnim = null) {
    let skin = char.cSkin;
    let dark = char.cDark;
    let suit = char.cSuit;
    let bodyShape = char.body || getDefaultBodyShape(char.type);

    // Animation Math
    let bob = Math.sin(frame * 0.5) * 2;
    let runCycle = Math.sin(frame * 0.5);
    let legAngle = runCycle * 0.8;
    let armAngle = -runCycle * 0.8;

    let armOffsetX = 0; let armOffsetY = 0;
    let legOffsetX = 0; let legOffsetY = 0;

    // Attack Overrides
    if (attackAnim && attackAnim.timer > 0) {
        let t = attackAnim.timer / attackAnim.max;
        let p = Math.sin(t * Math.PI);
        if (attackAnim.type === 'kick') { legAngle = -Math.PI/2 * p; legOffsetX = p * 10; armAngle = Math.PI/4; }
        else if (attackAnim.type === 'punch' || attackAnim.type === 'shoot') { armAngle = -Math.PI/2; armOffsetX = p * 15; }
        else if (attackAnim.type === 'slash') { armAngle = -Math.PI/2 + (t * Math.PI) - Math.PI/2; }
        else if (attackAnim.type === 'smash_down') { armAngle = Math.PI; if(t < 0.5) armAngle = 0; }
        else if (attackAnim.type === 'flex') { armAngle = -Math.PI + 0.5; armOffsetX = -5; bob = Math.sin(frame * 1.5) * 3; }
    }

    // Scale Logic
    let isSmall = (bodyShape === 'bean' || bodyShape === 'stick' || bodyShape === 'orb' && ['bee', 'rodent'].includes(char.type));
    let isBig = (bodyShape === 'brute' || char.type === 'elephant');
    let scale = isSmall ? 0.8 : (isBig ? 1.3 : 1.0);

    ctx.save();
    ctx.scale(scale, scale);

    // --- DRAW BACK ELEMENTS (Cape, Tail, Back Leg) ---

    // Cape
    if (['dog_pointy', 'cat', 'bird'].includes(char.type) || char.name.includes("SUPER") || char.name.includes("THOR") || char.name.includes("STRANGE")) {
         ctx.fillStyle = char.pColor;
         ctx.beginPath();
         ctx.moveTo(-10, 5 + bob); ctx.lineTo(10, 5 + bob);
         ctx.lineTo(15 + Math.sin(frame*0.2)*5, 35 + bob); ctx.lineTo(-15 + Math.sin(frame*0.2+1)*5, 35 + bob);
         ctx.fill();
    }

    // Tail
    if (['dog_pointy', 'dog_flat', 'dog_long', 'cat', 'fox', 'wolf', 'panther', 'raccoon', 'monkey', 'lizard', 'cow', 'lion'].includes(char.type)) {
        ctx.strokeStyle = skin; ctx.lineWidth = 4; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(0, 25 + bob);
        ctx.quadraticCurveTo(-20, 20 + bob + Math.sin(frame*0.3)*5, -25, 15 + bob);
        ctx.stroke();
    }

    // Determine Limb Attach Points based on Shape
    let armX = 0, armY = 15;
    let legX = 4, legY = 25;

    if (bodyShape === 'brute') { armX = 14; armY = 5; legX = 5; legY = 30; } // Arms high and wide
    if (bodyShape === 'orb') { armX = 12; armY = 15; legX = 6; legY = 24; }
    if (bodyShape === 'teardrop') { armX = 10; armY = 20; legX = 6; legY = 28; } // Low arms
    if (bodyShape === 'bean') { armX = 8; armY = 18; legX = 5; legY = 22; }

    // Back Leg
    ctx.fillStyle = dark;
    ctx.save();
    ctx.translate(-legX, legY + bob);
    ctx.rotate(legAngle);
    drawRoundedRect(ctx, -3, 0, 6, 12, 3);
    ctx.restore();

    // --- DRAW BODY ---
    ctx.fillStyle = suit;

    if (bodyShape === 'brute') {
        // Inverted Trapezoid (Huge Chest)
        ctx.beginPath();
        ctx.moveTo(-16, 0 + bob);
        ctx.lineTo(16, 0 + bob); // Wide Shoulders
        ctx.lineTo(8, 28 + bob); // Narrow Waist
        ctx.lineTo(-8, 28 + bob);
        ctx.closePath();
        ctx.fill();
        // Pecs Definition
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.fillRect(-1, 5 + bob, 2, 10);
        ctx.fillRect(-10, 15 + bob, 20, 2);
    }
    else if (bodyShape === 'orb') {
        // Round Body
        ctx.beginPath();
        ctx.arc(0, 15 + bob, 16, 0, Math.PI*2);
        ctx.fill();
    }
    else if (bodyShape === 'bean') {
        // Kidney/Bean Shape
        ctx.beginPath();
        ctx.moveTo(-5, 5 + bob);
        ctx.bezierCurveTo(-15, 5+bob, -15, 25+bob, -5, 25+bob); // Left curve
        ctx.lineTo(5, 25+bob);
        ctx.bezierCurveTo(15, 25+bob, 15, 5+bob, 5, 5+bob); // Right curve
        ctx.fill();
    }
    else if (bodyShape === 'block') {
        // Square/Rect
        drawRoundedRect(ctx, -12, 5 + bob, 24, 24, 2);
    }
    else if (bodyShape === 'teardrop') {
        // Penguin/Bird Shape (Wide bottom)
        ctx.beginPath();
        ctx.moveTo(0, 0 + bob);
        ctx.quadraticCurveTo(12, 5+bob, 12, 25+bob);
        ctx.quadraticCurveTo(0, 30+bob, -12, 25+bob);
        ctx.quadraticCurveTo(-12, 5+bob, 0, 0+bob);
        ctx.fill();
    }
    else if (bodyShape === 'stick') {
        // Stick Figure
        ctx.lineWidth = 4; ctx.strokeStyle = suit;
        ctx.beginPath(); ctx.moveTo(0, 5+bob); ctx.lineTo(0, 25+bob); ctx.stroke();
        ctx.fillStyle = suit;
    }
    else if (bodyShape === 'muscular') {
        // Tapered Rect (V-shape but less than brute)
        ctx.beginPath();
        ctx.moveTo(-12, 5 + bob); ctx.lineTo(12, 5 + bob);
        ctx.lineTo(10, 25 + bob); ctx.lineTo(-10, 25 + bob);
        ctx.fill();
    }
    else {
        // STANDARD (Rounded Rect)
        drawRoundedRect(ctx, -10, 8 + bob, 20, 18, 5);
    }

    // Chest Emblem / Detail
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath(); ctx.arc(0, 14 + bob, 4, 0, Math.PI*2); ctx.fill();

    // Belt
    if (bodyShape !== 'orb' && bodyShape !== 'stick') {
        ctx.fillStyle = "#FFD700";
        let by = (bodyShape === 'brute') ? 26 : 22;
        ctx.fillRect(-10, by + bob, 20, 4);
    }

    // --- DRAW HEAD ---
    ctx.save();
    let headY = (bodyShape === 'brute') ? -2 : 0; // Brute head slightly lower (hunched)
    if (bodyShape === 'teardrop') headY = -4;
    ctx.translate(0, headY + bob);
    drawHeroHead(ctx, char);
    ctx.restore();

    // --- DRAW FRONT LIMBS ---

    // Front Leg
    ctx.fillStyle = dark;
    ctx.save();
    ctx.translate(legX + legOffsetX, legY + bob + legOffsetY);
    if(attackAnim && attackAnim.type === 'kick' && attackAnim.timer > 0) ctx.rotate(legAngle);
    else ctx.rotate(-legAngle);
    drawRoundedRect(ctx, -3, 0, 6, 12, 3);
    ctx.restore();

    // Front Arm
    ctx.fillStyle = suit;
    ctx.save();
    ctx.translate(armX + armOffsetX, armY + bob + armOffsetY);
    ctx.rotate(armAngle);
    drawRoundedRect(ctx, -3, 0, 6, 12, 3);
    // Hand
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(0, 12, 4, 0, Math.PI*2); ctx.fill();

    // Weapon
    if(char.pType === 'boomerang') {
         ctx.fillStyle = char.pColor; ctx.translate(0, 12); ctx.rotate(Math.PI/2);
         ctx.fillRect(-2, -6, 4, 12);
    }
    ctx.restore();

    ctx.restore();
}
