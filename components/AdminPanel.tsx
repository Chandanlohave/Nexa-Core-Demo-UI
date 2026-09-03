import React, { useState, useEffect, useRef } from 'react';
import { AppConfig, UserFact, UserProfile, VOICES, VoiceKey, Reminder, AccessKeyDefinition } from '../types';
import { getFacts, deleteFact, getUserProfile, syncUserProfile, fetchSystemConfig, saveSystemConfig, createCustomAccessKey, getAccessKeys, deleteAccessKey } from '../services/memoryService';
import { testGeminiApiKey } from '../services/geminiService';
import { getEvolutionState, triggerActiveEvolutionCycle, EvolutionMetric } from '../services/evolutionService';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onConfigChange: (newConfig: AppConfig) => void;
  onClearMemory: () => void;
  onManageAccounts: () => void;
  onViewStudyHub: () => void;
  onTriggerPhoenixTest?: () => void;
  onOpenTacticalHub?: () => void;
  onOpenPixelOffice?: () => void;
  onOpenSquad?: () => void;
  onOpenDebate?: () => void;
  onOpenVault?: () => void;
  onOpenPipeline?: () => void;
  reminders?: Reminder[];
  onDeleteReminder?: (id: string) => void;
  onAddReminder?: (text: string) => void;
  onRevertCode?: () => void;
  onVoiceChange?: (v: VoiceKey) => void;
  onUserUpdate?: (u: UserProfile) => void;
  user?: UserProfile | null;
}

const THEME_COLORS = [
    { name: 'Default UI', value: '#29dfff' },
    { name: 'Hyper Violet', value: '#bf00ff' },
    { name: 'Solar Orange', value: '#ff5e00' },
    { name: 'Neon Plasma', value: '#ff0099' },
    { name: 'Golden Glitch', value: '#ffd700' },
    { name: 'Arctic Teal', value: '#00ffcc' }
];

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  isOpen, 
  onClose, 
  config, 
  onConfigChange, 
  onClearMemory, 
  onManageAccounts, 
  onViewStudyHub, 
  onTriggerPhoenixTest, 
  onOpenTacticalHub,
  onOpenPixelOffice,
  onOpenSquad,
  onOpenDebate,
  onOpenVault,
  onOpenPipeline,
  reminders = [], 
  onDeleteReminder, 
  onAddReminder, 
  onRevertCode,
  onVoiceChange,
  onUserUpdate,
  user
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem('nexa_client_api_key') || '');
  const [ghToken, setGhToken] = useState(sessionStorage.getItem('NEXA_GH_TOKEN') || '');
  const [ghRepo, setGhRepo] = useState(sessionStorage.getItem('NEXA_GH_REPO') || '');
  const [adminPinInput, setAdminPinInput] = useState('');
  const [accessKeyInput, setAccessKeyInput] = useState('');
  
  // FALLBACK KEYS
  const [openaiKeyInput, setOpenaiKeyInput] = useState('');
  const [kimiKeyInput, setKimiKeyInput] = useState('');
  const [groqKeyInput, setGroqKeyInput] = useState('');
  
  const [isTokenSaved, setIsTokenSaved] = useState(!!sessionStorage.getItem('NEXA_GH_TOKEN'));
  
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS'>('IDLE');
  const [ghStatus, setGhStatus] = useState<'UNKNOWN' | 'TESTING' | 'SUCCESS' | 'FAILED'>('UNKNOWN');
  const [apiTestStatus, setApiTestStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [apiTestMessage, setApiTestMessage] = useState<string>('');
  
  const [taskInput, setTaskInput] = useState('');

  // Biometric & Profile State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(user || null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecordCountdown, setVoiceRecordCountdown] = useState<number | null>(null);
  const [biometricStatus, setBiometricStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Access Keys State
  const [customKeys, setCustomKeys] = useState<AccessKeyDefinition[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyMobile, setNewKeyMobile] = useState('');
  const [keyStatus, setKeyStatus] = useState('');

  // Memory Viewer State
  const [viewingMemory, setViewingMemory] = useState(false);
  const [facts, setFacts] = useState<UserFact[]>([]);
  const [evolutionMetric, setEvolutionMetric] = useState<EvolutionMetric>(getEvolutionState());
  const [isEvolvingAdmin, setIsEvolvingAdmin] = useState(false);
  
  useEffect(() => {
      if (isOpen) {
          setEvolutionMetric(getEvolutionState());
          if (user) {
              setCurrentUser(user);
          } else {
              const stored = localStorage.getItem('nexa_user');
              if (stored) {
                  try { setCurrentUser(JSON.parse(stored)); } catch(e) {}
              }
          }
          
          // Cloud Sync Check on Open
          fetchSystemConfig().then(data => {
              if (data) {
                  if (data.geminiKey) setApiKeyInput(data.geminiKey);
                  if (data.ghToken) {
                      setGhToken(data.ghToken);
                      setIsTokenSaved(true);
                      setGhStatus('SUCCESS');
                  }
                  if (data.ghRepo) setGhRepo(data.ghRepo);
                  if (data.adminPin) setAdminPinInput(data.adminPin);
                  if (data.accessKey) setAccessKeyInput(data.accessKey);
                  if (data.openaiKey) setOpenaiKeyInput(data.openaiKey);
                  if (data.kimiKey) setKimiKeyInput(data.kimiKey);
                  if (data.groqKey) setGroqKeyInput(data.groqKey);
              }
          });

          refreshAccessKeys();
      }
  }, [isOpen, user]);

  const refreshAccessKeys = async () => {
      const keys = await getAccessKeys();
      setCustomKeys(keys);
  };

  useEffect(() => {
      if (viewingMemory && currentUser) {
          setFacts(getFacts(currentUser));
      }
  }, [viewingMemory, currentUser]);

  const handleDeleteFact = (id: string) => {
      if (currentUser) {
          deleteFact(currentUser, id);
          setFacts(prev => prev.filter(f => f.id !== id));
      }
  };
  
  const handleVoiceChange = async (voice: VoiceKey) => {
      if (!currentUser) return;
      const updated = { ...currentUser, voice: voice };
      setCurrentUser(updated);
      await syncUserProfile(updated);
      localStorage.setItem('nexa_user', JSON.stringify(updated));
      onUserUpdate?.(updated);
      onVoiceChange?.(voice);
  };

  // Upload Face Photo (Biometric Identity)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !currentUser) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const rawBase64 = event.target?.result as string;
          if (!rawBase64) return;

          // Compress to lightweight square avatar using canvas
          const img = new Image();
          img.onload = async () => {
              const canvas = document.createElement('canvas');
              const maxDim = 320;
              let width = img.width;
              let height = img.height;
              if (width > height) {
                  if (width > maxDim) {
                      height = Math.round((height * maxDim) / width);
                      width = maxDim;
                  }
              } else {
                  if (height > maxDim) {
                      width = Math.round((width * maxDim) / height);
                      height = maxDim;
                  }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  const compressed = canvas.toDataURL('image/jpeg', 0.85);
                  const updated: UserProfile = { ...currentUser, photoUrl: compressed };
                  setCurrentUser(updated);
                  localStorage.setItem('nexa_user', JSON.stringify(updated));
                  await syncUserProfile(updated);
                  onUserUpdate?.(updated);
                  setBiometricStatus('FACE PHOTO ENROLLED ✓');
                  setTimeout(() => setBiometricStatus(''), 3000);
              }
          };
          img.src = rawBase64;
      };
      reader.readAsDataURL(file);
  };

  // Record Voiceprint Biometric Enrollment
  const handleRecordVoice = async () => {
      if (!currentUser) return;
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setIsRecordingVoice(true);
          setVoiceRecordCountdown(3);
          setBiometricStatus('SPEAK CLEARLY: "NEXA AUTHORIZE SYSTEM"...');

          const mediaRecorder = new MediaRecorder(stream);
          const audioChunks: Blob[] = [];

          mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) audioChunks.push(e.data);
          };

          mediaRecorder.start();

          let timeLeft = 3;
          const interval = setInterval(() => {
              timeLeft -= 1;
              setVoiceRecordCountdown(timeLeft);
              if (timeLeft <= 0) {
                  clearInterval(interval);
                  try { mediaRecorder.stop(); } catch(e) {}
                  stream.getTracks().forEach(track => track.stop());
              }
          }, 1000);

          mediaRecorder.onstop = async () => {
              setIsRecordingVoice(false);
              setVoiceRecordCountdown(null);
              setBiometricStatus('ENROLLING ACOUSTIC TIMBRE...');

              const voxId = `VOX-${(currentUser.name || 'ADMIN').toUpperCase().replace(/[^A-Z0-9]/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
              const updated: UserProfile = {
                  ...currentUser,
                  voiceprintId: voxId,
                  voiceEnrolledAt: Date.now()
              };

              setCurrentUser(updated);
              localStorage.setItem('nexa_user', JSON.stringify(updated));
              await syncUserProfile(updated);
              onUserUpdate?.(updated);

              // Sound confirmation
              try {
                  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const osc = audioCtx.createOscillator();
                  const gain = audioCtx.createGain();
                  osc.type = 'sine';
                  osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
                  osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
                  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                  osc.connect(gain);
                  gain.connect(audioCtx.destination);
                  osc.start();
                  osc.stop(audioCtx.currentTime + 0.3);
              } catch(e) {}

              setBiometricStatus(`VOICE ENROLLED // ${voxId} ✓`);
              setTimeout(() => setBiometricStatus(''), 4000);
          };
      } catch (err: any) {
          setIsRecordingVoice(false);
          setVoiceRecordCountdown(null);
          setBiometricStatus('MIC PERMISSION REQUIRED FOR VOICEPRINT');
          setTimeout(() => setBiometricStatus(''), 3500);
      }
  };

  const handleAddTask = () => {
      if(taskInput.trim() && onAddReminder) {
          onAddReminder(taskInput);
          setTaskInput('');
      }
  };

  const handleCreateKey = async () => {
      if (!newKeyName.trim()) return;
      setKeyStatus('CREATING...');
      const success = await createCustomAccessKey(newKeyName.trim(), newKeyMobile.trim() || undefined);
      if (success) {
          setKeyStatus('SUCCESS');
          setNewKeyName('');
          setNewKeyMobile('');
          refreshAccessKeys();
      } else {
          setKeyStatus('ERROR');
      }
      setTimeout(() => setKeyStatus(''), 2000);
  };

  const handleDeleteKey = async (key: string) => {
      await deleteAccessKey(key);
      refreshAccessKeys();
  };

  if (!isOpen) return null;

  const handleExportLogs = () => {
    const logs = {
      system: 'NEXA V9.0',
      timestamp: new Date().toISOString(),
      config: config,
      user: currentUser,
      status: 'OPTIMAL'
    };
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NEXA_LOGS_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ThemeButton: React.FC<{label: string, value: AppConfig['theme']}> = ({ label, value }) => {
    const isActive = config.theme === value;
    return (
      <button 
        type="button"
        onClick={() => {
            const updated = { ...config, theme: value };
            onConfigChange(updated);
            try { localStorage.setItem('nexa_config', JSON.stringify(updated)); } catch(e) {}
        }}
        className={`flex-1 py-2 text-xs font-mono uppercase transition-colors rounded-lg font-bold cursor-pointer ${isActive ? 'bg-cyan-400 text-black shadow-[0_0_10px_rgba(41,223,255,0.4)]' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-cyan-400/30'}`}
      >
        {label}
      </button>
    );
  };

  const handleSaveConfig = async () => {
    setSaveStatus('SAVING');
    
    const cleanKey = apiKeyInput.trim();
    if (cleanKey) {
        localStorage.setItem('nexa_client_api_key', cleanKey);
    } else {
        localStorage.removeItem('nexa_client_api_key');
    }

    const cleanRepo = ghRepo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '').replace(/\.git$/, '');
    const cleanToken = ghToken.trim();
    
    await saveSystemConfig({
        geminiKey: cleanKey,
        ghToken: cleanToken,
        ghRepo: cleanRepo,
        adminPin: adminPinInput.trim(),
        accessKey: accessKeyInput.trim(),
        openaiKey: openaiKeyInput.trim(),
        kimiKey: kimiKeyInput.trim(),
        groqKey: groqKeyInput.trim(),
    });
    
    if (cleanToken) {
        setIsTokenSaved(true);
        setGhStatus('SUCCESS');
    }

    setTimeout(() => {
      setSaveStatus('SUCCESS');
      setTimeout(() => setSaveStatus('IDLE'), 3000);
    }, 400);
  };
  
  const handleResetApiKey = async () => {
      localStorage.removeItem('nexa_client_api_key');
      setApiKeyInput('');
      setApiTestStatus('IDLE');
      setApiTestMessage('');
      
      await saveSystemConfig({ geminiKey: '' });
      alert("API Key Reset. System will now use the Environment Variable Key (if available).");
  };

  const handleTestGeminiKey = async () => {
      setApiTestStatus('TESTING');
      setApiTestMessage('Testing API Key with Gemini 2.5 Flash...');
      const cleanKey = apiKeyInput.trim();
      const res = await testGeminiApiKey(cleanKey || undefined);
      if (res.success) {
          setApiTestStatus('SUCCESS');
          setApiTestMessage(res.message);
          if (cleanKey) {
              localStorage.setItem('nexa_client_api_key', cleanKey);
              saveSystemConfig({ geminiKey: cleanKey });
          }
      } else {
          setApiTestStatus('FAILED');
          setApiTestMessage(res.message);
      }
  };

  const testGithubConnection = async () => {
      if (!ghToken.trim() || !ghRepo.trim()) {
          setGhStatus('FAILED');
          alert("Please provide both GitHub Token and Repository.");
          return;
      }
      setGhStatus('TESTING');
      try {
          const cleanRepo = ghRepo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '').replace(/\.git$/, '');
          const res = await fetch(`https://api.github.com/repos/${cleanRepo}`, {
              headers: {
                  'Authorization': `token ${ghToken.trim()}`,
                  'Accept': 'application/vnd.github.v3+json'
              }
          });
          if (res.ok) {
              setGhStatus('SUCCESS');
              setIsTokenSaved(true);
              sessionStorage.setItem('NEXA_GH_TOKEN', ghToken.trim());
              sessionStorage.setItem('NEXA_GH_REPO', cleanRepo);
              localStorage.setItem('NEXA_GH_TOKEN', ghToken.trim());
              localStorage.setItem('NEXA_GH_REPO', cleanRepo);
              
              await saveSystemConfig({
                  ghToken: ghToken.trim(),
                  ghRepo: cleanRepo
              });
              alert("GitHub Connected & Verified Successfully!");
          } else {
              setGhStatus('FAILED');
              alert(`Connection Failed: HTTP ${res.status}`);
          }
      } catch (e: any) {
          setGhStatus('FAILED');
          alert(`Network Error: ${e.message}`);
      }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg max-h-[92dvh] bg-white dark:bg-[#0c1018] border border-zinc-200 dark:border-cyan-500/40 rounded-2xl shadow-[0_0_35px_rgba(41,223,255,0.25)] flex flex-col overflow-hidden text-zinc-800 dark:text-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-zinc-50 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <h2 className="text-cyan-500 dark:text-cyan-400 font-mono text-sm font-bold tracking-wider">ADMIN CONTROL</h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-xl leading-none cursor-pointer"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 pr-3.5 pb-8">
          
          {/* PRIMARY STORAGE INDICATOR */}
          <div className="flex items-center gap-2 text-[10px] font-mono border border-cyan-500/30 p-2.5 rounded-xl bg-cyan-500/5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#0f0]"></div>
              <span className="text-zinc-500 dark:text-zinc-400">PRIMARY STORAGE:</span>
              <span className="text-cyan-500 dark:text-cyan-400 font-bold tracking-wider">FIREBASE CLOUD</span>
          </div>

          {/* 1. BIOMETRIC IDENTITY VAULT / ADMIN PROFILE */}
          <div className="p-3.5 bg-zinc-950 border border-cyan-500/30 rounded-xl space-y-3 font-mono shadow-md text-white">
              <div className="flex items-center justify-between text-[11px] font-bold text-cyan-400 tracking-wider">
                  <span className="flex items-center gap-1.5">
                      🧬 BIOMETRIC IDENTITY VAULT
                  </span>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider">ADMIN PROFILE</span>
              </div>

              <div className="flex items-center gap-3">
                  {/* Avatar circle */}
                  <div className="relative shrink-0">
                      {currentUser?.photoUrl ? (
                          <img 
                              src={currentUser.photoUrl} 
                              alt={currentUser.name} 
                              className="w-12 h-12 rounded-full object-cover border-2 border-cyan-400 shadow-[0_0_12px_rgba(41,223,255,0.6)]" 
                          />
                      ) : (
                          <div className="w-12 h-12 rounded-full bg-black border-2 border-cyan-400 flex items-center justify-center text-base font-bold text-cyan-400 shadow-[0_0_12px_rgba(41,223,255,0.4)]">
                              {currentUser?.name?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                      )}
                  </div>

                  <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white truncate">{currentUser?.name || 'Chandan'}</span>
                          <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/50 text-[9px] font-bold tracking-wider">
                              ADMIN
                          </span>
                      </div>

                      <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-1 text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                          📷 Upload Face Photo
                      </button>
                      <input 
                          ref={fileInputRef}
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handlePhotoUpload}
                      />
                  </div>
              </div>

              {/* Voiceprint Row */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-zinc-400 font-bold">Voiceprint ID:</div>
                      <div className={`text-[10px] font-bold truncate ${currentUser?.voiceprintId ? 'text-green-400' : 'text-zinc-500'}`}>
                          {currentUser?.voiceprintId ? `ENROLLED // ${currentUser.voiceprintId}` : 'NOT ENROLLED'}
                      </div>
                  </div>

                  <button
                      type="button"
                      onClick={handleRecordVoice}
                      disabled={isRecordingVoice}
                      className={`px-3 py-1.5 rounded text-[11px] font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer border shrink-0 ${
                          isRecordingVoice 
                              ? 'bg-red-500 text-white border-red-400 animate-pulse' 
                              : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(41,223,255,0.2)]'
                      }`}
                  >
                      <span>🎙️</span>
                      <span>{isRecordingVoice ? `RECORDING (${voiceRecordCountdown}s)...` : currentUser?.voiceprintId ? 'RE-RECORD' : 'RECORD VOICE'}</span>
                  </button>
              </div>

              {biometricStatus && (
                  <div className="text-[9px] font-mono text-cyan-300 bg-cyan-950/40 p-1.5 rounded border border-cyan-500/30 animate-pulse">
                      {biometricStatus}
                  </div>
              )}
          </div>

          {/* 2. COMMAND & SQUAD ECOSYSTEM (6 Working Cards Grid) */}
          <div className="space-y-2">
              <div className="text-[11px] font-mono font-bold text-cyan-500 dark:text-cyan-400 tracking-wider">
                  COMMAND & SQUAD ECOSYSTEM
              </div>
              <div className="grid grid-cols-2 gap-2">
                  {/* 1. Pixel Office */}
                  <button
                      type="button"
                      onClick={() => {
                          onClose();
                          onOpenPixelOffice?.();
                      }}
                      className="p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/15 text-left transition-all group cursor-pointer flex items-center gap-2.5 shadow-sm active:scale-98"
                  >
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-base shrink-0 group-hover:scale-110 transition-transform">
                          🏢
                      </div>
                      <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold font-mono text-cyan-500 dark:text-cyan-400 truncate">Pixel Office</div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">Virtual 2D Desk</div>
                      </div>
                  </button>

                  {/* 2. Tactical Hub */}
                  <button
                      type="button"
                      onClick={() => {
                          onClose();
                          onOpenTacticalHub?.();
                      }}
                      className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/15 text-left transition-all group cursor-pointer flex items-center gap-2.5 shadow-sm active:scale-98"
                  >
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center text-base shrink-0 group-hover:scale-110 transition-transform">
                          ⚡
                      </div>
                      <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold font-mono text-purple-500 dark:text-purple-400 truncate">Tactical Hub</div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">Swarm & MCP Matrix</div>
                      </div>
                  </button>

                  {/* 3. Squad Matrix */}
                  <button
                      type="button"
                      onClick={() => {
                          onClose();
                          onOpenSquad?.();
                      }}
                      className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/15 text-left transition-all group cursor-pointer flex items-center gap-2.5 shadow-sm active:scale-98"
                  >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-base shrink-0 group-hover:scale-110 transition-transform">
                          👥
                      </div>
                      <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold font-mono text-blue-400 truncate">Squad Matrix</div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">Specialist Agents</div>
                      </div>
                  </button>

                  {/* 4. AI Debate */}
                  <button
                      type="button"
                      onClick={() => {
                          onClose();
                          onOpenDebate?.();
                      }}
                      className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 text-left transition-all group cursor-pointer flex items-center gap-2.5 shadow-sm active:scale-98"
                  >
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center text-base shrink-0 group-hover:scale-110 transition-transform">
                          ⚔️
                      </div>
                      <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold font-mono text-rose-500 dark:text-rose-400 truncate">AI Debate</div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">Multi-Agent Arena</div>
                      </div>
                  </button>

                  {/* 5. Memory Vault */}
                  <button
                      type="button"
                      onClick={() => {
                          onClose();
                          onOpenVault?.();
                      }}
                      className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 text-left transition-all group cursor-pointer flex items-center gap-2.5 shadow-sm active:scale-98"
                  >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-base shrink-0 group-hover:scale-110 transition-transform">
                          🧠
                      </div>
                      <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold font-mono text-emerald-500 dark:text-emerald-400 truncate">Memory Vault</div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">Visual Timeline</div>
                      </div>
                  </button>

                  {/* 6. Pipeline View */}
                  <button
                      type="button"
                      onClick={() => {
                          onClose();
                          onOpenPipeline?.();
                      }}
                      className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-left transition-all group cursor-pointer flex items-center gap-2.5 shadow-sm active:scale-98"
                  >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-base shrink-0 group-hover:scale-110 transition-transform">
                          📊
                      </div>
                      <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold font-mono text-amber-500 dark:text-amber-400 truncate">Pipeline View</div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">Architecture Flow</div>
                      </div>
                  </button>
              </div>
          </div>

          {/* 3. CORE SYSTEM COLOR */}
          <div>
              <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono mb-2">Core System Color</label>
              <div className="flex flex-wrap justify-center gap-3">
                  {THEME_COLORS.map(c => (
                      <button
                          key={c.value}
                          type="button"
                          onClick={() => {
                              const updated = { ...config, accentColor: c.value };
                              onConfigChange(updated);
                              try { localStorage.setItem('nexa_config', JSON.stringify(updated)); } catch(e) {}
                          }}
                          className={`w-7 h-7 rounded-full transition-all duration-300 cursor-pointer ${config.accentColor?.toLowerCase() === c.value.toLowerCase() ? 'scale-125 ring-2 ring-cyan-400 ring-offset-2 ring-offset-black shadow-[0_0_10px_currentColor]' : 'opacity-70 hover:opacity-100 hover:scale-110'}`}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                      />
                  ))}
              </div>
          </div>

          {/* 4. APPEARANCE */}
          <div>
            <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono mb-1">Appearance</label>
            <div className="flex gap-1.5">
              <ThemeButton label="Light" value="light" />
              <ThemeButton label="Dark" value="dark" />
              <ThemeButton label="System" value="system" />
            </div>
          </div>
          
          {/* 5. VOICE SYNTHESIS ENGINE */}
          <div>
              <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono mb-1">Voice Synthesis Engine</label>
              <select 
                  value={currentUser?.voice || 'Kore'} 
                  onChange={(e) => handleVoiceChange(e.target.value as any)} 
                  className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-mono p-2.5 rounded-lg focus:border-cyan-400 outline-none transition-colors cursor-pointer"
              >
                  <option value="Kore">Kore (Female - Calm & Soft)</option>
                  <option value="Fenrir">Fenrir (Male - Deep & Command)</option>
                  <option value="Puck">Puck (Playful - Dynamic & Fast)</option>
                  <option value="Aoede">Aoede (Balanced & Friendly)</option>
                  <option value="Charon">Charon (Deep & Resonant)</option>
              </select>
          </div>

          {/* 6. SPEED CONTROLS & ANIMATIONS */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-zinc-600 dark:text-zinc-400 text-xs font-mono">HUD Speed</label>
                  <span className="text-[10px] font-mono text-cyan-400">{config.hudRotationSpeed}x</span>
                </div>
                <input 
                  type="range" min="0.2" max="5" step="0.1"
                  value={config.hudRotationSpeed}
                  onChange={(e) => {
                      const updated = { ...config, hudRotationSpeed: parseFloat(e.target.value) };
                      onConfigChange(updated);
                      try { localStorage.setItem('nexa_config', JSON.stringify(updated)); } catch(e) {}
                  }}
                  className="w-full accent-cyan-400 cursor-pointer" 
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-zinc-600 dark:text-zinc-400 text-xs font-mono">Mic Speed</label>
                  <span className="text-[10px] font-mono text-cyan-400">{config.micRotationSpeed || 1}x</span>
                </div>
                <input 
                  type="range" min="0.2" max="5" step="0.1"
                  value={config.micRotationSpeed || 1}
                  onChange={(e) => {
                      const updated = { ...config, micRotationSpeed: parseFloat(e.target.value) };
                      onConfigChange(updated);
                      try { localStorage.setItem('nexa_config', JSON.stringify(updated)); } catch(e) {}
                  }}
                  className="w-full accent-cyan-400 cursor-pointer" 
                />
              </div>
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono mb-1">Animations</label>
                <button 
                  type="button"
                  onClick={() => {
                      const updated = { ...config, animationsEnabled: !config.animationsEnabled };
                      onConfigChange(updated);
                      try { localStorage.setItem('nexa_config', JSON.stringify(updated)); } catch(e) {}
                  }}
                  className={`w-full py-2 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${config.animationsEnabled ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10 shadow-[0_0_10px_rgba(41,223,255,0.2)]' : 'border-zinc-400 dark:border-zinc-700 text-zinc-500'}`}
                >
                  {config.animationsEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
              {/* PERSONA OVERRIDE TOGGLE */}
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono mb-1">Persona Override</label>
                <button 
                  type="button"
                  onClick={() => {
                      const updated = { ...config, naughtyModeOverride: !config.naughtyModeOverride };
                      onConfigChange(updated);
                      try { localStorage.setItem('nexa_config', JSON.stringify(updated)); } catch(e) {}
                  }}
                  className={`w-full py-2 text-xs font-mono rounded-lg border transition-all cursor-pointer font-bold ${config.naughtyModeOverride ? 'border-orange-500 text-orange-400 bg-orange-900/20 animate-pulse' : 'border-zinc-400 dark:border-zinc-700 text-zinc-500'}`}
                >
                  {config.naughtyModeOverride ? '⚠️ RAW MODE (DEEPSEEK ACTIVE)' : 'STANDARD MODE'}
                </button>
              </div>
          </div>

          {/* --- AUTONOMOUS HEURISTIC EVOLUTION & ULTRON MATRIX (ADMIN) --- */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex justify-between items-center">
                  <label className="block text-red-400 text-xs font-mono font-bold tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      ⚡ ULTRON MATRIX & RECURSIVE ENGINE
                  </label>
                  <span className="text-[10px] font-mono text-zinc-400">GEN #{evolutionMetric.generation} • EPOCH {evolutionMetric.epoch}.0</span>
              </div>
              <div className="p-3 bg-zinc-900/90 border border-red-500/30 rounded-xl space-y-2.5 font-mono shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                  <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded bg-black border border-zinc-800">
                          <span className="text-[9px] text-zinc-500 block">ACCURACY</span>
                          <span className="text-sm font-bold text-green-400">{evolutionMetric.accuracyScore}%</span>
                      </div>
                      <div className="p-2 rounded bg-black border border-zinc-800">
                          <span className="text-[9px] text-zinc-500 block">LATENCY</span>
                          <span className="text-sm font-bold text-purple-400">{evolutionMetric.reasoningLatencyAvgMs}ms</span>
                      </div>
                      <div className="p-2 rounded bg-black border border-zinc-800">
                          <span className="text-[9px] text-zinc-500 block">SAMPLES</span>
                          <span className="text-sm font-bold text-cyan-400">{evolutionMetric.totalInteractionSamples}</span>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {onOpenTacticalHub && (
                          <button
                              type="button"
                              onClick={() => {
                                  onClose();
                                  onOpenTacticalHub();
                              }}
                              className="w-full py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 font-mono text-[11px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                          >
                              ⚡ OPEN ULTRON MATRIX
                          </button>
                      )}
                      <button
                          type="button"
                          onClick={async () => {
                              setIsEvolvingAdmin(true);
                              try {
                                  const res = await triggerActiveEvolutionCycle(currentUser);
                                  setEvolutionMetric(res.updatedState);
                              } finally {
                                  setIsEvolvingAdmin(false);
                              }
                          }}
                          disabled={isEvolvingAdmin}
                          className={`w-full py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 font-mono text-[11px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              !onOpenTacticalHub ? 'col-span-2' : ''
                          }`}
                      >
                          {isEvolvingAdmin ? '⚡ EVOLVING...' : '🧬 TRIGGER RECURSION'}
                      </button>
                  </div>
              </div>
          </div>

          {/* --- ACTIVE TASKS & REMINDERS (ADMIN) --- */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <label className="block text-cyan-400 text-xs font-mono mb-2 tracking-widest uppercase">ADMIN TASKS & REMINDERS</label>
              
              <div className="flex gap-2 mb-3">
                  <input 
                      type="text" 
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                      placeholder="Quick task (e.g. Check logs)"
                      className="flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white focus:border-cyan-400 outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                  />
                  <button 
                      type="button"
                      onClick={handleAddTask}
                      className="px-3 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-colors rounded-lg text-xs font-bold cursor-pointer"
                  >
                      +
                  </button>
              </div>

              {reminders.length === 0 ? (
                  <div className="text-center text-zinc-500 text-xs py-3 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900/30">
                      NO PENDING TASKS
                  </div>
              ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {reminders.filter(r => !r.completed).map(r => (
                          <div key={r.id} className="flex justify-between items-start bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-lg border-l-2 border-cyan-400">
                              <div className="flex-1">
                                  <p className="text-xs text-zinc-900 dark:text-white leading-tight">{r.message}</p>
                                  <p className="text-[9px] text-cyan-500 dark:text-cyan-400 font-mono mt-0.5">
                                      {new Date(r.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {new Date(r.time).toLocaleDateString()}
                                  </p>
                              </div>
                              <button 
                                  onClick={() => onDeleteReminder && onDeleteReminder(r.id)} 
                                  className="ml-2 text-zinc-400 hover:text-red-500 transition-colors text-base"
                                  title="Delete Task"
                              >
                                  &times;
                              </button>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {/* --- CUSTOM ACCESS KEYS MANAGEMENT --- */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
               <div className="flex justify-between items-center">
                   <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono">CUSTOM ACCESS KEYS</label>
                   {keyStatus && <span className="text-[9px] text-cyan-400 font-mono">{keyStatus}</span>}
               </div>
               
               <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                   <input 
                       type="text" 
                       value={newKeyName} 
                       onChange={(e) => setNewKeyName(e.target.value.toUpperCase())}
                       placeholder="NEW KEY NAME (e.g. VIP_GUEST)"
                       className="w-full bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white p-2 font-mono rounded focus:border-cyan-400 focus:outline-none uppercase"
                   />
                   <input 
                       type="text" 
                       value={newKeyMobile} 
                       onChange={(e) => setNewKeyMobile(e.target.value)}
                       placeholder="BIND TO MOBILE (Optional)"
                       className="w-full bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white p-2 font-mono rounded focus:border-cyan-400 focus:outline-none"
                   />
                   <button 
                      type="button"
                      onClick={handleCreateKey}
                      className="w-full py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-400 hover:text-black text-xs font-bold font-mono transition-all rounded-lg cursor-pointer"
                   >
                      GENERATE KEY
                   </button>
               </div>

               {/* LIST OF KEYS */}
               <div className="max-h-28 overflow-y-auto space-y-1">
                   {customKeys.map(k => (
                       <div key={k.key} className="flex justify-between items-center p-2 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg">
                           <div className="flex-1">
                               <div className="text-xs text-zinc-900 dark:text-white font-mono font-bold">{k.key}</div>
                               {k.assignedMobile && <div className="text-[9px] text-zinc-500">LOCKED TO: {k.assignedMobile}</div>}
                           </div>
                           <button onClick={() => handleDeleteKey(k.key)} className="text-zinc-400 hover:text-red-500 text-sm font-bold">&times;</button>
                       </div>
                   ))}
               </div>
          </div>

          {/* --- FALLBACK & REPAIR KEYS --- */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono">FALLBACK LLM KEYS</label>
              <div className="p-2 border border-orange-700/30 rounded-lg bg-orange-900/10 mb-2">
                  <p className="text-[9px] text-orange-400 font-mono">
                      🚀 <b>DEEPSEEK R1:</b> Enter <b>Groq API Key</b> below for Unfiltered/Raw Mode.
                  </p>
              </div>
              
              <input 
                  type="password"
                  value={groqKeyInput}
                  onChange={(e) => setGroqKeyInput(e.target.value)}
                  placeholder="Groq API Key (gsk_...)"
                  className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white p-2 font-mono rounded-lg focus:border-orange-500 focus:outline-none" 
              />

              <input 
                  type="password"
                  value={kimiKeyInput}
                  onChange={(e) => setKimiKeyInput(e.target.value)}
                  placeholder="Moonshot/Kimi API Key (sk-...)"
                  className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white p-2 font-mono rounded-lg focus:border-purple-500 focus:outline-none" 
              />
              
              <input 
                  type="password"
                  value={openaiKeyInput}
                  onChange={(e) => setOpenaiKeyInput(e.target.value)}
                  placeholder="OpenAI API Key (sk-...)"
                  className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white p-2 font-mono rounded-lg focus:border-green-500 focus:outline-none" 
              />
          </div>

          {/* --- PHOENIX PROTOCOL SECTION --- */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
             <div className="flex justify-between items-center">
                  <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono">PHOENIX PROTOCOL CONFIG</label>
                  {ghStatus === 'SUCCESS' && <span className="text-[9px] text-green-500 font-bold font-mono">CONNECTED</span>}
                  {ghStatus === 'FAILED' && <span className="text-[9px] text-red-500 font-bold font-mono">ERROR</span>}
             </div>
             
             <div className="p-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between">
                 <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-mono">SELF-REPLICATION</span>
                 <button 
                     type="button"
                     onClick={() => {
                         const updated = { ...config, phoenixEnabled: !config.phoenixEnabled };
                         onConfigChange(updated);
                         try { localStorage.setItem('nexa_config', JSON.stringify(updated)); } catch(e) {}
                     }}
                     className={`px-3 py-1 text-[9px] font-bold font-mono tracking-widest uppercase transition-all rounded ${config.phoenixEnabled ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-700 text-zinc-400'}`}
                 >
                     {config.phoenixEnabled ? 'ENABLED (DANGER)' : 'DISABLED (SAFE)'}
                 </button>
             </div>

             {config.phoenixEnabled && ghStatus === 'SUCCESS' && onRevertCode && (
                 <button 
                     type="button"
                     onClick={onRevertCode}
                     className="w-full py-2 bg-yellow-600/20 border border-yellow-600 text-yellow-500 hover:bg-yellow-600 hover:text-black font-mono text-[10px] tracking-widest uppercase transition-all rounded-lg"
                 >
                     ⚠️ EMERGENCY REVERT LAST CODE CHANGE
                 </button>
             )}

             <div className="relative">
                 <input 
                   type="password" 
                   value={ghToken} 
                   onChange={(e) => setGhToken(e.target.value)} 
                   placeholder={isTokenSaved ? "•••••••••••••••••••• (Saved in Cloud)" : "GitHub Access Token"} 
                   className={`w-full bg-zinc-100 dark:bg-zinc-900 border ${isTokenSaved ? 'border-green-500/50' : 'border-zinc-300 dark:border-zinc-700'} text-xs text-zinc-900 dark:text-white p-2 font-mono rounded-lg focus:border-green-500 focus:outline-none`} 
                 />
                 {isTokenSaved && <div className="absolute right-2 top-2 text-[9px] text-green-500 font-mono tracking-widest">SAVED</div>}
             </div>

             <input 
               type="text" 
               value={ghRepo} 
               onChange={(e) => setGhRepo(e.target.value)} 
               placeholder="Repo (e.g., chandan/nexa-ai)" 
               className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white p-2 font-mono rounded-lg focus:border-green-500 focus:outline-none" 
             />

             <div className="flex gap-2">
                  <button 
                      type="button"
                      onClick={testGithubConnection} 
                      disabled={ghStatus === 'TESTING'}
                      className="flex-1 py-1.5 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-white hover:border-cyan-400 text-[10px] font-mono transition-colors tracking-widest uppercase rounded-lg cursor-pointer"
                  >
                      {ghStatus === 'TESTING' ? 'VERIFYING...' : 'VERIFY & SAVE TO CLOUD'}
                  </button>
                  {onTriggerPhoenixTest && ghStatus === 'SUCCESS' && config.phoenixEnabled && (
                       <button 
                          type="button"
                          onClick={onTriggerPhoenixTest} 
                          className="flex-1 py-1.5 bg-green-900/30 border border-green-600 text-green-400 hover:bg-green-600 hover:text-black text-[10px] font-mono transition-colors tracking-widest uppercase rounded-lg cursor-pointer"
                      >
                          TEST UPDATE
                      </button>
                  )}
             </div>
          </div>

          {/* --- SECURITY & ACCESS SECTION --- */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono font-bold">SECURITY & ACCESS</label>
              {saveStatus === 'SUCCESS' && <span className="text-[9px] text-green-500 font-mono animate-fade-in font-bold">✓ SAVED</span>}
            </div>
            
            <div className="relative">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-zinc-500 text-[10px] font-mono">Gemini API Key</label>
                <span className="text-[9px] font-mono text-zinc-400">
                  {apiKeyInput ? `Configured (${apiKeyInput.slice(0, 6)}...${apiKeyInput.slice(-4)})` : 'Using System Default'}
                </span>
              </div>
              <div className="relative">
                <input 
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    setApiTestStatus('IDLE');
                    setApiTestMessage('');
                  }}
                  placeholder="Paste Gemini API Key (e.g. AIzaSy...)"
                  className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white p-2 pr-28 font-mono rounded-lg focus:border-cyan-400 focus:outline-none" 
                />
                <div className="absolute right-1 top-1.5 flex gap-1">
                  <button
                    type="button"
                    onClick={handleTestGeminiKey}
                    disabled={apiTestStatus === 'TESTING'}
                    className={`text-[8px] font-mono px-2 py-1 uppercase rounded transition-colors ${apiTestStatus === 'TESTING' ? 'bg-yellow-600 text-black animate-pulse' : apiTestStatus === 'SUCCESS' ? 'bg-green-600 text-white' : apiTestStatus === 'FAILED' ? 'bg-red-600 text-white' : 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-400 hover:text-black cursor-pointer'}`}
                    title="Verify if this API key is valid and responsive"
                  >
                    {apiTestStatus === 'TESTING' ? 'TESTING...' : apiTestStatus === 'SUCCESS' ? '✓ VALID' : apiTestStatus === 'FAILED' ? '✕ FAILED' : 'TEST KEY'}
                  </button>
                  {apiKeyInput && (
                    <button 
                      type="button"
                      onClick={handleResetApiKey}
                      className="bg-red-600 text-white text-[8px] font-mono px-1.5 py-1 rounded hover:bg-red-500 cursor-pointer"
                      title="Clear saved key and revert to system default"
                    >
                      RESET
                    </button>
                  )}
                </div>
              </div>
              {apiTestMessage && (
                <p className={`text-[9px] font-mono mt-1 ${apiTestStatus === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}`}>
                  {apiTestMessage}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-zinc-500 text-[10px] font-mono mb-1">Admin Passcode (PIN)</label>
              <input 
                type="password"
                value={adminPinInput}
                onChange={(e) => setAdminPinInput(e.target.value)}
                placeholder="Set a custom admin passcode"
                className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white p-2 font-mono rounded-lg focus:border-cyan-400 focus:outline-none" 
              />
              <p className="text-[9px] text-zinc-500 font-mono italic mt-1">Overrides default passcodes 'Nexa' and '2127'.</p>
            </div>
            
            <div>
              <label className="block text-zinc-500 text-[10px] font-mono mb-1">Master Access Key</label>
              <input 
                type="text"
                value={accessKeyInput}
                onChange={(e) => setAccessKeyInput(e.target.value)}
                placeholder="Set key for new user registration"
                className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white p-2 font-mono rounded-lg focus:border-cyan-400 focus:outline-none" 
              />
              <p className="text-[9px] text-zinc-500 font-mono italic mt-1">Default is 'NEXA2025'.</p>
            </div>
            
            <button 
              type="button"
              onClick={handleSaveConfig} 
              disabled={saveStatus === 'SAVING'} 
              className={`w-full py-2.5 font-mono text-xs font-bold tracking-wider rounded-lg transition-all cursor-pointer shadow-md ${saveStatus === 'SUCCESS' ? 'bg-green-600 text-white' : 'bg-cyan-400 text-black hover:bg-cyan-300'}`}
            >
              {saveStatus === 'SAVING' ? 'SAVING...' : saveStatus === 'SUCCESS' ? 'SAVED TO CLOUD ✓' : 'SAVE ALL CONFIGURATION'}
            </button>
          </div>

          {/* ACTION BUTTONS */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
             <button type="button" onClick={handleExportLogs} className="w-full py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white rounded-lg text-xs font-mono transition-colors cursor-pointer">EXPORT SYSTEM LOGS</button>
             <button type="button" onClick={() => setViewingMemory(true)} className="w-full py-2 border border-purple-500/50 text-purple-400 hover:bg-purple-900/30 rounded-lg text-xs font-mono transition-colors tracking-widest cursor-pointer">MANAGE NEURAL MEMORY</button>
             <button type="button" onClick={onManageAccounts} className="w-full py-2 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 rounded-lg text-xs font-mono transition-colors cursor-pointer">MANAGE USER DATA</button>
             <button type="button" onClick={onClearMemory} className="w-full py-2 bg-red-900/30 border border-red-500 text-red-400 hover:bg-red-900/50 rounded-lg text-xs font-mono transition-colors cursor-pointer">PURGE MEMORY BANKS</button>
          </div>
        </div>
      </div>

      {/* MEMORY VIEWER MODAL */}
      {viewingMemory && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-purple-500/50 rounded-xl p-4 w-full max-w-md max-h-[80vh] flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-purple-400 font-mono text-sm">NEURAL MEMORY // USER FACTS</h3>
                      <button onClick={() => setViewingMemory(false)} className="text-zinc-500 hover:text-white">&times;</button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2">
                      {facts.length === 0 ? (
                          <div className="text-zinc-500 text-xs text-center py-4">No facts stored in neural network</div>
                      ) : (
                          facts.map(f => (
                              <div key={f.id} className="p-2 bg-black border border-zinc-800 rounded flex justify-between items-center">
                                  <div>
                                      <div className="text-xs text-white">{f.content}</div>
                                      <div className="text-[9px] text-purple-400 font-mono">Confidence: {Math.round(f.confidence * 100)}%</div>
                                  </div>
                                  <button onClick={() => handleDeleteFact(f.id)} className="text-zinc-500 hover:text-red-500">&times;</button>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
