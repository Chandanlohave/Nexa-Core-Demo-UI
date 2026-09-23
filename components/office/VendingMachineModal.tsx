import React, { useState, useEffect } from 'react';
import { officeAudio } from './officeAudio';

export interface SnackItem {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  type: 'snack' | 'drink';
  boostStat: string;
}

export const SNACK_ITEMS: SnackItem[] = [
  {
    id: 'choco',
    name: 'Cyber Choco-Bar',
    desc: '70% Dark cocoa with caffeine crunch for intense neural focus.',
    icon: '🍫',
    color: '#9a3412',
    type: 'snack',
    boostStat: '+40% Focus & Energy'
  },
  {
    id: 'chips',
    name: 'Quantum Nacho Chips',
    desc: 'Zesty chili cheese crisps baked with high-voltage crunch.',
    icon: '🍿',
    color: '#eab308',
    type: 'snack',
    boostStat: '+30% Morale Boost'
  },
  {
    id: 'soda',
    name: 'Nexa Neon Soda Can',
    desc: 'Zero-sugar sparkling blue raspberry energy infusion.',
    icon: '🥤',
    color: '#0284c7',
    type: 'drink',
    boostStat: '+50% Hydration & Speed'
  },
  {
    id: 'nuts',
    name: 'Neural Brain Nuts Mix',
    desc: 'Almonds, walnuts & dried blueberries for memory retention.',
    icon: '🥜',
    color: '#b45309',
    type: 'snack',
    boostStat: '+45% Memory Efficiency'
  },
  {
    id: 'boba',
    name: 'Cyber Boba Matcha Tea',
    desc: 'Chilled matcha boba tea with chewy tapioca pearls.',
    icon: '🧋',
    color: '#16a34a',
    type: 'drink',
    boostStat: '+35% Calm Debugging'
  },
  {
    id: 'jerky',
    name: 'Matrix Spicy Beef Jerky',
    desc: 'High-protein peppered beef strip for marathon coding sessions.',
    icon: '🥩',
    color: '#dc2626',
    type: 'snack',
    boostStat: '+60% Stamina Boost'
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

export const VendingMachineModal = ({
  isOpen = true,
  onClose,
  onDispenseItem
}: {
  isOpen?: boolean;
  onClose: () => void;
  onDispenseItem?: (item: SnackItem, agentId: string) => void;
}) => {
  const [selectedItem, setSelectedItem] = useState<SnackItem>(SNACK_ITEMS[0]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('agent_core');
  const [isDispensing, setIsDispensing] = useState(false);
  const [dispensed, setDispensed] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleDispense = () => {
    setIsDispensing(true);
    setDispensed(false);
    officeAudio?.playBlip?.(400);

    setTimeout(() => {
      officeAudio?.playChime?.();
      setIsDispensing(false);
      setDispensed(true);
      if (onDispenseItem) {
        onDispenseItem(selectedItem, selectedAgentId);
      }
    }, 1200);
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
            <span className="text-2xl">🍿</span>
            <div>
              <div className="text-sm font-bold text-red-500">NEXA CYBER VENDING DISPENSER</div>
              <div className="text-[10px] text-zinc-400">High-Protein Snacks & Energy Drinks</div>
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
          >
            ✕
          </button>
        </div>

        {/* Agent Selector */}
        <div>
          <label className="text-[10px] text-zinc-400 font-bold mb-1 block">SEND SNACK TO AGENT:</label>
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
                    ? 'bg-zinc-800 border-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
                style={{ borderColor: selectedAgentId === ag.id ? ag.color : undefined }}
              >
                {ag.name}
              </button>
            ))}
          </div>
        </div>

        {/* Snack Item Grid */}
        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
          {SNACK_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (!isDispensing) {
                  setSelectedItem(item);
                  officeAudio?.playBlip?.(600);
                  setDispensed(false);
                }
              }}
              className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                selectedItem.id === item.id 
                  ? 'bg-zinc-900 border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.25)]' 
                  : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-[9px] text-red-400/90 font-bold bg-red-500/10 px-1.5 py-0.5 rounded">VEND</span>
              </div>
              <div className="text-xs font-bold text-zinc-200 mt-1">{item.name}</div>
              <div className="text-[9px] text-zinc-400 leading-tight">{item.desc}</div>
              <div className="text-[9px] text-red-400 mt-0.5 font-bold">{item.boostStat}</div>
            </button>
          ))}
        </div>

        {/* Dispensing Tray Chamber */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3 relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl shadow-inner">
              {selectedItem.icon}
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-200">{selectedItem.name}</div>
              <div className="text-[10px] text-red-400 font-semibold">{selectedItem.boostStat}</div>
              <div className="text-[9px] text-zinc-400">Target Agent: {AGENT_OPTIONS.find(a => a.id === selectedAgentId)?.name}</div>
            </div>
          </div>

          {isDispensing && (
            <div className="text-xs font-bold text-amber-400 animate-pulse shrink-0">
              DISPENSING... ⚙️
            </div>
          )}
          {dispensed && (
            <div className="text-xs font-bold text-emerald-400 shrink-0 flex items-center gap-1">
              ✓ AGENT FETCHING!
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handleDispense}
          disabled={isDispensing}
          className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all"
        >
          {isDispensing ? (
            <span>DISPENSING ITEM FROM VENDING SLOT... ⚙️</span>
          ) : dispensed ? (
            <span>FETCH ANOTHER SNACK FOR AGENT 🍿</span>
          ) : (
            <span>DISPENSE & SEND AGENT TO VENDING MACHINE 🚀</span>
          )}
        </button>

      </div>
    </div>
  );
};
