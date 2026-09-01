import React, { useState, useEffect } from 'react';
import { UserProfile, ChatMessage } from '../types';
import { getLocalMessages, appendMessageToMemory, clearAllMemory } from '../services/memoryService';

interface MemoryVaultModalProps {
  user: UserProfile;
  onClose: () => void;
}

interface MemoryEntry {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  tag?: string;
}

export const MemoryVaultModal: React.FC<MemoryVaultModalProps> = ({ user, onClose }) => {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [newMemoryText, setNewMemoryText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadMemories();
  }, [user]);

  const loadMemories = () => {
    const rawMsgs = getLocalMessages(user);
    const parsed: MemoryEntry[] = rawMsgs.map((m, idx) => ({
      id: `vault_mem_${m.timestamp || Date.now()}_${idx}_${Math.random().toString(36).substring(2, 9)}`,
      role: m.role,
      text: m.text,
      timestamp: m.timestamp || Date.now(),
      tag: categorizeText(m.text)
    }));
    setMemories(parsed.reverse());
  };

  const categorizeText = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes('code') || lower.includes('typescript') || lower.includes('bug') || lower.includes('api')) return 'TECH';
    if (lower.includes('business') || lower.includes('roi') || lower.includes('market') || lower.includes('money')) return 'BUSINESS';
    if (lower.includes('chandan') || lower.includes('family') || lower.includes('name') || lower.includes('lohave')) return 'PERSONAL';
    return 'SYSTEM';
  };

  const handleAddMemory = async () => {
    if (!newMemoryText.trim()) return;
    setIsAdding(true);

    const msg: ChatMessage = {
      role: 'user',
      text: `[NEURAL MEMORY VAULT ADDITION]: ${newMemoryText.trim()}`,
      timestamp: Date.now()
    };

    await appendMessageToMemory(user, msg);
    setNewMemoryText('');
    setIsAdding(false);
    loadMemories();
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all neural memories for this session?")) {
      clearAllMemory(user);
      loadMemories();
    }
  };

  const filteredMemories = memories.filter(m => {
    const matchesSearch = m.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag === 'ALL' || m.tag === selectedTag;
    return matchesSearch && matchesTag;
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-blue-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(59,130,246,0.15)] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-blue-500/20 flex justify-between items-center bg-blue-950/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 font-bold">
              🧠
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                PERSISTENT NEURAL MEMORY VAULT
                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  FIRESTORE SYNCED
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Long-term persistent facts, conversation telemetry & AI memory cache</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-400 hover:text-white text-xl p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Controls */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm text-zinc-300">
          
          {/* Add New Memory Box */}
          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-950/20 space-y-2">
            <label className="text-xs font-mono text-blue-400 uppercase tracking-wider block">
              + Store New Fact / Direct Memory into Vault
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMemoryText}
                onChange={(e) => setNewMemoryText(e.target.value)}
                placeholder="e.g. Chandan Sir prefers dark neon sci-fi theme with high contrast typography..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 text-xs font-mono"
              />
              <button
                onClick={handleAddMemory}
                disabled={isAdding || !newMemoryText.trim()}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all disabled:opacity-40 cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              >
                STORE MEMORY
              </button>
            </div>
          </div>

          {/* Search & Tag Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
            <div className="w-full sm:w-auto flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Search memory vault logs..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {['ALL', 'PERSONAL', 'TECH', 'BUSINESS', 'SYSTEM'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`text-[10px] font-mono px-3 py-1 rounded-full border transition-all ${
                    selectedTag === tag 
                      ? 'bg-blue-500/20 text-blue-300 border-blue-400' 
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Memory List */}
          <div className="space-y-2.5 pt-2">
            {filteredMemories.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 font-mono text-xs">
                No matching neural memories found in vault.
              </div>
            ) : (
              filteredMemories.map((mem) => (
                <div 
                  key={mem.id}
                  className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 hover:border-blue-500/40 transition-all flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        mem.role === 'user' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {mem.role.toUpperCase()}
                      </span>
                      {mem.tag && (
                        <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                          TAG: {mem.tag}
                        </span>
                      )}
                    </div>
                    <span className="text-zinc-500">
                      {new Date(mem.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-200 font-mono whitespace-pre-wrap leading-relaxed">
                    {mem.text}
                  </p>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-blue-500/20 bg-zinc-950 flex justify-between items-center">
          <div className="text-xs font-mono text-zinc-400">
            Vault total: <span className="text-blue-400 font-bold">{memories.length}</span> long-term memories
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClearAll}
              className="px-4 py-2 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-400 font-bold text-xs transition-all cursor-pointer"
            >
              🗑 CLEAR ALL MEMORY
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
