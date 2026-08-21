
import React, { useState, useEffect } from 'react';

// Icons
const InstallIcon = () => (
    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const ShareIcon = () => (
    <svg className="w-4 h-4 inline-block mx-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-4 h-4 inline-block mx-1 border border-current rounded" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);

const InstallPWAButton: React.FC = () => {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    useEffect(() => {
        // 1. Check if already installed/standalone
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsStandalone(isStandaloneMode);

        // 2. Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // 3. Listen for Android Install Prompt
        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            }
            setInstallPrompt(null);
        });
    };

    if (isStandalone) return null; // Already installed, hide everything

    // Android / Desktop Chrome Case
    if (installPrompt) {
        return (
            <button
                onClick={handleInstallClick}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center bg-nexa-cyan/10 border border-nexa-cyan/30 text-nexa-cyan px-4 py-2 text-xs font-mono tracking-widest hover:bg-nexa-cyan hover:text-black transition-all duration-300 animate-fade-in shadow-[0_0_15px_rgba(41,223,255,0.2)]"
            >
                <InstallIcon />
                INSTALL APP
            </button>
        );
    }

    // iOS Case (Manual Instructions)
    if (isIOS && !showIOSInstructions) {
        return (
            <button
                onClick={() => setShowIOSInstructions(true)}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center bg-zinc-900/80 border border-zinc-700 text-zinc-300 px-4 py-2 text-[10px] font-mono tracking-widest backdrop-blur-md animate-fade-in"
            >
                <InstallIcon />
                INSTALL ON IPHONE
            </button>
        );
    }

    if (isIOS && showIOSInstructions) {
        return (
            <div className="absolute bottom-6 left-4 right-4 z-[100] bg-zinc-900/95 border border-nexa-cyan/30 p-4 rounded-lg shadow-xl backdrop-blur-md animate-slide-up text-center">
                <button onClick={() => setShowIOSInstructions(false)} className="absolute top-2 right-2 text-zinc-500 hover:text-white">&times;</button>
                <p className="text-nexa-cyan text-xs font-bold font-mono mb-2 tracking-widest">INSTALL NEXA ON IOS</p>
                <div className="text-zinc-300 text-xs font-sans space-y-2 leading-relaxed">
                    <p>1. Tap the <ShareIcon /> <b>Share</b> button in Safari menu.</p>
                    <p>2. Scroll down and tap <PlusIcon /> <b>Add to Home Screen</b>.</p>
                </div>
                <div className="mt-3 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-nexa-cyan/30 mx-auto animate-bounce"></div>
            </div>
        );
    }
    
    return null;
};

export default InstallPWAButton;
