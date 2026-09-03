
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Auth from './components/Auth';
import HUD from './components/HUD';
import { AgentVirtualOffice } from './components/AgentVirtualOffice';
import ChatPanel from './components/ChatPanel';
import AdminPanel from './components/AdminPanel';
import UserSettingsPanel from './components/UserSettingsPanel';
import StudyHubPanel from './components/StudyHubPanel';
import ManageAccountsModal from './components/ManageAccountsModal';
import { SquadPanel } from './components/SquadPanel';
import { PipelineModal } from './components/PipelineModal';
import { AgentDebateModal } from './components/AgentDebateModal';
import { CustomAgentModal } from './components/CustomAgentModal';
import { MemoryVaultModal } from './components/MemoryVaultModal';
import { TacticalEvolutionHub } from './components/TacticalEvolutionHub';
import { startSquadIntroSequence } from './services/squadService';
import { GestureController, GestureData } from './components/GestureController';
import { logoutFirebase } from './services/firebaseConfig';
import { UserProfile, UserRole, HUDState, ChatMessage, AppConfig, StudyHubSubject, ActionType, VoiceKey, Reminder } from './types';
import { generateTutorLesson, generateImageContent, generateVideoContent, editImageContent, isUserBhabhi, generateTopicContent, generateIntroductoryMessage } from './services/geminiService';
import { playMicOnSound, playErrorSound, playAdminLoginSound } from './services/audioService';
import { appendMessageToMemory, clearAllMemory, clearAdminNotifications, getLocalMessages, logAdminNotification, syncUserProfile, fetchSystemConfig, syncMemoryWithCloud, getAdminNotifications, getUserProfile, syncFamilyTree } from './services/memoryService';
import { speak as speakTextTTS, stop as stopTextTTS } from './services/ttsService';
import { LiveSessionManager } from './services/liveService';
import { analyzeSystemError, RepairPlan } from './services/selfRepairService';
import { getRobustGithubConfig, revertLastChange } from './services/githubService';
import { NexaCoreController } from './core/NexaCoreController';

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
      <defs>
        <radialGradient id="coreGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="60%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0284c7" />
        </radialGradient>
      </defs>
      <g style={{ transformOrigin: 'center', animation: `spin ${rotationDuration} linear infinite` }}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" strokeDasharray="5.85 2" transform="rotate(-11.25 12 12)" />
      </g>
      <circle cx="12" cy="12" r="7.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
      <circle cx="12" cy="12" r="7" fill="url(#coreGradient)" />
    </svg>
);

const StatusBar = ({ userName, userRole, photoUrl, hudMode, onToggleHudMode, onLogout, onSettings, latency, onStudyHub, isOffline }: any) => (
    <div className="w-full shrink-0 flex justify-between items-center px-3 sm:px-6 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1.5 min-h-[46px] sm:min-h-[52px] border-b border-zinc-200 dark:border-nexa-cyan/10 bg-white/80 dark:bg-black/80 backdrop-blur-md z-40 relative">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
                {photoUrl ? (
                    <img src={photoUrl} alt={userName} className="w-6 h-6 rounded-full border border-nexa-cyan/50 object-cover shadow-[0_0_8px_rgba(41,223,255,0.4)]" />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-nexa-cyan/20 border border-nexa-cyan/50 flex items-center justify-center text-[10px] font-bold text-nexa-cyan">
                        {userName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                )}
                <div className="text-base sm:text-lg font-bold tracking-[0.2em] sm:tracking-[0.25em] text-zinc-900 dark:text-white drop-shadow-[0_0_10px_rgba(41,223,255,0.6)]">NEXA</div>
                <div className="hidden sm:block text-[9px] text-nexa-cyan font-mono tracking-widest uppercase border-l border-cyan-500/30 pl-2">{userName}</div>
            </div>
            {isOffline ? (
                <div className="text-[9px] font-mono text-red-500 border-l border-red-500 pl-2 animate-pulse">OFFLINE</div>
            ) : (
                latency !== null && (<div className="hidden md:block text-[9px] font-mono text-zinc-500 dark:text-nexa-cyan/60 border-l border-zinc-200 dark:border-nexa-cyan/20 pl-2">LATENCY: <span className="text-zinc-800 dark:text-white">{latency}ms</span></div>)
            )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button 
                onClick={onToggleHudMode}
                className="px-2.5 py-1 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-mono text-[9px] sm:text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
                title="Toggle Matrix / Classic HUD"
            >
                {hudMode === 'matrix' ? '🌐 MATRIX' : '⭕ CLASSIC'}
            </button>
            <button onClick={onStudyHub} className="p-1 sm:p-1.5 hover:bg-zinc-200 dark:hover:bg-nexa-blue/20 rounded-full transition-colors group relative cursor-pointer shrink-0" title="Study Buddy">
                <StudyIcon />
                <span className="absolute -bottom-8 right-0 text-[9px] font-mono bg-nexa-blue text-black px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">STUDY BUDDY</span>
            </button>
            <button onClick={onSettings} className="p-1 sm:p-1.5 hover:bg-zinc-200 dark:hover:bg-nexa-cyan/10 rounded-full transition-colors relative group cursor-pointer shrink-0" title="Settings">
                <GearIcon />
                {userRole === UserRole.ADMIN && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                )}
            </button>
            <button onClick={onLogout} className="p-1 sm:p-1.5 hover:bg-red-500/10 rounded-full transition-colors cursor-pointer shrink-0" title="Logout"><LogoutIcon /></button>
        </div>
    </div>
);

const ControlDeck = ({ onMicClick, hudState, rotationSpeedMultiplier = 1, inputMode, onInputModeChange, textInput, onTextInputChange, onTextSubmit, textInputPlaceholder, onFileUpload, isLive, isCameraActive, onToggleCamera, showChat, pendingFile, onToggleTorch, isTorchOn, onTagAgent }: any) => {
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
    const sideButtonStyle = `w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-300 transform-gpu z-30 cursor-pointer`;
    const inactiveBtnStyle = `text-zinc-400 dark:text-zinc-500 hover:text-nexa-cyan hover:bg-nexa-cyan/10 border border-zinc-300 dark:border-zinc-800`;
    const activeBtnStyle = `bg-nexa-cyan/20 text-nexa-cyan border border-nexa-cyan/50 shadow-[0_0_15px_rgba(41,223,255,0.3)]`;

    const quickAgents = [
        { name: 'Nexa', color: '#00e5ff' },
        { name: 'Kronos', color: '#3b82f6' },
        { name: 'Cypher', color: '#f97316' },
        { name: 'Aura', color: '#a855f7' },
        { name: 'Veritas', color: '#10b981' },
        { name: 'Echo', color: '#38bdf8' },
        { name: 'Valkyrie', color: '#ef4444' },
    ];

    return (
        <div className="w-full shrink-0 bg-gradient-to-t from-slate-100/90 via-slate-100/60 to-transparent dark:from-black dark:via-black/90 dark:to-transparent z-40 relative flex flex-col items-center justify-center pb-[env(safe-area-inset-bottom)] transition-all duration-300 pt-2">
            
            {/* Quick Agent Tag Chips when in typing mode */}
            {isTextInputActive && (
                <div className="w-full max-w-xl px-4 mb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 animate-fade-in">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider shrink-0 mr-1">Tag:</span>
                    {quickAgents.map((ag) => (
                        <button
                            key={ag.name}
                            type="button"
                            onClick={() => onTagAgent ? onTagAgent(ag.name) : null}
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 transition-all hover:scale-105 border cursor-pointer"
                            style={{ 
                                backgroundColor: `${ag.color}15`, 
                                borderColor: `${ag.color}50`, 
                                color: ag.color 
                            }}
                        >
                            @{ag.name}
                        </button>
                    ))}
                </div>
            )}

            <div className="w-full max-w-3xl mx-auto h-20 sm:h-24 relative px-4 flex items-center justify-between gap-3">
                
                {/* Left Side: Camera / File Upload */}
                <div className="flex items-center gap-2">
                    {isLive ? (
                        <div className="flex flex-row items-center gap-2 z-50">
                            <button 
                                onClick={onToggleCamera} 
                                className={`${sideButtonStyle} ${isCameraActive ? activeBtnStyle : inactiveBtnStyle}`}
                                title="Toggle Vision"
                            >
                                {isCameraActive ? <EyeIcon /> : <EyeOffIcon />}
                            </button>

                            {isCameraActive && (
                                <button 
                                    onClick={onToggleTorch} 
                                    className={`${sideButtonStyle} ${isTorchOn ? 'bg-yellow-500/20 text-yellow-400 shadow-[0_0_15px_#fbbf24] border-yellow-500/50' : 'bg-black/50 text-zinc-500 hover:text-yellow-200'}`}
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
                                className={`${sideButtonStyle} ${pendingFile ? activeBtnStyle : inactiveBtnStyle}`}
                                title="Upload File / Image"
                            >
                                <CameraIcon />
                            </button>
                        </>
                    )}
                </div>

                {/* Center Control: Typing Input Bar OR Voice Reactor Core */}
                {isTextInputActive ? (
                    <div className="flex-1 max-w-xl h-full flex items-center justify-center animate-fade-in">
                         <form onSubmit={onTextSubmit} className="w-full flex items-center gap-2 bg-white/90 dark:bg-zinc-900/90 border border-nexa-cyan/40 rounded-full px-4 py-1.5 backdrop-blur-md shadow-[0_0_15px_rgba(41,223,255,0.15)]">
                            <input 
                                type="text"
                                value={textInput}
                                onChange={onTextInputChange}
                                placeholder={textInputPlaceholder}
                                autoFocus
                                className="w-full bg-transparent border-0 text-zinc-800 dark:text-white font-mono text-xs sm:text-sm focus:ring-0 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none"
                            />
                            <button 
                                type="submit" 
                                className={`w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 flex items-center justify-center rounded-full text-black transition-colors disabled:opacity-30 cursor-pointer ${isWarning ? 'bg-red-500 hover:bg-red-400' : 'bg-nexa-cyan hover:bg-white'}`} 
                                disabled={!textInput.trim() && !pendingFile}
                                title="Send Message"
                            >
                                <SendIcon />
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="relative z-20 flex flex-col items-center justify-center">
                        <button 
                            onClick={onMicClick} 
                            className={`relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full transition-all duration-300 group ${buttonScale} ${isIdle ? 'animate-breathing' : ''} cursor-pointer`} 
                            disabled={isWarning || isRepairing || hudState === HUDState.SAFEMODE || isGlitch}
                            title="Click for Voice Mode"
                        >
                            <div className="absolute inset-0 rounded-full bg-white/90 dark:bg-zinc-950/90 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-inner border border-zinc-200/90 dark:border-zinc-800 backdrop-blur-sm"></div>
                            <div className={`relative z-10 rounded-full flex items-center justify-center transition-colors duration-300 ${iconColorClass} ${pulseClass} filter drop-shadow-[0_0_10px_rgba(41,223,255,0.7)] group-hover:drop-shadow-[0_0_18px_rgba(41,223,255,0.9)]`}>
                                <div className="scale-[1.1] sm:scale-[1.3] flex items-center justify-center rounded-full"><MicIcon rotationDuration={finalDuration} /></div>
                            </div>
                        </button>
                    </div>
                )}
                
                {/* Right Side: TYPE / VOICE MODE TOGGLE BUTTON */}
                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={onInputModeChange} 
                        className={`${sideButtonStyle} ${isTextInputActive || showChat ? activeBtnStyle : inactiveBtnStyle} flex items-center justify-center relative group`}
                        aria-label="Toggle text typing mode and chat"
                        title={isTextInputActive ? "Switch to Voice Mode" : "Switch to Text Typing Mode"}
                    >
                        <KeyboardIcon />
                        {/* Tooltip / Badge */}
                        <span className="absolute -top-7 right-0 text-[8px] font-mono font-bold bg-cyan-500 text-black px-1.5 py-0.5 rounded shadow whitespace-nowrap opacity-90 group-hover:opacity-100 transition-opacity">
                            {isTextInputActive ? 'VOICE' : 'TYPE ⌨️'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

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
            phoenixEnabled: false,
            hudMode: 'classic'
        };
        try {
            const saved = localStorage.getItem('nexa_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...defaults, ...parsed, hudMode: parsed.hudMode || 'classic' };
            }
            return defaults;
        } catch(e) {
            return defaults;
        }
    });
    
    const [showAdmin, setShowAdmin] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showStudyHub, setShowStudyHub] = useState(false);
    const [showAccounts, setShowAccounts] = useState(false);
    const [showSquad, setShowSquad] = useState(false);
    const [showPipeline, setShowPipeline] = useState(false);
    const [showDebate, setShowDebate] = useState(false);
    const [showCustomAgent, setShowCustomAgent] = useState(false);
    const [showMemoryVault, setShowMemoryVault] = useState(false);
    const [showTacticalHub, setShowTacticalHub] = useState(false);
    const [showVirtualOffice, setShowVirtualOffice] = useState(false);

    const [customAgents, setCustomAgents] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem('nexa_custom_agents');
            return saved ? JSON.parse(saved) : [];
        } catch(e) { return []; }
    });

    const [activeHighlightAgentId, setActiveHighlightAgentId] = useState<string | null>(null);
    
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

    const callbacksRef = useRef({
        speakText: (text: string) => Promise.resolve(),
        handleLogout: () => {},
        setConfig: (c: any) => {},
        setShowAdmin: (show: boolean) => {},
        setShowSquad: (show: boolean) => {},
        setShowTacticalHub: (show: boolean) => {},
        setShowChat: (show: boolean) => {},
        setHudState: (state: HUDState) => {},
        setActiveHighlightAgentId: (id: string | null) => {},
        cleanupCamera: () => {},
        setLiveSession: (session: any) => {},
        user: null as UserProfile | null,
        customAgents: [] as any[],
        liveSession: null as LiveSessionManager | null,
        userRole: UserRole.USER as UserRole
    });

    const coreController = React.useMemo(() => {
        return new NexaCoreController(config, {
            onStateChange: setHudState,
            onMessageAdded: (msg) => setMessages(prev => [...prev, msg]),
            onSpeak: (text: string) => callbacksRef.current.speakText(text),
            onAction: (action: ActionType, params: any) => {
                switch(action) {
                    case 'LOGOUT': callbacksRef.current.handleLogout(); break;
                    case 'THEME_DARK': callbacksRef.current.setConfig((c: any) => ({...c, theme: 'dark'})); break;
                    case 'THEME_LIGHT': callbacksRef.current.setConfig((c: any) => ({...c, theme: 'light'})); break;
                    case 'OPEN_TACTICAL_HUB': callbacksRef.current.setShowTacticalHub(true); break;
                    case 'HIGHLIGHT_AGENT':
                        callbacksRef.current.setActiveHighlightAgentId(params?.agentId || null);
                        break;
                    case 'OPEN_ADMIN_PANEL': if(callbacksRef.current.userRole === UserRole.ADMIN) callbacksRef.current.setShowAdmin(true); break;
                    case 'OPEN_SQUAD_PANEL': callbacksRef.current.setShowSquad(true); break;
                    case 'INTRODUCE_SQUAD': 
                        if (callbacksRef.current.liveSession) {
                            callbacksRef.current.liveSession.pauseAudioForExternalSpeech();
                        }
                        callbacksRef.current.setShowSquad(false); 
                        callbacksRef.current.setShowChat(false);
                        if (callbacksRef.current.user) {
                            callbacksRef.current.setHudState(HUDState.SPEAKING);
                            startSquadIntroSequence(
                                callbacksRef.current.user, 
                                callbacksRef.current.customAgents,
                                (agentId) => {
                                    callbacksRef.current.setActiveHighlightAgentId(agentId);
                                    callbacksRef.current.setHudState(HUDState.SPEAKING);
                                }, 
                                () => {
                                    callbacksRef.current.setActiveHighlightAgentId(null);
                                    if (callbacksRef.current.liveSession) {
                                        callbacksRef.current.liveSession.resumeAudioAfterExternalSpeech();
                                        callbacksRef.current.setHudState(HUDState.LIVE);
                                    } else {
                                        callbacksRef.current.setHudState(HUDState.IDLE);
                                    }
                                },
                                !!callbacksRef.current.liveSession
                            );
                        }
                        break;
                }
            },
            onReloadRequested: () => window.location.reload()
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        coreController.setConfig(config);
    }, [config, coreController]);

    useEffect(() => {
        coreController.setUser(user);
    }, [user, coreController]);

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

    const handleVoiceChange = (v: VoiceKey) => {
        if (!user) return;
        const updated = { ...user, voice: v };
        setUser(updated);
        localStorage.setItem('nexa_user', JSON.stringify(updated));
        syncUserProfile(updated);
        if (liveSession) {
            liveSession.updateVoice(v);
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

    const processUserInput = (text: string, file: { name: string; type: 'image' | 'text'; data: string; mimeType?: string } | null) => {
        coreController.processUserInput(text, file);
    };
    
    const handleAction = (action: ActionType, params: any) => {
        coreController.executeAction(action, params);
    };

    const handleLogout = () => {
        if(liveSession) {
            liveSession.stop();
            cleanupCamera();
            setLiveSession(null);
        }
        logoutFirebase().catch(() => {});
        setUser(null);
        localStorage.removeItem('nexa_user');
        setMessages([]);
        setHudState(HUDState.IDLE);
    };

    const handleSettingsClick = () => {
        if (user?.role === UserRole.ADMIN) setShowAdmin(true);
        else setShowSettings(true);
    };

    useEffect(() => {
        callbacksRef.current.speakText = speakText;
        callbacksRef.current.handleLogout = handleLogout;
        callbacksRef.current.setConfig = setConfig;
        callbacksRef.current.setShowAdmin = setShowAdmin;
        callbacksRef.current.setShowSquad = setShowSquad;
        callbacksRef.current.setShowTacticalHub = setShowTacticalHub;
        callbacksRef.current.setShowChat = setShowChat;
        callbacksRef.current.setHudState = setHudState;
        callbacksRef.current.setActiveHighlightAgentId = setActiveHighlightAgentId;
        callbacksRef.current.cleanupCamera = cleanupCamera;
        callbacksRef.current.setLiveSession = setLiveSession;
        callbacksRef.current.user = user;
        callbacksRef.current.customAgents = customAgents;
        callbacksRef.current.liveSession = liveSession;
        callbacksRef.current.userRole = user?.role || UserRole.USER;
    }, [user, customAgents, liveSession, config]);

    return (
        <div className="w-full max-w-[100vw] h-full h-[100dvh] flex flex-col overflow-hidden bg-zinc-100 dark:bg-black text-zinc-900 dark:text-white transition-colors duration-300 fixed inset-0" style={{ height: 'var(--app-dvh, 100dvh)' }}>
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
                        photoUrl={user.photoUrl}
                        hudMode={config.hudMode}
                        onToggleHudMode={() => setConfig(prev => {
                            const next: 'matrix' | 'classic' = prev.hudMode === 'classic' ? 'matrix' : 'classic';
                            const updated: AppConfig = { ...prev, hudMode: next };
                            try { localStorage.setItem('nexa_config', JSON.stringify(updated)); } catch(e) {}
                            return updated;
                        })}
                        onLogout={handleLogout} 
                        onSettings={handleSettingsClick} 
                        onStudyHub={() => setShowStudyHub(true)} 
                        isOffline={!navigator.onLine} 
                    />
                    
                    <div className="flex-1 relative min-h-0 w-full flex items-center justify-center pointer-events-none">
                        <div className="w-full h-full pointer-events-auto">
                            <HUD 
                                state={hudState} 
                                rotationSpeed={config.hudRotationSpeed} 
                                audioRef={audioRef} 
                                accentColor={config.accentColor} 
                                ecoMode={config.ecoMode} 
                                gestureData={gestureData}
                                visualMode={config.hudMode === 'classic' ? 'CLASSIC' : 'NEBULA'}
                                activeHighlightAgentId={activeHighlightAgentId}
                                customAgents={customAgents}
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

                    {showVirtualOffice && (
                        <div className="z-20 pointer-events-auto w-full max-w-full sm:max-w-2xl mx-auto px-1 sm:px-2 shrink-0 animate-fade-in">
                            <AgentVirtualOffice 
                                activeAgentId={activeHighlightAgentId} 
                                hudState={hudState} 
                                user={user}
                                onClose={() => setShowVirtualOffice(false)}
                                onDirectChat={(agentName: string) => {
                                    setShowChat(true);
                                    setTextInput(`@${agentName} `);
                                }}
                            />
                        </div>
                    )}

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
                        onTagAgent={(agentName: string) => {
                            setTextInput(`@${agentName} `);
                            setShowChat(true);
                            setInputMode('text');
                        }}
                    />
                    
                    <AdminPanel 
                        isOpen={showAdmin} 
                        onClose={() => setShowAdmin(false)} 
                        config={config} 
                        onConfigChange={setConfig} 
                        onClearMemory={() => clearAllMemory(user)} 
                        onManageAccounts={() => setShowAccounts(true)} 
                        onViewStudyHub={() => setShowStudyHub(true)} 
                        onVoiceChange={handleVoiceChange} 
                        onOpenTacticalHub={() => setShowTacticalHub(true)}
                        onOpenPixelOffice={() => {
                            setShowAdmin(false);
                            setShowSettings(false);
                            setShowVirtualOffice(true);
                        }}
                        onOpenSquad={() => setShowSquad(true)}
                        onOpenDebate={() => setShowDebate(true)}
                        onOpenVault={() => setShowMemoryVault(true)}
                        onOpenPipeline={() => setShowPipeline(true)}
                        user={user}
                        onUserUpdate={(updatedUser) => {
                            setUser(updatedUser);
                            try { localStorage.setItem('nexa_user', JSON.stringify(updatedUser)); } catch(e) {}
                        }}
                    />
                    <UserSettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} config={config} onConfigChange={setConfig} currentVoice={user.voice} onVoiceChange={handleVoiceChange} />
                    <StudyHubPanel isOpen={showStudyHub} onClose={() => setShowStudyHub(false)} user={user} onStartLesson={(subject, topic) => {
                         processUserInput(`Teach me ${topic || 'summary'} from ${subject.courseName}`, null);
                         setShowStudyHub(false);
                    }} />
                    <ManageAccountsModal isOpen={showAccounts} onClose={() => setShowAccounts(false)} />
                    <SquadPanel 
                        isOpen={showSquad} 
                        onClose={() => setShowSquad(false)} 
                        user={user} 
                        onRunAgentTask={(agentName, prompt) => {
                            processUserInput(`[AGENT ${agentName}] ${prompt}`, null);
                            setShowChat(true);
                        }}
                        activeHighlightAgentId={activeHighlightAgentId}
                        setActiveHighlightAgentId={setActiveHighlightAgentId}
                        onOpenPipeline={() => { setShowSquad(false); setShowPipeline(true); }}
                        onOpenDebate={() => { setShowSquad(false); setShowDebate(true); }}
                        onOpenCustomAgent={() => { setShowSquad(false); setShowCustomAgent(true); }}
                    />

                    {showPipeline && (
                        <PipelineModal
                            user={user}
                            agents={customAgents.length > 0 ? [...customAgents] : []}
                            onClose={() => setShowPipeline(false)}
                            onAgentHighlight={(id) => setActiveHighlightAgentId(id)}
                        />
                    )}

                    {showDebate && (
                        <AgentDebateModal
                            user={user}
                            agents={customAgents.length > 0 ? [...customAgents] : []}
                            onClose={() => setShowDebate(false)}
                            onAgentHighlight={(id) => setActiveHighlightAgentId(id)}
                        />
                    )}

                    {showCustomAgent && (
                        <CustomAgentModal
                            onClose={() => setShowCustomAgent(false)}
                            onAddAgent={(newAgent) => {
                                const updated = [...customAgents, newAgent];
                                setCustomAgents(updated);
                                try {
                                    localStorage.setItem('nexa_custom_agents', JSON.stringify(updated));
                                } catch(e) {}
                            }}
                        />
                    )}

                    {showMemoryVault && (
                        <MemoryVaultModal
                            user={user}
                            onClose={() => setShowMemoryVault(false)}
                        />
                    )}

                    <TacticalEvolutionHub
                        isOpen={showTacticalHub}
                        onClose={() => setShowTacticalHub(false)}
                        user={user}
                    />
                </>
            )}
        </div>
    );
};

export default App;
