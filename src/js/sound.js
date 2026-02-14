export class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.muted = false;
        this.volume = 0.3; // Default volume
        this.initialized = false;

        // Music State
        this.isPlaying = false;
        this.nextNoteTime = 0;
        this.currentBeat = 0;
        this.tempo = 130;
        this.lookahead = 25.0; // ms
        this.scheduleAheadTime = 0.1; // s
        this.timerID = null;

        // Riffs
        this.bassLine = [
            41.2, 41.2, 49.0, 41.2, 55.0, 49.0, 41.2, 36.7, // E1 E1 G1 E1 A1 G1 E1 D1
            41.2, 41.2, 49.0, 41.2, 61.7, 55.0, 49.0, 55.0
        ];
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);

            this.musicGain = this.ctx.createGain();
            this.musicGain.connect(this.masterGain);
            this.musicGain.gain.value = 0.4; // Slightly lower music

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.connect(this.masterGain);
            this.sfxGain.gain.value = 0.6;

            this.updateMuteState();
            this.initialized = true;
            console.log("Audio Context Initialized");
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        this.updateMuteState();
        return this.muted;
    }

    updateMuteState() {
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
        }
    }

    // --- MUSIC SYSTEM ---

    playMusic() {
        if (!this.initialized) this.init();
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.currentBeat = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.scheduler();
    }

    stopMusic() {
        this.isPlaying = false;
        clearTimeout(this.timerID);
    }

    scheduler() {
        if (!this.isPlaying) return;

        // While there are notes that will need to play before the next interval, schedule them
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentBeat, this.nextNoteTime);
            this.nextNote();
        }

        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    nextNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
        this.currentBeat = (this.currentBeat + 1) % 16; // 16 step loop
    }

    scheduleNote(beatNumber, time) {
        // Kick: 1, 9 (1 and 3 in 4/4)
        if (beatNumber === 0 || beatNumber === 8 || beatNumber === 14) {
            this.playKick(time);
        }

        // Snare: 4, 12 (2 and 4 in 4/4)
        if (beatNumber === 4 || beatNumber === 12) {
            this.playSnare(time);
        }

        // HiHat: Every odd 8th
        if (beatNumber % 2 === 0) {
            this.playHiHat(time, beatNumber % 4 === 0 ? 0.1 : 0.05);
        }

        // Bass/Guitar Synth
        // Play on every 8th note (every 2 16ths), follow riff
        if (beatNumber % 2 === 0) {
            let noteIdx = (beatNumber / 2) % this.bassLine.length;
            let freq = this.bassLine[noteIdx];
            this.playBass(time, freq);
        }
    }

    // --- INSTRUMENTS ---

    playKick(time) {
        if(this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    playSnare(time) {
        if(this.muted) return;
        // Noise buffer
        const bufferSize = this.ctx.sampleRate * 0.2; // 200ms
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        const noiseGain = this.ctx.createGain();

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.musicGain);

        noiseGain.gain.setValueAtTime(0.4, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        noise.start(time);

        // Tone underlay
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.connect(oscGain);
        oscGain.connect(this.musicGain);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, time);
        oscGain.gain.setValueAtTime(0.2, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        osc.start(time);
        osc.stop(time + 0.1);
    }

    playHiHat(time, vol) {
        if(this.muted) return;
        // High freqs
        const bufferSize = this.ctx.sampleRate * 0.05;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 5000;

        const gain = this.ctx.createGain();
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        gain.gain.setValueAtTime(vol * 0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        noise.start(time);
    }

    playBass(time, freq) {
        if(this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const dist = this.ctx.createWaveShaper();

        // Simple distortion curve
        function makeDistortionCurve(amount) {
            let k = typeof amount === 'number' ? amount : 50,
            n_samples = 44100,
            curve = new Float32Array(n_samples),
            deg = Math.PI / 180,
            i = 0,
            x;
            for ( ; i < n_samples; ++i ) {
                x = i * 2 / n_samples - 1;
                curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
            }
            return curve;
        };

        dist.curve = makeDistortionCurve(100); // Heavy distortion
        dist.oversample = '4x';

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        // Filter for "palm mute" effect or just tone shaping
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, time);
        filter.frequency.linearRampToValueAtTime(100, time + 0.2); // Envelope

        osc.connect(dist);
        dist.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25); // Short decay

        osc.start(time);
        osc.stop(time + 0.25);
    }

    // --- SFX ---

    play(type) {
        if (!this.initialized) this.init();
        if (this.muted || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(e=>console.error(e));

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.sfxGain);

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
                osc.frequency.setValueAtTime(440, t);
                osc.frequency.setValueAtTime(554, t + 0.1);
                osc.frequency.setValueAtTime(659, t + 0.2);
                osc.frequency.setValueAtTime(880, t + 0.3);

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

export const soundManager = new SoundManager();
