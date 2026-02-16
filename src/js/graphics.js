export const CANVAS = document.getElementById('gameCanvas');
export const CTX = CANVAS.getContext('2d');
export const DEBUG_HUD = document.getElementById('debugHUD');
export const TILE_SIZE = 40;
export const GRAVITY = 0.6;
export const FRICTION = 0.85;
export const ACCELERATION = 0.8;
export const JUMP_FORCE = -13;
export const TERMINAL_VELOCITY = 15;
export const LEVEL_WIDTH = 400; // This might need to be mutable if it changes per level, but currently it's a const default
export const LEVEL_HEIGHT = 60;
export const FPS = 60;
export const INTERVAL = 1000 / FPS;

export const ASSETS = {
    dirtBase: "#5d4037", dirtLight: "#8d6e63", grassTop: "#4caf50",
    stoneBase: "#546e7a", stoneLight: "#78909c",
    skyTop: "#1e3c72", skyBot: "#2a5298",
    checkpoint: "#00ff41", leash: "#555", tank: "#e74c3c", ladder: "#d35400"
};

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
// ANATOMICAL FEATURES HELPERS
// ---------------------------------------------------------

function drawTail(ctx, char, bob, frame) {
    let type = char.type;
    let skin = char.cSkin;
    let dark = char.cDark;

    // Tail Logic
    if (['pig', 'dog_flat'].includes(type)) {
        // Curly tail
        ctx.strokeStyle = skin; ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(-15, 0 + bob, 5, 0, Math.PI*1.5);
        ctx.stroke();
    } else if (['cat', 'monkey', 'lion', 'panther', 'rodent', 'possum', 'tiger'].includes(type)) {
        // Long Slinky Tail
        ctx.strokeStyle = skin; ctx.lineWidth = 4; ctx.lineCap = "round";
        let tailWag = Math.sin(frame * 0.2) * 5;
        ctx.beginPath();
        ctx.moveTo(-10, 5 + bob);
        ctx.quadraticCurveTo(-25, 5 + bob - 10 + tailWag, -35, 5 + bob + tailWag);
        ctx.stroke();

        // Lion Tuft
        if (type === 'lion') {
            ctx.fillStyle = dark;
            ctx.beginPath(); ctx.arc(-35, 5 + bob + tailWag, 4, 0, Math.PI*2); ctx.fill();
        }
    } else if (['dog_pointy', 'wolf', 'fox', 'raccoon', 'skunk'].includes(type)) {
        // Bushy Tail
        ctx.fillStyle = (type === 'skunk' || type === 'raccoon') ? dark : skin;
        let tailWag = Math.sin(frame * 0.2) * 0.2;
        ctx.save();
        ctx.translate(-10, 5 + bob);
        ctx.rotate(-0.5 + tailWag);
        ctx.beginPath();
        ctx.ellipse(-10, 0, 15, 6, 0, 0, Math.PI*2);
        ctx.fill();
        // Skunk Stripe / Raccoon Rings
        if (type === 'skunk') {
            ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.ellipse(-10, -2, 12, 2, 0, 0, Math.PI*2); ctx.fill();
        }
        if (type === 'raccoon') {
            ctx.strokeStyle = "#333"; ctx.lineWidth=2;
            ctx.beginPath(); ctx.moveTo(-5, -4); ctx.lineTo(-5, 4); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-12, -5); ctx.lineTo(-12, 5); ctx.stroke();
        }
        ctx.restore();
    } else if (['cow', 'bull', 'donkey', 'horse', 'zebra', 'buffalo', 'giraffe', 'llama', 'alpaca', 'deer'].includes(type)) {
        // Rope Tail with Tuft
        ctx.strokeStyle = skin; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-10, 5 + bob); ctx.lineTo(-20, 10 + bob); ctx.stroke();
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.arc(-20, 10 + bob, 3, 0, Math.PI*2); ctx.fill();
    } else if (['rabbit'].includes(type)) {
        // Puff Tail
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(-12, 5 + bob, 5, 0, Math.PI*2); ctx.fill();
    } else if (['lizard', 'croc', 'dino', 'dragon'].includes(type)) {
        // Thick Tapered Tail
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.moveTo(-10, 0 + bob);
        ctx.lineTo(-30, 5 + bob);
        ctx.lineTo(-10, 10 + bob);
        ctx.fill();
        // Spikes for croc/dragon
        if(type === 'croc' || type === 'dragon') {
            ctx.fillStyle = dark;
            for(let i=0; i<3; i++) {
                ctx.beginPath(); ctx.moveTo(-12 - i*6, 2+bob); ctx.lineTo(-15 - i*6, -3+bob); ctx.lineTo(-18 - i*6, 3+bob); ctx.fill();
            }
        }
    } else if (['bird', 'duck', 'chicken', 'owl'].includes(type)) {
        // Feather Tail
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.moveTo(-10, 5+bob);
        ctx.lineTo(-18, 0+bob);
        ctx.lineTo(-18, 10+bob);
        ctx.fill();
    }
}

function drawBodyFeatures(ctx, char, bob, frame) {
    let type = char.type;
    let skin = char.cSkin;
    let dark = char.cDark;

    // Wings
    if (char.trait === 'fly' || ['bee', 'dragon', 'bat'].includes(type)) {
        let wingFlap = Math.sin(frame * 0.8) * 10;
        ctx.fillStyle = (type === 'bee') ? "rgba(255,255,255,0.7)" : skin;
        if(type === 'dragon' || type === 'bat') ctx.fillStyle = dark;

        ctx.save();
        ctx.translate(-5, -5 + bob);
        ctx.beginPath();
        ctx.ellipse(0, -5 + wingFlap/2, 12, 6, Math.PI/-4, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }

    // Shells / Spikes / Manes on Body
    if (type === 'turtle') {
        ctx.fillStyle = dark; // Shell color
        ctx.beginPath();
        ctx.arc(0, bob, 14, Math.PI, 0); // Half circle on back
        ctx.fill();
        // Shell pattern
        ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, bob, 10, Math.PI, 0); ctx.stroke();
    } else if (type === 'hedgehog') {
        ctx.fillStyle = dark; // Spikes
        for(let i=-10; i<10; i+=4) {
            ctx.beginPath(); ctx.moveTo(i, bob-5); ctx.lineTo(i+2, bob-15); ctx.lineTo(i+4, bob-5); ctx.fill();
        }
    } else if (type === 'bee') {
        // Stripes
        ctx.fillStyle = "#000";
        ctx.fillRect(-5, bob-5, 3, 10);
        ctx.fillRect(2, bob-5, 3, 10);
    } else if (type === 'skeleton') {
        // Ribs
        ctx.strokeStyle = "#333"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-5, bob-2); ctx.lineTo(5, bob-2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-5, bob+2); ctx.lineTo(5, bob+2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-5, bob+6); ctx.lineTo(5, bob+6); ctx.stroke();
    }
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
    let type = char.type;

    // 1. TAIL
    drawTail(ctx, char, bob, frame);

    // 2. FAR LEGS (Back & Front)
    ctx.fillStyle = dark;

    // Leg shape/length based on type
    let legW = 6, legH = 12;
    if (['horse', 'deer', 'llama', 'giraffe', 'zebra', 'donkey', 'cow', 'bull', 'buffalo'].includes(type)) {
        legH = 16; legW = 5; // Longer, thinner legs
    } else if (['elephant', 'rhino', 'hippo'].includes(type)) {
        legH = 10; legW = 8; // Stumpy thick legs
    }

    // Back-Far
    ctx.save(); ctx.translate(-w/2 + 8, 10 + bob); ctx.rotate(-backLegAngle);
    drawRoundedRect(ctx, -legW/2, 0, legW, legH, legW/2);
    ctx.restore();
    // Front-Far
    ctx.save(); ctx.translate(w/2 - 8, 10 + bob); ctx.rotate(-frontLegAngle);
    drawRoundedRect(ctx, -legW/2, 0, legW, legH, legW/2);
    ctx.restore();

    // 3. BODY SHAPE LOGIC
    ctx.fillStyle = suit;

    if (['horse', 'deer', 'llama', 'alpaca', 'donkey', 'zebra', 'giraffe'].includes(type)) {
        // EQUINE / UNGULATE: Rising neck
        ctx.beginPath();
        // Hindquarters
        ctx.moveTo(-w/2, -h/2 + bob + 5);
        ctx.quadraticCurveTo(-w/2 - 5, -h/2 + bob + 10, -w/2, h/2 + bob); // Butt curve
        ctx.lineTo(w/2 - 10, h/2 + bob); // Belly
        // Chest/Neck rise
        ctx.lineTo(w/2, -h/2 + bob - 10); // Neck base high
        ctx.lineTo(w/2 - 15, -h/2 + bob + 5); // Withers
        ctx.fill();

    } else if (['elephant', 'rhino', 'hippo', 'pig', 'boar', 'bear', 'cow', 'bull', 'buffalo'].includes(type)) {
        // HEAVY: Bulky, round/boxy
        let roundness = (type === 'pig' || type === 'hippo') ? 12 : 6;
        if(type === 'elephant') {
            // Big arch back
            ctx.beginPath();
            ctx.moveTo(-w/2, h/2 + bob);
            ctx.quadraticCurveTo(0, -h/2 + bob - 10, w/2, h/2 + bob);
            ctx.fill();
        } else {
            drawRoundedRect(ctx, -w/2, -h/2 + bob, w, h, roundness);
        }

    } else if (['cat', 'dog_pointy', 'wolf', 'fox', 'lion', 'panther', 'tiger', 'cheetah'].includes(type)) {
        // AGILE: Lean, defined chest
        ctx.beginPath();
        ctx.moveTo(-w/2, -h/2 + bob + 5);
        ctx.lineTo(w/2, -h/2 + bob);
        ctx.lineTo(w/2 + 2, h/2 + bob - 2); // Chest out
        ctx.lineTo(w/2 - 10, h/2 + bob - 5); // Tuck up
        ctx.lineTo(-w/2 + 5, h/2 + bob); // Haunch
        ctx.fill();

    } else if (['rodent', 'rabbit', 'hedgehog', 'skunk', 'raccoon'].includes(type)) {
        // SMALL: Oval/Egg
        ctx.beginPath();
        ctx.ellipse(0, bob + 5, w/2, h/2, 0, 0, Math.PI*2);
        ctx.fill();

    } else {
        // GENERIC / REPTILE
        drawRoundedRect(ctx, -w/2, -h/2 + bob, w, h, 8);
    }

    // Body Features (Wings, Shells, etc)
    drawBodyFeatures(ctx, char, bob, frame);

    // Weapon Mount (Back)
    if (char.mount === 'back') {
        ctx.fillStyle = "#555";
        ctx.fillRect(-5, -h/2 + bob - 6, 10, 6); // Mount base
        // Visual indicator
        ctx.fillStyle = char.pColor;
        ctx.beginPath(); ctx.arc(0, -h/2 + bob - 6, 4, 0, Math.PI*2); ctx.fill();
    }

    // 4. HEAD (Attached to Front)
    ctx.save();
    // Neck offset logic
    let neckX = w/2;
    let neckY = -5 + bob;

    if (['horse', 'deer', 'llama', 'alpaca', 'donkey', 'zebra', 'giraffe'].includes(type)) {
        // Long neck up
        ctx.fillStyle = skin;
        let neckLen = (type === 'giraffe') ? 30 : 15;
        let angle = -0.3;

        ctx.save();
        ctx.translate(w/2 - 5, -5 + bob);
        ctx.rotate(angle);
        drawRoundedRect(ctx, 0, -neckLen, 10, neckLen + 5, 4);
        ctx.restore();

        // Adjust head pos to end of neck
        neckX += Math.sin(-angle) * neckLen + 2;
        neckY -= Math.cos(-angle) * neckLen;
    } else if (['bird', 'ostrich'].includes(type)) {
        // Bird neck
        neckY -= 10;
        neckX += 2;
    }

    ctx.translate(neckX, neckY);
    drawHeroHead(ctx, char);
    ctx.restore();

    // 5. NEAR LEGS (Back & Front)
    ctx.fillStyle = skin;
    if(char.cSuit !== char.cSkin) ctx.fillStyle = dark;

    // Back-Near
    ctx.save(); ctx.translate(-w/2 + 8, 15 + bob); ctx.rotate(backLegAngle);
    drawRoundedRect(ctx, -legW/2, 0, legW, legH, legW/2);
    ctx.restore();
    // Front-Near
    ctx.save(); ctx.translate(w/2 - 8, 15 + bob); ctx.rotate(frontLegAngle);
    drawRoundedRect(ctx, -legW/2, 0, legW, legH, legW/2);
    ctx.restore();
}

function drawBiped(ctx, char, frame, bob, skin, dark, suit, attackAnim) {
    let runCycle = Math.sin(frame * 0.5);
    let legAngle = runCycle * 0.8;
    let armAngle = -runCycle * 0.8;
    let type = char.type;

    // Attack overrides
    let armOffsetX = 0, armOffsetY = 0;
    if (attackAnim && attackAnim.timer > 0) {
         let t = attackAnim.timer / attackAnim.max;
         if (attackAnim.type === 'shoot') { armAngle = -Math.PI/2; }
    }

    ctx.save();

    // Wings / Back Features
    drawBodyFeatures(ctx, char, bob, frame);

    // Cape
    if (['dog_pointy', 'cat', 'bird'].includes(char.type) || char.name.includes("SUPER") || char.name.includes("CAPTAIN")) {
         ctx.fillStyle = char.pColor;
         ctx.beginPath(); ctx.moveTo(-10, 5+bob); ctx.lineTo(10, 5+bob); ctx.lineTo(0, 35+bob); ctx.fill();
    }

    // Tail
    drawTail(ctx, char, bob, frame);

    // Back Leg
    ctx.fillStyle = dark;
    ctx.save(); ctx.translate(-4, 25+bob); ctx.rotate(legAngle);

    // Bird legs are thin
    if (['bird', 'duck', 'chicken', 'owl', 'penguin', 'bee'].includes(type)) {
        ctx.fillRect(-1, 0, 2, 10);
        ctx.fillStyle = "orange"; // Feet
        ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(-3, 14); ctx.lineTo(3, 14); ctx.fill();
    } else {
        drawRoundedRect(ctx, -3, 0, 6, 12, 3);
    }
    ctx.restore();

    // BODY SHAPES
    ctx.fillStyle = suit;
    let bodyShape = char.body || 'standard';

    if (['bird', 'duck', 'chicken', 'owl', 'penguin'].includes(type)) {
        // AVIAN: Teardrop
        ctx.beginPath();
        ctx.ellipse(0, 12 + bob, 10, 14, 0, 0, Math.PI*2);
        ctx.fill();
        // Tail feathers stick out back
        ctx.fillStyle = skin;
        ctx.beginPath(); ctx.moveTo(-8, 15+bob); ctx.lineTo(-15, 10+bob); ctx.lineTo(-15, 20+bob); ctx.fill();

    } else if (type === 'bee' || type === 'ant') {
        // INSECT: Segmented
        ctx.beginPath(); ctx.arc(0, 10+bob, 8, 0, Math.PI*2); ctx.fill(); // Thorax
        ctx.beginPath(); ctx.arc(0, 22+bob, 10, 0, Math.PI*2); ctx.fill(); // Abdomen

    } else if (bodyShape === 'brute' || type === 'bear' || type === 'rhino') {
         ctx.beginPath(); ctx.moveTo(-15,0+bob); ctx.lineTo(15,0+bob); ctx.lineTo(5,25+bob); ctx.lineTo(-5,25+bob); ctx.fill();

    } else if (bodyShape === 'orb' || type === 'pumpkin') {
         ctx.beginPath(); ctx.arc(0, 15+bob, 15, 0, Math.PI*2); ctx.fill();

    } else if (bodyShape === 'stick' || type === 'skeleton') {
         ctx.lineWidth=4; ctx.strokeStyle=suit; ctx.beginPath(); ctx.moveTo(0, 5+bob); ctx.lineTo(0, 25+bob); ctx.stroke();

    } else {
         drawRoundedRect(ctx, -10, 8+bob, 20, 18, 5);
    }

    // Head
    ctx.save(); ctx.translate(0, bob); drawHeroHead(ctx, char); ctx.restore();

    // Front Leg
    ctx.fillStyle = dark;
    ctx.save(); ctx.translate(4, 25+bob); ctx.rotate(-legAngle);
    if (['bird', 'duck', 'chicken', 'owl', 'penguin', 'bee'].includes(type)) {
        ctx.fillStyle = "#333";
        ctx.fillRect(-1, 0, 2, 10);
        ctx.fillStyle = "orange";
        ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(-3, 14); ctx.lineTo(3, 14); ctx.fill();
    } else {
        drawRoundedRect(ctx, -3, 0, 6, 12, 3);
    }
    ctx.restore();

    // Front Arm
    ctx.fillStyle = suit;
    // Wing arms for birds?
    if (['bird', 'duck', 'chicken', 'owl', 'penguin'].includes(type)) {
        ctx.fillStyle = skin; // Wing color
        ctx.save(); ctx.translate(5, 15+bob); ctx.rotate(armAngle);
        ctx.beginPath(); ctx.ellipse(0, 5, 4, 10, 0.2, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    } else {
        ctx.save(); ctx.translate(0 + armOffsetX, 15 + bob + armOffsetY); ctx.rotate(armAngle); drawRoundedRect(ctx, -3, 0, 6, 12, 3);
        ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, 12, 4, 0, 2*Math.PI); ctx.fill(); // Hand
        ctx.restore();
    }

    ctx.restore();
}

function drawSnake(ctx, char, frame, bob, skin, dark, suit) {
    let w = char.w || 36;
    let h = char.h || 18;

    // Slither motion
    let wave = Math.sin(frame * 0.5) * 5;

    // Tail/Body Segments
    ctx.fillStyle = suit;
    for(let i=0; i<8; i++) {
        let x = (w/2) - (i * 6);
        let y = bob + Math.sin((frame*0.2) + i)*4;
        let size = h/2 + (2-Math.abs(i-2));
        ctx.beginPath(); ctx.arc(x, y + 10, size, 0, Math.PI*2); ctx.fill();
    }

    // Fins if Fish
    if (char.type === 'fish' || char.type === 'shark') {
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.moveTo(0, bob); ctx.lineTo(-10, bob-10); ctx.lineTo(-5, bob); ctx.fill(); // Dorsal
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
    ctx.save();
    ctx.translate(w/3, -5);
    drawCartoonEye(ctx, 0, 0, 4, 0.5, 0);
    ctx.restore();

    ctx.restore();
}

// ---------------------------------------------------------
// DETAILED HEAD RENDERER
// ---------------------------------------------------------
export function drawHeroHead(ctx, char) {
    let skin = char.cSkin;
    let dark = char.cDark;
    let type = char.type;

    ctx.fillStyle = skin;

    // --- CANIDS ---
    if (['dog_pointy', 'wolf', 'fox', 'dog_long', 'dog_flat', 'poodle'].includes(type)) {
        if (type === 'dog_flat') { // Pug
            drawRoundedRect(ctx, -12, -12, 24, 24, 8);
            ctx.fillStyle = dark; // Muzzle mask
            ctx.beginPath(); ctx.ellipse(0, 4, 8, 5, 0, 0, Math.PI*2); ctx.fill();
            // Folded ears
            ctx.fillStyle = dark;
            ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(-18, -2); ctx.lineTo(-12, 0); ctx.fill();
            ctx.beginPath(); ctx.moveTo(12, -10); ctx.lineTo(18, -2); ctx.lineTo(12, 0); ctx.fill();
        } else if (type === 'dog_long') { // Greyhound
             ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(15, -6); ctx.lineTo(18, 5); ctx.lineTo(-8, 8); ctx.fill(); // Long snout
             // Ears back
             ctx.fillStyle = dark;
             ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-15, -12); ctx.lineTo(-5, -10); ctx.fill();
        } else if (type === 'poodle') {
             // Poofy head
             ctx.beginPath(); ctx.arc(0, -5, 12, 0, Math.PI*2); ctx.fill();
             // Poofy ears
             ctx.fillStyle = dark;
             ctx.beginPath(); ctx.arc(-12, 0, 6, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(12, 0, 6, 0, Math.PI*2); ctx.fill();
             // Snout
             ctx.fillStyle = skin;
             ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(10, -2); ctx.lineTo(10, 4); ctx.lineTo(0, 6); ctx.fill();
        } else { // Pointy (Wolf, Fox, German Shepherd)
             // Snout
             ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(12, -5); ctx.lineTo(10, 8); ctx.lineTo(-10, 10); ctx.fill();
             // Cheek fluff
             if (type === 'wolf' || type === 'fox') {
                 ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-15, 5); ctx.lineTo(-10, 10); ctx.fill();
             }
             // Ears
             ctx.fillStyle = (type === 'fox') ? dark : skin;
             ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(-8, -20); ctx.lineTo(0, -10); ctx.fill();
             ctx.beginPath(); ctx.moveTo(5, -10); ctx.lineTo(8, -20); ctx.lineTo(0, -10); ctx.fill();
             // Nose tip
             ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(12, 2, 2, 0, Math.PI*2); ctx.fill();
        }
    }

    // --- FELINES ---
    else if (['cat', 'lion', 'panther', 'tiger'].includes(type)) {
        // Mane for Lion
        if (type === 'lion') {
            ctx.fillStyle = dark;
            ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = skin;
        }
        // Head shape
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI*2); ctx.fill();
        // Pointy Ears
        ctx.fillStyle = (type === 'cat' && dark !== skin) ? dark : skin;
        ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-12, -16); ctx.lineTo(-2, -8); ctx.fill();
        ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(12, -16); ctx.lineTo(2, -8); ctx.fill();
        // Whiskers
        ctx.strokeStyle = "#333"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(5, 2); ctx.lineTo(15, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5, 2); ctx.lineTo(15, 4); ctx.stroke();
    }

    // --- RODENTS / RABBITS ---
    else if (['rodent', 'rabbit', 'skunk', 'raccoon', 'hedgehog', 'anteater'].includes(type)) {
        if (type === 'anteater') {
             // Long curved snout
             ctx.beginPath(); ctx.moveTo(-10,-5); ctx.quadraticCurveTo(20, 10, 15, 15); ctx.lineTo(-10, 10); ctx.fill();
        } else {
             // Base Head
             ctx.beginPath(); ctx.ellipse(0, 0, 10, 9, 0, 0, Math.PI*2); ctx.fill();
        }

        // Ears
        if (type === 'rabbit') {
            ctx.fillStyle = skin;
            ctx.beginPath(); ctx.ellipse(-5, -15, 4, 12, -0.2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(5, -15, 4, 12, 0.2, 0, Math.PI*2); ctx.fill();
        } else if (type === 'rodent') {
            ctx.fillStyle = dark; // Mouse ears
            ctx.beginPath(); ctx.arc(-8, -8, 5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(8, -8, 5, 0, Math.PI*2); ctx.fill();
        }

        // Mask for Raccoon
        if (type === 'raccoon') {
            ctx.fillStyle = "#333";
            ctx.fillRect(-10, -4, 20, 6);
        }

        // Whiskers
        if (['rodent', 'rabbit'].includes(type)) {
            ctx.strokeStyle = "#000"; ctx.beginPath(); ctx.moveTo(2,2); ctx.lineTo(10,2); ctx.stroke();
        }
    }

    // --- FARM ---
    else if (['cow', 'bull', 'buffalo', 'goat', 'pig', 'horse', 'donkey', 'llama', 'alpaca', 'zebra', 'giraffe', 'deer'].includes(type)) {
        if (type === 'pig') {
            drawRoundedRect(ctx, -10, -10, 20, 20, 8);
            // Snout
            ctx.fillStyle = dark;
            ctx.beginPath(); ctx.ellipse(0, 4, 6, 4, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#000"; // Nostrils
            ctx.beginPath(); ctx.arc(-2, 4, 1, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(2, 4, 1, 0, Math.PI*2); ctx.fill();
            // Floppy ears
            ctx.fillStyle = skin;
            ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-12, -2); ctx.lineTo(-6, -2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(12, -2); ctx.lineTo(6, -2); ctx.fill();
        } else if (['cow', 'bull', 'buffalo'].includes(type)) {
            drawRoundedRect(ctx, -12, -12, 24, 22, 6); // Broad head
            // Muzzle
            ctx.fillStyle = "#ecc"; // Pinkish muzzle usually, or skin light
            drawRoundedRect(ctx, -8, 2, 16, 8, 3);
            // Horns
            ctx.fillStyle = "#ddd";
            ctx.beginPath(); ctx.moveTo(-10, -10); ctx.quadraticCurveTo(-15, -15, -10, -20); ctx.stroke(); // Left
            ctx.beginPath(); ctx.moveTo(10, -10); ctx.quadraticCurveTo(15, -15, 10, -20); ctx.stroke(); // Right
            // Ears side
            ctx.fillStyle = skin;
            ctx.beginPath(); ctx.ellipse(-14, -5, 6, 3, 0.2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(14, -5, 6, 3, -0.2, 0, Math.PI*2); ctx.fill();
        } else if (type === 'goat') {
            ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(8, -10); ctx.lineTo(5, 10); ctx.lineTo(-5, 10); ctx.fill();
            // Beard
            ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(-2, 15); ctx.lineTo(2, 15); ctx.fill();
            // Horns
            ctx.fillStyle = "#ccc";
            ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(-8, -18); ctx.lineTo(-4, -10); ctx.fill();
            ctx.beginPath(); ctx.moveTo(5, -10); ctx.lineTo(8, -18); ctx.lineTo(4, -10); ctx.fill();
        } else if (['horse', 'donkey', 'zebra', 'llama', 'alpaca', 'giraffe', 'deer'].includes(type)) {
            // Long face
            ctx.beginPath(); ctx.ellipse(0, 0, 8, 14, 0.2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(5, 8, 6, 6, 0, 0, Math.PI*2); ctx.fill(); // Snout
            // Ears
            ctx.beginPath(); ctx.moveTo(-4, -10); ctx.lineTo(-6, -18); ctx.lineTo(0, -10); ctx.fill();
            if (type === 'giraffe') {
                // Ossicones
                ctx.fillStyle = dark;
                ctx.fillRect(-2, -14, 2, 6);
                ctx.fillRect(2, -14, 2, 6);
            }
            if (type === 'deer') {
                // Antlers
                ctx.strokeStyle = "#d2b48c"; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(-2, -10); ctx.lineTo(-10, -20); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(2, -10); ctx.lineTo(10, -20); ctx.stroke();
            }
        }
    }

    // --- BIRDS ---
    else if (['bird', 'duck', 'chicken', 'owl', 'penguin'].includes(type)) {
        if (type === 'owl') {
             // Disc face
             ctx.fillStyle = "#fff";
             ctx.beginPath(); ctx.arc(-5, -2, 5, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(5, -2, 5, 0, Math.PI*2); ctx.fill();
             // Tuft ears
             ctx.fillStyle = skin;
             ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-10, -14); ctx.lineTo(-4, -8); ctx.fill();
             ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(10, -14); ctx.lineTo(4, -8); ctx.fill();
             // Beak
             ctx.fillStyle = "orange";
             ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-2, 4); ctx.lineTo(2, 4); ctx.fill();
        } else if (type === 'chicken') {
             ctx.beginPath(); ctx.arc(0, -5, 9, 0, Math.PI*2); ctx.fill();
             // Comb
             ctx.fillStyle = "red";
             ctx.beginPath(); ctx.moveTo(-2, -12); ctx.lineTo(2, -12); ctx.lineTo(4, -16); ctx.lineTo(0, -14); ctx.lineTo(-4, -16); ctx.fill();
             // Wattle
             ctx.beginPath(); ctx.arc(2, 4, 2, 0, Math.PI*2); ctx.fill();
             // Beak
             ctx.fillStyle = "orange";
             ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(12, 0); ctx.lineTo(6, 2); ctx.fill();
        } else if (type === 'duck') {
             ctx.beginPath(); ctx.arc(0, -5, 10, 0, Math.PI*2); ctx.fill();
             // Bill
             ctx.fillStyle = "orange";
             drawRoundedRect(ctx, 4, -2, 10, 6, 2);
        } else { // Generic Bird
             ctx.beginPath(); ctx.arc(0, -5, 10, 0, Math.PI*2); ctx.fill();
             ctx.fillStyle = "orange";
             ctx.beginPath(); ctx.moveTo(8, -5); ctx.lineTo(16, -2); ctx.lineTo(8, 1); ctx.fill();
        }
    }

    // --- REPTILES ---
    else if (['croc', 'lizard', 'snake', 'turtle', 'frog', 'dragon'].includes(type)) {
        if (type === 'croc' || type === 'dragon') {
            // Long snout
            ctx.fillStyle = skin;
            ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(20, -5); ctx.lineTo(20, 5); ctx.lineTo(-10, 8); ctx.fill();
            // Teeth
            ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.moveTo(5, 5); ctx.lineTo(7, 8); ctx.lineTo(9, 5); ctx.fill();
            ctx.beginPath(); ctx.moveTo(12, 5); ctx.lineTo(14, 8); ctx.lineTo(16, 5); ctx.fill();
            // Eyes on top
            ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, -8, 3, 0, Math.PI*2); ctx.fill();
        } else if (type === 'frog') {
            ctx.fillStyle = skin;
            ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI*2); ctx.fill();
            // Eyes on top
            ctx.beginPath(); ctx.arc(-6, -8, 4, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(6, -8, 4, 0, Math.PI*2); ctx.fill();
        } else if (type === 'snake') {
            ctx.fillStyle = skin;
            ctx.beginPath(); ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI*2); ctx.fill();
            // Tongue
            ctx.strokeStyle = "red"; ctx.lineWidth=1;
            ctx.beginPath(); ctx.moveTo(10, 2); ctx.lineTo(15, 2); ctx.lineTo(18, 0); ctx.stroke();
        } else { // Lizard / Turtle
             ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
        }
    }

    // --- OTHERS ---
    else if (type === 'elephant') {
        ctx.beginPath(); ctx.arc(0, -5, 14, 0, Math.PI*2); ctx.fill();
        // Ears
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.ellipse(-12, -5, 8, 12, 0.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(12, -5, 8, 12, -0.2, 0, Math.PI*2); ctx.fill();
        // Trunk
        ctx.fillStyle = skin;
        ctx.beginPath(); ctx.moveTo(-2, 0); ctx.quadraticCurveTo(0, 15, 5, 20); ctx.lineTo(8, 20); ctx.quadraticCurveTo(6, 15, 4, 0); ctx.fill();
        // Tusks
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.moveTo(4, 5); ctx.lineTo(8, 12); ctx.lineTo(6, 5); ctx.fill();
    }
    else if (type === 'rhino') {
        drawRoundedRect(ctx, -10, -10, 20, 20, 6);
        ctx.fillStyle = "#eee"; // Horn
        ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(18, -12); ctx.lineTo(10, 0); ctx.fill();
    }
    else if (type === 'bear') {
        drawRoundedRect(ctx, -12, -12, 24, 24, 10);
        // Ears
        ctx.beginPath(); ctx.arc(-10, -12, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(10, -12, 4, 0, Math.PI*2); ctx.fill();
        // Muzzle
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.ellipse(0, 4, 8, 5, 0, 0, Math.PI*2); ctx.fill();
    }
    else if (type === 'monkey') {
        ctx.fillStyle = skin;
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
        // Face Mask
        ctx.fillStyle = "#ecc"; // Pale face
        ctx.beginPath(); ctx.arc(-3, -2, 5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(3, -2, 5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 4, 6, 4, 0, 0, Math.PI*2); ctx.fill();
        // Ears
        ctx.fillStyle = skin;
        ctx.beginPath(); ctx.arc(-12, 0, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(12, 0, 3, 0, Math.PI*2); ctx.fill();
    }
    else if (type === 'bee') {
        ctx.beginPath(); ctx.arc(0, -5, 8, 0, Math.PI*2); ctx.fill();
        // Antennae
        ctx.strokeStyle = "#000"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(-2, -10); ctx.lineTo(-5, -18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(2, -10); ctx.lineTo(5, -18); ctx.stroke();
    }
    else if (type === 'alien' || type === 'robot') {
        ctx.fillStyle = skin;
        // Alien head shape (bulbous top)
        ctx.beginPath(); ctx.moveTo(-8, 5); ctx.quadraticCurveTo(-12, -15, 0, -20); ctx.quadraticCurveTo(12, -15, 8, 5); ctx.fill();
        if(type==='robot') {
             ctx.fillStyle="#0f0"; ctx.fillRect(-5, -5, 10, 4); // Visor
        }
    }
    else {
        // Generic Fallback
        drawRoundedRect(ctx, -10, -10, 20, 20, 6);
    }

    // Eyes (Generic placement if not specific)
    // Some types handled eyes above (frog, croc, robot).
    if (!['frog', 'croc', 'robot', 'snake', 'bee'].includes(type) && !char.name.includes("DARE")) {
        // Offset for side profile animals
        let ex = 2, ey = -4;
        if (['bird', 'chicken', 'duck', 'horse', 'cow', 'wolf', 'fox', 'anteater', 'deer', 'giraffe', 'zebra', 'donkey', 'llama'].includes(type)) {
            ex = 2; ey = -6; // Side view usually
        }
        if (['owl', 'monkey', 'cat', 'lion', 'pig', 'human', 'bear', 'tiger'].includes(type)) {
             // Front view
             drawCartoonEye(ctx, -4, -4, 4, 0.5, 0);
             drawCartoonEye(ctx, 4, -4, 4, 0.5, 0);
        } else {
             // Side/Generic
             drawCartoonEye(ctx, ex, ey, 4, 0.5, 0);
        }
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
        // Biped / Avian
        drawBiped(ctx, char, frame, bob, skin, dark, suit, attackAnim);
    }
}
