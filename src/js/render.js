// --- RENDERING ---

function drawRoundedRect(ctx, x, y, w, h, r) {
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

function drawCartoonEye(ctx, x, y, size, lookX, lookY) {
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

function drawBackground(ctx, camX, camY) {
    let grd = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    grd.addColorStop(0, C.skyTop);
    grd.addColorStop(1, C.skyBot);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Simple Moon
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.arc(ctx.canvas.width - 100, 100, 50, 0, Math.PI*2);
    ctx.fill();
}

function drawHeroHead(ctx, char) {
    let skin = char.cSkin;
    let dark = char.cDark;

    ctx.fillStyle = skin;

    // 1. EARS / BASE HEAD
    if (['dog_pointy', 'wolf', 'fox', 'cat', 'monkey', 'bat'].includes(char.type)) {
        drawRoundedRect(ctx, -12, -12, 24, 20, 8);
        if (char.type === 'monkey') {
            // Monkey Ears
            ctx.beginPath(); ctx.arc(-14, -5, 5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(14, -5, 5, 0, Math.PI*2); ctx.fill();
        } else if (char.type === 'bat') {
            // Bat Ears
             ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(-18, -25); ctx.lineTo(-2, -12); ctx.fill();
             ctx.beginPath(); ctx.moveTo(8, -12); ctx.lineTo(18, -25); ctx.lineTo(2, -12); ctx.fill();
        } else {
            // Pointy Ears
            ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(-14, -22); ctx.lineTo(-2, -10); ctx.fill();
            ctx.beginPath(); ctx.moveTo(8, -10); ctx.lineTo(14, -22); ctx.lineTo(2, -10); ctx.fill();
        }
    }
    else if (['dog_flat', 'pig', 'bear', 'poodle', 'dog_long', 'panda', 'koala', 'lion'].includes(char.type)) {
        drawRoundedRect(ctx, -12, -12, 24, 20, 8);
        // Floppy/Round Ears
        ctx.beginPath(); ctx.arc(-12, -6, 6, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(12, -6, 6, 0, Math.PI*2); ctx.fill();
    }
    else if (char.type === 'rabbit' || char.type === 'kangaroo') {
        drawRoundedRect(ctx, -10, -10, 20, 18, 5);
        ctx.fillStyle = skin;
        drawRoundedRect(ctx, -8, -32, 6, 24, 3);
        drawRoundedRect(ctx, 2, -32, 6, 24, 3);
    }
    else if (['rodent', 'hedgehog', 'skunk', 'anteater'].includes(char.type)) {
        drawRoundedRect(ctx, -10, -8, 20, 16, 6); // Smaller head
        ctx.beginPath(); ctx.arc(-8, -6, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -6, 4, 0, Math.PI*2); ctx.fill();
    }
    else if (['rhino', 'elephant', 'cow'].includes(char.type)) {
        drawRoundedRect(ctx, -14, -14, 28, 24, 8); // Big head
        if(char.type === 'cow') {
            // Horns
            ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.moveTo(-14, -10); ctx.quadraticCurveTo(-20, -20, -10, -15); ctx.fill();
            ctx.beginPath(); ctx.moveTo(14, -10); ctx.quadraticCurveTo(20, -20, 10, -15); ctx.fill();
            ctx.fillStyle = skin;
        } else {
            ctx.beginPath(); ctx.arc(-14, -4, 8, 0, Math.PI*2); ctx.fill(); // Ears
        }
    }
    else if (['bird', 'duck', 'chicken', 'penguin'].includes(char.type)) {
        ctx.beginPath(); ctx.arc(0, -5, 12, 0, Math.PI*2); ctx.fill();
    }
    else if (['raccoon', 'panda'].includes(char.type)) {
        drawRoundedRect(ctx, -11, -10, 22, 18, 6);
        ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(-13, -18); ctx.lineTo(-3, -8); ctx.fill();
        ctx.beginPath(); ctx.moveTo(9, -8); ctx.lineTo(13, -18); ctx.lineTo(3, -8); ctx.fill();
    }
    else if (['turtle', 'frog', 'fish', 'alien', 'skeleton', 'pumpkin', 'robot', 'stone'].includes(char.type)) {
        if(char.type === 'turtle' || char.type === 'frog') {
             drawRoundedRect(ctx, -12, -10, 24, 16, 8); // Flat head
             if(char.type === 'frog') {
                 // Bug eyes
                 ctx.beginPath(); ctx.arc(-8, -12, 5, 0, Math.PI*2); ctx.fill();
                 ctx.beginPath(); ctx.arc(8, -12, 5, 0, Math.PI*2); ctx.fill();
             }
        }
        else if (char.type === 'fish') {
             // Fish shape
             ctx.beginPath(); ctx.ellipse(0, -5, 12, 15, Math.PI/2, 0, Math.PI*2); ctx.fill();
             // Fin
             ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-5, -5); ctx.lineTo(5, -5); ctx.fill();
        }
        else if (char.type === 'alien') {
             // Alien Head
             ctx.beginPath(); ctx.moveTo(0, 10); ctx.bezierCurveTo(20, 0, 20, -30, 0, -30); ctx.bezierCurveTo(-20, -30, -20, 0, 0, 10); ctx.fill();
        }
        else if (char.type === 'skeleton') {
             // Skull
             ctx.fillStyle = "#eee";
             drawRoundedRect(ctx, -10, -15, 20, 20, 8);
             ctx.fillRect(-6, 5, 12, 6); // Jaw
        }
        else if (char.type === 'pumpkin') {
             ctx.fillStyle = "#FFA500";
             ctx.beginPath(); ctx.arc(0, -5, 14, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = "#006400"; ctx.fillRect(-2, -22, 4, 8); // Stem
        }
        else if (char.type === 'robot') {
             drawRoundedRect(ctx, -12, -15, 24, 24, 2); // Square
             // Antenna
             ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, -25); ctx.stroke();
             ctx.beginPath(); ctx.arc(0, -25, 3, 0, Math.PI*2); ctx.fill();
        }
        else if (char.type === 'stone') {
             // Rock shape
             ctx.beginPath();
             ctx.moveTo(-10, -15); ctx.lineTo(5, -20); ctx.lineTo(12, -10); ctx.lineTo(10, 5); ctx.lineTo(-8, 8);
             ctx.fill();
        }
    }
    else {
        // Generic / Human
        drawRoundedRect(ctx, -11, -11, 22, 22, 8);
    }

    // 2. FACE DETAILS
    if (char.type === 'raccoon' || char.type === 'panda') {
        ctx.fillStyle = (char.type === 'panda') ? "#000" : "#333";
        ctx.beginPath(); ctx.ellipse(-5, -4, 4, 5, 0.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(5, -4, 4, 5, -0.2, 0, Math.PI*2); ctx.fill();
    }

    // Snouts
    if (['dog_pointy', 'dog_flat', 'dog_long', 'wolf', 'fox', 'bear', 'pig', 'monkey', 'cow'].includes(char.type)) {
        ctx.fillStyle = dark;
        if(char.type === 'pig') {
             ctx.fillStyle = "#ffb6c1";
             drawRoundedRect(ctx, -6, 0, 12, 8, 3);
             ctx.fillStyle = "#d16d7e";
             ctx.beginPath(); ctx.arc(-3, 4, 2, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(3, 4, 2, 0, Math.PI*2); ctx.fill();
        } else if (char.type === 'monkey') {
             ctx.fillStyle = "#FFE4C4"; // Face color
             ctx.beginPath(); ctx.ellipse(0, 2, 8, 6, 0, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = "#000"; ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.stroke();
        } else if (char.type === 'cow') {
             ctx.fillStyle = "#FFC0CB";
             drawRoundedRect(ctx, -7, 0, 14, 8, 3);
        } else {
             drawRoundedRect(ctx, -6, -1, 12, 9, 4);
             ctx.fillStyle = "#000";
             ctx.beginPath(); ctx.arc(0, -1, 3, 0, Math.PI*2); ctx.fill(); // Nose
        }
    }
    else if (['cat', 'panther', 'raccoon', 'lion', 'bat'].includes(char.type)) {
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(2, 2); ctx.lineTo(0, 5); ctx.fill(); // Tiny nose
        // Whiskers
        ctx.strokeStyle = "#000"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(15, -2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5, 2); ctx.lineTo(15, 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-15, -2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-5, 2); ctx.lineTo(-15, 4); ctx.stroke();
    }
    else if (char.type === 'elephant') {
        ctx.lineWidth = 6; ctx.strokeStyle = skin; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0, 15, 10, 10); ctx.stroke();
    }
    else if (char.type === 'rhino') {
        ctx.fillStyle = "#eee";
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(4, -15); ctx.lineTo(6, -5); ctx.fill();
    }
    else if (['bird', 'duck', 'chicken', 'penguin'].includes(char.type)) {
        ctx.fillStyle = "orange";
        if(char.type === 'duck' || char.type === 'chicken') {
            ctx.beginPath(); ctx.ellipse(0, -2, 8, 4, 0, 0, Math.PI*2); ctx.fill();
        } else {
            ctx.beginPath(); ctx.moveTo(5, -5); ctx.lineTo(18, -2); ctx.lineTo(5, 2); ctx.fill();
        }
    }
    else if (char.type === 'anteater') {
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(20, 2); ctx.lineTo(8, 6); ctx.fill();
    }
    else if (char.type === 'croc' || char.type === 'lizard') {
        ctx.fillStyle = dark;
        drawRoundedRect(ctx, -8, 0, 16, 12, 4); // Snout
    }
    else if (char.type === 'skeleton') {
         ctx.fillStyle = "#000";
         ctx.beginPath(); ctx.arc(-5, -6, 3, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(5, -6, 3, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-2, 6); ctx.lineTo(2, 6); ctx.fill(); // Nose hole
    }
    else if (char.type === 'pumpkin') {
         ctx.fillStyle = "#000";
         ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-2, -2); ctx.lineTo(-10, -2); ctx.fill(); // Eye
         ctx.beginPath(); ctx.moveTo(6, -6); ctx.lineTo(2, -2); ctx.lineTo(10, -2); ctx.fill(); // Eye
         ctx.beginPath(); ctx.moveTo(-8, 5); ctx.lineTo(0, 8); ctx.lineTo(8, 5); ctx.fill(); // Mouth
    }
    else if (char.type === 'robot') {
         ctx.fillStyle = "#00FF00";
         ctx.fillRect(-8, -10, 5, 5); ctx.fillRect(3, -10, 5, 5); // Square eyes
         ctx.fillRect(-6, 2, 12, 2); // Mouth slot
    }

    // 3. EYES
    if (['skeleton', 'pumpkin', 'robot', 'alien'].includes(char.type)) {
        // Eyes already drawn in base head or specialized logic
    } else if(char.name.includes("DARE")) {
        ctx.fillStyle = char.cDark;
        ctx.fillRect(-12, -8, 24, 6);
    } else if (char.name.includes("SPIDER") || char.name.includes("DEAD") || char.name.includes("PANTHER") || char.name.includes("IRON")) {
        // Mask Eyes
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.ellipse(-5, -4, 4, 6, -0.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(5, -4, 4, 6, 0.2, 0, Math.PI*2); ctx.fill();
        // Outline
        ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.stroke();
    } else {
        // Cartoon Eyes
        drawCartoonEye(ctx, -5, -4, 4, 0.5, 0);
        drawCartoonEye(ctx, 5, -4, 4, 0.5, 0);
    }

    // 4. HATS / SPECIAL
    if(char.name.includes("CAP") || char.name.includes("TRASH")) {
        // Cap
        ctx.fillStyle = char.cSuit;
        ctx.beginPath(); ctx.arc(0, -11, 12, Math.PI, 0); ctx.fill();
        ctx.fillRect(-12, -11, 24, 2);
    }
    if(char.type === 'tree') {
         ctx.fillStyle = "lime";
         ctx.beginPath(); ctx.arc(0, -15, 8, 0, Math.PI*2); ctx.fill();
    }
}

function drawAnatomicalHero(ctx, char, frame, attackAnim = null) {
    let skin = char.cSkin;
    let dark = char.cDark;
    let suit = char.cSuit;

    // Animation
    let bob = Math.sin(frame * 0.5) * 2;
    let runCycle = Math.sin(frame * 0.5);
    let legAngle = runCycle * 0.8;
    let armAngle = -runCycle * 0.8;

    let armOffsetX = 0;
    let armOffsetY = 0;
    let legOffsetX = 0;
    let legOffsetY = 0;

    if (attackAnim && attackAnim.timer > 0) {
        let t = attackAnim.timer / attackAnim.max;
        let p = Math.sin(t * Math.PI);

        if (attackAnim.type === 'kick') {
            legAngle = -Math.PI/2 * p; // Kick Up
            legOffsetX = p * 10;
            armAngle = Math.PI/4; // Balance
        } else if (attackAnim.type === 'punch' || attackAnim.type === 'shoot') {
             armAngle = -Math.PI/2;
             armOffsetX = p * 15;
        } else if (attackAnim.type === 'slash') {
             armAngle = -Math.PI/2 + (t * Math.PI) - Math.PI/2; // Downward slash arc
        } else if (attackAnim.type === 'smash_down') {
             armAngle = Math.PI;
             if(t < 0.5) armAngle = 0; // Wind up then smash
        } else if (attackAnim.type === 'throw') {
             armAngle = -Math.PI/2 + (1-t) * Math.PI;
        } else if (attackAnim.type === 'flex') {
             // Bicep Flex
             armAngle = -Math.PI + 0.5; // Up
             armOffsetX = -5;
             bob = Math.sin(frame * 1.5) * 3; // Intense bobbing
        }
    }

    let isBulky = ['rhino', 'elephant', 'bear', 'poodle', 'tree'].includes(char.type);
    let isSmall = ['rodent', 'hedgehog', 'rabbit', 'pig'].includes(char.type);

    let scale = isSmall ? 0.8 : (isBulky ? 1.2 : 1.0);

    ctx.save();
    ctx.scale(scale, scale);

    // CAPE
    if (['dog_pointy', 'cat', 'bird'].includes(char.type) || char.name.includes("SUPER") || char.name.includes("THOR") || char.name.includes("STRANGE") || char.name.includes("SCARLET") || char.name.includes("VISION")) {
         ctx.fillStyle = char.pColor;
         ctx.beginPath();
         ctx.moveTo(-10, 5 + bob);
         ctx.lineTo(10, 5 + bob);
         ctx.lineTo(15 + Math.sin(frame*0.2)*5, 35 + bob);
         ctx.lineTo(-15 + Math.sin(frame*0.2+1)*5, 35 + bob);
         ctx.fill();
    }

    // TAIL
    if (['dog_pointy', 'dog_flat', 'dog_long', 'cat', 'fox', 'wolf', 'panther', 'raccoon', 'monkey', 'lizard', 'croc', 'cow', 'lion', 'fish'].includes(char.type)) {
        ctx.strokeStyle = skin;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-5, 25 + bob);
        if(char.type === 'monkey') {
            ctx.quadraticCurveTo(-20, 10 + bob, -5, 5 + bob); // Curly tail
        } else if (char.type === 'fish') {
            ctx.moveTo(0, 25+bob); ctx.lineTo(0, 35+bob); // Fish tail
        } else {
            ctx.quadraticCurveTo(-15, 20 + bob + Math.sin(frame*0.3)*5, -20, 15 + bob);
        }
        ctx.stroke();
        if(char.type === 'raccoon') { // Striped tail
             ctx.strokeStyle = "#333"; ctx.lineWidth=4; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
        }
    }
    if (char.type === 'turtle') {
        // Shell
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.arc(0, 15+bob, 14, 0, Math.PI*2); ctx.fill();
    }

    // BACK LEG
    ctx.fillStyle = dark;
    ctx.save();
    ctx.translate(-4, 25 + bob);
    ctx.rotate(legAngle);
    drawRoundedRect(ctx, -3, 0, 6, 12, 3);
    ctx.restore();

    // BODY
    ctx.fillStyle = suit;
    let bw = isBulky ? 26 : 20;
    let bh = isBulky ? 22 : 18;
    drawRoundedRect(ctx, -bw/2, 8 + bob, bw, bh, 5);

    // CHEST DETAIL
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath(); ctx.arc(0, 16+bob, 4, 0, Math.PI*2); ctx.fill();

    // BELT
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(-bw/2, 22 + bob, bw, 4);

    // HEAD
    ctx.save();
    ctx.translate(0, 0 + bob);
    drawHeroHead(ctx, char);
    ctx.restore();

    // FRONT LEG (ANIMATED FOR KICK)
    ctx.fillStyle = dark;
    ctx.save();
    ctx.translate(4 + legOffsetX, 25 + bob + legOffsetY);
    // If kicking, override rotation logic. Otherwise use run cycle.
    if(attackAnim && attackAnim.type === 'kick' && attackAnim.timer > 0) {
        ctx.rotate(legAngle); // legAngle is calculated in attack block
    } else {
        ctx.rotate(-legAngle); // Normal run cycle (opposite of back leg)
    }
    drawRoundedRect(ctx, -3, 0, 6, 12, 3);
    ctx.restore();

    // FRONT ARM (ANIMATED)
    ctx.fillStyle = suit;
    ctx.save();
    ctx.translate(0 + armOffsetX, 15 + bob + armOffsetY);
    ctx.rotate(armAngle);
    drawRoundedRect(ctx, -3, 0, 6, 12, 3);
    // Hand
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(0, 12, 4, 0, Math.PI*2); ctx.fill();
    // Weapon/Prop
    if(char.pType === 'boomerang') {
         ctx.fillStyle = char.pColor;
         ctx.translate(0, 12); ctx.rotate(Math.PI/2);
         ctx.fillRect(-2, -6, 4, 12);
    }
    ctx.restore();

    ctx.restore();
}

// VISUALS: MENU
function drawMenu() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Safety reset
    ctx.clearRect(0,0,canvas.width,canvas.height);
    var grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grd.addColorStop(0, "#111"); grd.addColorStop(1, "#333");
    ctx.fillStyle = grd; ctx.fillRect(0,0,canvas.width,canvas.height);
}

function drawRoster() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Safety reset
    ctx.clearRect(0,0,canvas.width,canvas.height);
    var grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grd.addColorStop(0, "#111"); grd.addColorStop(1, "#333");
    ctx.fillStyle = grd; ctx.fillRect(0,0,canvas.width,canvas.height);

    let padding = 70;
    let cols = 12; // More columns
    let totalWidth = cols * padding;
    let startX = (canvas.width - totalWidth) / 2 + padding/2;
    let startY = 100;

    // Scale down if screen is small
    let scale = 1;
    if (totalWidth > canvas.width) scale = canvas.width / (totalWidth + 50);

    ctx.save();
    ctx.scale(scale, scale);
    if(scale < 1) startX = (canvas.width/scale - totalWidth)/2 + padding/2;

    ctx.font = "30px 'Courier New'";
    ctx.fillStyle = "#00ff41";
    ctx.textAlign = "center";
    ctx.fillText("ROSTER STATUS: " + gameState.globalUnlocked + " / " + CHARACTERS.length + " HEROES UNLOCKED", (canvas.width/scale)/2, 50);

    for(let i=0; i<CHARACTERS.length; i++) {
        let row = Math.floor(i / cols);
        let col = i % cols;
        let cx = startX + col * padding;
        let cy = startY + row * padding;

        ctx.fillStyle = "rgba(255,255,255,0.1)";
        drawRoundedRect(ctx, cx-30, cy-30, 60, 60, 10);

        if (i < gameState.globalUnlocked) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(0.8, 0.8);
            let frame = Date.now() / 100;
            drawAnatomicalHero(ctx, CHARACTERS[i], frame);
            ctx.restore();

            ctx.fillStyle = "#aaa"; ctx.font = "8px Arial";
            ctx.fillText(CHARACTERS[i].name.split(" ")[0], cx, cy+40);
        } else {
            ctx.fillStyle = "#222";
            ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI*2); ctx.fill();

            let needed = i - gameState.globalUnlocked + 1;
            ctx.fillStyle = "#555";
            if (needed === 1) {
                ctx.font = "10px Arial"; ctx.fillText("NEXT", cx, cy-5);
                ctx.font = "bold 16px Arial"; ctx.fillStyle = "#00ff41"; ctx.fillText("1", cx, cy+12);
            } else {
                ctx.font = "16px Arial"; ctx.fillText(needed, cx, cy+6);
            }
        }
    }
    ctx.restore();
}
