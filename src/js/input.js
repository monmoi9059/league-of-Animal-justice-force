import { playerKeys, gameState } from './state.js';

// Config: [ { type: 'keyboard' }, { type: 'gamepad', index: 0 }, ... ]
export const inputConfig = [null, null, null, null];

let lastGamepadState = [{}, {}, {}, {}];

export function initInput() {
    window.addEventListener('keydown', e => {
        // Find which player has keyboard
        let pIndex = inputConfig.findIndex(c => c && c.type === 'keyboard');
        if (pIndex === -1) {
            // Default to P1 if not assigned yet
            playerKeys[0][e.key.toLowerCase()] = true;
        } else {
            playerKeys[pIndex][e.key.toLowerCase()] = true;
        }
    });

    window.addEventListener('keyup', e => {
        let pIndex = inputConfig.findIndex(c => c && c.type === 'keyboard');
        if (pIndex !== -1) playerKeys[pIndex][e.key.toLowerCase()] = false;
        else playerKeys[0][e.key.toLowerCase()] = false;
    });

    setupTouchControls();
}

function setupTouchControls() {
    const actionMap = {
        'btnJump': ' ',
        'btnShoot': 'z',
        'btnSpecial': 'x',
        'btnSecondary': 'c',
        'btnFlex': 'f'
        // Sprint handled separately
    };

    function setKey(key, state) {
        // Assume touch is always P1
        if (playerKeys[0][key] !== state) {
            playerKeys[0][key] = state;
        }
    }

    // --- JOYSTICK LOGIC ---
    const joystickArea = document.getElementById('joystick-area');
    const joystickStick = document.getElementById('joystick-stick');
    let joystickTouchId = null;
    let joystickCenter = { x: 0, y: 0 };
    const maxRadius = 30; // Max distance the stick can move visually

    if (joystickArea && joystickStick) {
        const handleJoystickStart = (e) => {
            e.preventDefault();
            const touch = e.changedTouches ? e.changedTouches[0] : e;
            joystickTouchId = touch.identifier;

            // Get center relative to viewport
            const rect = joystickArea.getBoundingClientRect();
            joystickCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };

            updateJoystick(touch.clientX, touch.clientY);
        };

        const handleJoystickMove = (e) => {
            e.preventDefault();
            if (joystickTouchId === null && !e.changedTouches) return; // Mouse check

            let clientX, clientY;
            if (e.changedTouches) {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === joystickTouchId) {
                        clientX = e.changedTouches[i].clientX;
                        clientY = e.changedTouches[i].clientY;
                        break;
                    }
                }
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            if (clientX !== undefined) {
                updateJoystick(clientX, clientY);
            }
        };

        const handleJoystickEnd = (e) => {
            e.preventDefault();
            let shouldEnd = false;
            if (e.changedTouches) {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === joystickTouchId) {
                        shouldEnd = true;
                        break;
                    }
                }
            } else {
                shouldEnd = true;
            }

            if (shouldEnd) {
                joystickTouchId = null;
                resetJoystick();
            }
        };

        function updateJoystick(x, y) {
            let dx = x - joystickCenter.x;
            let dy = y - joystickCenter.y;
            let distance = Math.sqrt(dx*dx + dy*dy);

            // Clamp visual movement
            if (distance > maxRadius) {
                let angle = Math.atan2(dy, dx);
                dx = Math.cos(angle) * maxRadius;
                dy = Math.sin(angle) * maxRadius;
            }

            joystickStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

            // Input Mapping (Threshold based)
            // Normalized direction
            let ndx = dx / maxRadius; // -1 to 1
            let ndy = dy / maxRadius; // -1 to 1
            const threshold = 0.3;

            setKey('arrowright', ndx > threshold);
            setKey('arrowleft', ndx < -threshold);
            setKey('arrowdown', ndy > threshold);
            setKey('arrowup', ndy < -threshold);
        }

        function resetJoystick() {
            joystickStick.style.transform = `translate(-50%, -50%)`;
            setKey('arrowright', false);
            setKey('arrowleft', false);
            setKey('arrowdown', false);
            setKey('arrowup', false);
        }

        joystickArea.addEventListener('touchstart', handleJoystickStart, {passive: false});
        joystickArea.addEventListener('touchmove', handleJoystickMove, {passive: false});
        joystickArea.addEventListener('touchend', handleJoystickEnd, {passive: false});
        joystickArea.addEventListener('touchcancel', handleJoystickEnd, {passive: false});

        // Mouse Fallbacks for testing
        joystickArea.addEventListener('mousedown', handleJoystickStart);
        window.addEventListener('mousemove', (e) => {
            if (joystickTouchId !== null && !e.touches) handleJoystickMove(e);
        });
        window.addEventListener('mouseup', (e) => {
            if (joystickTouchId !== null && !e.touches) handleJoystickEnd(e);
        });
    }

    // --- ACTION BUTTON LOGIC ---
    function handleBtn(id, isDown) {
        const btn = document.getElementById(id);
        if (!btn) return;

        // Sprint Toggle Logic
        if (id === 'btnSprint') {
            if (isDown) { // Only toggle on press
                playerKeys[0]['shift'] = !playerKeys[0]['shift'];
                if (playerKeys[0]['shift']) btn.classList.add('active');
                else btn.classList.remove('active');
            }
            return;
        }

        const key = actionMap[id];
        if (key) {
            setKey(key, isDown);
            if (isDown) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    }

    const actionIds = Object.keys(actionMap).concat(['btnSprint']);
    actionIds.forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;

        const start = (e) => {
            e.preventDefault();
            handleBtn(id, true);
        };
        const end = (e) => {
            e.preventDefault();
            handleBtn(id, false);
        };

        btn.addEventListener('touchstart', start, {passive: false});
        btn.addEventListener('touchend', end, {passive: false});
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
                gameState.zoom = 0.5; // Zoom out
            } else {
                controlsDiv.style.display = 'none';
                gameState.zoom = 1.0; // Reset
            }
            updateToggleBtn();
        });

        // Auto-show on touch devices
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            controlsDiv.style.display = 'flex';
            gameState.zoom = 0.5;
        } else {
            // Hide by default on desktop
            controlsDiv.style.display = 'none';
            gameState.zoom = 1.0;
        }
        updateToggleBtn();
    }
}

// --- GAMEPAD SUPPORT ---
export function pollGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

    // Iterate over CONNECTED gamepads, not just 0-3
    for (let i = 0; i < gamepads.length; i++) {
        let gp = gamepads[i];
        if(!gp) continue;

        // Find which player slot owns this gamepad
        let pSlot = inputConfig.findIndex(c => c && c.type === 'gamepad' && c.index === gp.index);

        // If not assigned, skip (Lobby handles assignment)
        if (pSlot === -1) continue;

        let pKeys = playerKeys[pSlot];
        let pLast = lastGamepadState[pSlot];

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
