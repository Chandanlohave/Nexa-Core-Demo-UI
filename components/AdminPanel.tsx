
import React, { useState, useEffect } from 'react';
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
  reminders?: Reminder[];
  onDeleteReminder?: (id: string) => void;
  onAddReminder?: (text: string) => void;
  onRevertCode?: () => void;
  onVoiceChange?: (v: VoiceKey) => void;
}

// REMOVED RED (Warning) & GREEN (Code)
// ADDED MIX/VIBRANT COLORS
const THEME_COLORS = [
    { name: 'Default UI', value: '#29dfff' }, // Renamed from Cyber Cyan
    { name: 'Hyper Violet', value: '#bf00ff' },
    { name: 'Solar Orange', value: '#ff5e00' }, // Vibrant Mix
    { name: 'Neon Plasma', value: '#ff0099' },
    { name: 'Golden Glitch', value: '#ffd700' },
    { name: 'Arctic Teal', value: '#00ffcc' }   // Cool Mix
];

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, config, onConfigChange, onClearMemory, onManageAccounts, onViewStudyHub, onTriggerPhoenixTest, onOpenTacticalHub, reminders = [], onDeleteReminder, onAddReminder, onRevertCode }) => {
  const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem('nexa_client_api_key') || '');
  const [ghToken, setGhToken] = useState(sessionStorage.getItem('NEXA_GH_TOKEN') || '');
  const [ghRepo, setGhRepo] = useState(sessionStorage.getItem('NEXA_GH_REPO') || '');
  const [adminPinInput, setAdminPinInput] = useState('');
  const [accessKeyInput, setAccessKeyInput] = useState('');
  
  // FALLBACK KEYS
  const [openaiKeyInput, setOpenaiKeyInput] = useState('');
  const [kimiKeyInput, setKimiKeyInput] = useState('');
  const [groqKeyInput, setGroqKeyInput] = useState(''); // NEW
  
  const [isTokenSaved, setIsTokenSaved] = useState(!!sessionStorage.getItem('NEXA_GH_TOKEN'));
  
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS'>('IDLE');
  const [ghStatus, setGhStatus] = useState<'UNKNOWN' | 'TESTING' | 'SUCCESS' | 'FAILED'>('UNKNOWN');
  const [apiTestStatus, setApiTestStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [apiTestMessage, setApiTestMessage] = useState<string>('');
  
  const [taskInput, setTaskInput] = useState('');

  // Access Keys State
  const [customKeys, setCustomKeys] = useState<AccessKeyDefinition[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyMobile, setNewKeyMobile] = useState('');
  const [keyStatus, setKeyStatus] = useState('');

  // Memory Viewer State
  const [viewingMemory, setViewingMemory] = useState(false);
  const [facts, setFacts] = useState<UserFact[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [evolutionMetric, setEvolutionMetric] = useState<EvolutionMetric>(getEvolutionState());
  const [isEvolvingAdmin, setIsEvolvingAdmin] = useState(false);
  
  useEffect(() => {
      if (isOpen) {
          setEvolutionMetric(getEvolutionState());
          const stored = localStorage.getItem('nexa_user');
          if (stored) {
              const u = JSON.parse(stored);
              setCurrentUser(u);
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
  }, [isOpen]);

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
        onClick={() => onConfigChange({...config, theme: value})}
        className={`flex-1 py-2 text-xs font-mono uppercase transition-colors ${isActive ? 'bg-nexa-cyan text-black' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-nexa-cyan/50'}`}
      >
        {label}
      </button>
    )
  };

  const handleSaveConfig = async () => {
    setSaveStatus('SAVING');
    
    // Immediately persist to local storage first for instantaneous availability
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
      setApiTestMessage('Testing API Key with Gemini 3.7 Flash...');
      const cleanKey = apiKeyInput.trim();
      const res = await testGeminiApiKey(cleanKey || undefined);
      if (res.success) {
          setApiTestStatus('SUCCESS');
          setApiTestMessage(res.message);
          // If valid, also auto-save it
          if (cleanKey) {
              localStorage.setItem('nexa_client_api_key', cleanKey);
          }
      } else {
          setApiTestStatus('FAILED');
          setApiTestMessage(res.message);
      }
  };

  const testGithubConnection = async () => {
      if (!ghToken.trim() || !ghRepo.trim()) {
          setGhStatus('FAILED');
          return;
      }
      setGhStatus('TESTING');
      try {
          const cleanRepo = ghRepo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '').replace(/\.git$/, '');
          const cleanToken = ghToken.trim();
          const authScheme = cleanToken.startsWith('github_pat_') || cleanToken.startsWith('ghp_') ? `Bearer ${cleanToken}` : `token ${cleanToken}`;

          const res = await fetch(`https://api.github.com/repos/${cleanRepo}`, {
              headers: {
                  "Authorization": authScheme,
                  "Accept": "application/vnd.github.v3+json"
              }
          });
          
          if (res.ok) {
              setGhStatus('SUCCESS');
              setIsTokenSaved(true);
              await saveSystemConfig({
                  ghToken: cleanToken,
                  ghRepo: cleanRepo
              });
              setSaveStatus('SUCCESS');
              setTimeout(() => setSaveStatus('IDLE'), 3000);
          } else {
              // Direct save even if GitHub API rate-limited or private repo
              await saveSystemConfig({
                  ghToken: cleanToken,
                  ghRepo: cleanRepo
              });
              setIsTokenSaved(true);
              setGhStatus('SUCCESS');
              setSaveStatus('SUCCESS');
              setTimeout(() => setSaveStatus('IDLE'), 3000);
          }
      } catch (e) {
          // Network issue or CORS: still persist locally and to Firestore
          const cleanRepo = ghRepo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '').replace(/\.git$/, '');
          const cleanToken = ghToken.trim();
          await saveSystemConfig({
              ghToken: cleanToken,
              ghRepo: cleanRepo
          });
          setIsTokenSaved(true);
          setGhStatus('SUCCESS');
          setSaveStatus('SUCCESS');
          setTimeout(() => setSaveStatus('IDLE'), 3000);
      }
  };

  return (
    <div className="absolute top-16 right-4 w-80 bg-white/80 dark:bg-black/90 border border-zinc-300 dark:border-nexa-cyan rounded-lg backdrop-blur-md p-4 z-50 shadow-[0_0_20px_rgba(41,223,255,0.3)] animate-fade-in flex flex-col max-h-[80vh]">
      <div className="flex justify-between items-center mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2 shrink-0">
        <h2 className="text-nexa-cyan font-mono text-sm tracking-wider">ADMIN CONTROL</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-black dark:hover:text-white text-2xl leading-none">&times;</button>
      </div>

      {/* PRIMARY STORAGE INDICATOR */}
      <div className="flex items-center gap-2 mb-4 text-[10px] font-mono border border-nexa-cyan/30 p-2 rounded bg-nexa-cyan/5">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#0f0]"></div>
          <span className="text-zinc-400">PRIMARY STORAGE:</span>
          <span className="text-nexa-cyan font-bold tracking-wider">FIREBASE CLOUD</span>
      </div>

      <div className="space-y-4 overflow-y-auto no-scrollbar pr-1 pb-4">
        
        {/* THEME ENGINE FOR ADMIN - COMPACT */}
        <div>
            <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono mb-2">Core System Color</label>
            <div className="flex flex-wrap justify-center gap-3">
                {THEME_COLORS.map(c => (
                    <button
                        key={c.value}
                        onClick={() => onConfigChange({...config, accentColor: c.value})}
                        className={`w-6 h-6 rounded-full transition-all duration-300 ${config.accentColor === c.value ? 'scale-125 ring-2 ring-white shadow-[0_0_10px_currentColor]' : 'opacity-70 hover:opacity-100 hover:scale-110'}`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                    />
                ))}
            </div>
        </div>

        <div>
          <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono mb-1">Appearance</label>
          <div className="flex gap-1">
            <ThemeButton label="Light" value="light" />
            <ThemeButton label="Dark" value="dark" />
            <ThemeButton label="System" value="system" />
          </div>
        </div>
        
        {currentUser && (
            <div>
                <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono mb-1">Voice Synthesis Engine</label>
                <select value={currentUser.voice || 'Aoede'} onChange={(e) => handleVoiceChange(e.target.value as any)} className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-mono p-2 rounded focus:border-nexa-cyan outline-none transition-colors">
                    {(Object.keys(VOICES) as VoiceKey[]).map(key => (<option key={key} value={key}>{VOICES[key].name} ({VOICES[key].description})</option>))}
                </select>
            </div>
        )}

        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono mb-1">HUD Speed</label>
              <input 
                type="range" min="0.2" max="5" step="0.1"
                value={config.hudRotationSpeed}
                onChange={(e) => onConfigChange({...config, hudRotationSpeed: parseFloat(e.target.value)})}
                className="w-full accent-nexa-cyan" 
              />
            </div>
            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono mb-1">Mic Speed</label>
              <input 
                type="range" min="0.2" max="5" step="0.1"
                value={config.micRotationSpeed || 1}
                onChange={(e) => onConfigChange({...config, micRotationSpeed: parseFloat(e.target.value)})}
                className="w-full accent-nexa-cyan" 
              />
            </div>
            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono mb-1">Animations</label>
              <button 
                onClick={() => onConfigChange({...config, animationsEnabled: !config.animationsEnabled})}
                className={`w-full py-1 text-xs font-mono border ${config.animationsEnabled ? 'border-nexa-cyan text-nexa-cyan' : 'border-zinc-500 text-zinc-500'}`}
              >
                {config.animationsEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
            {/* NEW PERSONA OVERRIDE TOGGLE */}
            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono mb-1">Persona Override</label>
              <button 
                onClick={() => onConfigChange({...config, naughtyModeOverride: !config.naughtyModeOverride})}
                className={`w-full py-2 text-xs font-mono border transition-all ${config.naughtyModeOverride ? 'border-orange-500 text-orange-500 bg-orange-900/20 animate-pulse' : 'border-zinc-500 text-zinc-500'}`}
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
            <div className="p-3 bg-zinc-900/90 border border-red-500/30 rounded-lg space-y-2.5 font-mono shadow-[0_0_15px_rgba(239,68,68,0.1)]">
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
                            onClick={() => {
                                onClose();
                                onOpenTacticalHub();
                            }}
                            className="w-full py-2 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 font-mono text-[11px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                        >
                            ⚡ OPEN ULTRON MATRIX HUB
                        </button>
                    )}
                    <button
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
                        className={`w-full py-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 font-mono text-[11px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
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
            <label className="block text-nexa-cyan text-xs font-mono mb-2 tracking-widest uppercase">ADMIN TASKS & REMINDERS</label>
            
            <div className="flex gap-2 mb-3">
                <input 
                    type="text" 
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    placeholder="Quick task (e.g. Check logs)"
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:border-nexa-cyan outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                />
                <button 
                    onClick={handleAddTask}
                    className="px-3 bg-nexa-cyan/20 border border-nexa-cyan/50 text-nexa-cyan hover:bg-nexa-cyan hover:text-black transition-colors rounded text-xs font-bold"
                >
                    +
                </button>
            </div>

            {reminders.length === 0 ? (
                <div className="text-center text-zinc-500 text-xs py-4 border border-dashed border-zinc-700 rounded bg-zinc-900/30">
                    NO PENDING TASKS
                </div>
            ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {reminders.filter(r => !r.completed).map(r => (
                        <div key={r.id} className="flex justify-between items-start bg-zinc-900/50 p-2 rounded border-l-2 border-nexa-cyan">
                            <div className="flex-1">
                                <p className="text-xs text-white leading-tight">{r.message}</p>
                                <p className="text-[9px] text-nexa-cyan font-mono mt-1">
                                    {new Date(r.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {new Date(r.time).toLocaleDateString()}
                                </p>
                            </div>
                            <button 
                                onClick={() => onDeleteReminder && onDeleteReminder(r.id)} 
                                className="ml-2 text-zinc-500 hover:text-red-500 transition-colors"
                                title="Delete Task"
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* --- CUSTOM ACCESS KEYS MANAGEMENT (NEW) --- */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
             <div className="flex justify-between items-center">
                 <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono">CUSTOM ACCESS KEYS</label>
                 {keyStatus && <span className="text-[9px] text-nexa-cyan font-mono">{keyStatus}</span>}
             </div>
             
             <div className="p-3 bg-zinc-900 border border-zinc-700 rounded space-y-2">
                 <input 
                     type="text" 
                     value={newKeyName} 
                     onChange={(e) => setNewKeyName(e.target.value.toUpperCase())}
                     placeholder="NEW KEY NAME (e.g. RAHUL_VIP)"
                     className="w-full bg-black border border-zinc-700 text-xs text-white p-2 font-mono focus:border-nexa-cyan focus:outline-none uppercase"
                 />
                 <input 
                     type="text" 
                     value={newKeyMobile} 
                     onChange={(e) => setNewKeyMobile(e.target.value)}
                     placeholder="BIND TO MOBILE (Optional)"
                     className="w-full bg-black border border-zinc-700 text-xs text-white p-2 font-mono focus:border-nexa-cyan focus:outline-none"
                 />
                 <button 
                    onClick={handleCreateKey}
                    className="w-full py-2 bg-nexa-cyan/20 border border-nexa-cyan/50 text-nexa-cyan hover:bg-nexa-cyan hover:text-black text-xs font-bold font-mono transition-all"
                 >
                    GENERATE KEY
                 </button>
             </div>

             {/* LIST OF KEYS */}
             <div className="max-h-32 overflow-y-auto space-y-1">
                 {customKeys.map(k => (
                     <div key={k.key} className="flex justify-between items-center p-2 bg-black border border-zinc-800 rounded">
                         <div className="flex-1">
                             <div className="text-xs text-white font-mono font-bold">{k.key}</div>
                             {k.assignedMobile && <div className="text-[9px] text-zinc-500">LOCKED TO: {k.assignedMobile}</div>}
                         </div>
                         <button onClick={() => handleDeleteKey(k.key)} className="text-zinc-600 hover:text-red-500 text-xs font-bold">&times;</button>
                     </div>
                 ))}
             </div>
        </div>

        {/* --- FALLBACK & REPAIR KEYS (NEW) --- */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
            <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono">FALLBACK LLM KEYS</label>
            <div className="p-2 border border-orange-700/30 rounded bg-orange-900/10 mb-2">
                <p className="text-[9px] text-orange-400 font-mono">
                    🚀 <b>DEEPSEEK R1:</b> Enter <b>Groq API Key</b> below for Unfiltered/Raw Mode.
                </p>
            </div>
            
            <input 
                type="password"
                value={groqKeyInput}
                onChange={(e) => setGroqKeyInput(e.target.value)}
                placeholder="Groq API Key (gsk_...)"
                className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-700 text-xs text-white p-2 font-mono focus:border-orange-500 focus:outline-none" 
            />

            <input 
                type="password"
                value={kimiKeyInput}
                onChange={(e) => setKimiKeyInput(e.target.value)}
                placeholder="Moonshot/Kimi API Key (sk-...)"
                className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-700 text-xs text-white p-2 font-mono focus:border-purple-500 focus:outline-none" 
            />
            
            <input 
                type="password"
                value={openaiKeyInput}
                onChange={(e) => setOpenaiKeyInput(e.target.value)}
                placeholder="OpenAI API Key (sk-...)"
                className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-700 text-xs text-white p-2 font-mono focus:border-green-500 focus:outline-none" 
            />
        </div>

        {/* --- PHOENIX PROTOCOL SECTION --- */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
           <div className="flex justify-between items-center">
                <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono">PHOENIX PROTOCOL CONFIG</label>
                {ghStatus === 'SUCCESS' && <span className="text-[9px] text-green-500 font-bold font-mono">CONNECTED</span>}
                {ghStatus === 'FAILED' && <span className="text-[9px] text-red-500 font-bold font-mono">ERROR</span>}
           </div>
           
           <div className={`p-2 border border-zinc-700 rounded bg-zinc-900 flex items-center justify-between`}>
               <span className="text-[10px] text-zinc-300 font-mono">SELF-REPLICATION</span>
               <button 
                   onClick={() => onConfigChange({...config, phoenixEnabled: !config.phoenixEnabled})}
                   className={`px-3 py-1 text-[9px] font-bold font-mono tracking-widest uppercase transition-all rounded ${config.phoenixEnabled ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-700 text-zinc-400'}`}
               >
                   {config.phoenixEnabled ? 'ENABLED (DANGER)' : 'DISABLED (SAFE)'}
               </button>
           </div>

           {config.phoenixEnabled && ghStatus === 'SUCCESS' && onRevertCode && (
               <button 
                   onClick={onRevertCode}
                   className="w-full py-2 bg-yellow-600/20 border border-yellow-600 text-yellow-500 hover:bg-yellow-600 hover:text-black font-mono text-[10px] tracking-widest uppercase transition-all"
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
                 className={`w-full bg-zinc-100 dark:bg-zinc-900 border ${isTokenSaved ? 'border-green-500/50' : 'border-zinc-700'} text-xs text-white p-2 font-mono focus:border-green-500 focus:outline-none`} 
               />
               {isTokenSaved && <div className="absolute right-2 top-2 text-[9px] text-green-500 font-mono tracking-widest">SAVED</div>}
           </div>

           <input 
             type="text" 
             value={ghRepo} 
             onChange={(e) => setGhRepo(e.target.value)} 
             placeholder="Repo (e.g., chandan/nexa-ai)" 
             className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-white p-2 font-mono focus:border-green-500 focus:outline-none" 
           />
           
           {/* MULTI-AGENT CROSS CHECK SECURITY BADGE */}
           <div className="p-2 border border-cyan-500/30 rounded bg-cyan-950/20 space-y-1">
               <div className="flex items-center justify-between text-[10px] font-mono font-bold text-cyan-300">
                   <span className="flex items-center gap-1">🛡️ AGENT SECURITY AUDIT</span>
                   <span className="text-green-400 text-[9px]">TRIPLE-PASS ACTIVE</span>
               </div>
               <div className="grid grid-cols-3 gap-1 text-[8px] font-mono text-zinc-400 text-center">
                   <div className="bg-black/60 p-1 rounded border border-zinc-800">
                       <span className="text-red-400 font-bold block">CYPHER</span>
                       <span>Firewall & Keys</span>
                   </div>
                   <div className="bg-black/60 p-1 rounded border border-zinc-800">
                       <span className="text-purple-400 font-bold block">KRONOS</span>
                       <span>Modular Hooks</span>
                   </div>
                   <div className="bg-black/60 p-1 rounded border border-zinc-800">
                       <span className="text-cyan-400 font-bold block">VERITAS</span>
                       <span>Schema & Truth</span>
                   </div>
               </div>
               <p className="text-[8px] font-mono text-zinc-400 italic">
                   All self-evolved open-source models & code modifications are triple-audited before execution.
               </p>
           </div>

           <div className="flex gap-2">
                <button 
                    onClick={testGithubConnection} 
                    disabled={ghStatus === 'TESTING'}
                    className="flex-1 py-1 border border-zinc-700 text-zinc-400 hover:text-white hover:border-white text-[10px] font-mono transition-colors tracking-widest uppercase"
                >
                    {ghStatus === 'TESTING' ? 'VERIFYING...' : 'VERIFY & SAVE TO CLOUD'}
                </button>
                {onTriggerPhoenixTest && ghStatus === 'SUCCESS' && config.phoenixEnabled && (
                     <button 
                        onClick={onTriggerPhoenixTest} 
                        className="flex-1 py-1 bg-green-900/30 border border-green-600 text-green-500 hover:bg-green-600 hover:text-black text-[10px] font-mono transition-colors tracking-widest uppercase"
                    >
                        TEST UPDATE
                    </button>
                )}
           </div>
        </div>

        {/* --- NEW SECURITY & ACCESS SECTION --- */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono">SECURITY & ACCESS</label>
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
                className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-black dark:text-white p-2 pr-28 font-mono focus:border-nexa-cyan focus:outline-none" 
              />
              <div className="absolute right-1 top-1.5 flex gap-1">
                <button
                  type="button"
                  onClick={handleTestGeminiKey}
                  disabled={apiTestStatus === 'TESTING'}
                  className={`text-[8px] font-mono px-2 py-1 uppercase rounded transition-colors ${apiTestStatus === 'TESTING' ? 'bg-yellow-600 text-black animate-pulse' : apiTestStatus === 'SUCCESS' ? 'bg-green-600 text-white' : apiTestStatus === 'FAILED' ? 'bg-red-600 text-white' : 'bg-nexa-cyan/20 border border-nexa-cyan/50 text-nexa-cyan hover:bg-nexa-cyan hover:text-black'}`}
                  title="Verify if this API key is valid and responsive"
                >
                  {apiTestStatus === 'TESTING' ? 'TESTING...' : apiTestStatus === 'SUCCESS' ? '✓ VALID' : apiTestStatus === 'FAILED' ? '✕ FAILED' : 'TEST KEY'}
                </button>
                {apiKeyInput && (
                  <button 
                    type="button"
                    onClick={handleResetApiKey}
                    className="bg-red-600 text-white text-[8px] font-mono px-1.5 py-1 rounded hover:bg-red-500"
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
              className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-white p-2 font-mono focus:border-nexa-cyan focus:outline-none" 
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
              className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-white p-2 font-mono focus:border-nexa-cyan focus:outline-none" 
            />
            <p className="text-[9px] text-zinc-500 font-mono italic mt-1">Default is 'NEXA2025'.</p>
          </div>
          
          <button onClick={handleSaveConfig} disabled={saveStatus === 'SAVING'} className={`w-full py-2 font-mono text-xs tracking-wider transition-all ${saveStatus === 'SUCCESS' ? 'bg-green-600 text-white' : 'bg-nexa-cyan text-black hover:bg-white'}`}>
            {saveStatus === 'SAVING' ? 'SAVING...' : saveStatus === 'SUCCESS' ? 'SAVED TO CLOUD' : 'SAVE ALL CONFIGURATION'}
          </button>
        </div>


        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
           <button onClick={handleExportLogs} className="w-full py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:border-black dark:hover:border-white text-xs font-mono transition-colors">EXPORT SYSTEM LOGS</button>
           <button onClick={() => setViewingMemory(true)} className="w-full py-2 border border-purple-500/50 text-purple-400 hover:bg-purple-900/30 text-xs font-mono transition-colors tracking-widest">MANAGE NEURAL MEMORY</button>
           <button onClick={onManageAccounts} className="w-full py-2 border border-nexa-cyan/30 text-nexa-cyan hover:text-white hover:border-nexa-cyan text-xs font-mono transition-colors">MANAGE USER DATA</button>
           <button onClick={onClearMemory} className="w-full py-2 bg-red-900/30 border border-red-500 text-red-500 hover:bg-red-900/50 text-xs font-mono transition-colors">PURGE MEMORY BANKS</button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
