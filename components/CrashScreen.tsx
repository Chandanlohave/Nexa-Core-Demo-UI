
import React, { useState } from 'react';
import { revertLastChange } from '../services/githubService';

interface CrashScreenProps {
    error?: Error;
    mode?: 'CRASH' | 'SAFE_MODE';
}

const CrashScreen: React.FC<CrashScreenProps> = ({ error, mode = 'CRASH' }) => {
    const [status, setStatus] = useState<'IDLE' | 'REVERTING' | 'SUCCESS' | 'FAILED'>('IDLE');
    const [statusDetail, setStatusDetail] = useState<string>('');

    const handleRevert = async () => {
        setStatus('REVERTING');
        setStatusDetail('');
        try {
            await revertLastChange('App.tsx'); // Default to App.tsx as it's the most likely culprit
            setStatus('SUCCESS');
            setTimeout(() => {
                // Remove safemode param if present and reload
                const url = new URL(window.location.href);
                url.searchParams.delete('safemode');
                window.location.href = url.toString();
            }, 2000);
        } catch (e: any) {
            console.error(e);
            setStatusDetail(e?.message || 'Revert failed');
            setStatus('FAILED');
        }
    };

    return (
        <div className="fixed inset-0 bg-black text-red-600 font-mono p-8 flex flex-col items-center justify-center z-[9999] overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
            <div className="max-w-2xl w-full border-2 border-red-600 bg-black/90 p-8 shadow-[0_0_50px_rgba(220,38,38,0.5)] relative">
                <h1 className="text-4xl font-bold tracking-widest mb-4 glitch-text">
                    {mode === 'SAFE_MODE' ? 'SAFE MODE ACTIVE' : 'SYSTEM FAILURE'}
                </h1>
                
                <div className="mb-6 border-l-4 border-red-600 pl-4 py-2 bg-red-900/10">
                    <p className="text-sm uppercase tracking-wider text-red-400 mb-1">DIAGNOSTIC:</p>
                    <p className="text-white text-lg">
                        {mode === 'SAFE_MODE' 
                            ? "Standard boot sequence bypassed via User Override." 
                            : (error?.message || "Unknown Runtime Error in Neural Core.")}
                    </p>
                </div>

                <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
                    NEXA has encountered a critical fault or has been manually interrupted. 
                    If you were modifying code, the Phoenix Protocol allows you to instantly revert the last change.
                </p>

                {statusDetail && (
                    <div className="mb-4 text-xs text-yellow-400 bg-yellow-950/40 p-2 border border-yellow-700/50 rounded">
                        {statusDetail}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                        onClick={handleRevert}
                        disabled={status === 'REVERTING' || status === 'SUCCESS'}
                        className={`flex-1 py-4 text-center font-bold text-lg sm:text-xl uppercase tracking-widest transition-all ${
                            status === 'SUCCESS' ? 'bg-green-600 text-black' : 
                            status === 'FAILED' ? 'bg-yellow-600 text-black hover:bg-yellow-500' : 
                            'bg-red-600 text-black hover:bg-white hover:text-red-600'
                        }`}
                    >
                        {status === 'IDLE' && "⚠️ EMERGENCY REVERT CODE"}
                        {status === 'REVERTING' && "RESTORING PREVIOUS VERSION..."}
                        {status === 'SUCCESS' && "SYSTEM RESTORED. REBOOTING."}
                        {status === 'FAILED' && "RETRY REVERT"}
                    </button>
                    
                    <button 
                        onClick={() => {
                            const url = new URL(window.location.href);
                            url.searchParams.delete('safemode');
                            window.location.href = url.toString();
                        }}
                        className="px-6 py-3 border border-zinc-600 text-zinc-300 hover:text-white hover:border-white uppercase text-xs tracking-widest text-center"
                    >
                        Reboot System
                    </button>
                </div>
            </div>
            <style>{`
                .glitch-text { animation: glitch 1s infinite; }
                @keyframes glitch {
                    0% { transform: translate(0) }
                    20% { transform: translate(-2px, 2px) }
                    40% { transform: translate(-2px, -2px) }
                    60% { transform: translate(2px, 2px) }
                    80% { transform: translate(2px, -2px) }
                    100% { transform: translate(0) }
                }
            `}</style>
        </div>
    );
};

export default CrashScreen;
