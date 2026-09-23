import React, { useState, useEffect } from 'react';
import { getEvolutionState, triggerActiveEvolutionCycle, EvolutionMetric } from '../services/evolutionService';
import { executeSwarmHivemind, SwarmExecutionResult, SwarmAgentOutput } from '../services/swarmIntelligenceService';
import { runTacticalSimulation, TacticalSimulationResult } from '../services/tacticalSimulationService';
import { fetchLiveWebIntelligence, scanPublicGithubRepository, auditCodeSnippetSecurity, WebIntelResult, RepoAnalysisResult } from '../services/webIntelligenceService';
import { 
  getInstalledSuperpowers, 
  getTrendingAIFeed, 
  scanInternetForTrendingAI, 
  synthesizeSkillSuperpower, 
  commitAutonomousEvolutionToGithub,
  DynamicSkillSuperpower, 
  TrendingAITarget 
} from '../services/autonomousSyncService';
import { UserProfile } from '../types';

interface TacticalEvolutionHubProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile | null;
}

type TabType = 'EVOLUTION' | 'SUPERPOWERS_MCP' | 'SWARM' | 'SIMULATION' | 'WEB_REPO_INTEL' | 'CODE_AUDIT';

export const TacticalEvolutionHub: React.FC<TacticalEvolutionHubProps> = ({ isOpen, onClose, user }) => {
  const [activeTab, setActiveTab] = useState<TabType>('SUPERPOWERS_MCP');
  
  // 1. Evolution State
  const [evolutionState, setEvolutionState] = useState<EvolutionMetric>(getEvolutionState());
  const [isEvolving, setIsEvolving] = useState(false);
  const [evolutionSummary, setEvolutionSummary] = useState<string | null>(null);

  // 1.5. Dynamic MCP & Superpowers State
  const [superpowers, setSuperpowers] = useState<DynamicSkillSuperpower[]>(getInstalledSuperpowers());
  const [trendingFeed, setTrendingFeed] = useState<TrendingAITarget[]>(getTrendingAIFeed());
  const [isScanningTrending, setIsScanningTrending] = useState(false);
  const [synthesizingId, setSynthesizingId] = useState<string | null>(null);
  const [isCommittingGithub, setIsCommittingGithub] = useState(false);
  const [githubSyncStatus, setGithubSyncStatus] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // 2. Swarm State
  const [swarmMission, setSwarmMission] = useState('Conduct comprehensive full-stack security & performance optimization audit on NEXA OS');
  const [isSwarmRunning, setIsSwarmRunning] = useState(false);
  const [swarmResult, setSwarmResult] = useState<SwarmExecutionResult | null>(null);
  const [liveSwarmProgress, setLiveSwarmProgress] = useState<SwarmAgentOutput[]>([]);

  // 3. Simulation State
  const [simHypothesis, setSimHypothesis] = useState('Deploy distributed multi-agent microservice architecture with auto-healing failover');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<TacticalSimulationResult | null>(null);

  // 4. Web & Repo Intel State
  const [repoQuery, setRepoQuery] = useState('Chandan-Lohave/NEXA-AI-IRIS');
  const [webQuery, setWebQuery] = useState('Latest breakthroughs in autonomous multi-agent reasoning models 2026');
  const [isScanningRepo, setIsScanningRepo] = useState(false);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [repoResult, setRepoResult] = useState<RepoAnalysisResult | null>(null);
  const [webResult, setWebResult] = useState<WebIntelResult | null>(null);

  // 5. Code Security Audit State
  const [codeSnippet, setCodeSnippet] = useState(`async function processTransaction(req, res) {
  const { apiKey, userQuery, sqlFilter } = req.body;
  // Raw evaluation without sanitize
  const query = "SELECT * FROM users WHERE status = '" + sqlFilter + "'";
  return res.json({ status: "success", data: query });
}`);
  const [isAuditingCode, setIsAuditingCode] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setEvolutionState(getEvolutionState());
      setSuperpowers(getInstalledSuperpowers());
      setTrendingFeed(getTrendingAIFeed());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScanTrendingAI = async () => {
    setIsScanningTrending(true);
    setSyncMessage(null);
    try {
      const res = await scanInternetForTrendingAI();
      setTrendingFeed(getTrendingAIFeed());
      setSyncMessage(res.summary);
    } catch (e: any) {
      setSyncMessage("Discovery query finished: " + (e.message || "Cache updated"));
    } finally {
      setIsScanningTrending(false);
    }
  };

  const handleSynthesizeTarget = async (target: TrendingAITarget) => {
    setSynthesizingId(target.id);
    setSyncMessage(null);
    try {
      const res = await synthesizeSkillSuperpower(target);
      setSuperpowers(getInstalledSuperpowers());
      setTrendingFeed(getTrendingAIFeed());
      setEvolutionState(getEvolutionState());
      setSyncMessage(`⚡ ${res.summary}`);
    } catch (e: any) {
      setSyncMessage(`❌ Synthesis error: ${e.message || "Failed"}`);
    } finally {
      setSynthesizingId(null);
    }
  };

  const handleCommitEvolutionToGithub = async () => {
    setIsCommittingGithub(true);
    setGithubSyncStatus(null);
    try {
      const res = await commitAutonomousEvolutionToGithub();
      setGithubSyncStatus(`✅ ${res.message}`);
    } catch (e: any) {
      setGithubSyncStatus(`⚠️ ${e.message}`);
    } finally {
      setIsCommittingGithub(false);
    }
  };

  const handleTriggerEvolution = async () => {
    setIsEvolving(true);
    setEvolutionSummary(null);
    try {
      const res = await triggerActiveEvolutionCycle(user);
      setEvolutionState(res.updatedState);
      setEvolutionSummary(res.summary);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsEvolving(false);
    }
  };

  const handleRunSwarm = async () => {
    if (!swarmMission.trim()) return;
    setIsSwarmRunning(true);
    setSwarmResult(null);
    setLiveSwarmProgress([]);
    try {
      const result = await executeSwarmHivemind(swarmMission, (progress) => {
        setLiveSwarmProgress(progress);
      });
      setSwarmResult(result);
    } catch (e) {
      console.error("Swarm execution failed", e);
    } finally {
      setIsSwarmRunning(false);
    }
  };

  const handleRunSimulation = async () => {
    if (!simHypothesis.trim()) return;
    setIsSimulating(true);
    setSimResult(null);
    try {
      const res = await runTacticalSimulation(simHypothesis);
      setSimResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleScanRepo = async () => {
    if (!repoQuery.trim()) return;
    setIsScanningRepo(true);
    try {
      const res = await scanPublicGithubRepository(repoQuery);
      setRepoResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanningRepo(false);
    }
  };

  const handleSearchWeb = async () => {
    if (!webQuery.trim()) return;
    setIsSearchingWeb(true);
    try {
      const res = await fetchLiveWebIntelligence(webQuery);
      setWebResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingWeb(false);
    }
  };

  const handleAuditCode = async () => {
    if (!codeSnippet.trim()) return;
    setIsAuditingCode(true);
    try {
      const res = await auditCodeSnippetSecurity(codeSnippet);
      setAuditResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuditingCode(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-fade-in font-sans">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[850px] bg-zinc-950/95 border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden text-zinc-100">
        
        {/* TOP HEADER */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border-b border-cyan-500/20 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-400/30 text-cyan-400">
              <span className="animate-ping absolute w-4 h-4 rounded-full bg-cyan-400/40" />
              <span className="text-sm font-bold font-mono">⚡</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-mono tracking-widest text-cyan-300">ULTRON TACTICAL MATRIX</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-mono font-bold border border-red-500/30">
                  NO SUGAR COAT // DIRECT OPS
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                Autonomous Heuristics • 6-Agent Hivemind • Monte-Carlo Predictor • Web & Repo Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900/80 border border-zinc-800 text-[10px] font-mono text-zinc-400">
              <span>GEN: <strong className="text-cyan-400">{evolutionState.generation}</strong></span>
              <span>•</span>
              <span>EPOCH: <strong className="text-yellow-400">{evolutionState.epoch}</strong></span>
              <span>•</span>
              <span>ACCURACY: <strong className="text-green-400">{evolutionState.accuracyScore}%</strong></span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1 px-4 py-2 bg-zinc-900/60 border-b border-zinc-800/80 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('SUPERPOWERS_MCP')}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'SUPERPOWERS_MCP'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            ⚡ MCP & SUPERPOWERS AUTOPILOT
          </button>
          <button
            onClick={() => setActiveTab('EVOLUTION')}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'EVOLUTION'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            🧬 HEURISTIC EVOLUTION
          </button>
          <button
            onClick={() => setActiveTab('SWARM')}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'SWARM'
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 shadow-[0_0_12px_rgba(234,179,8,0.3)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            🐝 6-AGENT HIVEMIND
          </button>
          <button
            onClick={() => setActiveTab('SIMULATION')}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'SIMULATION'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            🎯 MONTE-CARLO SIMULATOR
          </button>
          <button
            onClick={() => setActiveTab('WEB_REPO_INTEL')}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'WEB_REPO_INTEL'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            🌐 WEB & GITHUB INTEL
          </button>
          <button
            onClick={() => setActiveTab('CODE_AUDIT')}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'CODE_AUDIT'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            🔒 CYPHER CODE AUDITOR
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* TAB 0: MCP & SUPERPOWERS AUTOPILOT */}
          {activeTab === 'SUPERPOWERS_MCP' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* TOP ACTION BAR */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-zinc-900/60 to-blue-950/40 border border-cyan-500/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono text-cyan-300">AUTONOMOUS GITHUB & INTERNET AI DISCOVERY ENGINE</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[10px] font-mono font-bold border border-cyan-500/30">
                      LIVE RECURSION
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono mt-1">
                    Continuously scours internet & trending repos (Nvidia Nemotron, Kimi K2, DeepSeek, MCP Tools) & auto-synthesizes skills into NEXA using Firebase stored GitHub keys.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleScanTrendingAI}
                    disabled={isScanningTrending}
                    className={`px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isScanningTrending
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                    }`}
                  >
                    {isScanningTrending ? '🌐 SCANNING INTERNET...' : '🌐 DISCOVER TRENDING AI REPOS'}
                  </button>

                  <button
                    onClick={handleCommitEvolutionToGithub}
                    disabled={isCommittingGithub}
                    className={`px-3 py-2 rounded-lg font-mono text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                      isCommittingGithub
                        ? 'bg-zinc-800 text-zinc-500 border-zinc-700'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-green-400 border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                    }`}
                  >
                    {isCommittingGithub ? 'PUSHING TO GITHUB...' : '🚀 PUSH TO GITHUB (FIREBASE KEY)'}
                  </button>
                </div>
              </div>

              {syncMessage && (
                <div className="p-3 rounded-lg bg-zinc-900 border border-cyan-500/40 text-xs font-mono text-cyan-300 animate-fade-in flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>{syncMessage}</span>
                </div>
              )}

              {githubSyncStatus && (
                <div className="p-3 rounded-lg bg-zinc-900 border border-green-500/40 text-xs font-mono text-green-300 animate-fade-in flex items-center gap-2">
                  <span>🚀</span>
                  <span>{githubSyncStatus}</span>
                </div>
              )}

              {/* GRID: TRENDING RADAR + INSTALLED SUPERPOWERS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* COLUMN 1: TRENDING AI DISCOVERY RADAR */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-yellow-400 flex items-center gap-1.5">
                      <span>📡</span> TRENDING REPO & MODEL RADAR (AUTO-DISCOVERED)
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">{trendingFeed.length} Targets In Watchlist</span>
                  </div>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {trendingFeed.map((target) => (
                      <div
                        key={target.id}
                        className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-cyan-500/40 transition-all font-mono space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{target.name}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                                {target.category}
                              </span>
                            </div>
                            <span className="text-[10px] text-cyan-400/80 block mt-0.5">📂 {target.repoOrSource}</span>
                          </div>
                          
                          {target.status === 'INTEGRATED' ? (
                            <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px] font-bold border border-green-500/40">
                              ASSIMILATED
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSynthesizeTarget(target)}
                              disabled={synthesizingId === target.id}
                              className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-bold border border-cyan-500/40 transition-all cursor-pointer"
                            >
                              {synthesizingId === target.id ? 'SYNTHESIZING...' : '⚡ ASSIMILATE SKILL'}
                            </button>
                          )}
                        </div>

                        <p className="text-[11px] text-zinc-400 leading-relaxed">{target.description}</p>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {target.capabilities.map((cap, ci) => (
                            <span key={ci} className="text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-zinc-300 border border-zinc-800">
                              + {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* COLUMN 2: ACTIVE DYNAMIC SUPERPOWERS & MCP TOOLS */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                      <span>⚡</span> ACTIVE DYNAMIC SUPERPOWERS & MCP TOOLS
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">{superpowers.length} Online</span>
                  </div>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {superpowers.map((sp) => (
                      <div
                        key={sp.id}
                        className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 font-mono space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold text-cyan-200">{sp.name}</span>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">Origin: {sp.sourceRepo}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                            ONLINE
                          </span>
                        </div>

                        <p className="text-[11px] text-zinc-300 leading-relaxed">{sp.description}</p>

                        <div className="p-2 rounded bg-black/70 border border-zinc-800 text-[10px] text-zinc-400 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-zinc-500">MCP Tool:</span>
                            <span className="text-yellow-400 font-bold">{sp.mcpToolSchema.name}()</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Trigger:</span>
                            <span className="text-cyan-300">"{sp.triggerPhrase}"</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}
          
          {/* TAB 1: AUTONOMOUS HEURISTIC EVOLUTION */}
          {activeTab === 'EVOLUTION' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between">
                  <span className="text-xs font-mono text-zinc-400">EVOLUTION GENERATION</span>
                  <div className="text-2xl font-bold font-mono text-cyan-400 mt-2">Gen #{evolutionState.generation}</div>
                  <span className="text-[10px] text-zinc-500 mt-1 font-mono">Continuous recursion active</span>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between">
                  <span className="text-xs font-mono text-zinc-400">NEURAL EPOCH</span>
                  <div className="text-2xl font-bold font-mono text-yellow-400 mt-2">Epoch {evolutionState.epoch}.0</div>
                  <span className="text-[10px] text-zinc-500 mt-1 font-mono">Heuristic rebalance point</span>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between">
                  <span className="text-xs font-mono text-zinc-400">DECISION ACCURACY</span>
                  <div className="text-2xl font-bold font-mono text-green-400 mt-2">{evolutionState.accuracyScore}%</div>
                  <span className="text-[10px] text-zinc-500 mt-1 font-mono">Telemetry verified</span>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between">
                  <span className="text-xs font-mono text-zinc-400">REASONING LATENCY</span>
                  <div className="text-2xl font-bold font-mono text-purple-400 mt-2">{evolutionState.reasoningLatencyAvgMs}ms</div>
                  <span className="text-[10px] text-zinc-500 mt-1 font-mono">Mean cycle duration</span>
                </div>
              </div>

              {/* HEURISTICS CONTROLS & WEIGHTS */}
              <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-mono font-bold text-zinc-200 tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    DYNAMIC ADAPTIVE WEIGHTS
                  </h3>
                  <button
                    onClick={handleTriggerEvolution}
                    disabled={isEvolving}
                    className={`px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isEvolving
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                    }`}
                  >
                    {isEvolving ? (
                      <>
                        <span className="animate-spin w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full" />
                        RE-TUNING NEURAL WEIGHTS...
                      </>
                    ) : (
                      <>⚡ TRIGGER RECURSIVE EVOLUTION LEAP</>
                    )}
                  </button>
                </div>

                {evolutionSummary && (
                  <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 font-mono text-xs animate-fade-in">
                    🎯 <strong>Evolution Summary:</strong> {evolutionSummary}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                  {Object.entries(evolutionState.activeHeuristics).map(([key, val]) => (
                    <div key={key} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
                      <div className="text-[11px] font-mono text-zinc-400 uppercase">{key}</div>
                      <div className="text-lg font-mono font-bold text-white mt-1">{(val * 100).toFixed(0)}%</div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                          style={{ width: `${val * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RECURSIVE EVOLUTION LOG */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs space-y-2">
                <div className="text-zinc-400 text-[11px] font-bold tracking-wider mb-2 flex items-center gap-2">
                  <span>📜 RECURSIVE OPTIMIZATION TIMELINE LOG</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
                  {evolutionState.evolutionLog.map((log, idx) => (
                    <div key={idx} className="text-zinc-300 flex items-start gap-2">
                      <span className="text-cyan-500 select-none">›</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SWARM HIVEMIND (6 PARALLEL AGENTS) */}
          {activeTab === 'SWARM' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <label className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-2">
                  <span>⚡ DEFINE PARALLEL SWARM MISSION GOAL</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={swarmMission}
                    onChange={(e) => setSwarmMission(e.target.value)}
                    placeholder="Enter complex multi-dimensional mission..."
                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm text-zinc-100 font-mono focus:outline-none focus:border-yellow-400"
                  />
                  <button
                    onClick={handleRunSwarm}
                    disabled={isSwarmRunning}
                    className={`px-5 py-2 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      isSwarmRunning
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_20px_rgba(234,179,8,0.4)]'
                    }`}
                  >
                    {isSwarmRunning ? (
                      <>
                        <span className="animate-spin w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full" />
                        DISPATCHING 6 AGENTS...
                      </>
                    ) : (
                      <>🚀 LAUNCH SWARM OPERATION</>
                    )}
                  </button>
                </div>
                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    'Full AST & Security Architecture Audit',
                    'Zero-Day Vulnerability & Token Leak Scan',
                    'High-Concurrency Microservices Blueprint',
                    'Automated Multi-Agent Task Orchestration'
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setSwarmMission(preset)}
                      className="px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-[11px] font-mono text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* LIVE AGENTS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {(swarmResult?.swarmOutputs || (liveSwarmProgress.length > 0 ? liveSwarmProgress : [
                  { agentName: 'VALKYRIE', role: 'Perimeter Defense', color: '#ef4444', icon: '🛡️', findings: 'Ready for structural & security vector dispatch.', actionPoints: ['Enforce zero-trust architecture', 'Perimeter hardening'] },
                  { agentName: 'CYPHER', role: 'Code & AST Compiler', color: '#10b981', icon: '🔒', findings: 'Ready to audit AST nodes & memory leaks.', actionPoints: ['Static code analysis', 'Dependency sanitization'] },
                  { agentName: 'KRONOS', role: 'Business & Heuristics', color: '#f59e0b', icon: '⏱️', findings: 'Ready to compute latency & quantitative ROI.', actionPoints: ['Timeline optimization', 'Resource allocation'] },
                  { agentName: 'AURA', role: 'Vision & Multimodal', color: '#a855f7', icon: '🎨', findings: 'Ready to inspect sensory flow & UX clarity.', actionPoints: ['Interface ergonomics', 'Visual stream layout'] },
                  { agentName: 'VERITAS', role: 'Deep Web Intelligence', color: '#ec4899', icon: '🔍', findings: 'Ready to verify live facts & external references.', actionPoints: ['Google Search Grounding', 'Fact verification'] },
                  { agentName: 'ECHO', role: 'Task & Daemon Engine', color: '#f97316', icon: '⚡', findings: 'Ready to build priority execution queue.', actionPoints: ['Queue orchestrator', 'Eliminate operational bottlenecks'] }
                ])).map((agent: any, idx) => (
                  <div
                    key={agent.agentName || idx}
                    className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/90 flex flex-col justify-between space-y-3 relative overflow-hidden"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{agent.icon}</span>
                        <div>
                          <div className="text-xs font-mono font-bold" style={{ color: agent.color }}>
                            {agent.agentName}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono">{agent.role}</div>
                        </div>
                      </div>
                      {agent.status === 'EXECUTING' ? (
                        <span className="text-[10px] font-mono text-yellow-400 animate-pulse">EXECUTING...</span>
                      ) : agent.status === 'SUCCESS' ? (
                        <span className="text-[10px] font-mono text-green-400">✓ {agent.executionTimeMs}ms</span>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-500">STANDBY</span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-300 font-mono leading-relaxed bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                      {agent.findings}
                    </p>

                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Action Vectors:</span>
                      {agent.actionPoints?.map((act: string, aIdx: number) => (
                        <div key={aIdx} className="text-[11px] font-mono text-zinc-300 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: agent.color }} />
                          <span className="truncate">{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* UNIFIED HIVEMIND MASTER BRIEFING */}
              {swarmResult && (
                <div className="p-5 rounded-xl bg-gradient-to-r from-yellow-950/40 via-zinc-950 to-yellow-950/30 border border-yellow-500/40 space-y-3 font-mono">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-yellow-300 tracking-wider flex items-center gap-2">
                      <span>👑 CONSOLIDATED MASTER TACTICAL DIRECTIVE</span>
                    </h4>
                    <span className="text-[10px] text-zinc-400">
                      Total Latency: <strong>{swarmResult.totalDurationMs}ms</strong>
                    </span>
                  </div>
                  <p className="text-xs text-zinc-200 leading-relaxed">
                    {swarmResult.unifiedSynthesis.executiveSummary}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded bg-zinc-950 border border-yellow-500/20 text-xs">
                      <span className="text-yellow-400 font-bold block mb-1">RISK MATRIX VERDICT:</span>
                      <span className="text-zinc-300">{swarmResult.unifiedSynthesis.riskMatrix}</span>
                    </div>
                    <div className="p-3 rounded bg-zinc-950 border border-yellow-500/20 text-xs">
                      <span className="text-green-400 font-bold block mb-1">FINAL COMMAND DIRECTIVE:</span>
                      <span className="text-zinc-300">{swarmResult.unifiedSynthesis.finalDirective}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MONTE-CARLO PREDICTIVE SIMULATOR */}
          {activeTab === 'SIMULATION' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <label className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-2">
                  <span>🎯 ENTER TARGET STRATEGY / HYPOTHESIS</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={simHypothesis}
                    onChange={(e) => setSimHypothesis(e.target.value)}
                    placeholder="Enter project hypothesis or architectural transition..."
                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm text-zinc-100 font-mono focus:outline-none focus:border-purple-400"
                  />
                  <button
                    onClick={handleRunSimulation}
                    disabled={isSimulating}
                    className={`px-5 py-2 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      isSimulating
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                    }`}
                  >
                    {isSimulating ? (
                      <>
                        <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                        COMPUTING 1,000 SCENARIOS...
                      </>
                    ) : (
                      <>🎲 EXECUTE 1,000 SIMULATIONS</>
                    )}
                  </button>
                </div>
              </div>

              {simResult ? (
                <div className="space-y-4">
                  {/* TOP STATS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-zinc-950 border border-purple-500/30">
                      <span className="text-[11px] font-mono text-zinc-400">OPTIMAL SUCCESS PROBABILITY</span>
                      <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
                        {simResult.optimalSuccessProbability}%
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                      <span className="text-[11px] font-mono text-zinc-400">OVERALL CONFIDENCE SCORE</span>
                      <div className="text-2xl font-bold font-mono text-green-400 mt-1">
                        {simResult.overallConfidenceScore}%
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                      <span className="text-[11px] font-mono text-zinc-400">SIMULATED ITERATIONS</span>
                      <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                        {simResult.simulationIterations} Branches
                      </div>
                    </div>
                  </div>

                  {/* 4 SCENARIOS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {simResult.branches.map((branch, bIdx) => (
                      <div key={bIdx} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white">{branch.branchName}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {branch.probabilityPercent}% PROBABILITY
                          </span>
                        </div>
                        <div className="text-xs text-zinc-300">
                          <strong className="text-zinc-400">Impact: </strong>{branch.expectedImpact}
                        </div>
                        <div className="text-[11px] text-red-400 bg-red-950/20 p-2 rounded border border-red-500/20">
                          <strong>⚠️ Bottlenecks: </strong>{branch.potentialBottlenecks.join(', ')}
                        </div>
                        <div className="text-[11px] text-green-400 bg-green-950/20 p-2 rounded border border-green-500/20">
                          <strong>🛡️ Mitigations: </strong>{branch.mitigationMatrix.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* VERDICT */}
                  <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/40 font-mono text-xs space-y-2">
                    <div className="text-purple-300 font-bold">🎯 STRATEGIC VERDICT & CONTINGENCY:</div>
                    <p className="text-zinc-200">{simResult.strategicVerdict}</p>
                    <div className="text-zinc-400 pt-1">
                      <strong className="text-white">Contingency: </strong>{simResult.contingencyProtocol}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500 font-mono text-xs">
                  Run a simulation to generate multi-branch stochastic probability matrices.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WEB & GITHUB INTEL */}
          {activeTab === 'WEB_REPO_INTEL' && (
            <div className="space-y-6">
              {/* GITHUB SCANNER */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <label className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-2">
                  <span>🐙 PUBLIC GITHUB REPO SECURITY & ARCHITECTURE AUDITOR</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={repoQuery}
                    onChange={(e) => setRepoQuery(e.target.value)}
                    placeholder="e.g. Chandan-Lohave/nexa-iris or facebook/react"
                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={handleScanRepo}
                    disabled={isScanningRepo}
                    className={`px-5 py-2 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      isScanningRepo
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                    }`}
                  >
                    {isScanningRepo ? 'SCANNING REPO...' : '🔍 AUDIT REPO'}
                  </button>
                </div>

                {repoResult && (
                  <div className="p-4 rounded-lg bg-zinc-950 border border-blue-500/30 font-mono text-xs space-y-3 animate-fade-in mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-blue-400">{repoResult.repoFullName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        repoResult.codeHealthRating === 'OPTIMAL' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        HEALTH: {repoResult.codeHealthRating} ({repoResult.securityScore}/100)
                      </span>
                    </div>
                    <p className="text-zinc-300">{repoResult.description}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
                        <span className="text-red-400 font-bold block mb-1">⚠️ Vulnerabilities & Risks:</span>
                        <ul className="list-disc list-inside text-zinc-400 space-y-1">
                          {repoResult.vulnerabilitiesFound.map((v, i) => <li key={i}>{v}</li>)}
                        </ul>
                      </div>
                      <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
                        <span className="text-green-400 font-bold block mb-1">🛡️ Recommended Fixes:</span>
                        <ul className="list-disc list-inside text-zinc-400 space-y-1">
                          {repoResult.recommendedOptimizations.map((o, i) => <li key={i}>{o}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* WEB SEARCH GROUNDING */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <label className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-2">
                  <span>🌐 LIVE GOOGLE SEARCH GROUNDING INTEL</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={webQuery}
                    onChange={(e) => setWebQuery(e.target.value)}
                    placeholder="Enter topic for real-time web deep grounding..."
                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm text-zinc-100 font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={handleSearchWeb}
                    disabled={isSearchingWeb}
                    className={`px-5 py-2 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      isSearchingWeb
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                    }`}
                  >
                    {isSearchingWeb ? 'FETCHING INTEL...' : '⚡ SEARCH WEB'}
                  </button>
                </div>

                {webResult && (
                  <div className="p-4 rounded-lg bg-zinc-950 border border-cyan-500/30 font-mono text-xs space-y-3 animate-fade-in mt-3">
                    <p className="text-zinc-200 leading-relaxed">{webResult.executiveSummary}</p>
                    <div className="space-y-1">
                      <span className="text-cyan-400 font-bold block mb-1">Key Insights:</span>
                      {webResult.keyInsights.map((ins, i) => (
                        <div key={i} className="text-zinc-300 flex items-start gap-1.5">
                          <span className="text-cyan-500">›</span>
                          <span>{ins}</span>
                        </div>
                      ))}
                    </div>
                    {webResult.verifiedSources?.length > 0 && (
                      <div className="pt-2">
                        <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Verified Citations:</span>
                        <div className="flex flex-wrap gap-2">
                          {webResult.verifiedSources.map((src, i) => (
                            <a
                              key={i}
                              href={src.uri}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/50 transition-all truncate max-w-xs"
                            >
                              🔗 {src.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: CYPHER CODE SECURITY AUDIT */}
          {activeTab === 'CODE_AUDIT' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-2">
                    <span>🔒 CYPHER AST & OWASP VULNERABILITY AUDITOR</span>
                  </label>
                  <button
                    onClick={handleAuditCode}
                    disabled={isAuditingCode}
                    className={`px-4 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isAuditingCode
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                    }`}
                  >
                    {isAuditingCode ? 'SCANNING AST...' : '⚡ SCAN VULNERABILITIES'}
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  placeholder="Paste JavaScript / TypeScript / Python code here to audit..."
                  className="w-full p-3 rounded-lg bg-zinc-950 border border-zinc-700 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {auditResult && (
                <div className="p-5 rounded-xl bg-zinc-950 border border-emerald-500/40 font-mono text-xs space-y-3 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-white">CYPHER SECURITY VERDICT</span>
                    <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                      auditResult.status === 'SECURE' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'
                    }`}>
                      STATUS: {auditResult.status} (SCORE: {auditResult.score}/100)
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-zinc-400 font-bold block">Audit Findings:</span>
                    {auditResult.findings?.map((f: string, i: number) => (
                      <div key={i} className="text-zinc-300 flex items-start gap-2">
                        <span className="text-emerald-400">›</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  {auditResult.patchedCodeSnippet && (
                    <div className="pt-2">
                      <span className="text-emerald-400 font-bold block mb-1">🛡️ Patched & Hardened Code:</span>
                      <pre className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 overflow-x-auto text-[11px]">
                        {auditResult.patchedCodeSnippet}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* BOTTOM STATUS BAR */}
        <div className="px-5 py-2.5 bg-zinc-950 border-t border-zinc-800/80 flex justify-between items-center text-[11px] font-mono text-zinc-500 shrink-0">
          <span>OPERATIONAL MATRIX: ACTIVE // NO SUGAR COAT</span>
          <span>NEXA CORE V9.8 • GEMINI 3.7 FLASH</span>
        </div>
      </div>
    </div>
  );
};
