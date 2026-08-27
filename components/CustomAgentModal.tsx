import React, { useState } from 'react';
import { NexaAgentNode, VoiceKey, VOICES } from '../types';

interface CustomAgentModalProps {
  onClose: () => void;
  onAddAgent: (newAgent: NexaAgentNode) => void;
}

const PRESET_COLORS = [
  { name: 'Neon Pink', hex: '#EC4899' },
  { name: 'Electric Cyan', hex: '#06B6D4' },
  { name: 'Lime Green', hex: '#10B981' },
  { name: 'Amber Yellow', hex: '#F59E0B' },
  { name: 'Vibrant Purple', hex: '#A855F7' },
  { name: 'Crimson Red', hex: '#EF4444' },
  { name: 'Royal Blue', hex: '#3B82F6' },
  { name: 'Bright Orange', hex: '#F97316' }
];

export const CustomAgentModal: React.FC<CustomAgentModalProps> = ({ onClose, onAddAgent }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [metric, setMetric] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [voice, setVoice] = useState<VoiceKey>('Aoede');
  const [voiceGender, setVoiceGender] = useState<'Male' | 'Female'>('Female');
  const [introText, setIntroText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) {
      alert("Please provide at least a Name and Role for the new Sub-Agent!");
      return;
    }

    const agentId = `agent_custom_${Date.now()}`;
    const formattedName = name.trim().toUpperCase();

    const newAgent: NexaAgentNode = {
      id: agentId,
      name: formattedName,
      role: role.trim(),
      specialty: specialty.trim() || role.trim(),
      status: `${formattedName} CORE // ONLINE`,
      metric: metric.trim() || 'Custom Sub-Agent Active',
      color: color,
      voice: voice,
      voiceGender: voiceGender,
      x: (Math.random() - 0.5) * 160,
      y: (Math.random() - 0.5) * 160,
      z: (Math.random() - 0.5) * 30,
      connections: [0, 1, 2],
      pulseOffset: Math.random(),
      activityLevel: 0.9,
      introText: introText.trim() || `Namaste Chandan Sir! Main ${formattedName}, aapka customized sub-agent. ${role.trim()} mera specialized domain hai!`
    };

    onAddAgent(newAgent);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-emerald-500/20 flex justify-between items-center bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-bold">
              🛠️
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                CUSTOM SUB-AGENT BUILDER
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  BUILD YOUR CORE
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Construct and assign a new custom AI sub-agent to the NEXA Squad</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-400 hover:text-white text-xl p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs text-zinc-300">
          
          <div>
            <label className="text-xs font-mono text-emerald-400 uppercase tracking-wider block mb-1">
              Agent Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PYTHIA, ATHENA, JANUS..."
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 font-bold uppercase tracking-widest text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-emerald-400 uppercase tracking-wider block mb-1">
                Role / Title *
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Predictive Analytics & Forecasting"
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-emerald-400 uppercase tracking-wider block mb-1">
                Telemetry Metric Label
              </label>
              <input
                type="text"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                placeholder="e.g. 99.9% Prediction Confidence"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-emerald-400 uppercase tracking-wider block mb-1">
              Specialty / Capabilities
            </label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="e.g. Market forecasting, trend synthesis, risk modeling"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="text-xs font-mono text-emerald-400 uppercase tracking-wider block mb-1.5">
              HUD Core Aura Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  type="button"
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    color === c.hex ? 'scale-125 border-white shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
              <input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)} 
                className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
              />
            </div>
          </div>

          {/* Voice Model Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-emerald-400 uppercase tracking-wider block mb-1">
                Voice Synthesizer Profile
              </label>
              <select
                value={voice}
                onChange={(e) => {
                  const selectedKey = e.target.value as VoiceKey;
                  setVoice(selectedKey);
                  setVoiceGender(VOICES[selectedKey]?.gender as 'Male' | 'Female' || 'Female');
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 font-medium"
              >
                {Object.entries(VOICES).map(([key, v]) => (
                  <option key={key} value={key}>
                    {v.name} — {v.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-mono text-emerald-400 uppercase tracking-wider block mb-1">
                Voice Gender
              </label>
              <select
                value={voiceGender}
                onChange={(e) => setVoiceGender(e.target.value as 'Male' | 'Female')}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </div>
          </div>

          {/* Intro Text */}
          <div>
            <label className="text-xs font-mono text-emerald-400 uppercase tracking-wider block mb-1">
              Custom Voice Introduction Statement
            </label>
            <textarea
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              placeholder="Enter what this agent says during full squad intro..."
              rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 text-xs font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold text-xs tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.4)]"
            >
              + ASSIGN SUB-AGENT TO SQUAD
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
