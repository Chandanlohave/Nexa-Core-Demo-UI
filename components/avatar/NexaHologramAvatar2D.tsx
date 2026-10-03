import React, { useEffect, useRef, useState } from 'react';
import { HUDState } from '../../types';
import { VRMModelMeta } from './vrmModelStore';

interface NexaHologramAvatar2DProps {
  state: HUDState;
  audioRef?: React.MutableRefObject<{ vol: number; bass: number; mid: number; treble: number } | null>;
  accentColor?: string;
  ecoMode?: boolean;
  onOpenModelManager?: () => void;
  onRetryWebGL?: () => void;
  onTriggerFileSelect?: () => void;
  activeModelMeta?: VRMModelMeta;
  isCustomModel?: boolean;
  onResetToDefault?: () => void;
  vrmNotice?: string | null;
  isUploadingVRM?: boolean;
  lipSyncSensitivity?: number;
}

export const NexaHologramAvatar2D: React.FC<NexaHologramAvatar2DProps> = ({
  state,
  audioRef,
  accentColor = '#29DFFF',
  ecoMode = false,
  onOpenModelManager,
  onRetryWebGL,
  onTriggerFileSelect,
  activeModelMeta,
  isCustomModel,
  onResetToDefault,
  vrmNotice,
  isUploadingVRM = false,
  lipSyncSensitivity = 1.2
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Parallax drag state
  const [parallax, setParallax] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Animation values
  const [time, setTime] = useState<number>(0);
  const [blink, setBlink] = useState<number>(0); // 0 = open, 1 = closed
  const [mouthOpen, setMouthOpen] = useState<number>(0); // 0 = closed, 1 = open

  // Refs for animation loop
  const animFrameId = useRef<number>(0);
  const blinkTimerRef = useRef<number>(0);
  const nextBlinkRef = useRef<number>(3.0);
  const currentMouthRef = useRef<number>(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - parallax.x, y: e.clientY - parallax.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const nx = Math.max(-20, Math.min(20, (e.clientX - dragStartRef.current.x) * 0.3));
    const ny = Math.max(-12, Math.min(12, (e.clientY - dragStartRef.current.y) * 0.3));
    setParallax({ x: nx, y: ny });
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleResetParallax = () => {
    setParallax({ x: 0, y: 0 });
  };

  useEffect(() => {
    let lastTime = performance.now();
    const fpsInterval = 1000 / (ecoMode ? 30 : 60);

    const loop = (now: number) => {
      animFrameId.current = requestAnimationFrame(loop);

      if (document.hidden) return;

      const deltaMs = now - lastTime;
      if (deltaMs < fpsInterval) return;
      lastTime = now - (deltaMs % fpsInterval);

      const delta = Math.min(0.1, deltaMs / 1000);
      setTime((prev) => prev + delta);

      // 1. Natural Blinking Loop
      blinkTimerRef.current += delta;
      let bWeight = 0;
      if (blinkTimerRef.current >= nextBlinkRef.current) {
        const prog = (blinkTimerRef.current - nextBlinkRef.current) / 0.15;
        if (prog <= 0.5) {
          bWeight = prog * 2.0;
        } else if (prog <= 1.0) {
          bWeight = (1.0 - prog) * 2.0;
        } else {
          blinkTimerRef.current = 0;
          nextBlinkRef.current = 2.8 + Math.random() * 3.5;
        }
      }
      setBlink(bWeight);

      // 2. Real-Time Lip-Sync
      const audio = audioRef?.current;
      const isSpeaking = state === HUDState.SPEAKING || (state === HUDState.LIVE && (audio?.vol || 0) > 0.015);
      let targetMouth = 0;

      if (isSpeaking && audio) {
        const vol = Math.max(0, audio.vol || 0);
        targetMouth = Math.min(1.0, vol * 3.4 * lipSyncSensitivity);
      }

      if (targetMouth > 0.02) {
        currentMouthRef.current += (targetMouth - currentMouthRef.current) * 0.35;
      } else {
        currentMouthRef.current += (0.0 - currentMouthRef.current) * 0.5;
        if (currentMouthRef.current < 0.01) currentMouthRef.current = 0;
      }
      setMouthOpen(currentMouthRef.current);
    };

    animFrameId.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameId.current);
    };
  }, [ecoMode, state, audioRef, lipSyncSensitivity]);

  // Dynamic expressions & head tilts
  const breathY = Math.sin(time * 2.2) * 3;
  const hairSway = Math.sin(time * 1.8) * 1.5;
  const isSpeaking = state === HUDState.SPEAKING || mouthOpen > 0.05;

  let headAngle = 0;
  if (state === HUDState.LISTENING) headAngle = -1.8;
  else if (state === HUDState.THINKING) headAngle = 2.2;
  else if (isSpeaking) headAngle = Math.sin(time * 8) * 0.8;

  // Eye brow offset
  let browY = 0;
  let browRot = 0;
  if (state === HUDState.THINKING) { browY = -3; browRot = 2; }
  else if (state === HUDState.LISTENING) { browY = 1; browRot = -1.5; }
  else if (state === HUDState.WARNING) { browY = 2; browRot = -4; }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative flex items-center justify-center overflow-hidden touch-none select-none bg-gradient-to-b from-[#060810] via-[#090e1c] to-[#04060c]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Floating Notice / Toast */}
      {vrmNotice && (
        <div className="absolute top-14 z-50 px-4 py-2 rounded-xl bg-black/90 backdrop-blur-md border border-nexa-cyan/80 text-nexa-cyan text-xs font-mono font-bold text-center shadow-[0_0_20px_rgba(41,223,255,0.4)] animate-bounce">
          {vrmNotice}
        </div>
      )}

      {/* Top Header & Actions Bar (Pinned Left to leave Right open for Air Gesture Sensor) */}
      <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-1.5 max-w-[calc(100%-145px)] pointer-events-auto">
        <div
          onClick={onOpenModelManager}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-nexa-cyan/50 text-nexa-cyan text-[10px] font-mono hover:bg-nexa-cyan/20 transition-all cursor-pointer shadow-[0_0_15px_rgba(41,223,255,0.2)] group"
          title="Nexa Anime Companion Settings"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-nexa-cyan animate-pulse"></span>
          <span className="font-bold tracking-widest uppercase max-w-[95px] truncate">
            {activeModelMeta?.title || 'NEXA COMPANION'}
          </span>
          <span className="text-[9px] text-zinc-400 group-hover:text-white">⚙</span>
        </div>

        <button
          onClick={handleResetParallax}
          className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-zinc-400 hover:text-white text-[10px] font-mono transition-colors flex items-center justify-center"
          title="Reset View"
        >
          ↺
        </button>

        {onTriggerFileSelect && (
          <button
            onClick={onTriggerFileSelect}
            disabled={isUploadingVRM}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-nexa-cyan/25 hover:bg-nexa-cyan/40 border border-nexa-cyan text-nexa-cyan text-[10px] font-mono font-bold shadow-[0_0_10px_rgba(41,223,255,0.25)] transition-all cursor-pointer"
            title="Select downloaded .vrm file to import"
          >
            <span>📂</span>
            <span>{isUploadingVRM ? '...' : 'LOAD .VRM'}</span>
          </button>
        )}

        {onRetryWebGL && (
          <button
            onClick={onRetryWebGL}
            className="px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-nexa-cyan/20 border border-zinc-700 hover:border-nexa-cyan text-[9px] font-mono text-zinc-300 hover:text-nexa-cyan transition-colors"
            title="Attempt 3D VRM Model View"
          >
            ⚡ 3D VRM
          </button>
        )}
      </div>

      {/* MAIN HIGH-FIDELITY ANIME COMPANION SVG ARTWORK */}
      <div 
        className="relative w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
        style={{
          transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0)`
        }}
      >
        <svg
          viewBox="0 0 600 800"
          className="w-full h-full max-w-[500px] max-h-[750px] object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.8)]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Skin Tone Gradients */}
            <linearGradient id="skinBase" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fff8f4" />
              <stop offset="60%" stopColor="#fdeee6" />
              <stop offset="100%" stopColor="#f8ded2" />
            </linearGradient>

            <linearGradient id="skinShadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f3ccbe" />
              <stop offset="100%" stopColor="#ebbaab" />
            </linearGradient>

            <radialGradient id="blushGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff7085" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#ff8597" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ff8597" stopOpacity="0" />
            </radialGradient>

            {/* Hair Gradients (Silver-White with Cyan Ambient Highlight) */}
            <linearGradient id="hairBase" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#f2f6fa" />
              <stop offset="85%" stopColor="#d5e2ed" />
              <stop offset="100%" stopColor="#b6c9dc" />
            </linearGradient>

            <linearGradient id="hairShadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c5d8ea" />
              <stop offset="100%" stopColor="#9fbcd4" />
            </linearGradient>

            <linearGradient id="hairCyanGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#29DFFF" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#00b4d8" stopOpacity="0.3" />
            </linearGradient>

            {/* Eye Crystal Gradients */}
            <linearGradient id="eyeIris" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0b2545" />
              <stop offset="35%" stopColor="#134074" />
              <stop offset="65%" stopColor="#00b4d8" />
              <stop offset="100%" stopColor="#29DFFF" />
            </linearGradient>

            <radialGradient id="eyeSparkle" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="80%" stopColor="#e0fbfc" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#29DFFF" stopOpacity="0" />
            </radialGradient>

            {/* Dress Silk & Turquoise Gradients */}
            <linearGradient id="dressWhite" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#f7f9fb" />
              <stop offset="100%" stopColor="#dde5ed" />
            </linearGradient>

            <linearGradient id="dressCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#29DFFF" />
              <stop offset="60%" stopColor="#00a8cc" />
              <stop offset="100%" stopColor="#007799" />
            </linearGradient>

            <linearGradient id="darkTrim" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#222b38" />
              <stop offset="100%" stopColor="#111620" />
            </linearGradient>

            {/* Cyan Gemstone Shimmer */}
            <linearGradient id="gemCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#29DFFF" />
              <stop offset="70%" stopColor="#0096c7" />
              <stop offset="100%" stopColor="#03045e" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* BACKGROUND HOLOGRAPHIC AMBIENCE */}
          <g opacity="0.35" transform="translate(300, 400)">
            {/* Rotating Tech Reticle */}
            <circle r="240" fill="none" stroke="#29DFFF" strokeWidth="1" strokeDasharray="10 15" opacity="0.4">
              <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="40s" repeatCount="indefinite" />
            </circle>
            <circle r="215" fill="none" stroke="#29DFFF" strokeWidth="1.5" opacity="0.5" />
            <circle r="185" fill="none" stroke="#00a8cc" strokeWidth="0.8" strokeDasharray="6 8" opacity="0.3" />

            {/* Outer Tech Crosshairs */}
            <line x1="-250" y1="0" x2="-230" y2="0" stroke="#29DFFF" strokeWidth="2" />
            <line x1="230" y1="0" x2="250" y2="0" stroke="#29DFFF" strokeWidth="2" />
            <line x1="0" y1="-250" x2="0" y2="-230" stroke="#29DFFF" strokeWidth="2" />
            <line x1="0" y1="230" x2="0" y2="250" stroke="#29DFFF" strokeWidth="2" />
          </g>

          {/* --- CHARACTER MASTER GROUP --- */}
          <g transform={`translate(0, ${breathY})`}>

            {/* 1. BACK HAIR (Silvery-white long waves behind shoulders) */}
            <g id="backHair" transform={`translate(${hairSway * 0.5}, 0)`}>
              {/* Left flowing strands */}
              <path
                d="M 230 240 C 170 300, 140 430, 175 560 C 205 520, 225 450, 235 380 Z"
                fill="url(#hairShadow)"
              />
              <path
                d="M 220 250 C 160 320, 130 450, 180 570 C 210 520, 235 440, 240 370 Z"
                fill="url(#hairBase)"
                opacity="0.95"
              />

              {/* Right flowing strands */}
              <path
                d="M 370 240 C 430 300, 460 430, 425 560 C 395 520, 375 450, 365 380 Z"
                fill="url(#hairShadow)"
              />
              <path
                d="M 380 250 C 440 320, 470 450, 420 570 C 390 520, 365 440, 360 370 Z"
                fill="url(#hairBase)"
                opacity="0.95"
              />
            </g>

            {/* 2. BODY & ELEGANT DRESS (Matching Reference Images 2 & 3) */}
            <g id="bodyOutfit" transform="translate(0, 0)">
              {/* Bare Shoulders & Chest Base */}
              <path
                d="M 220 460 Q 250 405 275 390 L 325 390 Q 350 405 380 460 L 415 540 Q 425 610 430 750 L 170 750 Q 175 610 185 540 Z"
                fill="url(#skinBase)"
              />

              {/* Collarbone Shadow */}
              <path
                d="M 260 415 Q 280 422 295 425"
                fill="none"
                stroke="url(#skinShadow)"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.75"
              />
              <path
                d="M 340 415 Q 320 422 305 425"
                fill="none"
                stroke="url(#skinShadow)"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.75"
              />

              {/* White Silk Halter Bodice */}
              <path
                d="M 245 460 C 265 440 335 440 355 460 C 380 500 385 580 385 750 L 215 750 C 215 580 220 500 245 460 Z"
                fill="url(#dressWhite)"
                stroke="#c7d4e2"
                strokeWidth="1.5"
              />

              {/* Turquoise Cross-Over Trim (Signature reference detail) */}
              <path
                d="M 255 450 L 285 435 L 345 520 L 325 535 Z"
                fill="url(#dressCyan)"
                opacity="0.9"
              />
              <path
                d="M 345 450 L 315 435 L 255 520 L 275 535 Z"
                fill="url(#dressCyan)"
                opacity="0.9"
              />

              {/* Waist Teal Sash Band */}
              <rect x="220" y="590" width="160" height="34" rx="4" fill="url(#dressCyan)" />
              <rect x="220" y="620" width="160" height="5" fill="#005f73" opacity="0.6" />

              {/* Sash Tie Ribbon on Right */}
              <g transform="translate(345, 605)">
                <ellipse cx="0" cy="0" rx="10" ry="16" fill="url(#dressCyan)" transform="rotate(-30)" stroke="#007799" strokeWidth="1" />
                <ellipse cx="14" cy="5" rx="8" ry="14" fill="url(#dressCyan)" transform="rotate(30)" stroke="#007799" strokeWidth="1" />
                <path d="M 5 10 Q 15 40 25 75 L 14 78 Q 6 42 0 12 Z" fill="url(#dressCyan)" />
                <path d="M -5 10 Q -5 45 0 85 L -10 86 Q -15 45 -8 12 Z" fill="url(#dressCyan)" />
              </g>

              {/* Detached Off-Shoulder Puff Sleeves (Left & Right) */}
              {/* Left Sleeve */}
              <g transform="translate(190, 480)">
                <ellipse cx="0" cy="30" rx="35" ry="50" fill="url(#dressWhite)" stroke="#c7d4e2" strokeWidth="1.5" />
                <path d="M -25 0 Q 0 -12 25 0" stroke="url(#darkTrim)" strokeWidth="6" fill="none" strokeLinecap="round" />
                <path d="M -22 65 Q 0 75 22 65" stroke="url(#dressCyan)" strokeWidth="5" fill="none" strokeLinecap="round" />
              </g>

              {/* Right Sleeve */}
              <g transform="translate(410, 480)">
                <ellipse cx="0" cy="30" rx="35" ry="50" fill="url(#dressWhite)" stroke="#c7d4e2" strokeWidth="1.5" />
                <path d="M -25 0 Q 0 -12 25 0" stroke="url(#darkTrim)" strokeWidth="6" fill="none" strokeLinecap="round" />
                <path d="M -22 65 Q 0 75 22 65" stroke="url(#dressCyan)" strokeWidth="5" fill="none" strokeLinecap="round" />
              </g>

              {/* High Mandarin Collar & Neck */}
              <path
                d="M 282 345 L 282 400 L 318 400 L 318 345 Z"
                fill="url(#skinBase)"
              />
              <path
                d="M 282 385 C 285 400 315 400 318 385 L 322 410 C 315 422 285 422 278 410 Z"
                fill="url(#skinShadow)"
                opacity="0.5"
              />

              {/* Collar Band (Dark with Gold Edge) */}
              <path
                d="M 276 385 C 285 398 315 398 324 385 L 326 405 C 315 420 285 420 274 405 Z"
                fill="url(#darkTrim)"
                stroke="#29DFFF"
                strokeWidth="1.2"
              />

              {/* Glowing Turquoise Diamond Brooch (Central Landmark) */}
              <g transform="translate(300, 404)" filter="url(#neonGlow)">
                <polygon points="0,-13 13,0 0,13 -13,0" fill="url(#gemCyan)" stroke="#ffffff" strokeWidth="1.5" />
                <polygon points="0,-7 7,0 0,7 -7,0" fill="#ffffff" opacity="0.6" />
                <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
              </g>
            </g>

            {/* 3. HEAD & FACE GROUP (With dynamic responsive tilt) */}
            <g id="headFace" transform={`rotate(${headAngle}, 300, 310)`}>

              {/* Face Shape (Delicate feminine jawline matching reference) */}
              <path
                d="M 240 250 C 240 180 360 180 360 250 C 360 300 345 350 300 375 C 255 350 240 300 240 250 Z"
                fill="url(#skinBase)"
                stroke="#eccac0"
                strokeWidth="1.2"
              />

              {/* Soft Cheeks Blush */}
              <circle cx="262" cy="305" r="18" fill="url(#blushGlow)" />
              <circle cx="338" cy="305" r="18" fill="url(#blushGlow)" />

              {/* Dainty Anime Nose Dot & Shadow */}
              <circle cx="300" cy="296" r="1.6" fill="#d99b8d" />
              <path d="M 299 298 Q 300 302 297 303" stroke="#e0a89b" strokeWidth="1" fill="none" opacity="0.7" />

              {/* EYES (Crystal Cyan / Sapphire - Multi-layered) */}
              {/* Left Eye */}
              <g id="leftEye" transform="translate(268, 275)">
                {blink >= 0.85 ? (
                  /* Blinking / Closed Eye Curve */
                  <path
                    d="M -20 2 Q 0 -6 20 2"
                    fill="none"
                    stroke="#1c2536"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                ) : (
                  /* Open Detailed Anime Eye */
                  <g>
                    {/* White Sclera */}
                    <path
                      d="M -22 0 C -18 -15 18 -15 22 0 C 18 16 -18 16 -22 0 Z"
                      fill="#ffffff"
                    />

                    {/* Iris (Vibrant Cyan-Blue Gradient) */}
                    <ellipse cx="0" cy="0" rx="14" ry="14" fill="url(#eyeIris)" />

                    {/* Dark Pupil */}
                    <ellipse cx="0" cy="-1" rx="6" ry="7" fill="#051329" />

                    {/* Lower Aqua Rim Light */}
                    <path
                      d="M -10 5 Q 0 13 10 5"
                      stroke="#29DFFF"
                      strokeWidth="2.5"
                      fill="none"
                      opacity="0.9"
                    />

                    {/* Primary Big Sparkle Highlight */}
                    <circle cx="-5" cy="-6" r="4.2" fill="#ffffff" />
                    {/* Secondary Sparkle */}
                    <circle cx="5" cy="4" r="2.2" fill="#ffffff" opacity="0.85" />

                    {/* Upper Eyelash Line */}
                    <path
                      d="M -24 -2 Q 0 -18 24 -2"
                      fill="none"
                      stroke="#182030"
                      strokeWidth="3.8"
                      strokeLinecap="round"
                    />
                    {/* Delicate Corner Lash */}
                    <path d="M 20 -4 L 26 -8" stroke="#182030" strokeWidth="2.5" strokeLinecap="round" />
                  </g>
                )}
              </g>

              {/* Right Eye */}
              <g id="rightEye" transform="translate(332, 275)">
                {blink >= 0.85 ? (
                  /* Blinking / Closed Eye Curve */
                  <path
                    d="M -20 2 Q 0 -6 20 2"
                    fill="none"
                    stroke="#1c2536"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                ) : (
                  /* Open Detailed Anime Eye */
                  <g>
                    {/* White Sclera */}
                    <path
                      d="M -22 0 C -18 -15 18 -15 22 0 C 18 16 -18 16 -22 0 Z"
                      fill="#ffffff"
                    />

                    {/* Iris (Vibrant Cyan-Blue Gradient) */}
                    <ellipse cx="0" cy="0" rx="14" ry="14" fill="url(#eyeIris)" />

                    {/* Dark Pupil */}
                    <ellipse cx="0" cy="-1" rx="6" ry="7" fill="#051329" />

                    {/* Lower Aqua Rim Light */}
                    <path
                      d="M -10 5 Q 0 13 10 5"
                      stroke="#29DFFF"
                      strokeWidth="2.5"
                      fill="none"
                      opacity="0.9"
                    />

                    {/* Primary Big Sparkle Highlight */}
                    <circle cx="-5" cy="-6" r="4.2" fill="#ffffff" />
                    {/* Secondary Sparkle */}
                    <circle cx="5" cy="4" r="2.2" fill="#ffffff" opacity="0.85" />

                    {/* Upper Eyelash Line */}
                    <path
                      d="M -24 -2 Q 0 -18 24 -2"
                      fill="none"
                      stroke="#182030"
                      strokeWidth="3.8"
                      strokeLinecap="round"
                    />
                    {/* Delicate Corner Lash */}
                    <path d="M 20 -4 L 26 -8" stroke="#182030" strokeWidth="2.5" strokeLinecap="round" />
                  </g>
                )}
              </g>

              {/* EYEBROWS (Responsive to Assistant State) */}
              <g transform={`translate(0, ${browY})`}>
                <path
                  d="M 248 254 Q 268 246 288 252"
                  fill="none"
                  stroke="#475569"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  transform={`rotate(${browRot}, 268, 252)`}
                />
                <path
                  d="M 312 252 Q 332 246 352 254"
                  fill="none"
                  stroke="#475569"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  transform={`rotate(${-browRot}, 332, 252)`}
                />
              </g>

              {/* DYNAMIC MOUTH (Real-time Lip-Sync with Speech Audio) */}
              <g id="mouthGroup" transform="translate(300, 328)">
                {mouthOpen > 0.08 ? (
                  /* Open Animated Speech Mouth */
                  <g>
                    {/* Mouth Interior */}
                    <path
                      d={`M ${-10 - mouthOpen * 8} 0 Q 0 ${-mouthOpen * 5} ${10 + mouthOpen * 8} 0 Q 0 ${12 + mouthOpen * 20} ${-10 - mouthOpen * 8} 0 Z`}
                      fill="#7a1f33"
                      stroke="#3d0e19"
                      strokeWidth="1.8"
                    />
                    {/* Upper Teeth */}
                    <path
                      d={`M ${-7 - mouthOpen * 4} 0 Q 0 ${2 + mouthOpen * 2} ${7 + mouthOpen * 4} 0 Z`}
                      fill="#ffffff"
                    />
                    {/* Pink Tongue */}
                    <path
                      d={`M ${-6 - mouthOpen * 4} ${6 + mouthOpen * 10} Q 0 ${3 + mouthOpen * 7} ${6 + mouthOpen * 4} ${6 + mouthOpen * 10} Q 0 ${11 + mouthOpen * 18} ${-6 - mouthOpen * 4} ${6 + mouthOpen * 10} Z`}
                      fill="#e06d88"
                    />
                  </g>
                ) : (
                  /* Closed Natural Smile */
                  <path
                    d="M -9 0 Q 0 4 9 0"
                    fill="none"
                    stroke="#c46d75"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                )}
                {/* Subtle Lower Lip Tint */}
                <ellipse cx="0" cy="7" rx="5" ry="2" fill="#ff7a8a" opacity="0.3" />
              </g>

              {/* 4. FRONT BANGS & LUSTROUS HAIR SHINE (Signature Reference Hairstyle) */}
              <g id="frontBangs" transform={`translate(${hairSway}, 0)`}>
                {/* Crown Hair Dome */}
                <path
                  d="M 230 250 C 220 120 380 120 370 250 C 375 220 370 170 300 160 C 230 170 225 220 230 250 Z"
                  fill="url(#hairBase)"
                />

                {/* Left Side Hair Strand (Hangs past cheek with outward flip) */}
                <path
                  d="M 240 230 C 230 280 220 340 235 390 C 240 370 248 320 255 270 Z"
                  fill="url(#hairBase)"
                  stroke="#c5d8ea"
                  strokeWidth="1.2"
                />

                {/* Right Side Hair Strand (Hangs past cheek with outward flip) */}
                <path
                  d="M 360 230 C 370 280 380 340 365 390 C 360 370 352 320 345 270 Z"
                  fill="url(#hairBase)"
                  stroke="#c5d8ea"
                  strokeWidth="1.2"
                />

                {/* Center Forehead Bangs */}
                <path
                  d="M 245 210 Q 265 255 275 268 Q 280 245 285 220 Q 295 260 300 272 Q 305 245 315 220 Q 325 255 335 268 Q 345 245 355 210 Z"
                  fill="url(#hairBase)"
                  stroke="#c5d8ea"
                  strokeWidth="1.2"
                />

                {/* Silky Hair Highlights (Angel's Ring) */}
                <ellipse cx="300" cy="188" rx="55" ry="6" fill="#ffffff" opacity="0.8" />
                <path
                  d="M 255 188 Q 300 184 345 188"
                  stroke="#ffffff"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.9"
                />

                {/* Cyan Ribbon Hair Ties on Sides (Signature reference detail) */}
                <g transform="translate(232, 285) rotate(-20)">
                  <polygon points="0,0 -8,-10 6,-8" fill="url(#dressCyan)" />
                  <polygon points="0,0 -6,10 7,8" fill="url(#dressCyan)" />
                  <circle cx="0" cy="0" r="3.5" fill="#29DFFF" />
                </g>

                <g transform="translate(368, 285) rotate(20)">
                  <polygon points="0,0 8,-10 -6,-8" fill="url(#dressCyan)" />
                  <polygon points="0,0 6,10 -7,8" fill="url(#dressCyan)" />
                  <circle cx="0" cy="0" r="3.5" fill="#29DFFF" />
                </g>
              </g>

            </g> {/* End Head Group */}

          </g> {/* End Character Master Group */}

          {/* LOWER PEDESTAL HOLOGRAPHIC SOUND EQUALIZER */}
          <g transform="translate(300, 740)" opacity="0.75">
            <ellipse cx="0" cy="0" rx="190" ry="25" fill="none" stroke="#29DFFF" strokeWidth="2" strokeDasharray="12 8" opacity="0.5" />
            <ellipse cx="0" cy="0" rx="140" ry="18" fill="none" stroke="#00b4d8" strokeWidth="1.5" />
            {isSpeaking && (
              <ellipse 
                cx="0" 
                cy="0" 
                rx={150 + mouthOpen * 40} 
                ry={20 + mouthOpen * 8} 
                fill="none" 
                stroke="#29DFFF" 
                strokeWidth="2.5" 
                filter="url(#neonGlow)"
              />
            )}
          </g>
        </svg>
      </div>

      {/* Bottom Status Feedback Pill */}
      <div className="absolute bottom-2.5 right-3 z-30 pointer-events-none flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[9px] font-mono text-zinc-300">
        <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`}></span>
        <span>VOICE LIP-SYNC: {isSpeaking ? 'ACTIVE' : 'READY'}</span>
      </div>
    </div>
  );
};

export default NexaHologramAvatar2D;
