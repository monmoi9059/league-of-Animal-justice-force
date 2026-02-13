// --- INPUT ---
// Keys are now stored in window.playerKeys[0] for P1 (Keyboard)
// We keep window.keys as an alias for backward compatibility (mostly)
// But actually, we should initialize it from state.js or ensure it's linked
if (!window.playerKeys) window.playerKeys = [{}, {}, {}, {}];
window.keys = window.playerKeys[0]; // Alias P1

// Config: [ { type: 'keyboard' }, { type: 'gamepad', index: 0 }, ... ]
window.inputConfig = [null, null, null, null];

window.addEventListener('keydown', e => {
    // Find which player has keyboard
    let pIndex = window.inputConfig.findIndex(c => c && c.type === 'keyboard');
    if (pIndex === -1) {
        // Default to P1 if not assigned yet (or separate Keyboard player)
        // For lobby simplicity, we assume Keyboard is always available for P1 initially or claimable
        // We'll handle assignment in Lobby.
        // For now, update global buffer if P1 is keyboard OR if no one is assigned (default)
        window.playerKeys[0][e.key.toLowerCase()] = true;
    } else {
        window.playerKeys[pIndex][e.key.toLowerCase()] = true;
    }
});
window.addEventListener('keyup', e => {
    let pIndex = window.inputConfig.findIndex(c => c && c.type === 'keyboard');
    if (pIndex !== -1) window.playerKeys[pIndex][e.key.toLowerCase()] = false;
    else window.playerKeys[0][e.key.toLowerCase()] = false;
});

// --- TOUCH CONTROLS ---
(function() {
    const touchMap = {
        'btnUp': 'arrowup',
        'btnDown': 'arrowdown',
        'btnLeft': 'arrowleft',
        'btnRight': 'arrowright',
        'btnJump': ' ',
        'btnShoot': 'z',
        'btnSpecial': 'x',
        'btnSecondary': 'c',
        'btnFlex': 'f'
        // Sprint handled separately
    };

    function setKey(key, state) {
        if (keys[key] !== state) {
            keys[key] = state;
        }
    }

    function handleTouch(id, isDown) {
        const btn = document.getElementById(id);
        if (!btn) return;

        // Sprint Toggle Logic
        if (id === 'btnSprint') {
            if (isDown) { // Only toggle on press
                keys['shift'] = !keys['shift'];
                if (keys['shift']) btn.classList.add('active');
                else btn.classList.remove('active');
            }
            return;
        }

        const key = touchMap[id];
        if (key) {
            setKey(key, isDown);
            if (isDown) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    }

    // Attach listeners
    const allBtnIds = Object.keys(touchMap).concat(['btnSprint']);

    allBtnIds.forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;

        const start = (e) => {
            e.preventDefault();
            handleTouch(id, true);
        };
        const end = (e) => {
            e.preventDefault();
            handleTouch(id, false);
        };

        btn.addEventListener('touchstart', start, {passive: false});
        btn.addEventListener('touchend', end, {passive: false});
        // Mouse fallbacks for testing
        btn.addEventListener('mousedown', start);
        btn.addEventListener('mouseup', end);
        btn.addEventListener('mouseleave', end);
    });

    // Toggle Visibility
    const toggleBtn = document.getElementById('controlsToggle');
    const controlsDiv = document.getElementById('touchControls');

    function updateToggleBtn() {
        if (controlsDiv.style.display === 'none') {
            toggleBtn.style.opacity = '0.5';
        } else {
            toggleBtn.style.opacity = '1';
        }
    }

    if (toggleBtn && controlsDiv) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (controlsDiv.style.display === 'none') {
                controlsDiv.style.display = 'flex';
            } else {
                controlsDiv.style.display = 'none';
            }
            updateToggleBtn();
        });

        // Auto-show on touch devices
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            controlsDiv.style.display = 'flex';
        } else {
            // Hide by default on desktop
            controlsDiv.style.display = 'none';
        }
        updateToggleBtn();
    }
})();

// --- GAMEPAD SUPPORT ---
window.pollGamepad = function() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

    // Store previous state to handle release per player
    if (!window.lastGamepadState) window.lastGamepadState = [{}, {}, {}, {}];

    // Iterate over CONNECTED gamepads, not just 0-3
    for (let i = 0; i < gamepads.length; i++) {
        let gp = gamepads[i];
        if(!gp) continue;

        // Find which player slot owns this gamepad
        let pSlot = window.inputConfig.findIndex(c => c && c.type === 'gamepad' && c.index === gp.index);

        // If not assigned, skip (Lobby handles assignment)
        // EXCEPTION: If we are in-game and strict mode is off, maybe default?
        // No, let's rely on config.
        if (pSlot === -1) continue;

        let pKeys = window.playerKeys[pSlot];
        let pLast = window.lastGamepadState[pSlot];

        if (!pKeys || !pLast) continue;

        const handleBtn = (btnId, key) => {
            let pressed = (gp.buttons[btnId] && gp.buttons[btnId].pressed);

            if (pressed) {
                pKeys[key] = true;
                pLast[key] = true;
            } else {
                if (pLast[key]) {
                    pKeys[key] = false;
                    pLast[key] = false;
                }
            }
        }

        // A (0) -> Jump (Space)
        handleBtn(0, ' ');
        // B (1) -> Special (x)
        handleBtn(1, 'x');
        // X (2) -> Shoot (z)
        handleBtn(2, 'z');
        // Y (3) -> Secondary (c)
        handleBtn(3, 'c');
        // LB (4) -> Sprint
        handleBtn(4, 'shift');
        // RB (5) -> Sprint
        handleBtn(5, 'shift');

        // D-PAD
        handleBtn(12, 'arrowup');
        handleBtn(13, 'arrowdown');
        handleBtn(14, 'arrowleft');
        handleBtn(15, 'arrowright');

        // Axes (Thumbsticks)
        const dz = 0.5;

        // Left Stick X (Axis 0)
        let axisX = gp.axes[0];
        let right = axisX > dz;
        let left = axisX < -dz;

        if(right) { pKeys['arrowright'] = true; pLast['stick_x'] = 1; }
        else if(left) { pKeys['arrowleft'] = true; pLast['stick_x'] = -1; }
        else if(pLast['stick_x']) {
            pKeys['arrowright'] = false;
            pKeys['arrowleft'] = false;
            pLast['stick_x'] = 0;
        }

        // Left Stick Y (Axis 1)
        let axisY = gp.axes[1];
        let down = axisY > dz;
        let up = axisY < -dz;

        if(down) { pKeys['arrowdown'] = true; pLast['stick_y'] = 1; }
        else if(up) { pKeys['arrowup'] = true; pLast['stick_y'] = -1; }
        else if(pLast['stick_y']) {
            pKeys['arrowdown'] = false;
            pKeys['arrowup'] = false;
            pLast['stick_y'] = 0;
        }

        // Start -> Flex (F)
        handleBtn(9, 'f');
    }
};
