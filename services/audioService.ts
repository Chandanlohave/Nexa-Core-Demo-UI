// A self-contained service for generating UI sound effects using the Web Audio API.

let audioCtx: AudioContext | null = null;
let isInitialized = false;

/**
 * Initializes the AudioContext. Must be called from a user gesture (e.g., click).
 * This is crucial for audio to work on mobile browsers.
 */
const initAudio = () => {
    if (isInitialized || typeof window === 'undefined') return;
    try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        // A common trick to "unlock" the audio context on mobile browsers
        const buffer = audioCtx.createBuffer(1, 1, 22050);
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start(0);
        isInitialized = true;
    } catch (e) {
        console.error("AudioService: Failed to initialize AudioContext.", e);
    }
};

const play = (nodes: (ctx: AudioContext, time: number) => AudioNode[]) => {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const now = audioCtx.currentTime;
    const soundNodes = nodes(audioCtx, now);
    if (soundNodes.length > 0) {
        soundNodes[soundNodes.length-1].connect(audioCtx.destination);
    }
};

export const playStartupSound = () => {
    play((ctx, now) => {
        // Increased duration and gain for a more powerful effect
        const totalDuration = 2.0; 
        const mainGain = ctx.createGain();
        mainGain.gain.setValueAtTime(0, now);
        mainGain.gain.linearRampToValueAtTime(0.35, now + 0.05); // Louder
        mainGain.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration);

        // Layer 1: Arc Reactor Power Hum
        const coreHum = ctx.createOscillator();
        coreHum.type = 'sawtooth';
        coreHum.frequency.setValueAtTime(50, now);
        coreHum.frequency.exponentialRampToValueAtTime(120, now + 1.2); // Longer ramp
        const coreFilter = ctx.createBiquadFilter();
        coreFilter.type = 'lowpass';
        coreFilter.frequency.setValueAtTime(80, now);
        coreFilter.frequency.exponentialRampToValueAtTime(500, now + 1.2);
        coreHum.connect(coreFilter);
        coreFilter.connect(mainGain);

        // Layer 2: Mechanical Servo Clicks
        for (let i = 0; i < 5; i++) { // More clicks
            const clickTime = now + 0.8 + i * 0.1;
            const noise = ctx.createBufferSource();
            const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let j = 0; j < data.length; j++) { data[j] = Math.random() * 2 - 1; }
            noise.buffer = buffer;
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.value = 3000 + i * 500;
            noiseFilter.Q.value = 20;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.3, clickTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, clickTime + 0.05);
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(mainGain);
            noise.start(clickTime);
        }
        
        // Layer 3: System Online Chime
        const onlineChime = ctx.createOscillator();
        onlineChime.type = 'sine';
        onlineChime.frequency.value = getNoteFrequency('A6');
        const chimeGain = ctx.createGain();
        chimeGain.gain.setValueAtTime(0, now + 1.5);
        chimeGain.gain.linearRampToValueAtTime(0.2, now + 1.51);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);
        onlineChime.connect(chimeGain);
        chimeGain.connect(mainGain);
        
        coreHum.start(now);
        coreHum.stop(now + 1.3);
        onlineChime.start(now + 1.5);
        onlineChime.stop(now + 1.9);

        return [mainGain];
    });
};

export const playUserLoginSound = () => {
    play((ctx, now) => {
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        ['G5', 'C6', 'E6'].forEach((note, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = getNoteFrequency(note);
            osc.connect(gainNode);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.15);
        });
        return [gainNode];
    });
};

export const playAdminLoginSound = () => {
    // New, soft, digital chime for "Access Granted"
    play((ctx, now) => {
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.25, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

        // A pleasant, rising arpeggio
        const notes = ['C5', 'E5', 'G5', 'C6'];
        notes.forEach((note, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(getNoteFrequency(note), now);
            
            const oscGain = ctx.createGain();
            oscGain.gain.setValueAtTime(0, now + i * 0.08);
            oscGain.gain.linearRampToValueAtTime(1, now + i * 0.08 + 0.01);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.8);

            osc.connect(oscGain);
            oscGain.connect(gainNode);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 1);
        });
        
        // Subtle digital shimmer effect
        const shimmer = ctx.createOscillator();
        shimmer.type = 'triangle';
        shimmer.frequency.value = getNoteFrequency('G6');
        const shimmerGain = ctx.createGain();
        shimmerGain.gain.setValueAtTime(0, now + 0.3);
        shimmerGain.gain.linearRampToValueAtTime(0.05, now + 0.4);
        shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
        shimmer.connect(shimmerGain);
        shimmerGain.connect(gainNode);
        
        shimmer.start(now + 0.3);
        shimmer.stop(now + 1.2);

        return [gainNode];
    });
};

export const playMicOnSound = () => {
    play((ctx, now) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.1);
        return [gain];
    });
};

export const playMicOffSound = () => {
    play((ctx, now) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.1);
        return [gain];
    });
};

export const playErrorSound = () => {
    // This sound is used for the security alert when switching to admin console.
    play((ctx, now) => {
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        [440, 466.16].forEach(freq => { // A and A# for a dissonant alert sound
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.value = freq;
            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 0.2);
        });
        return [gain];
    });
};


// Helper to get frequencies for notes
const noteFrequencies: { [note: string]: number } = {
    'C4': 261.63,
    'G4': 392.00,
    'C5': 523.25,
    'E5': 659.25,
    'G5': 783.99,
    'A5': 880.00,
    'C6': 1046.50,
    'C#6': 1108.73,
    'E6': 1318.51,
    'F#6': 1479.98,
    'A6': 1760.00,
    'G6': 1567.98,
};

const getNoteFrequency = (note: string): number => {
    return noteFrequencies[note] || 440;
};
