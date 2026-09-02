import React, { useState, useEffect } from 'react';
import { officeAudio } from './officeAudio';

interface Beverage {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  boostStat: string;
}

const DRINKS: Beverage[] = [
  {
    id: 'espresso',
    name: 'Cyber Espresso Double Shot',
    desc: 'Ultra-concentrated dark roast with neural overclocking beans.',
    icon: '☕',
    color: '#78350f',
    boostStat: '+40% Code Processing Speed'
  },
  {
    id: 'nitro',
    name: 'Quantum Nitro Cold Brew',
    desc: 'Sub-zero brewed with nitrogen micro-bubbles for silky focus.',
    icon: '🧊',
    color: '#0284c7',
    boostStat: '+50% Context Window Clarity'
  },
  {
    id: 'matcha',
    name: 'Neo Kyoto Ceremonial Matcha',
    desc: 'L-Theanine infused zen green tea for calm debugging sessions.',
    icon: '🍵',
    color: '#16a34a',
    boostStat: '-70% Bug Stress Level'
  },
  {
    id: 'energy',
    name: 'Nexa Overdrive Energy Can',
    desc: 'Electrolyte & taurine formula with zero carbon latency.',
    icon: '⚡',
    color: '#eab308',
    boostStat: '+100% Team Morale'
  }
];

const AGENT_OPTIONS = [
  { id: 'agent_core', name: 'Nexa', color: '#00e5ff' },
  { id: 'agent_kronos', name: 'Kronos', color: '#f59e0b' },
  { id: 'agent_cypher', name: 'Cypher', color: '#10b981' },
  { id: 'agent_aura', name: 'Aura', color: '#a855f7' },
  { id: 'agent_echo', name: 'Echo', color: '#38bdf8' },
  { id: 'agent_veritas', name: 'Veritas', color: '#10b981' },
  { id: 'agent_valkyrie', name: 'Valkyrie', color: '#ef4444' },
];

export const CoffeeMachineModal = ({
  isOpen = true,
  onClose,
  onBrewSuccess,
  onBrewComplete,
  onBrewForAgent
}: {
  isOpen?: boolean;
  onClose: () => void;
  onBrewSuccess?: (drink: Beverage) => void;
  onBrewComplete?: (drinkName: string, agentId?: string) => void;
  onBrewForAgent?: (drink: Beverage, agentId: string) => void;
}) => {
  const [selectedDrink, setSelectedDrink] = useState<Beverage>(DRINKS[0]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('agent_core');
  const [isBrewing, setIsBrewing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [brewed, setBrewed] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const startBrew = () => {
    setIsBrewing(true);
    setProgress(0);
    setBrewed(false);
    officeAudio?.playCoffeeBrew?.();

    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 8;
      });
    }, 120);
  };

  useEffect(() => {
    if (progress === 100 && isBrewing) {
      setIsBrewing(false);
      setBrewed(true);
      if (onBrewSuccess) onBrewSuccess(selectedDrink);
      if (onBrewComplete) onBrewComplete(selectedDrink.name, selectedAgentId);
      if (onBrewForAgent) onBrewForAgent(selectedDrink, selectedAgentId);
    }
  }, [progress, isBrewing, selectedDrink, selectedAgentId, onBrewSuccess, onBrewComplete, onBrewForAgent]);

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
            <span className="text-2xl">☕</span>
            <div>
              <div className="text-sm font-bold text-amber-400">NEXA HIGH-PRESSURE BREW STATION</div>
              <div className="text-[10px] text-zinc-400">Espresso & Smart Hydration Bar</div>
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
            title="Close brew station"
          >
            ✕
          </button>
        </div>

        {/* Agent Selector */}
        <div>
          <label className="text-[10px] text-zinc-400 font-bold mb-1 block">ORDER BREW FOR AGENT:</label>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {AGENT_OPTIONS.map(ag => (
              <button
                key={ag.id}
                onClick={() => {
                  setSelectedAgentId(ag.id);
                  officeAudio?.playBlip?.(700);
                }}
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedAgentId === ag.id
                    ? 'bg-zinc-800 border-amber-500 text-white shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
                style={{ borderColor: selectedAgentId === ag.id ? ag.color : undefined }}
              >
                {ag.name}
              </button>
            ))}
          </div>
        </div>

        {/* Drink Selection Grid */}
        <div className="grid grid-cols-2 gap-2">
          {DRINKS.map(d => (
            <button
              key={d.id}
              onClick={() => {
                if (!isBrewing) {
                  setSelectedDrink(d);
                  officeAudio?.playBlip?.(600);
                  setBrewed(false);
                }
              }}
              className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                selectedDrink.id === d.id 
                  ? 'bg-zinc-900 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.2)]' 
                  : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{d.icon}</span>
                <span className="text-[9px] text-amber-400/90 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">READY</span>
              </div>
              <div className="text-xs font-bold text-zinc-200 mt-1">{d.name}</div>
              <div className="text-[9px] text-zinc-400 leading-tight">{d.desc}</div>
            </button>
          ))}
        </div>

        {/* Brewing Chamber Visualizer */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center gap-3 relative overflow-hidden">
          {/* Animated Steam */}
          {isBrewing && (
            <div className="flex gap-2 text-zinc-400 text-sm animate-bounce">
              <span>☁️</span>
              <span>♨️</span>
              <span>☁️</span>
            </div>
          )}

          {/* Cup Display */}
          <div className="relative">
            <div 
              className="w-14 h-16 rounded-b-xl border-2 border-zinc-600 bg-zinc-800 flex items-end justify-center overflow-hidden shadow-lg"
              style={{ borderColor: selectedDrink.color }}
            >
              <div 
                className="w-full transition-all duration-200"
                style={{ 
                  height: `${isBrewing ? progress : brewed ? 85 : 0}%`,
                  backgroundColor: selectedDrink.color 
                }}
              />
            </div>
            {/* Cup Handle */}
            <div className="absolute top-3 -right-2.5 w-3 h-7 rounded-r-lg border-2 border-zinc-600 border-l-0" />
          </div>

          <div className="text-center">
            <div className="text-xs font-bold text-zinc-200">
              {isBrewing ? '☕ Extracting Neural Blend...' : brewed ? '✨ Fresh Brew Complete!' : `Selected: ${selectedDrink.name}`}
            </div>
            <div className="text-[10px] text-amber-400 mt-0.5 font-semibold">
              {selectedDrink.boostStat}
            </div>
          </div>

          {/* Progress Bar */}
          {isBrewing && (
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-amber-400 h-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={startBrew}
          disabled={isBrewing}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all"
        >
          {isBrewing ? (
            <span>BREWING IN PROGRESS ({progress}%)...</span>
          ) : brewed ? (
            <span>BREW ANOTHER CUP ☕</span>
          ) : (
            <span>START EXTRACTION ⚡</span>
          )}
        </button>

      </div>
    </div>
  );
};
