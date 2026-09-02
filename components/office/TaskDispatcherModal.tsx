import React, { useState, useEffect } from 'react';
import { officeAudio } from './officeAudio';

export interface TaskAssignment {
  agentId: string;
  agentName: string;
  taskTitle?: string;
  title?: string;
  category: 'CODE' | 'SECURITY' | 'DESIGN' | 'VOICE' | 'RESEARCH' | 'STRATEGY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const AGENT_LIST = [
  { id: 'agent_core', name: 'Nexa', role: 'Executive Commander & Orchestrator', color: '#00e5ff', category: 'STRATEGY' },
  { id: 'agent_kronos', name: 'Kronos', role: 'Strategic Architect & Sprints', color: '#f59e0b', category: 'STRATEGY' },
  { id: 'agent_cypher', name: 'Cypher', role: 'Cybersecurity & Code Architect', color: '#10b981', category: 'SECURITY' },
  { id: 'agent_aura', name: 'Aura', role: 'Generative Design & UX Aesthetics', color: '#a855f7', category: 'DESIGN' },
  { id: 'agent_echo', name: 'Echo', role: 'Neural Voice AI & Acoustics', color: '#38bdf8', category: 'VOICE' },
  { id: 'agent_veritas', name: 'Veritas', role: 'Deep Fact-Check & Knowledge Matrix', color: '#10b981', category: 'RESEARCH' },
  { id: 'agent_valkyrie', name: 'Valkyrie', role: 'Defensive Sentinel & Error Recovery', color: '#ef4444', category: 'CODE' },
];

const PRESETS = [
  { agentId: 'agent_core', title: 'Orchestrate Full Squad Task Execution', category: 'STRATEGY', priority: 'CRITICAL' },
  { agentId: 'agent_cypher', title: 'Audit Firestore & Cloud Security Rules', category: 'SECURITY', priority: 'HIGH' },
  { agentId: 'agent_aura', title: 'Synthesize 4K Cyberpunk UI Themes', category: 'DESIGN', priority: 'MEDIUM' },
  { agentId: 'agent_kronos', title: 'Compile Sprint Milestones & Q4 Roadmap', category: 'STRATEGY', priority: 'HIGH' },
  { agentId: 'agent_echo', title: 'Tune Low-Latency Hindi & English Voice Latency', category: 'VOICE', priority: 'MEDIUM' },
  { agentId: 'agent_veritas', title: 'Run Cross-Source Fact Verification Sweep', category: 'RESEARCH', priority: 'LOW' },
  { agentId: 'agent_valkyrie', title: 'Patch Memory Leaks & Optimize WebGL Canvas', category: 'CODE', priority: 'CRITICAL' },
];

export const TaskDispatcherModal = ({
  isOpen = true,
  onClose,
  onDispatchTask,
  onDispatch,
  preselectedAgentId,
  preSelectedAgentId
}: {
  isOpen?: boolean;
  onClose: () => void;
  onDispatchTask?: (assignment: any) => void;
  onDispatch?: (assignment: any) => void;
  preselectedAgentId?: string | null;
  preSelectedAgentId?: string | null;
}) => {
  const targetId = preselectedAgentId || preSelectedAgentId;
  const [selectedAgent, setSelectedAgent] = useState(
    AGENT_LIST.find(a => a.id === targetId) || AGENT_LIST[0]
  );
  const [customTask, setCustomTask] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [isListening, setIsListening] = useState(false);

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN'; // Default to Hindi/Hinglish/English recognition
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        officeAudio?.playBlip?.(800);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setCustomTask(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        officeAudio?.playChime?.();
      };

      recognition.start();
    } catch (e) {
      console.warn("Speech Rec Error:", e);
      setIsListening(false);
    }
  };

  useEffect(() => {
    if (isOpen && targetId) {
      const match = AGENT_LIST.find(a => a.id === targetId);
      if (match) setSelectedAgent(match);
    }
  }, [isOpen, targetId]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleDispatch = (taskTitle: string, cat?: any, prio?: any) => {
    if (!taskTitle.trim()) return;
    officeAudio?.playBlip?.(950);
    const assignment = {
      agentId: selectedAgent.id,
      agentName: selectedAgent.name,
      taskTitle: taskTitle.trim(),
      title: taskTitle.trim(),
      category: cat || (selectedAgent.category as any),
      priority: prio || priority,
    };
    if (onDispatchTask) onDispatchTask(assignment);
    if (onDispatch) onDispatch(assignment);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono text-white"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="text-sm font-bold text-cyan-400">DESK TASK DISPATCHER</div>
              <div className="text-[10px] text-zinc-400">Direct Agent Workstation Pipeline</div>
            </div>
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer text-xs font-bold border border-zinc-700 transition-colors"
            title="Close dispatcher"
          >
            ✕
          </button>
        </div>

        {/* Agent Target Selector */}
        <div>
          <label className="text-[11px] text-zinc-400 font-bold mb-1.5 block">SELECT TARGET AGENT:</label>
          <div className="grid grid-cols-3 gap-2">
            {AGENT_LIST.map(a => (
              <button
                key={a.id}
                onClick={() => {
                  setSelectedAgent(a);
                  officeAudio?.playBlip?.(500);
                }}
                className={`p-2 rounded-xl border text-left flex flex-col transition-all cursor-pointer ${
                  selectedAgent.id === a.id 
                    ? 'bg-zinc-900 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                    : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: a.color }}>{a.name}</span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: a.color }} />
                </div>
                <div className="text-[9px] text-zinc-400 truncate mt-0.5">{a.role.split('&')[0]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick One-Click Presets */}
        <div>
          <label className="text-[11px] text-zinc-400 font-bold mb-1.5 block">INSTANT TASK PRESETS:</label>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {PRESETS.map((p, i) => (
              <div 
                key={i}
                onClick={() => {
                  const ag = AGENT_LIST.find(a => a.id === p.agentId) || selectedAgent;
                  setSelectedAgent(ag);
                  handleDispatch(p.title, p.category, p.priority);
                }}
                className="p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 flex items-center justify-between cursor-pointer transition-colors text-[10px]"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-cyan-400 font-bold uppercase">[{p.category}]</span>
                  <span className="truncate text-zinc-300">{p.title}</span>
                </div>
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  p.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                  p.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {p.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Task Input */}
        <div>
          <label className="text-[11px] text-zinc-400 font-bold mb-1.5 flex items-center justify-between">
            <span>OR WRITE / SPEAK CUSTOM DIRECTIVE:</span>
            {isListening && <span className="text-cyan-400 font-bold animate-pulse text-[10px]">🎙️ LISTENING TO VOICE...</span>}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customTask}
              onChange={(e) => setCustomTask(e.target.value)}
              placeholder={`Assign directive to ${selectedAgent.name} (type or click mic)...`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleDispatch(customTask);
              }}
              className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none"
            />
            <button
              type="button"
              onClick={startVoiceInput}
              className={`p-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                isListening
                  ? 'bg-cyan-500 text-black border-cyan-400 animate-bounce'
                  : 'bg-zinc-900 text-cyan-400 border-zinc-800 hover:border-cyan-500/60'
              }`}
              title="Voice Command (Speak to Agent)"
            >
              🎤
            </button>
            <button
              onClick={() => handleDispatch(customTask)}
              disabled={!customTask.trim()}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold text-xs cursor-pointer transition-all shrink-0"
            >
              DISPATCH 🚀
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
