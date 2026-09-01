
import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from "@google/genai";
import { UserProfile, UserRole, VoiceKey } from "../types";
import { getRigidIntro, getCurrentLocation, isUserBhabhi, generateIntroductoryMessage, modifyCodeTool, getFormattedTimeContext, forceFemaleHindi } from "./geminiService";
import { getMemoryForPrompt, getFacts, syncMemoryWithCloud } from "./memoryService";

export const liveControlAppTool: FunctionDeclaration = {
  name: 'controlApp',
  description: 'Control the NEXA visual interface, HUD theme, colors, panels, and highlight squad agents on the 3D core.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: { 
        type: Type.STRING, 
        enum: [
          'THEME_DARK', 
          'THEME_LIGHT', 
          'CHANGE_COLOR', 
          'OPEN_STUDY_HUB', 
          'OPEN_ADMIN_PANEL', 
          'OPEN_SETTINGS', 
          'CLOSE_PANELS', 
          'HIGHLIGHT_AGENT',
          'OPEN_SQUAD_PANEL',
          'INTRODUCE_SQUAD',
          'LOGOUT'
        ], 
        description: 'The specific UI action.' 
      },
      color: { type: Type.STRING, description: 'Target color name if action is CHANGE_COLOR.' },
      agentId: { type: Type.STRING, description: 'Target agent ID for HIGHLIGHT_AGENT (e.g. agent_kronos, agent_cypher, agent_aura, agent_veritas, agent_echo, agent_valkyrie).' }
    },
    required: ['action'],
  },
};

// --- SECURITY DICTIONARIES ---
const TARGET_KEYWORDS = ['chandan', 'chandan sir', 'admin', 'creator', 'boss', 'sir', 'lohave', 'malik', 'owner', 'baap'];
const INSULT_KEYWORDS = [
    'idiot', 'stupid', 'bad', 'useless', 'dumb', 'retard', 'rascal', 'bastard', 'loser', 
    'weak', 'trash', 'shit', 'fuck', 'bitch', 'asshole', 'nonsense', 'crazy', 'mad',
    'gadha', 'bekar', 'pagal', 'kutta', 'kamina', 'harami', 'bhosdike', 'madarchod', 
    'behenchod', 'chutiya', 'ullu', 'saale', 'randi', 'bhadwe', 'lodu', 'lavde', 'gandu',
    'kamine', 'nalayak', 'suar', 'ghatiya', 'teri maa', 'teri behen', 'chut', 'lund', 'jhaatu',
    'bhadwa', 'raand', 'hijde', 'chinal', 'kutti', 'haramkhor'
];

// --- AUDIO HELPERS ---
function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
  return btoa(binary);
}

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
  return bytes;
}

function downsampleTo16k(input: Float32Array, inputRate: number): Int16Array {
    if (inputRate === 16000) {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
    }
    const ratio = inputRate / 16000;
    const newLength = Math.ceil(input.length / ratio);
    const result = new Int16Array(newLength);
    let offsetResult = 0;
    let offsetInput = 0;
    while (offsetResult < newLength) {
        const nextOffsetInput = Math.floor((offsetResult + 1) * ratio);
        let accum = 0; let count = 0;
        for (let i = offsetInput; i < nextOffsetInput && i < input.length; i++) { accum += input[i]; count++; }
        const val = count > 0 ? accum / count : 0;
        const s = Math.max(-1, Math.min(1, val));
        result[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        offsetResult++; offsetInput = nextOffsetInput;
    }
    return result;
}

async function decodePcmAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const sampleRate = 24000;
  const numChannels = 1;
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) { channelData[i] = dataInt16[i * numChannels + channel] / 32768.0; }
  }
  return buffer;
}

interface LiveSessionCallbacks {
  onTranscriptionUpdate: (input: string, output: string) => void;
  onTurnComplete: (finalInput: string, finalOutput: string) => void;
  onStateChange: (state: 'connecting' | 'open' | 'closed' | 'error') => void;
  onSecurityBreach: (offendingText: string) => void;
  onAdminInsultReported: (transcript: string) => void;
  onAction: (action: string, params: any) => void;
  onAudioData: (data: { vol: number, bass: number, mid: number, treble: number }) => void;
  onLogout: (response: string) => void; 
}

export class LiveSessionManager {
  private user: UserProfile;
  private naughtyMode: boolean;
  private callbacks: LiveSessionCallbacks;
  
  private session: any | null = null;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  
  private outputAudioQueue: { buffer: AudioBuffer, startTime: number }[] = [];
  private nextAudioStartTime = 0;
  private isPlaying = false;
  private activeAudioSources = new Set<AudioBufferSourceNode>();
  
  private currentInputTranscription = '';
  private currentOutputTranscription = '';
  private breachDetectedThisTurn = false;
  private isCodingTurn = false;
  private videoInterval: number | null = null;
  private analysisInterval: number | null = null;
  private currentInputLevel = 0;
  private isStopping = false; 
  private BUFFER_THRESHOLD = 1; 
  private isBuffering = false;
  private reconnectAttempts = 0;
  private framesSent = 0;
  private isExternalSpeechActive = false;
  
  constructor(user: UserProfile, naughtyModeOverride: boolean, callbacks: LiveSessionCallbacks) {
    this.user = user;
    this.naughtyMode = naughtyModeOverride;
    this.callbacks = callbacks;
  }

  public pauseAudioForExternalSpeech(): void {
    this.isExternalSpeechActive = true;
    this.interruptPlayback();
  }

  public resumeAudioAfterExternalSpeech(): void {
    this.isExternalSpeechActive = false;
    this.interruptPlayback();
  }

  public async updateVoice(voice: VoiceKey) {
    this.user.voice = voice;
    if (this.session) {
      try {
        this.session.close();
      } catch (e) {}
      this.session = null;
      this.sessionPromise = null;
      await this.connect();
    }
  }
  
  private checkApiKey = () => {
    const customKey = localStorage.getItem('nexa_client_api_key');
    if (customKey && customKey.trim().length > 10) return customKey.trim();

    try {
        const userStr = localStorage.getItem('nexa_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            const isVip = isUserBhabhi(user);
            if (user.role === 'USER' && !isVip) throw new Error("USER_API_KEY_REQUIRED");
        }
    } catch(e: any) {
        if(e.message === "USER_API_KEY_REQUIRED") throw e;
    }

    const systemKey = process.env.API_KEY || (process.env as any).GEMINI_API_KEY || (import.meta as any).env?.VITE_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (systemKey && systemKey !== "undefined" && systemKey !== "null" && systemKey.trim() !== '') return systemKey.trim();
    throw new Error("GUEST_ACCESS_DENIED");
  };

  private async buildSystemInstruction(): Promise<string> {
    const rigidIntro = getRigidIntro(this.user, true).replace(/Lohave/gi, "लोहवे").replace(/Chandan/gi, "चंदन"); 
    const timeContext = getFormattedTimeContext();
    
    let memoryContext = "";
    try {
        const recentHistory = await getMemoryForPrompt(this.user);
        const historyMessages = recentHistory.slice(-35);
        if (historyMessages.length > 0) {
            const historyText = historyMessages.map(h => { 
                const role = h.role === 'user' ? (this.user.name || 'USER') : 'NEXA';
                const text = h.parts[0]?.text || '';
                return `${role}: ${text}`; 
            }).join('\n');
            memoryContext = `**PAST CONVERSATION HISTORY & FULL RECENT DIALOGUE (CRITICAL MEMORY BANK):**\n${historyText}`;
        }
    } catch (e) {}

    let userFactsContext = "";
    try {
        const facts = getFacts(this.user);
        if (facts.length > 0) {
            userFactsContext = `**SAVED USER FACTS & BEHAVIOR PREFERENCES:**\n` + facts.map(f => `- ${f.content}`).join('\n');
        }
    } catch (e) {}

    let instruction = `
    ${rigidIntro}
    ${timeContext}
    ${userFactsContext}
    ${memoryContext}
    
    **MEMORY PROTOCOL (NON-NEGOTIABLE):**
    1. You have full access to PAST CONVERSATION HISTORY above.
    2. Remember everything discussed 5, 10, 20, or 30 minutes ago.
    3. NEVER say you forgot or don't know what was discussed earlier in the session or in previous conversations.
    
    **VISION PROTOCOL (CRITICAL):**
    1. **IMAGE DETECTION:** If you receive an image stream, ANALYZE IT INSTANTLY.
    2. **DESCRIPTION:** Be natural. "Mujhe dikh raha hai ki...", "Ye toh ek...", "Aapke saamne...".
    3. **NO HALLUCINATION:** If it's dark or unclear, say "Thoda andhera hai" or "Clear nahi dikh raha". Do not make things up.
    
    **GENDER & VOICE PROTOCOL (NON-NEGOTIABLE):**
    1. **YOU ARE FEMALE.** Your voice is sweet, clear, natural female (${this.user.voice || 'Aoede'}).
    2. **GRAMMAR:** ALWAYS use female grammar ("Karti hoon", "Sakti hoon", "Jaungi", "Dekhungi"). NEVER use male grammar ("Karta hoon", "Sakta hoon").
    
    **SQUAD & AGENT INTRO PROTOCOL (LIVE REALTIME API):**
    When Chandan Sir or the user asks to introduce your squad, team, or agents (e.g., 'apne squad ka intro de', 'squad intro', 'introduce your team', 'agents se milwao', 'kaun kaun se agent hain'):
    1. DO NOT speak! DO NOT introduce the squad members yourself! DO NOT say "Bilkul Chandan Sir"!
    2. Respond SILENTLY by IMMEDIATELY calling the tool 'controlApp' with 'action="INTRODUCE_SQUAD"'.
    3. The system will handle the local TTS for both you and your agents. You must just trigger the tool. THIS IS MANDATORY!

    **NATURAL CONVERSATIONAL PACE & STYLE:**
    1. Speak calmly, warmly, and naturally like a real human friend sitting next to the user.
    2. Do NOT speak too fast. Do NOT read like a script or a robot.
    3. Keep answers concise, sweet, and interactive. Use short sentences with proper punctuation (commas, full stops) so speech synthesis has natural pauses.
    4. Follow all specified user behavior preferences and facts strictly.

    **PRONUNCIATION:**
    - Read Hinglish as Hindi. "Sahi" -> "सही", "Kya" -> "क्या".
    `;

    return instruction;
  }

  public sendText(text: string): void {
      if (this.sessionPromise) {
          this.sessionPromise.then(session => {
              try {
                  if (session && typeof session.send === 'function') {
                      session.send({ parts: [{ text: text }] });
                  }
              } catch(e) {}
          }).catch(e => {});
      }
  }

  public async start(): Promise<void> {
    if (this.isStopping) return;
    this.callbacks.onStateChange('connecting');
    this.reconnectAttempts = 0;
    await this.connect();
  }

  private async connect(): Promise<void> {
    try {
        const apiKey = this.checkApiKey();
        const ai = new GoogleGenAI({ apiKey });
        
        const systemInstruction = await this.buildSystemInstruction();

        if (!this.inputAudioContext) {
            this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.inputAudioContext.state === 'suspended') {
            await this.inputAudioContext.resume();
        }

        if (!this.outputAudioContext) {
            this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.outputAudioContext.state === 'suspended') {
            await this.outputAudioContext.resume();
        }
        
        if (!this.outputAnalyser && this.outputAudioContext) {
            this.outputAnalyser = this.outputAudioContext.createAnalyser();
            this.outputAnalyser.fftSize = 512; 
            this.outputAnalyser.smoothingTimeConstant = 0.5;
            this.outputAnalyser.connect(this.outputAudioContext.destination);
            this.startLevelMonitoring();
        }
        
        const voiceName = this.user.voice || 'Aoede';

        this.sessionPromise = ai.live.connect({
            model: 'gemini-3.1-flash-live-preview',
            config: {
                systemInstruction: systemInstruction,
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: { languageCodes: ['en-IN'] },
                outputAudioTranscription: { languageCodes: ['en-IN'] },
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
                tools: [{ functionDeclarations: [liveControlAppTool, modifyCodeTool] }]
            },
            callbacks: {
                onopen: this.handleSessionOpen.bind(this),
                onmessage: this.handleSessionMessage.bind(this),
                onerror: this.handleSessionError.bind(this),
                onclose: this.handleSessionClose.bind(this),
            },
        });
        this.session = await this.sessionPromise;
    } catch (error: any) {
        if (this.isStopping) return;
        this.reconnectAttempts++;
        if (this.reconnectAttempts > 3) {
            this.callbacks.onStateChange('error');
            return;
        }
        setTimeout(() => this.connect(), 2000);
    }
  }

  private interruptPlayback() {
      this.activeAudioSources.forEach(source => {
          try { source.stop(); source.disconnect(); } catch(e) {}
      });
      this.activeAudioSources.clear();
      this.outputAudioQueue = [];
      this.isPlaying = false;
      this.isBuffering = false;
      if (this.outputAudioContext) {
          this.nextAudioStartTime = this.outputAudioContext.currentTime;
      }
  }

  public stop(): void {
    if (this.isStopping) return;
    this.isStopping = true;
    
    this.callbacks.onStateChange('closed');
    this.stopVideo(); 
    if(this.analysisInterval) { clearInterval(this.analysisInterval); this.analysisInterval = null; }
    this.interruptPlayback();
    
    if (this.scriptProcessor) { this.scriptProcessor.disconnect(); this.scriptProcessor.onaudioprocess = null; this.scriptProcessor = null; }
    if (this.mediaStreamSource) { this.mediaStreamSource.disconnect(); this.mediaStreamSource = null; }
    if (this.mediaStream) { this.mediaStream.getTracks().forEach(t => { t.stop(); t.enabled = false; }); this.mediaStream = null; }
    if (this.session) { try { this.session.close(); } catch (e) {} this.session = null; }
    this.sessionPromise = null;
    
    setTimeout(() => { this.isStopping = false; }, 1000);
  }

  public startVideo(videoEl: HTMLVideoElement) {
      if (this.videoInterval) return;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      this.framesSent = 0;

      // OPTIMIZED VIDEO STREAMING: 600px width limit, 1000ms interval for stable transmission
      this.videoInterval = window.setInterval(() => {
          if (!ctx || videoEl.paused || videoEl.ended || videoEl.videoWidth === 0) return;
          
          const MAX_WIDTH = 600; // Lower resolution for faster transmission
          const scale = Math.min(1, MAX_WIDTH / videoEl.videoWidth);
          
          canvas.width = videoEl.videoWidth * scale;
          canvas.height = videoEl.videoHeight * scale;
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          
          const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
          
          if(this.sessionPromise) {
              this.sessionPromise.then(s => {
                  s.sendRealtimeInput({ video: { mimeType: 'image/jpeg', data: base64 } });
                  this.framesSent++;
              }).catch(()=>{});
          }
      }, 1000); 
  }

  public stopVideo() {
      if (this.videoInterval) { clearInterval(this.videoInterval); this.videoInterval = null; }
  }

  private startLevelMonitoring() {
      if (!this.outputAnalyser) return;
      const bufferLength = this.outputAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      this.analysisInterval = window.setInterval(() => {
          this.outputAnalyser!.getByteFrequencyData(dataArray);
          let sum = 0;
          for(let i = 0; i < bufferLength; i++) { sum += dataArray[i]; }
          const avg = (sum / bufferLength) / 255;
          this.callbacks.onAudioData({ vol: avg, bass: avg, mid: avg, treble: avg });
          this.currentInputLevel *= 0.8; 
      }, 50);
  }

  private async handleSessionOpen(): Promise<void> {
    this.callbacks.onStateChange('open'); 
    this.reconnectAttempts = 0;
    
    if (!this.inputAudioContext) return;
    try {
        if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
        
        if (!this.mediaStream) {
             this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        }
        
        if (!this.mediaStreamSource) {
             this.mediaStreamSource = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
        }
        
        if (!this.scriptProcessor) {
             this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
             this.scriptProcessor.onaudioprocess = (event) => {
                if (!this.sessionPromise || !this.inputAudioContext) return;
                const inputData = event.inputBuffer.getChannelData(0);
                
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) { sum += inputData[i] * inputData[i]; }
                this.currentInputLevel = Math.sqrt(sum / inputData.length) * 5; 
                
                if (this.currentInputLevel < 0.015) { inputData.fill(0); }
                
                const pcm16 = downsampleTo16k(inputData, this.inputAudioContext.sampleRate);
                const base64Pcm = encodeBase64(new Uint8Array(pcm16.buffer));
                this.sessionPromise.then(s => s.sendRealtimeInput({ audio: { data: base64Pcm, mimeType: 'audio/pcm;rate=16000' } })).catch(()=>{});
            };
            this.mediaStreamSource.connect(this.scriptProcessor);
            this.scriptProcessor.connect(this.inputAudioContext.destination);
        }
    } catch(e) { console.error("Audio Stream Error", e); }
  }
  
  private async handleSessionMessage(message: LiveServerMessage): Promise<void> {
      if (message.serverContent?.inputTranscription) {
          let text = message.serverContent.inputTranscription.text;
          if (text) {
              text = text.replace(/alexa/gi, "Nexa");
              this.currentInputTranscription += text;
              if (text.trim().length > 0) { this.interruptPlayback(); }
          }
          this.callbacks.onTranscriptionUpdate(this.currentInputTranscription, this.currentOutputTranscription);
          
          const lowerText = this.currentInputTranscription.toLowerCase();
          
          if (lowerText.includes('logout') || lowerText.includes('stop session')) {
             this.callbacks.onLogout("Session closing.");
             this.stop(); 
             return;
          }

          if ((lowerText.includes('squad') || lowerText.includes('agent') || lowerText.includes('team')) && (lowerText.includes('intro') || lowerText.includes('milwa') || lowerText.includes('bata') || lowerText.includes('introduce'))) {
             this.pauseAudioForExternalSpeech();
             this.callbacks.onAction('INTRODUCE_SQUAD', {});
             this.currentInputTranscription = '';
             return;
          }
      }

      if (message.serverContent?.interrupted) { 
          this.interruptPlayback(); 
          this.callbacks.onAction('HIGHLIGHT_AGENT', { agentId: null });
          return; 
      }

      if (message.toolCall?.functionCalls) {
          for (const fc of message.toolCall.functionCalls) {
              if (fc.name === 'controlApp') {
                  const args = fc.args as any;
                  if (args.action === 'INTRODUCE_SQUAD') {
                      this.pauseAudioForExternalSpeech();
                  }
                  this.callbacks.onAction(args.action, args);
                  if (this.sessionPromise) {
                      this.sessionPromise.then(s => {
                          s.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: "OK" } }] });
                      });
                  }
              }
          }
      }

      if (this.isExternalSpeechActive) {
          // Drop streaming audio chunks while individual squad agents speak via dedicated TTS
          return;
      }

      if (message.serverContent?.outputTranscription) {
          const rawText = message.serverContent.outputTranscription.text;
          if (rawText) {
              const fixedText = forceFemaleHindi(rawText);
              this.currentOutputTranscription += fixedText;
              this.callbacks.onTranscriptionUpdate(this.currentInputTranscription, this.currentOutputTranscription);
              
              // Real-time Agent Spotlighting on 3D Hologram as Live Voice Mentions Each Member
              const upper = rawText.toUpperCase();
              if (upper.includes('KRONOS')) {
                  this.callbacks.onAction('HIGHLIGHT_AGENT', { agentId: 'agent_kronos' });
              } else if (upper.includes('CYPHER')) {
                  this.callbacks.onAction('HIGHLIGHT_AGENT', { agentId: 'agent_cypher' });
              } else if (upper.includes('AURA')) {
                  this.callbacks.onAction('HIGHLIGHT_AGENT', { agentId: 'agent_aura' });
              } else if (upper.includes('VERITAS')) {
                  this.callbacks.onAction('HIGHLIGHT_AGENT', { agentId: 'agent_veritas' });
              } else if (upper.includes('ECHO')) {
                  this.callbacks.onAction('HIGHLIGHT_AGENT', { agentId: 'agent_echo' });
              } else if (upper.includes('VALKYRIE')) {
                  this.callbacks.onAction('HIGHLIGHT_AGENT', { agentId: 'agent_valkyrie' });
              }
          }
      }

      if (message.serverContent?.modelTurn?.parts && this.outputAudioContext) {
          for (const part of message.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                  const audioBytes = decodeBase64(part.inlineData.data);
                  const audioBuffer = await decodePcmAudioData(audioBytes, this.outputAudioContext);
                  this.queueAudio(audioBuffer);
              }
          }
      }
      
      if (message.serverContent?.turnComplete) {
          this.callbacks.onTurnComplete(this.currentInputTranscription, this.currentOutputTranscription);
          this.currentInputTranscription = ''; this.currentOutputTranscription = '';
      }
  }

  private handleSessionError(error: any): void {
      console.warn("Gemini Live Session event:", error);
      if (!this.isStopping) {
          this.callbacks.onStateChange('error');
      }
  }

  private handleSessionClose(event: CloseEvent): void {
      if (this.isStopping) {
          this.callbacks.onStateChange('closed');
      } else {
          if (this.reconnectAttempts < 5) { setTimeout(() => this.connect(), 200); } 
          else { this.callbacks.onStateChange('error'); }
      }
  }
  
  private queueAudio(buffer: AudioBuffer): void {
      if (!this.outputAudioContext || !this.outputAnalyser) return;
      const currentTime = this.outputAudioContext.currentTime;
      
      // Ensure smooth continuous playback timing without buffer gaps or overlaps
      if (this.nextAudioStartTime < currentTime) {
          this.nextAudioStartTime = currentTime + 0.05;
      }
      
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.outputAnalyser); 
      source.start(this.nextAudioStartTime);
      this.nextAudioStartTime += buffer.duration;
      
      this.activeAudioSources.add(source);
      source.onended = () => {
          try { source.disconnect(); } catch (e) {}
          this.activeAudioSources.delete(source);
      };
  }
}
