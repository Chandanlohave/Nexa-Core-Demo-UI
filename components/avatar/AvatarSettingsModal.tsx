import React, { useState, useEffect } from 'react';
import { 
  VRMModelMeta, 
  DEFAULT_BUNDLED_AVATAR, 
  saveCustomVRMModel, 
  getStoredCustomVRM, 
  clearCustomVRMModel 
} from './vrmModelStore';

interface AvatarSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModelChanged: () => void;
  lipSyncSensitivity: number;
  onSensitivityChange: (val: number) => void;
  avatarEnabled: boolean;
  onToggleAvatar: (enabled: boolean) => void;
}

export const AvatarSettingsModal: React.FC<AvatarSettingsModalProps> = ({
  isOpen,
  onClose,
  onModelChanged,
  lipSyncSensitivity,
  onSensitivityChange,
  avatarEnabled,
  onToggleAvatar
}) => {
  const [currentMeta, setCurrentMeta] = useState<VRMModelMeta>(DEFAULT_BUNDLED_AVATAR);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      getStoredCustomVRM().then((res) => {
        if (res && res.meta) {
          setCurrentMeta(res.meta);
        } else {
          setCurrentMeta(DEFAULT_BUNDLED_AVATAR);
        }
      });
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatusMessage({ text: 'Validating and importing VRM model...' });

    try {
      const meta = await saveCustomVRMModel(file);
      setCurrentMeta(meta);
      setStatusMessage({ text: `✓ Successfully loaded "${meta.title}". Avatar updated!` });
      onModelChanged();
    } catch (err: any) {
      console.error('VRM Import Error:', err);
      setStatusMessage({ text: err?.message || 'Failed to import VRM model.', isError: true });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleResetToDefault = async () => {
    setIsUploading(true);
    try {
      await clearCustomVRMModel();
      setCurrentMeta(DEFAULT_BUNDLED_AVATAR);
      setStatusMessage({ text: 'Reverted to official bundled anime model.' });
      onModelChanged();
    } catch (err) {
      setStatusMessage({ text: 'Failed to reset model.', isError: true });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-lg bg-zinc-950 border border-nexa-cyan/30 rounded-xl shadow-[0_0_30px_rgba(41,223,255,0.15)] flex flex-col max-h-[90vh] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-nexa-cyan text-base sm:text-lg font-mono">✦</span>
            <h2 className="text-sm sm:text-base font-bold text-white font-mono tracking-wider">
              3D ANIME COMPANION MATRIX
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-zinc-300 font-mono text-xs">
          
          {/* Avatar Master Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
            <div>
              <div className="font-bold text-white text-xs sm:text-sm">3D Anime Companion Display</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Toggle between 3D Anime Avatar and Holographic Core HUD</div>
            </div>
            <button
              onClick={() => onToggleAvatar(!avatarEnabled)}
              className={`px-3.5 py-1.5 rounded-full font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                avatarEnabled 
                  ? 'bg-nexa-cyan text-black shadow-[0_0_15px_rgba(41,223,255,0.4)]' 
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${avatarEnabled ? 'bg-black animate-pulse' : 'bg-zinc-500'}`}></span>
              {avatarEnabled ? 'AVATAR ON' : 'AVATAR OFF'}
            </button>
          </div>

          {/* Active Model Details Card */}
          <div className="p-3.5 rounded-lg bg-zinc-900/50 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-400 text-[10px] uppercase tracking-wider">Active Character Asset</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                currentMeta.isCustom 
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' 
                  : 'bg-nexa-cyan/20 text-nexa-cyan border-nexa-cyan/40'
              }`}>
                {currentMeta.isCustom ? 'CUSTOM IMPORT' : 'BUNDLED DEFAULT'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-zinc-500">Character:</span>
                <p className="text-white font-semibold truncate">{currentMeta.title}</p>
              </div>
              <div>
                <span className="text-zinc-500">Author:</span>
                <p className="text-white font-semibold truncate">{currentMeta.author}</p>
              </div>
              <div>
                <span className="text-zinc-500">License:</span>
                <p className="text-zinc-300 truncate">{currentMeta.licenseName || 'Open Redistribution'}</p>
              </div>
              <div>
                <span className="text-zinc-500">Commercial Usage:</span>
                <p className="text-emerald-400">{currentMeta.commercialUsage || 'Allowed'}</p>
              </div>
            </div>

            {currentMeta.isCustom && (
              <div className="pt-1">
                <button
                  onClick={handleResetToDefault}
                  disabled={isUploading}
                  className="text-[10px] text-nexa-cyan hover:underline cursor-pointer"
                >
                  ↺ Reset to default bundled model (three-vrm-girl)
                </button>
              </div>
            )}
          </div>

          {/* Import Custom VRM File Section */}
          <div className="p-3.5 rounded-lg bg-zinc-900/40 border border-dashed border-zinc-700 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold text-white text-xs">Import Custom .VRM Model</div>
              <span className="text-[10px] text-zinc-500">VRoid / Booth format</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              Have your own female anime character created in VRoid Studio or downloaded from open repositories? Upload your <span className="text-nexa-cyan">.vrm</span> file directly.
            </p>

            <label className="block w-full py-2.5 px-3 text-center rounded border border-nexa-cyan/40 hover:border-nexa-cyan bg-nexa-cyan/10 hover:bg-nexa-cyan/20 text-nexa-cyan text-xs font-bold transition-all cursor-pointer">
              <span>{isUploading ? 'IMPORTING MODEL...' : '📂 SELECT .VRM FILE TO IMPORT'}</span>
              <input 
                type="file" 
                accept=".vrm" 
                className="hidden" 
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>

          {/* Status Feedback Message */}
          {statusMessage && (
            <div className={`p-2.5 rounded text-[11px] border ${
              statusMessage.isError 
                ? 'bg-red-950/50 border-red-500/50 text-red-300' 
                : 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
            }`}>
              {statusMessage.text}
            </div>
          )}

          {/* Lip-Sync & Voice Tuning */}
          <div className="p-3.5 rounded-lg bg-zinc-900/50 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">Amplitude Lip-Sync Sensitivity</span>
              <span className="text-nexa-cyan font-bold">{lipSyncSensitivity.toFixed(1)}x</span>
            </div>
            <input 
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={lipSyncSensitivity}
              onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
              className="w-full accent-nexa-cyan cursor-pointer"
            />
            <div className="text-[10px] text-zinc-400 leading-relaxed bg-black/40 p-2 rounded border border-white/5">
              ℹ <strong className="text-zinc-200">How lip-sync works:</strong> Mouth shape changes are driven by Nexa's actual outgoing audio output stream from Gemini Live and conversational TTS. No duplicate audio stream or extra permissions are used.
            </div>
          </div>

          {/* Required Attribution & Licensing */}
          <div className="p-3 rounded-lg bg-black/60 border border-zinc-800/80 text-[10px] text-zinc-500 space-y-1">
            <div className="font-bold text-zinc-400 uppercase tracking-wider">Asset Licensing & Attribution</div>
            <p>
              • Character Model: <span className="text-zinc-300">three-vrm-girl</span> by <span className="text-zinc-300">pixiv Inc.</span>
            </p>
            <p>
              • Source: <span className="text-nexa-cyan">https://github.com/pixiv/three-vrm</span>
            </p>
            <p>
              • Redistribution & Commercial Use: <span className="text-emerald-400">Allowed for Everyone</span>
            </p>
            <p>
              • 3D Engine: <span className="text-zinc-300">Three.js</span> and <span className="text-zinc-300">@pixiv/three-vrm</span> (MIT License).
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-zinc-800 bg-zinc-900/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-nexa-cyan hover:bg-cyan-300 text-black font-bold text-xs transition-colors cursor-pointer"
          >
            CONFIRM & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarSettingsModal;
