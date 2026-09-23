import React, { useState, useEffect } from 'react';
import { officeAudio } from './officeAudio';

export const HolographicCommandWallModal = ({
  isOpen = true,
  onClose,
  isWarRoomActive = false,
  isEmergencyActive = false,
  onToggleWarRoom,
  onToggleEmergency,
  activeTasksCount = 0
}: {
  isOpen?: boolean;
  onClose: () => void;
  isWarRoomActive?: boolean;
  isEmergencyActive?: boolean;
  onToggleWarRoom?: () => void;
  onToggleEmergency?: () => void;
  activeTasksCount?: number;
}) => {
  const isEmergency = isWarRoomActive || isEmergencyActive;
  const toggleHandler = onToggleEmergency || onToggleWarRoom || (() => {});
  const [activeTab, setActiveTab] = useState<'METRICS' | 'SQUAD' | 'DEFENSE'>('METRICS');
  const [latency, setLatency] = useState(42);
  const [tokensProcessed, setTokensProcessed] = useState(128450);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const timer = setInterval(() => {
      setLatency(38 + Math.floor(Math.random() * 8));
      setTokensProcessed(t => t + Math.floor(Math.random() * 15));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleWarRoomToggle = () => {
    if (!isEmergency) {
      if (officeAudio?.playEmergencyAlert) {
        officeAudio.playEmergencyAlert();
      } else {
        officeAudio?.playAlert?.();
      }
    } else {
      officeAudio?.playBlip?.(600);
    }
    toggleHandler();
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
        className="w-full max-w-lg bg-zinc-950 border border-cyan-500/40 rounded-2xl p-5 shadow-[0_0_30px_rgba(6,182,212,0.2)] flex flex-col gap-4 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <div>
              <div className="text-sm font-bold text-cyan-400">NEXA COMMAND HOLOGRAPHIC MATRIX</div>
              <div className="text-[10px] text-zinc-400">Executive Cabin // Real-Time Telemetry</div>
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
            title="Close telemetry wall"
          >
            ✕
          </button>
        </div>

        {/* Live Status Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2.5">
            <div className="text-[9px] text-zinc-400 font-bold">SYSTEM LATENCY</div>
            <div className="text-base font-bold text-cyan-400 mt-0.5">{latency}ms</div>
            <div className="text-[8px] text-emerald-400">● OPTIMAL</div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2.5">
            <div className="text-[9px] text-zinc-400 font-bold">TOKENS STREAMED</div>
            <div className="text-base font-bold text-amber-400 mt-0.5">{tokensProcessed.toLocaleString()}</div>
            <div className="text-[8px] text-cyan-400">⚡ ACTIVE</div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2.5">
            <div className="text-[9px] text-zinc-400 font-bold">SQUAD HEALTH</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">6/6 SYNC</div>
            <div className="text-[8px] text-emerald-400">🔒 100% ONLINE</div>
          </div>
        </div>

        {/* Hologram Telemetry Graph / Status Details */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 border-b border-zinc-800 pb-1.5">
            <span className="font-bold text-cyan-400">NEURAL AGENT PIPELINE LOAD</span>
            <span>AUTO-BALANCING ENABLED</span>
          </div>

          <div className="space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Kronos (Sprint Roadmap Engine)</span>
              <span className="text-amber-400 font-bold">42% LOAD</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-400 h-full w-[42%]" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Cypher (Cyber Defense & SQL)</span>
              <span className="text-emerald-400 font-bold">78% LOAD</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full w-[78%]" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Echo (Acoustic Neural TTS)</span>
              <span className="text-cyan-400 font-bold">25% LOAD</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full w-[25%]" />
            </div>
          </div>
        </div>

        {/* Tactical Emergency War Room Action Box */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
          isWarRoomActive 
            ? 'bg-red-950/80 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse' 
            : 'bg-zinc-900/60 border-zinc-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{isWarRoomActive ? '🚨' : '🛡️'}</span>
            <div>
              <div className={`text-xs font-bold ${isWarRoomActive ? 'text-red-400' : 'text-zinc-200'}`}>
                {isWarRoomActive ? 'WAR ROOM / RED ALERT ACTIVE' : 'TACTICAL WAR ROOM MODE'}
              </div>
              <div className="text-[9px] text-zinc-400">
                {isWarRoomActive ? 'All squad agents mobilized to emergency huddle' : 'Trigger office-wide siren & emergency tactical gathering'}
              </div>
            </div>
          </div>

          <button
            onClick={handleWarRoomToggle}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
              isWarRoomActive 
                ? 'bg-zinc-900 hover:bg-zinc-800 text-red-400 border border-red-500/50' 
                : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]'
            }`}
          >
            {isWarRoomActive ? 'STAND DOWN 🛡️' : 'TRIGGER ALARM 🚨'}
          </button>
        </div>

      </div>
    </div>
  );
};
