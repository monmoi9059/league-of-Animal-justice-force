// --- INPUT ---
const keys = {};
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
