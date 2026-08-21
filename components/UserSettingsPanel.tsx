
import React, { useState } from 'react';
import { AppConfig, VOICES, VoiceKey, Reminder } from '../types';

interface UserSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onConfigChange: (newConfig: AppConfig) => void;
  currentVoice?: VoiceKey;
  onVoiceChange?: (voice: VoiceKey) => void;
  reminders?: Reminder[];
  onDeleteReminder?: (id: string) => void;
  onAddReminder?: (text: string) => void;
}

const THEME_COLORS = [
    { name: 'Default UI', value: '#29dfff' }, // Renamed from Cyber Cyan
    { name: 'Hyper Violet', value: '#bf00ff' },
    { name: 'Solar Orange', value: '#ff5e00' }, 
    { name: 'Neon Plasma', value: '#ff0099' },
    { name: 'Golden Glitch', value: '#ffd700' },
    { name: 'Arctic Teal', value: '#00ffcc' }
];

const UserSettingsPanel: React.FC<UserSettingsPanelProps> = ({ isOpen, onClose, config, onConfigChange, currentVoice = 'Kore', onVoiceChange, reminders = [], onDeleteReminder, onAddReminder }) => {
  const [taskInput, setTaskInput] = useState('');

  if (!isOpen) return null;

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

  const handleAddTask = () => {
      if(taskInput.trim() && onAddReminder) {
          onAddReminder(taskInput);
          setTaskInput('');
      }
  };

  return (
    <div className="absolute top-16 right-4 w-72 bg-white/80 dark:bg-black/90 border border-zinc-300 dark:border-nexa-cyan/80 rounded-lg backdrop-blur-md p-4 z-50 shadow-[0_0_20px_rgba(41,223,255,0.3)] animate-fade-in flex flex-col max-h-[80vh]">
      <div className="flex justify-between items-center mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2 shrink-0">
        <h2 className="text-nexa-cyan font-mono text-sm tracking-wider">USER SETTINGS</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-black dark:hover:text-white text-2xl leading-none">&times;</button>
      </div>

      <div className="space-y-6 overflow-y-auto no-scrollbar pr-1">
        
        {/* NEW: COMPACT CIRCLE COLOR PICKER */}
        <div>
            <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono mb-2">System Color</label>
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
        
        {onVoiceChange && (
            <div>
                <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono mb-1">Voice Synthesis Engine</label>
                <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(VOICES) as VoiceKey[]).map(key => {
                        const voice = VOICES[key];
                        const isActive = currentVoice === key;
                        return (
                            <button
                                key={key}
                                onClick={() => onVoiceChange(key)}
                                className={`p-2 text-left border rounded transition-all flex flex-col justify-between min-h-[50px] ${isActive ? 'bg-nexa-cyan/20 border-nexa-cyan text-nexa-cyan' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-nexa-cyan/50 hover:text-white'}`}
                            >
                                <div className="text-xs font-bold font-mono">{voice.name}</div>
                                <div className="text-[8px] opacity-70 leading-tight">{voice.gender}</div>
                            </button>
                        )
                    })}
                </div>
                <div className="mt-2 text-[9px] text-zinc-500 font-mono border-l-2 border-nexa-cyan/30 pl-2">
                    {currentVoice && VOICES[currentVoice] ? `${VOICES[currentVoice].description} - ${VOICES[currentVoice].style}` : 'Standard Voice'}
                </div>
            </div>
        )}

        <div>
          <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono mb-1">HUD Animation Speed</label>
          <input 
            type="range" 
            min="0.2" 
            max="5" 
            step="0.1"
            value={config.hudRotationSpeed}
            onChange={(e) => onConfigChange({...config, hudRotationSpeed: parseFloat(e.target.value)})}
            className="w-full accent-nexa-cyan" 
          />
        </div>

        <div>
          <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono mb-1">Mic Animation Speed</label>
          <input 
            type="range" 
            min="0.2" 
            max="5" 
            step="0.1"
            value={config.micRotationSpeed || 1}
            onChange={(e) => onConfigChange({...config, micRotationSpeed: parseFloat(e.target.value)})}
            className="w-full accent-nexa-cyan" 
          />
        </div>

        <div>
          <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-mono mb-1">Visual Effects</label>
          <div className="flex flex-col gap-2">
              <button 
                onClick={() => onConfigChange({...config, animationsEnabled: !config.animationsEnabled})}
                className={`w-full py-2 text-xs font-mono border ${config.animationsEnabled ? 'border-nexa-cyan text-nexa-cyan' : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-500'}`}
              >
                {config.animationsEnabled ? 'HUD ANIMATIONS ON' : 'HUD ANIMATIONS OFF'}
              </button>
              
              <button 
                onClick={() => onConfigChange({...config, ecoMode: !config.ecoMode})}
                className={`w-full py-2 text-xs font-mono border transition-all ${config.ecoMode ? 'border-green-500 text-green-500 bg-green-900/20' : 'border-zinc-600 text-zinc-400'}`}
              >
                {config.ecoMode ? 'ECO MODE ACTIVE (SAVES BATTERY)' : 'HIGH PERFORMANCE MODE'}
              </button>
          </div>
        </div>

        {/* --- ACTIVE TASKS & REMINDERS --- */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <label className="block text-nexa-cyan text-xs font-mono mb-2 tracking-widest uppercase">PENDING TASKS & REMINDERS</label>
            
            {/* INPUT AREA */}
            <div className="flex gap-2 mb-3">
                <input 
                    type="text" 
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    placeholder="Add task (e.g. Call Mom at 5)"
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

      </div>
    </div>
  );
};

export default UserSettingsPanel;
