
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Auth from './components/Auth';
import HUD from './components/HUD';
import ChatPanel from './components/ChatPanel';
import AdminPanel from './components/AdminPanel';
import UserSettingsPanel from './components/UserSettingsPanel';
import StudyHubPanel from './components/StudyHubPanel';
import ManageAccountsModal from './components/ManageAccountsModal';
import { GestureController, GestureData } from './components/GestureController';
import { UserProfile, UserRole, HUDState, ChatMessage, AppConfig, StudyHubSubject, ActionType, VoiceKey, Reminder } from './types';
import { generateTextResponse, generateTutorLesson, generateImageContent, generateVideoContent, editImageContent, isUserBhabhi, generateTopicContent, generateIntroductoryMessage } from './services/geminiService';
import { playMicOnSound, playErrorSound, playAdminLoginSound } from './services/audioService';
import { appendMessageToMemory, clearAllMemory, clearAdminNotifications, getLocalMessages, logAdminNotification, syncUserProfile, fetchSystemConfig, syncMemoryWithCloud, getAdminNotifications, getUserProfile, syncFamilyTree } from './services/memoryService';
import { speak as speakTextTTS, stop as stopTextTTS } from './services/ttsService';
import { LiveSessionManager } from './services/liveService';
import { analyzeSystemError, RepairPlan } from './services/selfRepairService';
import { identifyTargetFile, fetchFileContent, generateCodePatch, pushToGithub, getRobustGithubConfig, revertLastChange } from './services/githubService';

// --- ICONS ---
const GearIcon = () => ( <svg className="w-5 h-5 text-nexa-cyan/80 dark:hover:text-white hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 00-1.065 2.572c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573 1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 001.065-2.572c-.94-1.543.826 3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );
const LogoutIcon = () => ( <svg className="w-5 h-5 text-nexa-cyan/80 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );
const StudyIcon = () => ( <svg className="w-5 h-5 text-nexa-blue/80 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> );
const KeyboardIcon = () => ( <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /><path d="M20 12H4" /></svg> );
const SendIcon = () => ( <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg> );
const CameraIcon = () => ( <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );
const EyeIcon = () => ( <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> );
const EyeOffIcon = () => ( <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> );
const BoltIcon = () => ( <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> );

const MicIcon = ({ rotationDuration = '8s' }: { rotationDuration?: string }) => (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="coreGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%"><stop offset="0%" stopColor="currentColor" /><stop offset="100%" stopColor="#0077ff" /></radialGradient></defs>
      <g style={{ transformOrigin: 'center', animation: `spin ${rotationDuration} linear infinite` }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="5.85 2" transform="rotate(-11.25 12 12)" /></g>
      <circle cx="12" cy="12" r="8" stroke="rgba(0,0,0,0.7)" strokeWidth="0.5" />
      <circle cx="12" cy="12" r="7.75" fill="url(#coreGradient)" />
    </svg>
);

const StatusBar = ({ userName, userRole, onLogout, onSettings, latency, onStudyHub, isOffline }: any) => (
    <div className="w-full shrink-0 flex justify-between items-center px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-2 min-h-[64px] border-b border-zinc-200 dark:border-nexa-cyan/10 bg-white/80 dark:bg-black/80 backdrop-blur-md z-40 relative">
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-start">
                <div className="text-[10px] text-nexa-cyan font-mono tracking-widest uppercase">{userName}</div>
                <div className="flex gap-1 mt-1"><div className="w-8 h-1 bg-nexa-cyan shadow-[0_0_5px_currentColor]"></div><div className="w-2 h-1 bg-nexa-cyan/50"></div><div className="w-1 h-1 bg-nexa-cyan/20"></div></div>
            </div>
            {isOffline ? (
                <div className="text-[9px] font-mono text-red-500 border-l border-red-500 pl-4 animate-pulse">OFFLINE MODE</div>
            ) : (
                latency !== null && (<div className="hidden sm:block text-[9px] font-mono text-zinc-500 dark:text-nexa-cyan/60 border-l border-zinc-200 dark:border-nexa-cyan/20 pl-4">API LATENCY: <span className="text-zinc-800 dark:text-white">{latency}ms</span></div>)
            )}
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none mt-[env(safe-area-inset-top)]"><div className="text-xl font-bold tracking-[0.3em] text-zinc-900 dark:text-white/90 drop-shadow-[0_0_10px_rgba(41,223,255,0.5)]">NEXA</div></div>
        <div className="flex items-center gap-4">
            <button onClick={onStudyHub} className="p-2 hover:bg-zinc-200 dark:hover:bg-nexa-blue/20 rounded-full transition-colors group relative">
                <StudyIcon />
                <span className="absolute -bottom-8 right-0 text-[9px] font-mono bg-nexa-blue text-black px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">STUDY BUDDY</span>
            </button>
            <button onClick={onSettings} className="p-2 hover:bg-zinc-200 dark:hover:bg-nexa-cyan/10 rounded-full transition-colors relative group">
                <GearIcon />
                {userRole === UserRole.ADMIN && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                )}
            </button>
            <button onClick={onLogout} className="p-2 hover:bg-red-500/10 rounded-full transition-colors"><LogoutIcon /></button>
        </div>
    </div>
);

const ControlDeck = ({ onMicClick, hudState, rotationSpeedMultiplier = 1, inputMode, onInputModeChange, textInput, onTextInputChange, onTextSubmit, textInputPlaceholder, onFileUpload, isLive, isCameraActive, onToggleCamera, showChat, pendingFile, onToggleTorch, isTorchOn }: any) => {
    const isListening = hudState === HUDState.LISTENING, isWarning = hudState === HUDState.WARNING, isThinking = hudState === HUDState.THINKING, isIdle = hudState === HUDState.IDLE, isSpeaking = hudState === HUDState.SPEAKING, isStudyHub = hudState === HUDState.STUDY_HUB, isLiveMode = hudState === HUDState.LIVE, isWatching = hudState === HUDState.WATCHING, isGenerating = hudState === HUDState.GENERATING, isRepairing = hudState === HUDState.REPAIRING, isCoding = hudState === HUDState.CODING, isGlitch = hudState === HUDState.GLITCH;
    let baseDuration = isThinking ? 2 : (isSpeaking || isListening || isLiveMode) ? 4 : isWarning ? 1 : isStudyHub ? 6 : 8;
    // Safety check for multiplier
    const safeMultiplier = (rotationSpeedMultiplier && rotationSpeedMultiplier > 0) ? rotationSpeedMultiplier : 1;
    const finalDuration = `${baseDuration / safeMultiplier}s`;
    
    const buttonScale = isListening || isWarning || isThinking || isLiveMode || isGenerating || isRepairing || isCoding || isGlitch ? 'scale-110' : 'hover:scale-105 active:scale-95';
    
    let iconColorClass = 'text-nexa-cyan'; 
    if (isListening || isWarning || isGlitch) iconColorClass = 'text-nexa-red';
    else if (isLiveMode) iconColorClass = 'text-green-500';
    else if (isThinking) iconColorClass = 'text-nexa-yellow';
    else if (isStudyHub) iconColorClass = 'text-nexa-blue';
    else if (isWatching) iconColorClass = 'text-green-500';
    else if (isGenerating) iconColorClass = 'text-pink-500';
    else if (isRepairing) iconColorClass = 'text-white';
    else if (isCoding) iconColorClass = 'text-green-600'; 

    let pulseClass = (isListening || isWarning || isThinking || isStudyHub || isLiveMode || isWatching || isGenerating || isRepairing || isCoding || isGlitch) ? 'animate-pulse' : '';
    const isTextInputActive = inputMode === 'text';
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const sideButtonStyle = `absolute top-1/2 -translate-y-1/2 w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-300 transform-gpu z-30`;
    const inactiveBtnStyle = `text-zinc-400 dark:text-zinc-600 hover:text-nexa-cyan hover:bg-nexa-cyan/10`;
    const activeBtnStyle = `bg-nexa-cyan/20 text-nexa-cyan`;

    return (
        <div className="w-full shrink-0 bg-gradient-to-t from-zinc-100 via-zinc-100/80 to-transparent dark:from-black dark:via-black/80 dark:to-transparent z-40 relative flex flex-col items-center justify-center pb-[env(safe-area-inset-bottom)] transition-all duration-300">
            <div className="absolute w-full top-1/2 -translate-y-1/2 h-[1px] px-4"><div className="w-full h-full flex justify-between items-center"><div className="flex-1 h-full bg-gradient-to-r from-transparent via-zinc-300/50 to-zinc-400/70 dark:via-nexa-cyan/20 dark:to-nexa-cyan/40"></div><div className="w-24 flex-shrink-0"></div><div className="flex-1 h-full bg-gradient-to-l from-transparent via-zinc-300/50 to-zinc-400/70 dark:via-nexa-cyan/20 dark:to-nexa-cyan/40"></div></div></div>
            
            <div className="w-full max-w-3xl mx-auto h-24 relative px-4 flex items-center justify-center">
                
                {isLive ? (
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-row items-center gap-4 z-50">
                        <button 
                            onClick={onToggleCamera} 
                            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 ${isCameraActive ? activeBtnStyle : inactiveBtnStyle}`}
                            title="Toggle Vision"
                        >
                            {isCameraActive ? <EyeIcon /> : <EyeOffIcon />}
                        </button>

                        {isCameraActive && (
                            <button 
                                onClick={onToggleTorch} 
                                className={`w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 border border-nexa-cyan/30 ${isTorchOn ? 'bg-yellow-500/20 text-yellow-400 shadow-[0_0_15px_#fbbf24]' : 'bg-black/50 text-zinc-500 hover:text-yellow-200'}`}
                                title="Toggle Flashlight"
                            >
                                <BoltIcon />
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <input 
                            type="file" 
                            accept="image/*,text/*,.js,.ts,.py,.html,.css,.json,.md,.pdf,.doc,.docx" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={(e) => {
                                if(e.target.files && e.target.files[0]) {
                                    onFileUpload(e.target.files[0]);
                                    e.target.value = ''; 
                                }
                            }}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()} 
                            className={`${sideButtonStyle} left-4 ${pendingFile ? activeBtnStyle : inactiveBtnStyle}`}
                        >
                            <CameraIcon />
                        </button>
                    </>
                )}

                {isTextInputActive ? (
                    <div className="w-full h-full flex items-center justify-center animate-fade-in pl-16 pr-16">
                         <form onSubmit={onTextSubmit} className="w-full flex items-center gap-2">
                            <input 
                                type="text"
                                value={textInput}
                                onChange={onTextInputChange}
                                placeholder={textInputPlaceholder}
                                autoFocus
                                className={`w-full bg-transparent border-0 border-b  text-zinc-800 dark:text-white font-mono text-sm focus:ring-0 transition-colors ${isWarning ? 'border-red-500 focus:border-red-400 placeholder-red-500/50' : 'border-nexa-cyan/30 focus:border-nexa-cyan'}`}
                            />
                            <button type="submit" className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full text-black transition-colors disabled:opacity-50 ${isWarning ? 'bg-red-500 hover:bg-red-400' : 'bg-nexa-cyan hover:bg-white'}`} disabled={!textInput.trim() && !pendingFile}>
                                <SendIcon />
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="relative z-20 flex items-center justify-center">
                        <button onClick={onMicClick} className={`relative w-20 h-20 flex items-center justify-center rounded-full transition-all duration-300 group ${buttonScale} ${isIdle ? 'animate-breathing' : ''}`} disabled={isWarning || isRepairing || hudState === HUDState.SAFEMODE || isGlitch}>
                            <div className="absolute inset-0 rounded-full bg-white dark:bg-black shadow-inner"></div>
                            <div className={`relative z-10 transition-colors duration-300 ${iconColorClass} ${pulseClass} shadow-[0_0_20px_currentColor] group-hover:shadow-[0_0_30px_currentColor]`}>
                                <div className="scale-[1.3]"><MicIcon rotationDuration={finalDuration} /></div>
                            </div>
                        </button>
                    </div>
                )}
                
                <button 
                    onClick={onInputModeChange} 
                    className={`${sideButtonStyle} right-4 ${showChat ? activeBtnStyle : inactiveBtnStyle}`}
                    aria-label="Toggle text input and chat"
                >
                    <div className={showChat ? 'rotate-90 transition-transform' : 'rotate-0 transition-transform'}>
                         <KeyboardIcon />
                    </div>
                </button>
            </div>
        </div>
    );
};

const MODIFIABLE_FILES = [
  'index.tsx',
  'App.tsx',
  'types.ts',
  'index.html',
  'components/Auth.tsx',
  'components/HUD.tsx',
  'components/NebulaOrb.tsx',
  'components/GestureController.tsx',
  'components/ChatPanel.tsx',
  'components/AdminPanel.tsx',
  'components/UserSettingsPanel.tsx',
  'components/StudyHubPanel.tsx',
  'components/ManageAccountsModal.tsx',
  'components/CrashScreen.tsx',
  'components/ErrorBoundary.tsx',
  'components/InstallPWAButton.tsx',
  'services/geminiService.ts',
  'services/liveService.ts',
  'services/memoryService.ts',
  'services/ttsService.ts',
  'services/githubService.ts',
  'services/selfRepairService.ts',
  'services/audioService.ts',
  'services/firebaseConfig.ts',
  'services/wakeWordService.ts',
  'vite.config.ts',
  'tsconfig.json',
  'package.json',
  'manifest.json',
  'metadata.json',
  'capacitor.config.ts',
  'service-worker.js',
  'netlify.toml',
  'firebase.json',
  'vercel.json',
  'README.md'
];

const App: React.FC = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [hudState, setHudState] = useState<HUDState>(HUDState.IDLE);
    const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
    const [textInput, setTextInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [showChat, setShowChat] = useState(false);
    
    const [pendingFile, setPendingFile] = useState<{ name: string; type: 'image' | 'text'; data: string; mimeType?: string } | null>(null);
    
    const [config, setConfig] = useState<AppConfig>(() => {
        const defaults: AppConfig = {
            animationsEnabled: true,
            hudRotationSpeed: 1,
            micRotationSpeed: 1,
            theme: 'dark', 
            accentColor: '#29DFFF',
            ecoMode: false,
            phoenixEnabled: false
        };
        try {
            const saved = localStorage.getItem('nexa_config');
            // MERGE SAVED WITH DEFAULTS to prevent undefined properties when new config is added
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch(e) {
            return defaults;
        }
    });
    
    const [showAdmin, setShowAdmin] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showStudyHub, setShowStudyHub] = useState(false);
    const [showAccounts, setShowAccounts] = useState(false);
    
    const [liveSession, setLiveSession] = useState<LiveSessionManager | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const isCameraActiveRef = useRef(false);
    
    const [zoomLevel, setZoomLevel] = useState(1);
    const [maxZoom, setMaxZoom] = useState(3);
    const [zoomMethod, setZoomMethod] = useState<'hardware' | 'digital'>('digital'); 
    
    const [tapPoint, setTapPoint] = useState<{x: number, y: number} | null>(null);
    const lastTapTime = useRef<number>(0);
    
    // AIR GESTURE (Touch-free shrink/expand) state
    const [airGestureActive, setAirGestureActive] = useState<boolean>(false);
    const [gestureData, setGestureData] = useState<GestureData>({
        handDetected: false,
        gesture: 'IDLE',
        scale: 1.0,
        pinchDistance: 0.5,
        handPosition: { x: 0, y: 0 },
        fingerCount: 0
    });
    
    const [isTorchOn, setIsTorchOn] = useState(false); 
    const [inputTranscription, setInputTranscription] = useState('');
    const [outputTranscription, setOutputTranscription] = useState('');
    
    const audioRef = useRef<{ vol: number, bass: number, mid: number, treble: number } | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);
    const gestureCtrlRef = useRef<any>(null);

    const setCameraState = (active: boolean) => {
        setIsCameraActive(active);
        isCameraActiveRef.current = active;
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('nexa_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        fetchSystemConfig();
    }, []);

    useEffect(() => {
        localStorage.setItem('nexa_config', JSON.stringify(config));
        const root = window.document.documentElement;
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const shouldUseDark = config.theme === 'dark' || (config.theme === 'system' && isSystemDark);
        root.classList.remove('light', 'dark');
        root.classList.add(shouldUseDark ? 'dark' : 'light');
    }, [config]);

    const speakText = async (text: string, force: boolean = false) => {
         if (user) {
             stopTextTTS();
             setHudState(HUDState.SPEAKING);
             return new Promise<void>((resolve) => {
                 speakTextTTS(
                     user, 
                     text, 
                     config.naughtyModeOverride || false, 
                     () => {}, 
                     () => {
                         setHudState(HUDState.IDLE);
                         resolve();
                     }
                 ).catch(() => {
                     setHudState(HUDState.IDLE);
                     resolve();
                 });
             });
         }
    };

    const cleanupCamera = useCallback(() => {
        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach(track => track.stop());
            cameraStreamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setCameraState(false);
        setIsTorchOn(false);
        setZoomLevel(1);
    }, []);

    const handleToggleCamera = useCallback(async () => {
        if (isCameraActive) {
            liveSession?.stopVideo();
            cleanupCamera();
            setHudState(HUDState.LIVE);
            return;
        }

        if (!liveSession) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: "environment",
                    width: { ideal: 1280 }, 
                    height: { ideal: 720 },
                    // @ts-ignore
                    zoom: true 
                } 
            });
            cameraStreamRef.current = stream;
            
            const track = stream.getVideoTracks()[0];
            const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
            
            // @ts-ignore
            if (capabilities.zoom) {
                setZoomMethod('hardware');
                // @ts-ignore
                setMaxZoom(capabilities.zoom.max || 3);
                // @ts-ignore
                setZoomLevel(capabilities.zoom.min || 1);
            } else {
                console.warn("Hardware zoom not supported. Using Digital Zoom.");
                setZoomMethod('digital');
                setMaxZoom(3); 
                setZoomLevel(1);
            }
            
            try {
                // @ts-ignore
                await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
            } catch(e) {}

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                liveSession.startVideo(videoRef.current);
                setCameraState(true);
                setHudState(HUDState.WATCHING);
                
                liveSession.sendText("CAMERA_ACTIVATED: I have turned on my camera. Briefly tell me what you see to confirm vision is working.");
                
                setShowChat(false);
            }
        } catch (err) {
            console.error("Camera access error:", err);
            speakText("I couldn't access your camera. Please check the permissions.");
            cleanupCamera();
        }
    }, [isCameraActive, liveSession, cleanupCamera]);
    
    const handleToggleTorch = useCallback(async () => {
        if (!cameraStreamRef.current) return;
        const track = cameraStreamRef.current.getVideoTracks()[0];
        if (!track) return;
        try {
            const newState = !isTorchOn;
            // @ts-ignore
            await track.applyConstraints({ advanced: [{ torch: newState }] });
            setIsTorchOn(newState);
        } catch (e) {
            console.warn("Torch toggle failed.", e);
            speakText("Flashlight access denied.");
        }
    }, [isTorchOn]);

    const handleZoomChange = async (e: React.SyntheticEvent<HTMLInputElement>) => {
        const newZoom = parseFloat(e.currentTarget.value);
        setZoomLevel(newZoom);

        if (zoomMethod === 'hardware' && cameraStreamRef.current) {
            const track = cameraStreamRef.current.getVideoTracks()[0];
            if (track && track.applyConstraints) {
                try {
                    // @ts-ignore
                    await track.applyConstraints({ advanced: [{ zoom: newZoom }] });
                } catch(e) { console.warn("Hardware zoom failed", e); }
            }
        } 
    };

    const handleVideoTap = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isCameraActive || !liveSession) return;
        
        const now = Date.now();
        if (now - lastTapTime.current < 1500) return; 
        lastTapTime.current = now;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        setTapPoint({ x, y });
        setTimeout(() => setTapPoint(null), 1500);
        
        liveSession.sendText("I am pointing at a specific object in the frame. Please analyze what I am focusing on right now.");
    };

    const handleToggleLive = async () => {
        playMicOnSound();
        
        if (liveSession) {
            liveSession.stop();
            cleanupCamera();
            setLiveSession(null);
            setHudState(HUDState.IDLE);
        } else {
            if (!user) return;
            setHudState(HUDState.LIVE); 
            
            const session = new LiveSessionManager(user, config.naughtyModeOverride || false, {
                onStateChange: (state) => {
                    if (state === 'open') setHudState(HUDState.LIVE);
                    else if (state === 'closed' || state === 'error') {
                        setHudState(HUDState.IDLE);
                        cleanupCamera();
                        setLiveSession(null);
                        if (state === 'error') playErrorSound();
                    }
                },
                onAudioData: (data) => {
                    if (audioRef.current) Object.assign(audioRef.current, data);
                    else audioRef.current = data;
                },
                onTranscriptionUpdate: (inp, out) => {
                    setInputTranscription(inp);
                    setOutputTranscription(out);
                },
                onTurnComplete: (inp, out) => {
                    const userMsg: ChatMessage = { role: 'user', text: inp, timestamp: Date.now() };
                    const modelMsg: ChatMessage = { role: 'model', text: out, timestamp: Date.now() };
                    setMessages(prev => [...prev, userMsg, modelMsg]);
                    appendMessageToMemory(user, userMsg);
                    appendMessageToMemory(user, modelMsg);
                },
                onSecurityBreach: (text) => setHudState(HUDState.WARNING),
                onAdminInsultReported: (text) => {},
                onAction: (action, params) => handleAction(action as ActionType, params),
                onLogout: (msg) => {
                    if(msg) speakText(msg);
                    handleLogout();
                }
            });
            
            setLiveSession(session);
            await session.start();
        }
    };

    const handleFileUpload = (file: File) => {
        if (file.size > 10 * 1024 * 1024) { 
            alert("File is too large. Please select a file smaller than 10MB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            let fileType: 'image' | 'text' = 'text';
            let fileData = '';
            
            if (file.type.startsWith('image/')) {
                fileType = 'image';
                fileData = result.split(',')[1];
            } else {
                fileType = 'text';
                fileData = result; 
            }

            setPendingFile({ 
                name: file.name, 
                type: fileType, 
                data: fileData,
                mimeType: file.type 
            });
            
            if (inputMode !== 'text') {
                setInputMode('text');
                setShowChat(true);
            }
        };

        if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
    };

    const processUserInput = async (text: string, file: { name: string; type: 'image' | 'text'; data: string; mimeType?: string } | null) => {
        if (!user) return;
        setHudState(HUDState.THINKING);
        
        let displayImage = undefined;
        if (file && file.type === 'image') {
            displayImage = `data:${file.mimeType || 'image/jpeg'};base64,${file.data}`;
        }
        
        let displayText = text;
        if (file && file.type === 'text') {
            displayText += `\n[Attached: ${file.name}]`;
        }

        const userMsg: ChatMessage = { role: 'user', text: displayText, timestamp: Date.now(), image: displayImage };
        setMessages(prev => [...prev, userMsg]);
        appendMessageToMemory(user, userMsg);
        
        try {
            const response = await generateTextResponse(text, user, config.naughtyModeOverride, file);
            if (response.action && response.action !== 'NONE') {
                handleAction(response.action, response.actionParams);
            }
            
            const modelMsg: ChatMessage = { role: 'model', text: response.text, timestamp: Date.now(), widget: response.widget };
            setMessages(prev => [...prev, modelMsg]);
            appendMessageToMemory(user, modelMsg);
            
            if (response.text) {
                await speakText(response.text);
            } else {
                setHudState(HUDState.IDLE);
            }
        } catch (e) {
            console.error(e);
            setHudState(HUDState.IDLE);
            setTimeout(() => setHudState(HUDState.IDLE), 2000);
        }
    };
    
    const handleAction = async (action: ActionType, params: any) => {
        switch(action) {
            case 'LOGOUT': handleLogout(); break;
            case 'THEME_DARK': setConfig(c => ({...c, theme: 'dark'})); break;
            case 'THEME_LIGHT': setConfig(c => ({...c, theme: 'light'})); break;
            case 'OPEN_ADMIN_PANEL': if(user?.role === UserRole.ADMIN) setShowAdmin(true); break;
            case 'MODIFY_CODE': 
                setHudState(HUDState.CODING);
                setTimeout(async () => {
                    try {
                        const targetFile = await identifyTargetFile(params.request, MODIFIABLE_FILES); 
                        if(targetFile) {
                            await speakText(`Target identified: ${targetFile}. Accessing file content.`);
                            const current = await fetchFileContent(targetFile) || { content: "", sha: undefined };
                            
                            await speakText("Generating code patch. This may take a moment.");
                            const patch = await generateCodePatch(current.content, params.request, targetFile);
                            
                            await speakText("Code generated. Pushing update to the repository.");
                            await pushToGithub(targetFile, patch, current.sha, params.request);
                            
                            await speakText("Code update successful. Reloading the application now.");
                            setTimeout(() => window.location.reload(), 3000);
                            return; 
                        }
                        throw new Error("Target file could not be identified.");
                    } catch(e: any) {
                        console.error("Phoenix Protocol failed:", e);
                        await speakText(`Code modification failed. Error: ${e.message}`);
                        setHudState(HUDState.IDLE); 
                    }
                }, 100);
                break;
        }
    };

    const handleLogout = () => {
        if(liveSession) {
            liveSession.stop();
            cleanupCamera();
            setLiveSession(null);
        }
        setUser(null);
        localStorage.removeItem('nexa_user');
        setMessages([]);
        setHudState(HUDState.IDLE);
    };

    const handleSettingsClick = () => {
        if (user?.role === UserRole.ADMIN) setShowAdmin(true);
        else setShowSettings(true);
    };

    return (
        <div className="w-screen h-[100dvh] flex flex-col overflow-hidden bg-zinc-100 dark:bg-black text-zinc-900 dark:text-white transition-colors duration-300 fixed inset-0">
            <div className="absolute inset-0 pointer-events-none z-0">
                <video 
                    ref={videoRef} 
                    playsInline 
                    muted 
                    autoPlay
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`} 
                    style={{ 
                        transform: (isCameraActive && zoomMethod === 'digital' && zoomLevel > 1) 
                            ? `scale(${zoomLevel})` 
                            : 'none'
                    }}
                />
                
                {isCameraActive && (
                    <div 
                        className="absolute inset-0 z-10 pointer-events-auto flex flex-col justify-between pt-[env(safe-area-inset-top)] pb-[120px]"
                        onClick={handleVideoTap}
                    >
                        <div className="absolute top-[80px] right-4 flex flex-col items-end gap-1 font-mono text-[10px] text-nexa-cyan/80 z-20 pointer-events-none">
                            <span className="bg-black/40 px-1 rounded">REC ●</span>
                            <span className="bg-black/40 px-1 rounded">ZOOM: {zoomMethod === 'digital' ? 'DIGITAL' : 'OPTICAL'}</span>
                            <span className="bg-black/40 px-1 rounded">EXP: +0.0</span>
                            {isTorchOn && <span className="text-yellow-400 bg-black/40 px-1 rounded">⚡ FLASH ON</span>}
                        </div>

                        <div 
                            className="absolute right-6 top-1/2 -translate-y-1/2 h-48 w-12 bg-black/40 rounded-full border border-nexa-cyan/30 flex flex-col items-center justify-center z-50 pointer-events-auto" 
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchMove={(e) => e.stopPropagation()} 
                            onTouchEnd={(e) => e.stopPropagation()}
                        >
                            <span className="text-[10px] font-mono text-nexa-cyan mb-2 font-bold">{maxZoom.toFixed(1)}x</span>
                            <input 
                                type="range" 
                                min="1" 
                                max={maxZoom} 
                                step="0.1" 
                                value={zoomLevel} 
                                onChange={handleZoomChange}
                                onInput={handleZoomChange}
                                className="w-32 h-8 bg-nexa-cyan/20 rounded-lg appearance-none cursor-pointer -rotate-90 origin-center"
                                style={{ width: '120px', height: '20px' }} 
                            />
                            <span className="text-[10px] font-mono text-nexa-cyan mt-2 font-bold">1.0x</span>
                        </div>

                        {tapPoint && (
                            <div 
                                className="absolute w-16 h-16 border-2 border-nexa-cyan rounded-full animate-ping pointer-events-none z-40"
                                style={{ left: tapPoint.x - 32, top: tapPoint.y - 32 }}
                            >
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"></div>
                            </div>
                        )}

                        <div className="absolute inset-4 sm:inset-10 pointer-events-none">
                            <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-nexa-cyan rounded-tl-lg drop-shadow-[0_0_5px_rgba(41,223,255,0.8)]"></div>
                            <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-nexa-cyan rounded-tr-lg drop-shadow-[0_0_5px_rgba(41,223,255,0.8)]"></div>
                            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-nexa-cyan rounded-bl-lg drop-shadow-[0_0_5px_rgba(41,223,255,0.8)]"></div>
                            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-nexa-cyan rounded-br-lg drop-shadow-[0_0_5px_rgba(41,223,255,0.8)]"></div>
                            
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-nexa-cyan/50 shadow-[0_0_15px_#29dfff] animate-scantop opacity-50"></div>
                            
                            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-10">
                                <div className="border-r border-b border-nexa-cyan"></div>
                                <div className="border-r border-b border-nexa-cyan"></div>
                                <div className="border-b border-nexa-cyan"></div>
                                <div className="border-r border-b border-nexa-cyan"></div>
                                <div className="border-r border-b border-nexa-cyan"></div>
                                <div className="border-b border-nexa-cyan"></div>
                                <div className="border-r border-nexa-cyan"></div>
                                <div className="border-r border-nexa-cyan"></div>
                                <div></div>
                            </div>
                            
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-nexa-cyan/20 rounded-lg flex items-center justify-center animate-pulse">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-nexa-cyan"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-nexa-cyan"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-nexa-cyan"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-nexa-cyan"></div>
                                
                                <div className="text-[8px] font-mono text-nexa-cyan/70 mt-[-60px] bg-black/50 px-1 rounded">FACIAL_RECOGNITION_ACTIVE</div>
                            </div>
                        </div>

                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none">
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-nexa-cyan rounded-full shadow-[0_0_5px_#29dfff]"></div>
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-[1px] bg-nexa-cyan/30"></div>
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-[1px] bg-nexa-cyan/30"></div>
                        </div>
                    </div>
                )}
            </div>

            {!user ? (
                <Auth onLogin={(u) => { setUser(u); localStorage.setItem('nexa_user', JSON.stringify(u)); }} />
            ) : (
                <>
                    <StatusBar 
                        userName={user.name} 
                        userRole={user.role} 
                        onLogout={handleLogout} 
                        onSettings={handleSettingsClick} 
                        onStudyHub={() => setShowStudyHub(true)} 
                        isOffline={!navigator.onLine} 
                    />
                    
                    <div className="flex-1 relative min-h-0 w-full flex items-center justify-center pointer-events-none">
                        <div className="w-full h-full pointer-events-none">
                            <HUD 
                                state={hudState} 
                                rotationSpeed={config.hudRotationSpeed} 
                                audioRef={audioRef} 
                                accentColor={config.accentColor} 
                                ecoMode={config.ecoMode} 
                                gestureData={gestureData}
                                visualMode="NEBULA"
                                onResetZoom={() => gestureCtrlRef.current?.resetZoom()}
                            />
                        </div>

                        {/* Top-Right Air Gesture Sensor Switch */}
                        <div className="absolute top-4 right-4 z-40 pointer-events-auto">
                            <GestureController 
                                ref={gestureCtrlRef}
                                isActive={airGestureActive} 
                                onToggle={setAirGestureActive} 
                                onGestureUpdate={setGestureData} 
                            />
                        </div>
                        
                        {showChat && (
                            <div className="absolute inset-x-0 bottom-0 h-[60%] z-30 pointer-events-auto">
                                <ChatPanel 
                                    messages={messages} 
                                    userName={user.name}
                                    userRole={user.role}
                                    hudState={hudState}
                                    onTypingComplete={() => {}}
                                    onClose={() => setShowChat(false)}
                                    inputTranscription={inputTranscription}
                                    outputTranscription={outputTranscription}
                                />
                            </div>
                        )}
                    </div>

                    <ControlDeck 
                        onMicClick={handleToggleLive}
                        hudState={hudState}
                        inputMode={inputMode}
                        onInputModeChange={() => {
                            setShowChat(!showChat);
                            setInputMode(inputMode === 'voice' ? 'text' : 'voice');
                        }}
                        textInput={textInput}
                        onTextInputChange={(e: any) => setTextInput(e.target.value)}
                        onTextSubmit={(e: any) => {
                            e.preventDefault();
                            if(textInput.trim() || pendingFile) {
                                processUserInput(textInput, pendingFile);
                                setTextInput('');
                                setPendingFile(null);
                            }
                        }}
                        textInputPlaceholder={pendingFile ? `Type instruction for ${pendingFile.name}...` : "Type a message..."}
                        onFileUpload={handleFileUpload}
                        isLive={hudState === HUDState.LIVE || hudState === HUDState.WATCHING}
                        isCameraActive={isCameraActive} 
                        onToggleCamera={handleToggleCamera}
                        showChat={showChat}
                        pendingFile={pendingFile}
                        onToggleTorch={handleToggleTorch}
                        isTorchOn={isTorchOn}
                        rotationSpeedMultiplier={config.micRotationSpeed || 1}
                    />
                    
                    <AdminPanel isOpen={showAdmin} onClose={() => setShowAdmin(false)} config={config} onConfigChange={setConfig} onClearMemory={() => clearAllMemory(user)} onManageAccounts={() => setShowAccounts(true)} onViewStudyHub={() => setShowStudyHub(true)} />
                    <UserSettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} config={config} onConfigChange={setConfig} currentVoice={user.voice} onVoiceChange={(v) => {
                        setUser({...user, voice: v});
                        syncUserProfile({...user, voice: v});
                    }} />
                    <StudyHubPanel isOpen={showStudyHub} onClose={() => setShowStudyHub(false)} user={user} onStartLesson={(subject, topic) => {
                         processUserInput(`Teach me ${topic || 'summary'} from ${subject.courseName}`, null);
                         setShowStudyHub(false);
                    }} />
                    <ManageAccountsModal isOpen={showAccounts} onClose={() => setShowAccounts(false)} />
                </>
            )}
        </div>
    );
};

export default App;
