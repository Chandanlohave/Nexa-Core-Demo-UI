import React, { useState, useEffect } from 'react';
import { officeAudio } from './officeAudio';

export interface OfficeTheme {
  flooring: 'hardwood' | 'obsidian' | 'matrix' | 'marble';
  neonAccent: 'cyan' | 'purple' | 'amber' | 'crimson';
  wallColor: string;
}

const FLOORINGS = [
  { id: 'hardwood', name: 'Executive Walnut Hardwood', desc: 'Classic warm timber planks', icon: '🪵', previewColor: '#8a5a36' },
  { id: 'obsidian', name: 'Cyber Obsidian Tiles', desc: 'Sleek dark geometric carbon panels', icon: '⬛', previewColor: '#181b22' },
  { id: 'matrix', name: 'Matrix Emerald Cyber Grid', desc: 'Glowing terminal wireframe floor', icon: '🟩', previewColor: '#064e3b' },
  { id: 'marble', name: 'Zen White Carrara Marble', desc: 'High-contrast minimalist polished stone', icon: '🏛️', previewColor: '#e2e8f0' },
];

const NEONS = [
  { id: 'cyan', name: 'Neo Cyanide (Default)', color: '#00e5ff' },
  { id: 'purple', name: 'Synthwave Purple', color: '#c084fc' },
  { id: 'amber', name: 'Cyberpunk Amber Gold', color: '#fbbf24' },
  { id: 'crimson', name: 'Valkyrie Crimson', color: '#f87171' },
];

const TROPHIES = [
  { id: 'first_100', title: '100 Tasks Cleared', desc: 'Processed 100 neural commands', icon: '🏆', unlocked: true },
  { id: 'voice_master', title: 'Voice Commander', desc: 'Connected low-latency acoustic stream', icon: '🎙️', unlocked: true },
  { id: 'pool_shark', title: 'Lounge 8-Ball Shark', desc: 'Scored trick shot in break lounge', icon: '🎱', unlocked: true },
  { id: 'night_owl', title: 'Night Shift Operative', desc: 'Ran midnight AI pipelines', icon: '🌙', unlocked: true },
];

export const OfficeCustomizerModal = ({
  isOpen = true,
  currentTheme,
  onSaveTheme,
  onClose
}: {
  isOpen?: boolean;
  currentTheme: OfficeTheme;
  onSaveTheme: (theme: OfficeTheme) => void;
  onClose: () => void;
}) => {
  const [theme, setTheme] = useState<OfficeTheme>(currentTheme);
  const [tab, setTab] = useState<'STYLE' | 'TROPHIES'>('STYLE');

  useEffect(() => {
    if (isOpen) {
      setTheme(currentTheme);
    }
  }, [isOpen, currentTheme]);

  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleFlooringSelect = (flooring: any) => {
    officeAudio?.playBlip?.(700);
    setTheme(t => ({ ...t, flooring }));
  };

  const handleNeonSelect = (neonAccent: any) => {
    officeAudio?.playBlip?.(850);
    setTheme(t => ({ ...t, neonAccent }));
  };

  const handleApply = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    officeAudio?.playBlip?.(1000);
    onSaveTheme(theme);
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
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <div>
              <div className="text-sm font-bold text-cyan-400">OFFICE ARCHITECTURE & TROPHIES</div>
              <div className="text-[10px] text-zinc-400">Headquarters Aesthetics Studio</div>
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
            title="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-bold">
          <button
            onClick={() => setTab('STYLE')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              tab === 'STYLE' ? 'bg-cyan-500 text-black shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            📐 FLOORS & NEON
          </button>
          <button
            onClick={() => setTab('TROPHIES')}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              tab === 'TROPHIES' ? 'bg-cyan-500 text-black shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            🏆 TROPHY SHOWCASE
          </button>
        </div>

        {tab === 'STYLE' ? (
          <div className="space-y-4">
            {/* Flooring Selection */}
            <div>
              <label className="text-[11px] text-zinc-400 font-bold mb-1.5 block">SELECT FLOORING MATERIAL:</label>
              <div className="grid grid-cols-2 gap-2">
                {FLOORINGS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleFlooringSelect(f.id)}
                    className={`p-2 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      theme.flooring === f.id 
                        ? 'bg-zinc-900 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.25)]' 
                        : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base">{f.icon}</span>
                      <span 
                        className="w-3 h-3 rounded-full border border-black/40" 
                        style={{ backgroundColor: f.previewColor }} 
                      />
                    </div>
                    <div className="text-xs font-bold text-zinc-200 mt-0.5">{f.name.split(' ')[1] || f.name}</div>
                    <div className="text-[9px] text-zinc-400 leading-tight">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Neon Glow Trim */}
            <div>
              <label className="text-[11px] text-zinc-400 font-bold mb-1.5 block">GLASS CABIN NEON ACCENT:</label>
              <div className="grid grid-cols-2 gap-2">
                {NEONS.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNeonSelect(n.id)}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      theme.neonAccent === n.id 
                        ? 'bg-zinc-900 border-cyan-400' 
                        : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-xs font-bold text-zinc-300">{n.name}</span>
                    <span 
                      className="w-3.5 h-3.5 rounded-full shadow-[0_0_8px_currentColor]" 
                      style={{ backgroundColor: n.color, color: n.color }} 
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Save & Apply */}
            <button
              onClick={handleApply}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all mt-2"
            >
              SAVE & APPLY TO HQ ✨
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {TROPHIES.map(t => (
              <div
                key={t.id}
                className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3"
              >
                <div className="text-2xl p-2 rounded-xl bg-zinc-800/80 border border-zinc-700/50">
                  {t.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-amber-400">{t.title}</span>
                    <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-bold">UNLOCKED</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
