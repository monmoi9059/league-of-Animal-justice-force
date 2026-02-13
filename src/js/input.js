// --- INPUT ---
window.keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

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
    const gp = gamepads[0]; // Use first gamepad

    if (!gp) return;

    // Helper to map buttons to keys
    const mapBtn = (btnIndex, keyName) => {
        if (gp.buttons[btnIndex] && gp.buttons[btnIndex].pressed) {
            keys[keyName] = true;
        } else {
            // Only unset if keyboard isn't also pressing it (simple OR logic via existing listeners)
            // Ideally we check previous frame or rely on the fact that keyboard events set it to true
            // But since this runs every frame, we might overwrite keyboard release.
            // Better strategy: We can't easily detect "keyboard pressed" vs "gamepad pressed" without more state.
            // For now, we will SET to true if pressed. If not pressed, we DO NOT set to false,
            // because that would kill keyboard input if gamepad is plugged in but idle.
            // Wait, if I don't set to false, it stays stuck?
            // Yes.
            // Solution: We need separate states or we accept that gamepad overrides.
            // But if I hold 'A' on keyboard, and gamepad button 0 is NOT pressed,
            // if I do `keys[' '] = false`, I kill the keyboard input.

            // Refined Strategy:
            // We use a separate `gamepadKeys` object and merge them?
            // Or we check `keys` status.
            // Actually, standard input handling usually tracks sources.
            // Given the simple `keys` object structure:
            // window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
            // window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

            // If we blindly set false, we break keyboard.
            // If we don't set false, we get stuck keys.

            // Hacky but effective for simple JS:
            // 1. Reset specific gamepad-mapped keys to false at START of poll IF they are not being held by keyboard?
            // We don't know if they are held by keyboard. `keys` just stores true/false.

            // Let's rely on a separate flag object for gamepad state to avoid conflict?
            // No, the game logic reads `keys`.

            // Compromise: We only set to TRUE. We rely on a "reset" phase?
            // No.

            // Correct way for this codebase:
            // We shouldn't clear `keys` because `keyup` handles clearing.
            // BUT gamepad doesn't fire events.
            // So we DO need to manage state.

            // Let's check if the key was set by gamepad last frame? Too complex.

            // Alternative:
            // If gamepad button is pressed -> keys[key] = true.
            // If gamepad button is NOT pressed -> keys[key] = false?? -> BREAKS KEYBOARD.

            // Solution:
            // Maintain a separate `gpKeys` object.
            // Modify game loop to check `keys[k] || gpKeys[k]`.
            // But `keys` is used directly everywhere (player.js, etc).

            // Okay, let's inject `gpKeys` concept into `input.js`.
            // Modify the `keys` object to be a Proxy? Overkill.

            // Let's go with:
            // On every frame, reset gamepad-specific keys in `keys` ONLY if they were set by gamepad?
            // No.

            // Let's modify the Global `keys` object to be derived?
            // Too risky.

            // Safe approach:
            // Create `window.gamepadState = {}`.
            // Poll fills `gamepadState`.
            // In the game loop (main.js), right before `player.update()`, we merge:
            // `effectiveKeys = { ...keys, ...gamepadState }` -> No, `player.update` reads global `keys`.

            // OK, we must modify global `keys`.
            // To avoid breaking keyboard:
            // We assume keyboard events manage `keys`.
            // We ONLY touch `keys` if gamepad input is DETECTED.
            // But releasing a button is an input.

            // Let's use a "dirty" list.
            // If `gamepadState[btn]` was true last frame, and false this frame -> set `keys[btn] = false`.
            // This assumes keyboard user isn't holding it simultaneously. That's an acceptable edge case.
        }
    };

    // Store previous state to handle release
    if (!window.lastGamepadState) window.lastGamepadState = {};

    function handleBtn(btnId, key) {
        let pressed = (gp.buttons[btnId] && gp.buttons[btnId].pressed);

        if (pressed) {
            keys[key] = true;
            window.lastGamepadState[key] = true;
        } else {
            // Only release if WE set it previously
            if (window.lastGamepadState[key]) {
                keys[key] = false;
                window.lastGamepadState[key] = false;
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
    // Threshold
    const dz = 0.5;

    // Left Stick X (Axis 0)
    let axisX = gp.axes[0];
    let right = axisX > dz;
    let left = axisX < -dz;

    if(right) { keys['arrowright'] = true; window.lastGamepadState['stick_x'] = 1; }
    else if(left) { keys['arrowleft'] = true; window.lastGamepadState['stick_x'] = -1; }
    else if(window.lastGamepadState['stick_x']) {
        // Release both to be safe
        keys['arrowright'] = false;
        keys['arrowleft'] = false;
        window.lastGamepadState['stick_x'] = 0;
    }

    // Left Stick Y (Axis 1)
    let axisY = gp.axes[1];
    let down = axisY > dz;
    let up = axisY < -dz;

    if(down) { keys['arrowdown'] = true; window.lastGamepadState['stick_y'] = 1; }
    else if(up) { keys['arrowup'] = true; window.lastGamepadState['stick_y'] = -1; }
    else if(window.lastGamepadState['stick_y']) {
        keys['arrowdown'] = false;
        keys['arrowup'] = false;
        window.lastGamepadState['stick_y'] = 0;
    }

    // Start -> Flex (F)
    handleBtn(9, 'f');
};
