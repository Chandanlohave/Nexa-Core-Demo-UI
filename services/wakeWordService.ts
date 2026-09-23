
// A lightweight, on-device Wake Word listener using Web Speech API.
// This is privacy-focused as it processes audio locally in the browser (on supported engines).

interface WakeWordCallbacks {
    onWake: () => void;
    onError: (e: any) => void;
}

export class WakeWordService {
    private recognition: any = null;
    private isListening: boolean = false;
    private callbacks: WakeWordCallbacks;
    private restartTimer: any = null;
    private keywords = ['nexa', 'hey nexa', 'hello nexa', 'suno nexa', 'hi nexa'];

    constructor(callbacks: WakeWordCallbacks) {
        this.callbacks = callbacks;
        this.init();
    }

    private init() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn("Wake Word: Web Speech API not supported.");
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        if (this.recognition) {
            this.recognition.continuous = true;
            this.recognition.interimResults = false; // We only care about final words
            this.recognition.lang = 'en-IN'; // Optimized for Indian English/Hinglish accent
            
            this.recognition.onresult = (event: any) => {
                const lastResultIndex = event.results.length - 1;
                const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
                
                // console.log("Wake Word Heard:", transcript); // Debugging

                // Check for keywords
                const detected = this.keywords.some(keyword => transcript.includes(keyword));
                
                if (detected) {
                    this.stop(); // Stop listening once triggered to prevent loop
                    this.callbacks.onWake();
                }
            };

            this.recognition.onerror = (event: any) => {
                // Determine if it's a fatal error or just "no speech"
                if (event.error === 'no-speech') {
                    // Ignore, just keep listening (handled by onend)
                } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    this.isListening = false;
                    this.callbacks.onError("Microphone permission denied for Wake Word.");
                } else {
                    // console.warn("Wake Word Error:", event.error);
                }
            };

            this.recognition.onend = () => {
                // Auto-restart if it stops but wasn't manually stopped
                if (this.isListening) {
                   this.restartTimer = setTimeout(() => {
                       try { this.recognition?.start(); } catch(e){}
                   }, 500); 
                }
            };
        }
    }

    public start() {
        if (this.isListening || !this.recognition) return;
        try {
            this.isListening = true;
            this.recognition.start();
        } catch (e) {
            console.warn("Wake Word Start Failed", e);
        }
    }

    public stop() {
        this.isListening = false;
        if (this.restartTimer) clearTimeout(this.restartTimer);
        try {
            this.recognition?.stop();
        } catch (e) {}
    }
}
