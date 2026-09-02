
import { GoogleGenAI, Modality } from "@google/genai";
import { UserProfile, UserRole, VOICES, VoiceKey } from "../types";
import { forceFemaleHindi } from "./geminiService";

const CACHE_VERSION = 'v28_female_natural_voice';

let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentSessionId = 0;

// --- INDEXED DB IMPLEMENTATION ---
const DB_NAME = 'NexaTTSCache';
const STORE_NAME = 'audio_files';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const cacheAudio = async (key: string, base64: string) => {
    try {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(base64, key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.warn("IndexedDB Cache Failed:", e);
    }
};

const getCachedAudio = async (key: string): Promise<string | null> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch (e) {
        return null;
    }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const checkApiKey = () => {
  const customKey = localStorage.getItem('nexa_client_api_key');
  if (customKey && customKey.trim().length > 10) return customKey.trim();

  try {
      const userStr = localStorage.getItem('nexa_user');
      if (userStr) {
          const user = JSON.parse(userStr);
          if (user.role === 'USER') {
               throw new Error("USER_API_KEY_REQUIRED");
          }
      }
  } catch(e: any) {
      if(e.message === "USER_API_KEY_REQUIRED") throw e;
  }
  
  const systemKey = process.env.API_KEY || (process.env as any).GEMINI_API_KEY || (import.meta as any).env?.VITE_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (systemKey && systemKey !== "undefined" && systemKey !== "null" && systemKey.trim() !== '') return systemKey.trim();
  throw new Error("GUEST_ACCESS_DENIED");
};

const initAudioContext = () => {
    if (!audioCtx && typeof window !== 'undefined') {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
};

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodePcmAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const sampleRate = 24000;
  const numChannels = 1;
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

const playAudioBuffer = (buffer: AudioBuffer, sessionId: number, onStart: () => void, onEnd: () => void) => {
    if (!audioCtx || sessionId !== currentSessionId) {
        return;
    }
    
    // Stop any previously playing node immediately
    if (currentSource) {
        try {
            currentSource.onended = null;
            currentSource.stop(0);
            currentSource.disconnect();
        } catch (e) {}
        currentSource = null;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    
    source.onended = () => {
        if (currentSource === source) {
            currentSource = null;
            if (sessionId === currentSessionId) {
                onEnd();
            }
        }
        try { source.disconnect(); } catch (e) {}
    };
    
    currentSource = source;
    if (sessionId === currentSessionId) {
        onStart();
    }
    source.start(0);
};

const generateAndPlay = async (user: UserProfile, text: string, cacheKey: string | null, naughtyModeOverride: boolean, onStart: () => void, onEnd: () => void) => {
    // Increment session ID to cancel any pending or in-flight TTS calls
    stop();
    const mySessionId = currentSessionId;

    initAudioContext();
    if (!audioCtx) {
        if (mySessionId === currentSessionId) onEnd();
        return;
    }
    if (audioCtx.state === 'suspended') {
        try { await audioCtx.resume(); } catch (e) {}
    }
    if (mySessionId !== currentSessionId) return;

    // --- FORCE FEMALE HINDI CORRECTION BEFORE GENERATION ---
    const correctedText = forceFemaleHindi(text);
    if (!correctedText || !correctedText.trim()) {
        if (mySessionId === currentSessionId) onEnd();
        return;
    }

    const currentVoice: VoiceKey = user.voice || 'Aoede'; 
    const voiceData = VOICES[currentVoice];

    if (cacheKey) {
        const fullKey = `${cacheKey}_${currentVoice}_${CACHE_VERSION}`;
        const cachedAudio = await getCachedAudio(fullKey);
        if (cachedAudio) {
            if (mySessionId !== currentSessionId) return;
            try {
                const audioBytes = decodeBase64(cachedAudio);
                const audioBuffer = await decodePcmAudioData(audioBytes, audioCtx);
                if (mySessionId !== currentSessionId) return;
                playAudioBuffer(audioBuffer, mySessionId, onStart, onEnd);
                return;
            } catch (e) { }
        }
    }

    let lastError: any = null;
    const maxRetries = 2; 

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (mySessionId !== currentSessionId) return;
        try {
            const apiKey = checkApiKey();
            const ai = new GoogleGenAI({ apiKey });
            
            // --- PRONUNCIATION FIXES ---
            let pronunciationText = correctedText;
            pronunciationText = pronunciationText.replace(/^Nexa[:\s\-]*/i, '').trim();
            pronunciationText = pronunciationText.replace(/Chandan/gi, "चंदन");
            pronunciationText = pronunciationText.replace(/Lohave/gi, "लोहवे");
            pronunciationText = pronunciationText.replace(/NEXA/gi, "Nexa");
            
            // Bad word filter
            const phoneticMap: {[key: string]: string} = {
                "choot": "चूत", "chut": "चूत", "loda": "लौड़ा", "lauda": "लौड़ा",
                "gaand": "गांड", "gand": "गांड", "fuck": "फक", "sexy": "सैक्सी"
            };

            for (const [key, value] of Object.entries(phoneticMap)) {
                const regex = new RegExp(`\\b${key}\\b`, "gi");
                pronunciationText = pronunciationText.replace(regex, value);
            }

            let voiceStyle = voiceData ? voiceData.style : "Natural, sweet, clear female voice";
            if (naughtyModeOverride) {
                voiceStyle = "Intimate, soft, breathy, sweet female voice.";
            }

            const ttsPrompt = `
            Perform the following text in a realistic, natural female voice.
            TEXT: "${pronunciationText}"
            ROLE: Indian Female Voice.
            INSTRUCTIONS:
            1. VOICE PITCH: Sweet, clear, natural female pitch. NEVER lower the pitch, NEVER sound heavy, deep, or male-like.
            2. ACCENT: Indian English / Hinglish.
            3. GRAMMAR: Ensure Female Gender ("Karti hun", "Sakti hun").
            4. SPEAKING SPEED & PACE: Relaxed, calm, normal conversational pace. DO NOT speak fast or rush like reading a script. Pause naturally at commas and full stops.
            5. TONE: ${voiceStyle}
            `;

            const response = await ai.models.generateContent({
                model: "gemini-3.1-flash-tts-preview",
                contents: [{ parts: [{ text: ttsPrompt }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: currentVoice } } },
                },
            });

            // Check if user requested something else or cancelled while waiting for Gemini API response
            if (mySessionId !== currentSessionId) return;

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("No audio data");

            if (cacheKey) {
                const fullKey = `${cacheKey}_${currentVoice}_${CACHE_VERSION}`;
                cacheAudio(fullKey, base64Audio);
            }

            const audioBytes = decodeBase64(base64Audio);
            const audioBuffer = await decodePcmAudioData(audioBytes, audioCtx);

            if (mySessionId !== currentSessionId) return;

            playAudioBuffer(audioBuffer, mySessionId, onStart, onEnd);
            return; 

        } catch (error: any) {
            lastError = error;
            if (mySessionId !== currentSessionId) return;
            if (attempt < maxRetries) {
                await delay(attempt * 1000);
            } else {
                break;
            }
        }
    }
    
    if (mySessionId === currentSessionId) {
        onEnd();
    }
    if (lastError?.toString().includes('429')) {
        throw new Error("TTS_RATE_LIMIT_EXCEEDED");
    }
};

export const speakIntro = async (user: UserProfile, text: string, cacheKey: string, naughtyModeOverride: boolean, onStart: () => void, onEnd: () => void) => {
    return generateAndPlay(user, text, cacheKey, naughtyModeOverride, onStart, onEnd);
};

export const speak = async (user: UserProfile, text: string, naughtyModeOverride: boolean, onStart: () => void, onEnd: () => void) => {
    return generateAndPlay(user, text, null, naughtyModeOverride, onStart, onEnd);
};

export const speakAgentText = async (
    user: UserProfile,
    text: string,
    voiceKey: VoiceKey,
    voiceGender: 'Male' | 'Female',
    onStart: () => void,
    onEnd: () => void
) => {
    stop();
    const mySessionId = currentSessionId;

    initAudioContext();
    if (!audioCtx) {
        if (mySessionId === currentSessionId) onEnd();
        return;
    }
    if (audioCtx.state === 'suspended') {
        try { await audioCtx.resume(); } catch (e) {}
    }
    if (mySessionId !== currentSessionId) return;

    const safeText = typeof text === 'string' ? text : (typeof (text as any)?.text === 'string' ? (text as any).text : String(text || ""));
    let pronunciationText = safeText.replace(/Chandan/gi, "चंदन").replace(/Lohave/gi, "लोहवे").replace(/NEXA/gi, "Nexa");
    const voiceData = VOICES[voiceKey] || VOICES['Aoede'];

    const voiceInstruction = voiceGender === 'Male' 
        ? `Perform in a confident, clear ${voiceData.description}. Pitch: Male. Tone: ${voiceData.style}`
        : `Perform in a natural, sweet ${voiceData.description}. Pitch: Female. Tone: ${voiceData.style}`;

    const ttsPrompt = `
    TEXT: "${pronunciationText}"
    INSTRUCTIONS:
    1. ${voiceInstruction}
    2. ACCENT & TONE: Highly realistic Indian accent (Hinglish/Hindi). Act like a real human assistant.
    3. DELIVERY: Do not sound like a robotic announcer. Use natural breathing pauses at commas. Speak warmly, naturally, and with conversational fluidity.
    `;

    let lastError: any = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (mySessionId !== currentSessionId) return;
        try {
            const apiKey = checkApiKey();
            const ai = new GoogleGenAI({ apiKey });

            const response = await ai.models.generateContent({
                model: "gemini-3.1-flash-tts-preview",
                contents: [{ parts: [{ text: ttsPrompt }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceKey } } },
                },
            });

            if (mySessionId !== currentSessionId) return;

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) throw new Error("No agent audio data");

            const audioBytes = decodeBase64(base64Audio);
            const audioBuffer = await decodePcmAudioData(audioBytes, audioCtx);

            if (mySessionId !== currentSessionId) return;

            playAudioBuffer(audioBuffer, mySessionId, onStart, onEnd);
            return;
        } catch (e: any) {
            lastError = e;
            console.warn(`Agent TTS error (Attempt ${attempt}):`, e);
            if (mySessionId !== currentSessionId) return;
            if (attempt < maxRetries) {
                await delay(attempt * 1500); // Wait 1.5 seconds before retrying
            }
        }
    }

    console.warn("Agent TTS final failure, falling back to Web Speech:", lastError);
    if (mySessionId !== currentSessionId) return;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = 'hi-IN';
            utter.rate = 0.95;
            utter.pitch = voiceGender === 'Male' ? 0.85 : 1.15;
            utter.onstart = () => { if (mySessionId === currentSessionId) onStart(); };
            utter.onend = () => { if (mySessionId === currentSessionId) onEnd(); };
            utter.onerror = () => { if (mySessionId === currentSessionId) onEnd(); };
            window.speechSynthesis.speak(utter);
            return;
        } catch (err) {
            console.warn("Web Speech failed:", err);
        }
    }
    
    if (mySessionId === currentSessionId) {
        onEnd();
    }
};

export const stop = (): void => {
    currentSessionId++;
    if (currentSource) {
        try {
            currentSource.onended = null;
            currentSource.stop(0);
            currentSource.disconnect();
        } catch (e) {}
        currentSource = null;
    }
};
