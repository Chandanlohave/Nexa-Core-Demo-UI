
import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { getAllUserProfiles, syncUserProfile } from '../services/memoryService';

interface ManageAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManageAccountsModal: React.FC<ManageAccountsModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const allUsers = await getAllUserProfiles();
    setUsers(allUsers);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);
  
  const handleForgive = async (userToForgive: UserProfile) => {
    const updatedUser = { ...userToForgive, warningCount: 0 };
    await syncUserProfile(updatedUser);
    // Refresh the list to show the change
    fetchUsers();
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-black border-2 border-nexa-cyan/50 p-6 shadow-[0_0_30px_rgba(41,223,255,0.4)] max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b border-nexa-cyan/30 pb-2 shrink-0">
          <h2 className="text-nexa-cyan text-lg font-bold tracking-widest font-mono">USER DATABASE</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <p className="text-zinc-300 mt-2 font-sans leading-relaxed text-sm shrink-0">
          Sir, this is the central registry of all user profiles. You can monitor their security status and take action if required.
        </p>
        
        <div className="mt-4 flex-1 overflow-y-auto no-scrollbar pr-2">
            {loading ? (
                <div className="text-center text-nexa-cyan animate-pulse">LOADING REGISTRY...</div>
            ) : users.length === 0 ? (
                <div className="text-center text-zinc-500 border border-dashed border-zinc-700 p-4">NO USER PROFILES FOUND.</div>
            ) : (
                <div className="space-y-2">
                    {users.map((user, idx) => {
                        const isBlocked = (user.warningCount || 0) >= 3;
                        return (
                            <div key={user.mobile ? `acc_${user.mobile}` : `usr_${idx}`} className={`p-3 flex items-center justify-between border transition-colors duration-200 ${isBlocked ? 'bg-red-900/40 border-red-500/50' : 'bg-zinc-900/50 border-zinc-700'}`}>
                                <div>
                                    <p className={`font-bold ${isBlocked ? 'text-red-400' : 'text-white'}`}>{user.name}</p>
                                    <p className="text-xs text-zinc-400 font-mono">{user.mobile}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-center">
                                        <p className="text-xs text-zinc-500 font-mono">WARNINGS</p>
                                        <p className={`font-bold text-lg ${isBlocked ? 'text-red-400 animate-pulse' : 'text-nexa-cyan'}`}>{user.warningCount || 0}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleForgive(user)}
                                        disabled={(user.warningCount || 0) === 0}
                                        className="py-2 px-4 bg-nexa-cyan text-black font-bold text-xs tracking-wider hover:bg-white transition-colors uppercase disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
                                    >
                                        FORGIVE
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>

        <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-nexa-cyan/30 shrink-0">
          <button onClick={onClose} className="py-3 px-6 border border-zinc-700 text-zinc-400 font-mono text-xs tracking-widest hover:bg-zinc-900 hover:text-white transition-colors">CLOSE</button>
        </div>
      </div>
    </div>
  );
};

export default ManageAccountsModal;
