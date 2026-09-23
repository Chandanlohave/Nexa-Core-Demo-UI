import React, { useState } from 'react';
import { NexaAgentNode, UserProfile } from '../types';
import { NEXA_SQUAD_AGENTS } from '../services/squadService';
import { generateTextResponse } from '../services/geminiService';
import { speakAgentText, stop } from '../services/ttsService';

interface AgentDebateModalProps {
  user: UserProfile;
  agents: NexaAgentNode[];
  onClose: () => void;
  onAgentHighlight: (agentId: string | null) => void;
}

interface DebateTurn {
  speaker: NexaAgentNode;
  text: string;
}

const DEBATE_TOPICS = [
  '⚡ Monolithic vs Microservices Architecture in 2026',
  '🛡️ Maximum AES-256 Firewall Restrictions vs Rapid Developer Velocity',
  '🤖 Fully Autonomous AI Execution vs Human-in-the-Loop Supervision',
  '📊 Predictive Data Modeling vs Live Real-Time Stream Processing'
];

export const AgentDebateModal: React.FC<AgentDebateModalProps> = ({ user, agents, onClose, onAgentHighlight }) => {
  const [agent1Id, setAgent1Id] = useState<string>(agents[0]?.id || 'agent_kronos');
  const [agent2Id, setAgent2Id] = useState<string>(agents[1]?.id || 'agent_cypher');
  const [topic, setTopic] = useState<string>(DEBATE_TOPICS[0]);
  const [rounds, setRounds] = useState<number>(3);
  const [turns, setTurns] = useState<DebateTurn[]>([]);
  const [isDebating, setIsDebating] = useState<boolean>(false);
  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | null>(null);

  const getAgent = (id: string): NexaAgentNode => {
    return agents.find(a => a.id === id) || NEXA_SQUAD_AGENTS[0];
  };

  const handleStartDebate = async () => {
    if (agent1Id === agent2Id) {
      alert("Please select two different agents for the debate!");
      return;
    }

    setIsDebating(true);
    setTurns([]);
    const a1 = getAgent(agent1Id);
    const a2 = getAgent(agent2Id);

    let debateHistory: { speaker: string; content: string }[] = [];

    for (let round = 1; round <= rounds; round++) {
      // Turn 1: Agent 1
      setCurrentSpeakerId(a1.id);
      onAgentHighlight(a1.id);

      const promptA1 = `You are ${a1.name} (${a1.role}). You are debating ${a2.name} (${a2.role}) on topic: "${topic}". Round ${round}/${rounds}.
${debateHistory.length > 0 ? `Previous arguments: ${JSON.stringify(debateHistory)}` : 'Opening statement.'}
Provide a crisp 2-3 sentence argument backing your specialty. Speak in natural professional Hinglish/English for Chandan Sir.`;

      let textA1 = '';
      try {
        const resA1 = await generateTextResponse(promptA1, user);
        textA1 = resA1?.text || `${a1.name}: Proceeding with analysis for ${topic}.`;
      } catch (err) {
        textA1 = `${a2.name}, as ${a1.name}, my analysis shows that optimizing for high throughput and system reliability must take priority on ${topic}!`;
      }

      debateHistory.push({ speaker: a1.name, content: textA1 });
      setTurns(prev => [...prev, { speaker: a1, text: textA1 }]);

      await new Promise<void>((resolve) => {
        speakAgentText(
          user,
          textA1,
          a1.voice,
          a1.voiceGender,
          () => {},
          () => resolve()
        );
      });

      // Turn 2: Agent 2
      setCurrentSpeakerId(a2.id);
      onAgentHighlight(a2.id);

      const promptA2 = `You are ${a2.name} (${a2.role}). You are debating ${a1.name} on topic: "${topic}". Round ${round}/${rounds}.
${a1.name} just said: "${textA1}".
Provide a smart counter-argument or rebuttal emphasizing your domain (${a2.role}). Speak concisely in natural Hinglish/English.`;

      let textA2 = '';
      try {
        const resA2 = await generateTextResponse(promptA2, user);
        textA2 = resA2?.text || `${a2.name}: Acknowledged. Re-evaluating architecture.`;
      } catch (err) {
        textA2 = `I understand your perspective ${a1.name}, but from ${a2.role} standpoint, code scalability and architectural elegance are paramount!`;
      }

      debateHistory.push({ speaker: a2.name, content: textA2 });
      setTurns(prev => [...prev, { speaker: a2, text: textA2 }]);

      await new Promise<void>((resolve) => {
        speakAgentText(
          user,
          textA2,
          a2.voice,
          a2.voiceGender,
          () => {},
          () => resolve()
        );
      });
    }

    onAgentHighlight(null);
    setCurrentSpeakerId(null);
    setIsDebating(false);
  };

  const handleStopDebate = () => {
    stop();
    setIsDebating(false);
    setCurrentSpeakerId(null);
    onAgentHighlight(null);
  };

  const a1Obj = getAgent(agent1Id);
  const a2Obj = getAgent(agent2Id);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-purple-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-purple-500/20 flex justify-between items-center bg-purple-950/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400 font-bold">
              ⚔️
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                AGENT-TO-AGENT LIVE DEBATE MODE
                <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                  AI REASONING CHESS
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Watch two specialized squad agents discuss and debate live</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-400 hover:text-white text-xl p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Setup Controls */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-zinc-300">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Agent 1 Selector */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60" style={{ borderColor: a1Obj.color + '66' }}>
              <label className="text-xs font-mono uppercase block mb-1" style={{ color: a1Obj.color }}>
                Debater #1 (Speaker A)
              </label>
              <select
                value={agent1Id}
                onChange={(e) => setAgent1Id(e.target.value)}
                disabled={isDebating}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none font-medium"
              >
                {agents.map(ag => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} — {ag.role}
                  </option>
                ))}
              </select>
            </div>

            {/* Agent 2 Selector */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60" style={{ borderColor: a2Obj.color + '66' }}>
              <label className="text-xs font-mono uppercase block mb-1" style={{ color: a2Obj.color }}>
                Debater #2 (Speaker B)
              </label>
              <select
                value={agent2Id}
                onChange={(e) => setAgent2Id(e.target.value)}
                disabled={isDebating}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none font-medium"
              >
                {agents.map(ag => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} — {ag.role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Topic */}
          <div>
            <label className="text-xs font-mono text-purple-400 uppercase tracking-wider block mb-1.5">
              Debate Topic / Proposition
            </label>
            <div className="flex gap-2 flex-wrap mb-2">
              {DEBATE_TOPICS.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => setTopic(t)}
                  disabled={isDebating}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    topic === t 
                      ? 'bg-purple-500/20 text-purple-300 border-purple-400' 
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Or enter a custom debate prompt..."
              disabled={isDebating}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 text-xs font-mono"
            />
          </div>

          {/* Live Debate Dialogue Feed */}
          {turns.length > 0 && (
            <div className="space-y-3 pt-2">
              <label className="text-xs font-mono text-purple-400 uppercase tracking-wider block">
                Live Debate Audio & Dialogue Stream
              </label>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {turns.map((turn, idx) => {
                  const isCurrent = currentSpeakerId === turn.speaker.id && idx === turns.length - 1;
                  return (
                    <div 
                      key={idx}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrent 
                          ? 'border-purple-400 bg-purple-950/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]' 
                          : 'border-zinc-800 bg-zinc-950/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: turn.speaker.color }} />
                          <span className="font-bold text-sm" style={{ color: turn.speaker.color }}>
                            {turn.speaker.name}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono border border-zinc-800 px-1.5 py-0.5 rounded">
                            {turn.speaker.role}
                          </span>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] font-mono text-purple-400 animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                            SPEAKING LIVE...
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                        "{turn.text}"
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-purple-500/20 bg-zinc-950 flex justify-between items-center">
          <div className="text-xs font-mono text-zinc-400">
            {isDebating ? `⚔️ Debate in progress: ${a1Obj.name} vs ${a2Obj.name}` : 'Select debaters and topic to launch AI debate'}
          </div>

          <div className="flex items-center gap-3">
            {isDebating ? (
              <button
                onClick={handleStopDebate}
                className="px-5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-bold text-xs transition-all cursor-pointer"
              >
                ⏹ STOP DEBATE
              </button>
            ) : (
              <button
                onClick={handleStartDebate}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white font-bold text-xs tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              >
                ⚔️ LAUNCH LIVE DEBATE
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
