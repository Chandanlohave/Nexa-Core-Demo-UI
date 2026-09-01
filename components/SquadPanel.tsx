import React, { useState } from 'react';
import { NEXA_SQUAD_AGENTS, startSquadIntroSequence } from '../services/squadService';
import { speakAgentText, stop } from '../services/ttsService';
import { UserProfile } from '../types';
import { 
  BarChart3, 
  Code2, 
  Eye, 
  Search, 
  Clock, 
  ShieldCheck, 
  Volume2, 
  Play, 
  Sparkles, 
  X, 
  Cpu, 
  Radio, 
  Activity,
  Zap
} from 'lucide-react';

interface SquadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onRunAgentTask: (agentName: string, promptText: string) => void;
  activeHighlightAgentId: string | null;
  setActiveHighlightAgentId: (id: string | null) => void;
  onOpenPipeline?: () => void;
  onOpenDebate?: () => void;
  onOpenCustomAgent?: () => void;
}

export const SquadPanel: React.FC<SquadPanelProps> = ({
  isOpen,
  onClose,
  user,
  onRunAgentTask,
  activeHighlightAgentId,
  setActiveHighlightAgentId,
  onOpenPipeline,
  onOpenDebate,
  onOpenCustomAgent
}) => {
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [playingSingleAgentId, setPlayingSingleAgentId] = useState<string | null>(null);

  if (!isOpen) return null;

  const getAgentIcon = (id: string) => {
    switch (id) {
      case 'agent_kronos': return <BarChart3 className="w-5 h-5 text-amber-400" />;
      case 'agent_cypher': return <Code2 className="w-5 h-5 text-emerald-400" />;
      case 'agent_aura': return <Eye className="w-5 h-5 text-purple-400" />;
      case 'agent_veritas': return <Search className="w-5 h-5 text-pink-500" />;
      case 'agent_echo': return <Clock className="w-5 h-5 text-orange-400" />;
      case 'agent_valkyrie': return <ShieldCheck className="w-5 h-5 text-red-400" />;
      default: return <Cpu className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getAgentTaskPrompt = (id: string) => {
    switch (id) {
      case 'agent_kronos': return "Analyze our business data, calculate key growth metrics, and generate strategic recommendations with clear expected impacts.";
      case 'agent_cypher': return "Perform a live code audit on the current TypeScript architecture, inspect AST node execution, and verify zero syntax errors.";
      case 'agent_aura': return "Activate Vision Optical Feed analysis and explain what visual elements or image patterns require live inspection.";
      case 'agent_veritas': return "Perform a deep web research grounding query on latest AI Studio developments and fact-check all key sources.";
      case 'agent_echo': return "Organize today's pending operational tasks, construct a priority matrix, and suggest automated workflow actions.";
      case 'agent_valkyrie': return "Execute security firewall audit, verify AES-256 encryption state, and confirm 3-Strike access control status.";
      default: return "Run specialist diagnostic.";
    }
  };

  const handleStartSquadSequence = async () => {
    setIsPlayingSequence(true);
    await startSquadIntroSequence(
      user,
      [],
      (agentId) => setActiveHighlightAgentId(agentId),
      () => {
        setIsPlayingSequence(false);
        setActiveHighlightAgentId(null);
      },
      false
    );
  };

  const handlePlaySingleAgent = async (agent: typeof NEXA_SQUAD_AGENTS[0]) => {
    stop();
    setPlayingSingleAgentId(agent.id);
    setActiveHighlightAgentId(agent.id);

    await speakAgentText(
      user,
      agent.introText,
      agent.voice,
      agent.voiceGender,
      () => {},
      () => {
        setPlayingSingleAgentId(null);
        setActiveHighlightAgentId(null);
      }
    );
  };

  const handleStopAll = () => {
    stop();
    setIsPlayingSequence(false);
    setPlayingSingleAgentId(null);
    setActiveHighlightAgentId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-[96%] max-w-5xl max-h-[94vh] bg-slate-950/90 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-5 gap-3 border-b border-cyan-500/20 bg-slate-900/50">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
              <Cpu className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-xl font-bold tracking-wider text-white font-mono uppercase">
                  NEXA SQUAD
                </h2>
                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full">
                  6 SPECIALIZED CORES
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-mono mt-0.5 line-clamp-1 sm:line-clamp-none">
                Integrated Neural Sub-Agents • Autonomous Execution Engine
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
            <div className="flex flex-wrap items-center gap-2">
              {onOpenPipeline && (
                <button
                  onClick={onOpenPipeline}
                  className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] sm:text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  ⚡ PIPELINE
                </button>
              )}
              {onOpenDebate && (
                <button
                  onClick={onOpenDebate}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono text-[10px] sm:text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  ⚔️ DEBATE
                </button>
              )}
              {onOpenCustomAgent && (
                <button
                  onClick={onOpenCustomAgent}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] sm:text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  🛠️ BUILD CORE
                </button>
              )}

              {isPlayingSequence || playingSingleAgentId ? (
                <button
                  onClick={handleStopAll}
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-mono text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> STOP INTRO
                </button>
              ) : null}

              <button
                onClick={handleStartSquadSequence}
                disabled={isPlayingSequence}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-[11px] sm:text-xs font-bold shadow-lg shadow-cyan-500/20 border border-cyan-400/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Volume2 className="w-3.5 h-3.5 animate-bounce" /> INTRO ALL AGENTS
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 custom-scrollbar">
          
          {/* Active Highlight Banner */}
          {activeHighlightAgentId && (
            <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <Radio className="w-5 h-5 text-cyan-400 animate-spin" />
                <div>
                  <div className="text-xs font-mono text-cyan-300 font-bold uppercase">
                    ACTIVE TRANSMISSION PROTOCOL
                  </div>
                  <div className="text-sm font-semibold text-white">
                    Agent Highlight: <span className="text-cyan-400 uppercase font-mono">{activeHighlightAgentId.replace('agent_', '')}</span>
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono text-cyan-400 px-3 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30">
                VOICE SYNTHESIS IN PROGRESS
              </span>
            </div>
          )}

          {/* 6 Agent Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {NEXA_SQUAD_AGENTS.map((agent) => {
              const isHighlight = activeHighlightAgentId === agent.id;
              const isSinglePlaying = playingSingleAgentId === agent.id;

              return (
                <div
                  key={agent.id}
                  className={`relative flex flex-col justify-between p-5 rounded-xl border transition-all duration-300 bg-slate-900/60 ${
                    isHighlight || isSinglePlaying
                      ? 'border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)] bg-slate-900/90 scale-[1.02]'
                      : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                  style={{
                    borderTopColor: agent.color,
                    borderTopWidth: '3px'
                  }}
                >
                  <div>
                    {/* Top Status & Name */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50">
                          {getAgentIcon(agent.id)}
                        </div>
                        <div>
                          <h3 
                            className="font-mono font-bold text-base tracking-wider uppercase"
                            style={{ color: agent.color }}
                          >
                            {agent.name}
                          </h3>
                          <div className="text-xs text-slate-400 font-medium">
                            {agent.role}
                          </div>
                        </div>
                      </div>

                      <span 
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold"
                        style={{ 
                          backgroundColor: `${agent.color}15`, 
                          color: agent.color,
                          border: `1px solid ${agent.color}40`
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: agent.color }} />
                        ONLINE
                      </span>
                    </div>

                    {/* Specialty & Metrics */}
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      {agent.specialty}
                    </p>

                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1 font-mono text-[11px] mb-4">
                      <div className="text-slate-400 flex items-center justify-between">
                        <span>STATUS:</span>
                        <span className="text-emerald-400 font-semibold">{agent.status}</span>
                      </div>
                      <div className="text-slate-400 flex items-center justify-between">
                        <span>METRIC:</span>
                        <span className="text-slate-200">{agent.metric}</span>
                      </div>
                      <div className="text-slate-400 flex items-center justify-between">
                        <span>VOICE:</span>
                        <span style={{ color: agent.color }}>
                          {agent.voice} ({agent.voiceGender})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handlePlaySingleAgent(agent)}
                      disabled={isPlayingSequence}
                      className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSinglePlaying ? (
                        <>
                          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-spin" /> Speaking...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" /> Hear Intro
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        onRunAgentTask(agent.name, getAgentTaskPrompt(agent.id));
                        onClose();
                      }}
                      className="flex-1 py-2 px-3 rounded-lg font-mono text-xs font-bold text-slate-950 flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer hover:brightness-110"
                      style={{ backgroundColor: agent.color }}
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" /> Run Task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Info Note */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Voice commands supported: <span className="text-slate-200">"Nexa, introduce your agents"</span> or <span className="text-slate-200">"apne agents se introduce karao"</span></span>
            </div>
            <span className="text-cyan-400">NEXA OS v9.8 ACTIVE</span>
          </div>

        </div>
      </div>
    </div>
  );
};
