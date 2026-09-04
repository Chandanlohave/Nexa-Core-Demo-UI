import React from 'react';
import { X, Cloud } from 'lucide-react';
import { WorkspaceHub } from './WorkspaceHub';

interface WorkspaceHubPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkspaceHubPanel: React.FC<WorkspaceHubPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg h-full max-h-[600px] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden relative">
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold font-mono tracking-widest text-zinc-100 uppercase">Google Workspace</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden relative p-4">
          <WorkspaceHub />
        </div>
      </div>
    </div>
  );
};
