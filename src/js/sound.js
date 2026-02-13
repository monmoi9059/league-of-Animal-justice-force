class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.muted = false;
        this.volume = 0.3; // Default volume
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
            this.initialized = true;
            console.log("Audio Context Initialized");
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
        }
        return this.muted;
    }

    play(type) {
        if (!this.initialized) this.init(); // Auto-init on first play attempt
        if (this.muted || !this.ctx) return;

        // Ensure context is running (browsers suspend it until interaction)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(e => console.error(e));
        }

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        switch (type) {
            case 'jump':
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, t);
                osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                osc.start(t);
                osc.stop(t + 0.1);
                break;

            case 'shoot':
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, t);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
                osc.start(t);
                osc.stop(t + 0.15);
                break;

            case 'enemy_shoot':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, t);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                osc.start(t);
                osc.stop(t + 0.2);
                break;

            case 'explosion':
                // Double oscillator for rumble effect
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, t);
                osc.frequency.exponentialRampToValueAtTime(10, t + 0.4);

                const osc2 = this.ctx.createOscillator();
                osc2.type = 'square';
                osc2.frequency.setValueAtTime(80, t);
                osc2.frequency.exponentialRampToValueAtTime(5, t + 0.4);
                osc2.connect(gain);
                osc2.start(t);
                osc2.stop(t + 0.4);

                gain.gain.setValueAtTime(0.3, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
                osc.start(t);
                osc.stop(t + 0.4);
                break;

            case 'powerup':
                osc.type = 'sine';
                // Arpeggio
                osc.frequency.setValueAtTime(440, t); // A4
                osc.frequency.setValueAtTime(554, t + 0.1); // C#5
                osc.frequency.setValueAtTime(659, t + 0.2); // E5
                osc.frequency.setValueAtTime(880, t + 0.3); // A5

                gain.gain.setValueAtTime(0.1, t);
                gain.gain.linearRampToValueAtTime(0.1, t + 0.3);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
                osc.start(t);
                osc.stop(t + 0.6);
                break;

            case 'hurt':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, t);
                osc.frequency.linearRampToValueAtTime(50, t + 0.2);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                osc.start(t);
                osc.stop(t + 0.2);
                break;

            case 'brick_break':
                // White noise burst or low square wave crumble
                osc.type = 'square';
                osc.frequency.setValueAtTime(100, t);
                osc.frequency.exponentialRampToValueAtTime(20, t + 0.1);

                gain.gain.setValueAtTime(0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                osc.start(t);
                osc.stop(t + 0.1);
                break;
        }
    }
}

// Expose global
window.SoundManager = SoundManager;
