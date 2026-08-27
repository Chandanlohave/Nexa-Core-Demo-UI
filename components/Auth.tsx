
import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { playStartupSound, playUserLoginSound, playAdminLoginSound, playErrorSound } from '../services/audioService';
import InstallPWAButton from './InstallPWAButton';
import { syncUserProfile, getUserProfile, fetchSystemConfig, verifyAdminPassword, verifyMasterAccessKey } from '../services/memoryService';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, onAuthChange } from '../services/firebaseConfig';

interface AuthProps {
  onLogin: (user: UserProfile) => void;
}

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
    <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"/>
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
  </svg>
);


// --- HELPER COMPONENTS ---
const BracketInput = ({ name, placeholder, type = 'text', value, onChange, autoFocus, variant = 'cyan', className = '' }: any) => {
  const colorClass = variant === 'red' ? 'text-red-500' : 'text-nexa-cyan';
  const borderClass = variant === 'red' ? 'bg-red-500' : 'bg-nexa-cyan';
  const placeholderClass = variant === 'red' ? 'placeholder-red-500/20' : 'placeholder-nexa-cyan/20 dark:placeholder-nexa-cyan/20';
  
  const isPassword = type === 'password';
  const textColor = (isPassword && variant === 'red') 
      ? 'text-transparent caret-red-500 selection:bg-transparent' 
      : 'text-zinc-800 dark:text-white';

  return (
    <div className="relative group z-50 my-4">
      <div className="flex items-center">
        <span className={`${colorClass} opacity-50 text-2xl font-light group-focus-within:opacity-100 transition-opacity duration-300`}>[</span>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          autoFocus={autoFocus}
          className={`w-full bg-transparent border-none text-center font-mono text-base focus:ring-0 focus:outline-none ${placeholderClass} z-50 tracking-widest relative z-10 ${className} ${textColor}`}
          placeholder={placeholder}
          autoComplete="off"
        />
        <span className={`${colorClass} opacity-50 text-2xl font-light group-focus-within:opacity-100 transition-opacity duration-300`}>]</span>
      </div>
      <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-[1px] ${borderClass} group-focus-within:w-full transition-all duration-300`}></div>
    </div>
  );
};

const CyberButton = ({ onClick, label, secondary = false, loading = false, icon = null }: any) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`
      w-full py-4 px-6 font-bold tracking-[0.2em] uppercase transition-all duration-200 z-50 cursor-pointer clip-corner relative z-20 flex items-center justify-center gap-3
      ${secondary 
        ? 'bg-transparent border border-nexa-cyan/30 text-nexa-cyan/60 hover:text-black dark:hover:text-white hover:border-nexa-cyan' 
        : 'bg-nexa-cyan text-black hover:bg-zinc-800 dark:hover:bg-white hover:shadow-[0_0_20px_rgba(41,223,255,0.6)]'
      }
    `}
    style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
  >
    {loading ? (
      <span className="flex items-center justify-center gap-2">
         <span className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce"></span>
         PROCESSING
      </span>
    ) : (
      <>
        {icon && <span className="w-5 h-5">{icon}</span>}
        {label}
      </>
    )}
  </button>
);


// --- MAIN AUTH COMPONENT ---

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'INIT' | 'USER_CREATE' | 'ADMIN' | 'KEY_INPUT'>('INIT');
  const [showManual, setShowManual] = useState(false);
  
  // Helper to safely get stored keys
  const getStoredKey = () => {
      try { return localStorage.getItem('nexa_client_api_key') || ''; } 
      catch (e) { return ''; }
  };

  const getStoredAccessKey = () => {
      try { return localStorage.getItem('nexa_access_key') || ''; } 
      catch (e) { return ''; }
  };

  const [authMethod, setAuthMethod] = useState<'ACCESS_CODE' | 'FIREBASE_EMAIL'>('ACCESS_CODE');
  const [emailMode, setEmailMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '', 
    gender: 'male',
    password: '',
    customApiKey: getStoredKey(),
    accessKey: getStoredAccessKey() // Pre-fill Access Key from LocalStorage
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [glitchText, setGlitchText] = useState('SYSTEM_LOCKED');
  const [initStatusText, setInitStatusText] = useState('TAP TO CONNECT');
  const [isBlacklisted, setIsBlacklisted] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (fbUser) => {
      if (fbUser && mode === 'INIT') {
        const userId = fbUser.phoneNumber || fbUser.uid.replace(/[^0-9]/g, '').slice(0, 10) || '9999999999';
        const existingProfile = await getUserProfile(userId);
        if (existingProfile) {
          completeLogin(existingProfile);
        }
      }
    });
    return () => unsubscribe();
  }, [mode]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    const { user: fbUser, error: authError } = await signInWithGoogle();
    if (authError || !fbUser) {
      setLoading(false);
      playErrorSound();
      setError(`// FIREBASE AUTH ERROR: ${authError || 'Google Sign-In failed'}`);
      return;
    }

    const userId = fbUser.phoneNumber || fbUser.uid.replace(/[^0-9]/g, '').slice(0, 10) || '9999999999';
    const existingProfile = await getUserProfile(userId);

    const profile: UserProfile = existingProfile || {
      name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Nexa User',
      mobile: userId,
      role: UserRole.USER,
      gender: 'male',
      warningCount: 0,
      voice: 'Kore'
    };

    await syncUserProfile(profile);
    completeLogin(profile);
  };

  const handleEmailAuth = async () => {
    if (!formData.email.trim() || !formData.password.trim()) {
      playErrorSound();
      setError('// ERROR: EMAIL AND PASSWORD REQUIRED');
      return;
    }
    setLoading(true);
    setError('');

    const res = emailMode === 'REGISTER'
      ? await signUpWithEmail(formData.email.trim(), formData.password.trim())
      : await signInWithEmail(formData.email.trim(), formData.password.trim());

    if (res.error || !res.user) {
      setLoading(false);
      playErrorSound();
      setError(`// FIREBASE AUTH ERROR: ${res.error || 'Authentication failed'}`);
      return;
    }

    const userId = res.user.uid.replace(/[^0-9]/g, '').slice(0, 10) || '9999999999';
    const existingProfile = await getUserProfile(userId);

    const profile: UserProfile = existingProfile || {
      name: formData.name.trim() || res.user.email?.split('@')[0] || 'Nexa User',
      mobile: userId,
      role: UserRole.USER,
      gender: formData.gender as 'male' | 'female' | 'other',
      warningCount: 0,
      voice: 'Kore'
    };

    await syncUserProfile(profile);
    completeLogin(profile);
  };


  // Check connectivity options
  const hasCustomKey = !!getStoredKey();

  useEffect(() => {
    const headerTexts = ['SYSTEM_LOCKED', 'ENCRYPTION_ACTIVE', 'AWAITING_USER', 'NEXA_PROTOCOL'];
    const statusTexts = ['CALIBRATING_NEURAL_NET...', 'SYNCING_LOCAL_DRIVES...', 'AWAITING_INPUT...'];
    let headerInterval: any, statusInterval: any;

    if (mode === 'INIT') {
      headerInterval = setInterval(() => setGlitchText(headerTexts[Math.floor(Math.random() * headerTexts.length)]), 2000);
      statusInterval = setInterval(() => setInitStatusText(statusTexts[Math.floor(Math.random() * statusTexts.length)]), 2500);
    } else {
      setGlitchText('ACCESS_GATEWAY');
    }

    return () => { clearInterval(headerInterval); clearInterval(statusInterval); };
  }, [mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setIsBlacklisted(false);
  };

  const initiateSystem = () => {
    playStartupSound();
    setLoading(true);
    setInitStatusText('SECURITY HANDSHAKE...');
    
    setTimeout(() => {
        setLoading(false);
        // STRICT API KEY ENFORCEMENT
        const sessionKey = getStoredKey();
        const hasValidSessionKey = sessionKey && sessionKey.trim().length > 10;

        if (hasValidSessionKey) {
            setMode('USER_CREATE');
        } else {
            setMode('KEY_INPUT');
        }
    }, 1500);
  };

  const handleAdminLogin = async () => {
    setLoading(true);
    const isValid = await verifyAdminPassword(formData.password);
    
    if (isValid) {
      try { await fetchSystemConfig(); } catch (e) { console.warn("Failed to auto-fetch config", e); }
      const adminProfile: UserProfile = { name: 'Chandan', mobile: 'admin_001', role: UserRole.ADMIN, gender: 'male', warningCount: 0, voice: 'Kore' };
      completeLogin(adminProfile);
    } else {
      setLoading(false);
      playErrorSound();
      setError('// ERROR: INVALID CREDENTIALS');
    }
  };

  const handleUserCreate = async () => {
    if (!formData.name.trim()) {
        playErrorSound();
        setError('// ERROR: NAME REQUIRED');
        return;
    }
    
    if (!/^\d{10}$/.test(formData.mobile.trim())) {
        playErrorSound();
        setError('// ERROR: VALID 10-DIGIT MOBILE REQUIRED');
        return;
    }

    // 1. Verify Master Access Key First (Database Check)
    const isValidAccess = await verifyMasterAccessKey(formData.accessKey, formData.mobile.trim());
    if (!isValidAccess) {
        playErrorSound();
        setError('// ERROR: INVALID OR UNAUTHORIZED ACCESS CODE');
        return;
    }

    // 2. PERSIST KEYS FOR FUTURE SESSIONS
    try {
        if (formData.accessKey.trim()) {
            localStorage.setItem('nexa_access_key', formData.accessKey.trim());
        }
        if (formData.customApiKey.trim()) {
            localStorage.setItem('nexa_client_api_key', formData.customApiKey.trim());
        }
    } catch(e) { console.warn("Storage write failed", e); }

    setLoading(true);
    const userId = formData.mobile.trim();
    const existingProfile = await getUserProfile(userId);
    
    // --- BLACKLIST CHECK ---
    if (existingProfile && (existingProfile.warningCount || 0) >= 3) {
        playErrorSound();
        setIsBlacklisted(true); // Triggers Red UI
        setError('// CRITICAL: IDENTITY BLACKLISTED');
        setGlitchText('ACCESS_DENIED');
        setLoading(false);
        return;
    }

    const profile: UserProfile = existingProfile || {
         name: formData.name,
         mobile: userId, 
         role: UserRole.USER,
         gender: formData.gender as 'male' | 'female' | 'other',
         warningCount: 0,
         voice: 'Kore'
    };
    
    profile.name = formData.name;
    await syncUserProfile(profile);
    completeLogin(profile);
  };

  const saveCustomKey = () => {
    if (formData.customApiKey.trim().length < 10) {
        playErrorSound();
        setError('// ERROR: INVALID API KEY FORMAT');
        return;
    }
    try {
        localStorage.setItem('nexa_client_api_key', formData.customApiKey.trim());
    } catch(e) { console.warn("Storage blocked"); }
    
    setInitStatusText('KEY SAVED. INITIALIZING...');
    setLoading(true);
    setTimeout(() => {
        setLoading(false);
        setMode('USER_CREATE');
    }, 1000);
  };
  
  const clearCustomKey = () => {
      try { localStorage.removeItem('nexa_client_api_key'); } catch(e) {}
      setFormData({...formData, customApiKey: ''});
      setError('// KEY REMOVED FROM DEVICE');
  };

  const completeLogin = (profile: UserProfile) => {
    setLoading(true);
    profile.role === UserRole.ADMIN ? playAdminLoginSound() : playUserLoginSound();
    onLogin(profile);
  };
  
  const switchToAdmin = () => {
    playErrorSound();
    setMode('ADMIN');
  };

  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-center p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] z-[60] overflow-hidden transition-colors duration-500 ${isBlacklisted ? 'bg-red-950 text-red-500' : 'bg-zinc-100 dark:bg-black'}`}>
      {/* Visual Background Effects */}
      <div className="absolute inset-0 z-0 opacity-20"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-zinc-400 dark:border-nexa-cyan/20 rounded-full animate-spin-slow"></div><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-dashed border-zinc-400 dark:border-nexa-cyan/20 rounded-full animate-spin-reverse-slow"></div></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(41,223,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(41,223,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] z-0 pointer-events-none"></div>
      
      <div className="absolute top-8 mt-[env(safe-area-inset-top)] text-center animate-fade-in z-50">
        <div className="text-[9px] text-zinc-500 dark:text-nexa-cyan/50 font-mono tracking-[0.3em]">CREATED & DESIGNED BY</div>
        <div className="text-lg font-bold text-zinc-800 dark:text-white tracking-[0.2em]">CHANDAN LOHAVE</div>
      </div>
      
      <div className="absolute bottom-4 mb-[env(safe-area-inset-bottom)] left-0 w-full text-center z-50">
          <div className="text-[9px] text-zinc-500 dark:text-zinc-600 font-mono tracking-widest uppercase">
              &copy; COPYRIGHT RESERVED BY CHANDAN LOHAVE 2025
          </div>
      </div>
      
      {mode === 'INIT' && !isBlacklisted && (
          <button onClick={() => setMode('KEY_INPUT')} className="absolute top-6 right-6 mt-[env(safe-area-inset-top)] p-2 text-nexa-cyan/50 hover:text-nexa-cyan border border-transparent hover:border-nexa-cyan/30 transition-all z-[70] group">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
              <span className="absolute right-8 top-2 text-[9px] font-mono tracking-widest opacity-0 group-hover:opacity-100 whitespace-nowrap bg-black px-2 py-1 border border-nexa-cyan/30">
                  {hasCustomKey ? 'KEY ACTIVE' : 'SETUP KEY'}
              </span>
              {hasCustomKey && <div className="absolute top-1 right-1 w-2 h-2 bg-nexa-cyan rounded-full animate-pulse"></div>}
          </button>
      )}

      {/* PWA INSTALL BUTTON */}
      <InstallPWAButton />

      <div className="relative w-full max-w-sm z-50">
        <div className={`absolute -top-4 -left-4 w-8 h-8 border-t-2 border-l-2 ${mode === 'ADMIN' || isBlacklisted ? 'border-red-500' : 'border-nexa-cyan'} transition-all duration-500 hover:w-12 hover:h-12`}></div><div className={`absolute -top-4 -right-4 w-8 h-8 border-t-2 border-r-2 ${mode === 'ADMIN' || isBlacklisted ? 'border-red-500' : 'border-nexa-cyan'} transition-all duration-500 hover:w-12 hover:h-12`}></div><div className={`absolute -bottom-4 -left-4 w-8 h-8 border-b-2 border-l-2 ${mode === 'ADMIN' || isBlacklisted ? 'border-red-500' : 'border-nexa-cyan'} transition-all duration-500 hover:w-12 hover:h-12`}></div><div className={`absolute -bottom-4 -right-4 w-8 h-8 border-b-2 border-r-2 ${mode === 'ADMIN' || isBlacklisted ? 'border-red-500' : 'border-nexa-cyan'} transition-all duration-500 hover:w-12 hover:h-12`}></div>
        <div className={`flex justify-between items-center mb-8 border-b ${mode === 'ADMIN' || isBlacklisted ? 'border-red-500/20' : 'border-nexa-cyan/20'} pb-2 transition-colors duration-500`}>
           <div className={`text-[10px] ${mode === 'ADMIN' || isBlacklisted ? 'text-red-500' : 'text-nexa-cyan'} font-mono tracking-widest`}>{glitchText}</div>
           <div className="flex gap-1"><div className={`w-1 h-1 ${mode === 'ADMIN' || isBlacklisted ? 'bg-red-500' : 'bg-nexa-cyan'} animate-pulse`}></div><div className={`w-1 h-1 ${mode === 'ADMIN' || isBlacklisted ? 'bg-red-500' : 'bg-nexa-cyan'} animate-pulse delay-75`}></div><div className={`w-1 h-1 ${mode === 'ADMIN' || isBlacklisted ? 'bg-red-500' : 'bg-nexa-cyan'} animate-pulse delay-150`}></div></div>
        </div>
        <div className={`backdrop-blur-md border p-6 relative transition-all duration-500 ${mode === 'ADMIN' || isBlacklisted ? 'bg-red-900/10 border-red-500/20' : 'bg-white/60 dark:bg-black/60 border-zinc-200 dark:border-nexa-cyan/10'}`}>
          {error && <div className="mb-6 p-2 bg-red-900/20 border-l-2 border-red-500 text-red-500 text-[10px] font-mono tracking-wider animate-pulse">{error}</div>}
          
          {isBlacklisted ? (
              <div className="text-center space-y-4 animate-glitch">
                  <h1 className="text-3xl font-bold text-red-600 tracking-widest">BLACKLISTED</h1>
                  <p className="text-red-400 text-xs font-mono">YOUR ACCESS HAS BEEN PERMANENTLY REVOKED DUE TO DISRESPECTFUL BEHAVIOR.</p>
                  <div className="p-4 border border-red-900 bg-black">
                      <p className="text-[10px] text-red-700">CONTACT ADMIN FOR APPEALS</p>
                  </div>
                  <button onClick={() => window.location.reload()} className="text-[10px] text-red-500 hover:text-white underline">TRY AGAIN</button>
              </div>
          ) : (
            <>
              {mode === 'INIT' && (
                <div className="flex flex-col items-center py-10 animate-fade-in">
                  <div onClick={initiateSystem} className="relative w-32 h-32 flex items-center justify-center cursor-pointer group">
                      <div className="absolute inset-0 bg-nexa-cyan/10 rounded-full blur-xl group-hover:bg-nexa-cyan/30 transition-all duration-500"></div>
                      <div className="absolute w-full h-full border-2 border-nexa-cyan rounded-full border-t-transparent animate-spin"></div>
                      <div className="absolute w-[80%] h-[80%] border-2 border-dashed border-nexa-cyan/50 rounded-full animate-spin-reverse-slow"></div>
                      <div className="absolute w-[40%] h-[40%] bg-nexa-cyan rounded-full animate-pulse shadow-[0_0_20px_currentColor]"></div>
                  </div>
                  <div className="mt-8 text-center space-y-2">
                      <h1 className="text-4xl font-bold text-zinc-900 dark:text-white tracking-widest">NEXA</h1>
                      <div className="text-zinc-500 dark:text-nexa-cyan/60 text-xs font-mono tracking-[0.3em] group-hover:text-nexa-cyan transition-colors">{loading ? 'INITIALIZING...' : initStatusText}</div>
                  </div>
                  {hasCustomKey && (
                      <div className="mt-4 flex flex-col items-center">
                          <div className="px-2 py-1 bg-nexa-cyan/10 border border-nexa-cyan/30 text-[10px] text-nexa-cyan tracking-widest font-mono">
                              KEY SAVED (DEVICE ONLY)
                          </div>
                          <p className="text-zinc-500 dark:text-zinc-600 text-[8px] font-mono mt-1 max-w-[200px] text-center">
                              This key is stored locally on this device. It is NOT shared via link.
                          </p>
                      </div>
                  )}
                </div>
              )}

              {mode === 'USER_CREATE' && (
                <div className="animate-slide-up space-y-3">
                  <div className="text-center"><div className="text-nexa-cyan text-xs font-mono border border-nexa-cyan/30 inline-block px-2 py-1 mb-2">IDENTIFY YOURSELF</div></div>
                  
                  {/* Google Sign-In with Firebase */}
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-nexa-cyan/40 hover:border-nexa-cyan text-white text-xs font-mono tracking-wider font-semibold rounded flex items-center justify-center gap-3 transition-all cursor-pointer"
                  >
                    <GoogleIcon />
                    <span>SIGN IN WITH GOOGLE</span>
                  </button>

                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-[1px] bg-zinc-700/50"></div>
                    <span className="text-[9px] font-mono text-zinc-500">OR AUTHENTICATE</span>
                    <div className="flex-1 h-[1px] bg-zinc-700/50"></div>
                  </div>

                  <div className="flex justify-center gap-2 mb-2">
                    <button
                      onClick={() => setAuthMethod('ACCESS_CODE')}
                      className={`px-3 py-1 text-[9px] font-mono tracking-widest border transition-all ${authMethod === 'ACCESS_CODE' ? 'border-nexa-cyan bg-nexa-cyan/20 text-nexa-cyan' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
                    >
                      ACCESS CODE
                    </button>
                    <button
                      onClick={() => setAuthMethod('FIREBASE_EMAIL')}
                      className={`px-3 py-1 text-[9px] font-mono tracking-widest border transition-all ${authMethod === 'FIREBASE_EMAIL' ? 'border-nexa-cyan bg-nexa-cyan/20 text-nexa-cyan' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
                    >
                      FIREBASE EMAIL
                    </button>
                  </div>

                  {authMethod === 'FIREBASE_EMAIL' ? (
                    <div className="space-y-2">
                      <div className="flex justify-center gap-4 text-[10px] font-mono text-zinc-400 mb-1">
                        <button 
                          onClick={() => setEmailMode('LOGIN')}
                          className={emailMode === 'LOGIN' ? 'text-nexa-cyan font-bold underline' : 'hover:text-white'}
                        >
                          SIGN IN
                        </button>
                        <span>|</span>
                        <button 
                          onClick={() => setEmailMode('REGISTER')}
                          className={emailMode === 'REGISTER' ? 'text-nexa-cyan font-bold underline' : 'hover:text-white'}
                        >
                          CREATE ACCOUNT
                        </button>
                      </div>

                      {emailMode === 'REGISTER' && (
                        <BracketInput name="name" placeholder="ENTER NAME" value={formData.name} onChange={handleChange} autoFocus />
                      )}
                      <BracketInput name="email" placeholder="ENTER EMAIL ADDRESS" type="email" value={formData.email} onChange={handleChange} autoFocus={emailMode === 'LOGIN'} />
                      <BracketInput name="password" placeholder="ENTER PASSWORD" type="password" value={formData.password} onChange={handleChange} />

                      <div className="pt-2">
                        <CyberButton 
                          onClick={handleEmailAuth} 
                          label={emailMode === 'LOGIN' ? 'FIREBASE SIGN IN' : 'CREATE FIREBASE ACCOUNT'} 
                          loading={loading} 
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <BracketInput name="name" placeholder="ENTER NAME" value={formData.name} onChange={handleChange} autoFocus />
                      <BracketInput name="mobile" placeholder="ENTER 10-DIGIT MOBILE" type="tel" value={formData.mobile} onChange={handleChange} />
                      <BracketInput name="accessKey" placeholder="ACCESS CODE (REQUIRED)" type="password" value={formData.accessKey} onChange={handleChange} />

                      <div className="flex items-center justify-center gap-4 py-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="gender" value="male" checked={formData.gender === 'male'} onChange={handleChange} className="accent-nexa-cyan" />
                            <span className="text-xs font-mono text-zinc-400">MALE</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="gender" value="female" checked={formData.gender === 'female'} onChange={handleChange} className="accent-nexa-cyan" />
                            <span className="text-xs font-mono text-zinc-400">FEMALE</span>
                        </label>
                      </div>

                      <div className="pt-2">
                          <CyberButton onClick={handleUserCreate} label="INITIALIZE PROFILE" loading={loading} />
                      </div>
                    </div>
                  )}

                  <div className="pt-3 space-y-4">
                      <div className="flex justify-between items-center text-center mt-2 px-1">
                          <button onClick={() => setMode('INIT')} className="text-[9px] text-zinc-500 hover:text-nexa-cyan font-mono tracking-widest uppercase transition-colors flex items-center gap-1 group"><span className="group-hover:-translate-x-1 transition-transform">&lt;&lt;</span> BACK</button>
                          <button onClick={switchToAdmin} className="text-[9px] text-zinc-500 hover:text-nexa-cyan font-mono tracking-widest uppercase transition-colors">// Admin Console</button>
                      </div>
                  </div>
                </div>
              )}
              
              {mode === 'ADMIN' && (
                <div className="animate-slide-up space-y-4">
                    <div className="text-center"><div className="text-red-500 text-xs font-mono border border-red-500/30 inline-block px-2 py-1 mb-6">ADMIN PRIVILEGES</div></div>
                    <BracketInput name="password" placeholder="ENTER PASSCODE" type="password" value={formData.password} onChange={handleChange} autoFocus variant="red" />
                    
                    <div className="pt-4">
                        <button
                            onClick={handleAdminLogin}
                            disabled={loading}
                            className={`w-full py-4 px-6 font-bold tracking-[0.2em] uppercase transition-all duration-200 z-50 cursor-pointer clip-corner relative z-20 flex items-center justify-center gap-3 bg-red-600 text-white hover:bg-red-500 hover:shadow-[0_0_20px_rgba(220,38,38,0.6)]`}
                            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                        >
                            {loading ? 'VERIFYING...' : 'ACCESS MAINFRAME'}
                        </button>
                    </div>
                    <div className="pt-2 text-center">
                        <button onClick={() => setMode('USER_CREATE')} className="text-[9px] text-zinc-500 hover:text-red-500 font-mono tracking-widest uppercase transition-colors flex items-center gap-1 group justify-center w-full"><span className="group-hover:-translate-x-1 transition-transform">&lt;&lt;</span> BACK</button>
                    </div>
                </div>
              )}

              {mode === 'KEY_INPUT' && (
                <div className="animate-slide-up space-y-4">
                  {/* Red Warning Box for Key Input */}
                  <div className="mb-2 border-l-4 border-red-900/50 bg-red-900/10 p-2">
                      <div className="text-[10px] text-red-500 font-mono tracking-widest uppercase">
                          // SYSTEM HALTED: PERSONAL API KEY REQUIRED
                      </div>
                  </div>

                  <div className="text-center"><div className="text-nexa-cyan text-xs font-mono border border-nexa-cyan/30 inline-block px-2 py-1 mb-2">ACCESS OVERRIDE</div></div>
                  
                  <p className="text-zinc-400 text-[10px] text-center font-mono leading-relaxed">
                      Security Protocol Active. You must provide your own Google Gemini API Key to operate NEXA on this device.
                  </p>

                  <BracketInput name="customApiKey" placeholder="PASTE_API_KEY_HERE" value={formData.customApiKey} onChange={handleChange} autoFocus />
                  
                  <div className="flex flex-col gap-2 pt-2">
                      <div className="flex gap-2">
                          {hasCustomKey && (
                              <CyberButton onClick={clearCustomKey} label="CLEAR" secondary={true} />
                          )}
                          <CyberButton onClick={saveCustomKey} label="ACTIVATE SYSTEM" />
                      </div>
                      
                      <div className="border-t border-zinc-700/50 my-2"></div>

                      <a 
                          href="https://aistudio.google.com/app/apikey" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full py-3 bg-zinc-900 border border-dashed border-zinc-600 hover:border-nexa-cyan text-zinc-300 hover:text-white text-[10px] font-mono tracking-widest uppercase text-center transition-all flex items-center justify-center gap-2 group rounded hover:bg-zinc-800"
                      >
                          <span>GET FREE API KEY</span>
                          <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                      
                      <button 
                          onClick={() => setShowManual(!showManual)}
                          className="w-full py-2 text-[10px] text-nexa-cyan/80 hover:text-nexa-cyan border border-transparent hover:border-nexa-cyan/20 transition-all font-mono tracking-widest uppercase bg-transparent hover:bg-nexa-cyan/5 rounded"
                      >
                          {showManual ? "HIDE MANUAL [-]" : "HOW TO CREATE KEY? [+]"}
                      </button>
                      
                      {showManual && (
                          <div className="bg-zinc-900 border border-nexa-cyan/30 p-3 text-[10px] text-zinc-300 font-mono text-left space-y-2 animate-slide-up rounded shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                              <p className="text-nexa-cyan border-b border-nexa-cyan/20 pb-1 mb-2 font-bold">QUICK GUIDE:</p>
                              <p>1. Open <span className="text-white">Google AI Studio</span> (Link above).</p>
                              <p>2. Sign in with Google Account.</p>
                              <p>3. Click "Create API Key" (Blue Button).</p>
                              <p>4. Select "Create key in new project".</p>
                              <p>5. Copy the key string (starts with AIza...).</p>
                              <p>6. Paste above and click ACTIVATE.</p>
                          </div>
                      )}
                  </div>

                  <div className="pt-2 text-center flex justify-between px-2">
                      <button onClick={() => setMode('INIT')} className="text-[9px] text-zinc-500 hover:text-nexa-cyan font-mono tracking-widest uppercase transition-colors flex items-center gap-1 group"><span className="group-hover:-translate-x-1 transition-transform">&lt;&lt;</span> BACK</button>
                      <button onClick={switchToAdmin} className="text-[9px] text-zinc-500 hover:text-red-500 font-mono tracking-widest uppercase transition-colors">// ADMIN LOGIN</button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default Auth;
