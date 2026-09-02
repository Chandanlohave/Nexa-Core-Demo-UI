
import React, { useEffect, useRef } from 'react';
import { HUDState } from '../types';
import NebulaOrb from './NebulaOrb';
import { GestureData } from './GestureController';

import { NexaAgentNode } from './NebulaOrb';

interface HUDProps {
  state: HUDState;
  rotationSpeed?: number;
  audioRef?: React.MutableRefObject<{ vol: number, bass: number, mid: number, treble: number } | null>; // CHANGED: Ref for performance
  accentColor?: string;
  ecoMode?: boolean; // New prop for battery saving
  gestureData?: GestureData;
  visualMode?: 'NEBULA' | 'CLASSIC';
  activeHighlightAgentId?: string | null;
  customAgents?: NexaAgentNode[];
  onResetZoom?: () => void;
}

const adjustColor = (color: string, amount: number) => {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
};

// Memoized Classic HUD Canvas
const ClassicHUD: React.FC<{
  state: HUDState;
  rotationSpeed?: number;
  audioRef?: React.MutableRefObject<{ vol: number, bass: number, mid: number, treble: number } | null>;
  accentColor?: string;
  ecoMode?: boolean;
}> = React.memo(({ state, rotationSpeed = 1, audioRef, accentColor = '#29DFFF', ecoMode = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const particlesRef = useRef<any[]>([]);
  const rotationRef = useRef({ x: 0, y: 0 });
  const matrixDropsRef = useRef<number[]>([]);
  
  const smoothedAudioRef = useRef({ vol: 0, bass: 0, mid: 0, treble: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // RESIZE LOGIC: Use ResizeObserver to track container size changes perfectly
    const updateSize = () => {
        if(containerRef.current && canvas) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            
            // Set actual canvas size (resolution)
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            
            // Set CSS display size
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            
            // Scale context to match DPR
            ctx.scale(dpr, dpr);
            
            const fontSize = 16;
            const columns = Math.floor(width / fontSize); 
            if (matrixDropsRef.current.length !== columns) {
                // Initialize drops at random y positions for immediate effect
                matrixDropsRef.current = Array(columns).fill(1).map(() => Math.floor(Math.random() * -50));
            }
        }
    };
    
    // Initial sizing
    updateSize();

    // Listen for container resize (e.g., when chat panel opens/closes)
    const resizeObserver = new ResizeObserver(() => {
        updateSize();
    });
    
    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }

    const getThemeColors = (isDark: boolean) => {
      // 1. WARNING - RED
      if (state === HUDState.WARNING) return isDark ? ['#FF0000', '#FF3333', '#800000'] : ['#DC2626', '#EF4444', '#991B1B']; 
      
      // 2. GLITCH - DARK RED/BLACK
      if (state === HUDState.GLITCH) return isDark ? ['#8B0000', '#000000', '#FF0000'] : ['#991B1B', '#1E293B', '#DC2626'];

      // 3. LIVE MODE & VISION MODE - GREEN
      if (state === HUDState.LIVE || state === HUDState.WATCHING) return isDark ? ['#00FF00', '#004400', '#CCFFCC'] : ['#059669', '#10B981', '#047857'];

      // 4. REPAIRING - WHITE/GREY
      if (state === HUDState.REPAIRING) return isDark ? ['#FFFFFF', '#E2E8F0', '#94A3B8'] : ['#0F172A', '#334155', '#64748B'];
      
      // 5. CODING - MATRIX GREEN
      if (state === HUDState.CODING) return isDark ? ['#0F0', '#003B00', '#008F11'] : ['#16A34A', '#15803D', '#166534']; 

      // 6. IDLE/DEFAULT - ACCENT COLOR
      const primary = accentColor || '#29DFFF';
      let secondary = '#00F0FF';
      let tertiary = '#38BDF8';
      return [primary, secondary, tertiary];
    };

    // REDUCE PARTICLES FOR BUTTERY 60FPS
    const particleCount = state === HUDState.CODING ? 0 : (ecoMode ? 100 : 250); 
    
    if (state !== HUDState.CODING && (particlesRef.current.length === 0 || particlesRef.current.length !== particleCount)) {
        particlesRef.current = [];
        const r = 100; // Initial radius, will be scaled dynamically
        for (let i = 0; i < particleCount; i++) {
            particlesRef.current.push({
                theta: Math.random() * 2 * Math.PI,
                phi: Math.acos(2 * Math.random() - 1),
                originalR: r + (Math.random() - 0.5) * 20,
                r: r,
                size: (Math.random() * 1.4 + 0.5),
                speedOffset: Math.random() * 0.02,
                blinkOffset: Math.random() * 100,
                randomPhase: Math.random() * Math.PI * 2
            });
        }
    }

    let lastTime = 0;
    const animate = (time: number) => {
      // BATTERY SAVER: If tab is hidden, skip rendering
      if (document.hidden) {
          requestRef.current = requestAnimationFrame(animate);
          return;
      }

      const now = performance.now();
      const dt = lastTime > 0 ? Math.min(0.04, (now - lastTime) / 1000) : 0.016;
      lastTime = now;
      const timeScale = dt * 60;

      if(!canvas || !containerRef.current) return;
      
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      
      // DYNAMIC RADIUS: Ensure it fits in the container (Reduced to 0.22 to prevent cutting)
      const baseRadius = Math.min(width, height) * 0.22;

      // CLEAN CLEAR for non-coding states
      if (state !== HUDState.CODING) {
          ctx.clearRect(0, 0, width, height);
      }
      
      const isDarkMode = document.documentElement.classList.contains('dark');
      const colors = getThemeColors(isDarkMode);

      // --- MATRIX RAIN MODE (NUMBERS) ---
      if (state === HUDState.CODING) {
          // Trail Effect: Draw a very transparent black rectangle to create trails
          ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; 
          ctx.fillRect(0, 0, width, height);
          
          ctx.font = '16px monospace';
          const fontSize = 16;
          
          for (let i = 0; i < matrixDropsRef.current.length; i++) {
              // Classic Matrix: Binary + some random hex for flavor
              const char = Math.random() > 0.5 ? '1' : '0';
              // Occasional Katakana-like chars or hex
              const displayChar = Math.random() > 0.9 ? (Math.floor(Math.random()*16).toString(16).toUpperCase()) : char;

              const x = i * fontSize;
              const y = matrixDropsRef.current[i] * fontSize;
              
              // THE MATRIX GLOW LOGIC
              // Randomly make some characters super bright (head of the drop)
              const isBright = Math.random() > 0.97;
              
              if (isBright) {
                  ctx.fillStyle = '#FFF'; // White tip
                  ctx.shadowBlur = 6;
                  ctx.shadowColor = '#FFF';
              } else {
                  ctx.fillStyle = '#0F0'; // Classic Green
                  ctx.shadowBlur = 0;
              }
              
              ctx.fillText(displayChar, x, y);
              
              // Reset Shadow
              ctx.shadowBlur = 0;

              // Reset drop to top randomly
              if (y > height && Math.random() > 0.975) {
                  matrixDropsRef.current[i] = 0;
              }
              matrixDropsRef.current[i]++;
          }
          
          // CENTER OVERLAY TEXT (Still needed to know what's happening)
          // Draw a semi-transparent box behind text for readability
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(width/2 - 150, height/2 - 40, 300, 80);
          
          ctx.shadowColor = '#0F0';
          ctx.shadowBlur = 8;
          ctx.font = '700 24px Rajdhani';
          ctx.fillStyle = '#FFF';
          ctx.textAlign = 'center';
          ctx.fillText("PHOENIX PROTOCOL", width/2, height/2);
          ctx.font = '12px monospace';
          ctx.fillStyle = '#0F0';
          ctx.fillText("REWRITING SOURCE CODE...", width/2, height/2 + 25);
          ctx.shadowBlur = 0;

          requestRef.current = requestAnimationFrame(animate);
          return;
      }

      // --- SPHERE MODE (NORMAL) ---
      let speedMultiplier = rotationSpeed || 1;
      if (state === HUDState.SPEAKING) speedMultiplier *= 1.4;
      if (state === HUDState.THINKING) speedMultiplier *= 2.2;
      if (state === HUDState.GLITCH) speedMultiplier *= 4;
      
      const currentAudio = audioRef?.current; 

      if (currentAudio) {
          const smoothFactor = Math.min(1, 0.2 * timeScale); 
          smoothedAudioRef.current.vol = lerp(smoothedAudioRef.current.vol, currentAudio.vol, smoothFactor);
          smoothedAudioRef.current.bass = lerp(smoothedAudioRef.current.bass, currentAudio.bass, smoothFactor);
          smoothedAudioRef.current.mid = lerp(smoothedAudioRef.current.mid, currentAudio.mid, smoothFactor);
          smoothedAudioRef.current.treble = lerp(smoothedAudioRef.current.treble, currentAudio.treble, smoothFactor);
      } else {
          const decay = Math.min(1, 0.05 * timeScale);
          smoothedAudioRef.current.vol = lerp(smoothedAudioRef.current.vol, 0, decay);
          smoothedAudioRef.current.bass = lerp(smoothedAudioRef.current.bass, 0, decay);
          smoothedAudioRef.current.mid = lerp(smoothedAudioRef.current.mid, 0, decay);
          smoothedAudioRef.current.treble = lerp(smoothedAudioRef.current.treble, 0, decay);
      }

      const { vol, bass, mid, treble } = smoothedAudioRef.current;

      rotationRef.current.y += (0.003 + (mid * 0.008)) * speedMultiplier * timeScale;
      rotationRef.current.x += (0.001 + (treble * 0.004)) * speedMultiplier * timeScale;
      
      // GLITCH JITTER
      let glitchOffsetX = 0, glitchOffsetY = 0;
      if (state === HUDState.GLITCH) {
          glitchOffsetX = (Math.random() - 0.5) * 8;
          glitchOffsetY = (Math.random() - 0.5) * 8;
      }

      const breathSpeed = 0.002;
      const breathAmp = baseRadius * 0.08;
      const globalExpansion = Math.sin(time * breathSpeed) * breathAmp;
      const audioExpansion = bass * (baseRadius * 0.35);

      // Glow (Subtle and controlled when shrunk)
      let glowColor = colors[0];
      const glowSize = baseRadius * 1.3 + (vol * baseRadius * 0.6);
      const gradient = ctx.createRadialGradient(width/2 + glitchOffsetX, height/2 + glitchOffsetY, baseRadius * 0.2, width/2, height/2, glowSize);
      gradient.addColorStop(0, isDarkMode ? `${glowColor}18` : `${glowColor}0A`);
      gradient.addColorStop(0.5, isDarkMode ? `${glowColor}06` : `${glowColor}02`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = isDarkMode ? 'lighter' : 'source-over';
      
      particlesRef.current.forEach((p, i) => {
        let shake = treble * 3 * Math.sin(time * 0.1 + i);
        if (state === HUDState.GLITCH) shake *= 5; // Intense shake

        const individualPulse = Math.sin((time * breathSpeed) + p.randomPhase) * 5;
        // Scale the particle radius to the current container size
        const scaleFactor = baseRadius / 100; // 100 was original base r
        const currentParticleR = p.r * scaleFactor;
        
        const targetR = baseRadius + globalExpansion + individualPulse + audioExpansion;
        // Interpolate radius changes
        const effectiveR = currentParticleR + (targetR - baseRadius); 

        let rotX, rotY, rotZ;
        rotX = effectiveR * Math.sin(p.phi) * Math.cos(p.theta + rotationRef.current.y);
        rotZ = effectiveR * Math.sin(p.phi) * Math.sin(p.theta + rotationRef.current.y);
        rotY = effectiveR * Math.cos(p.phi);
        
        rotX += shake; rotY += shake;

        let y2 = rotY * Math.cos(rotationRef.current.x) - rotZ * Math.sin(rotationRef.current.x);
        let z2 = rotY * Math.sin(rotationRef.current.x) + rotZ * Math.cos(rotationRef.current.x);
        
        const scale = 300 / (300 + z2);
        const alpha = scale * scale;
        
        ctx.beginPath();
        ctx.arc(width / 2 + rotX * scale + glitchOffsetX, height / 2 + y2 * scale + glitchOffsetY, p.size * scale, 0, Math.PI * 2);
        
        // Randomly flip colors in Glitch mode
        if (state === HUDState.GLITCH && Math.random() > 0.8) {
            ctx.fillStyle = '#000000';
        } else {
            ctx.fillStyle = colors[i % colors.length];
        }
        
        const blink = Math.sin(time * 0.005 + p.blinkOffset);
        const brightness = 0.6 + blink * 0.4 + (vol * 1.5); 
        ctx.globalAlpha = Math.min(1, Math.max(0.08, alpha * brightness * (isDarkMode ? 1.0 : 0.8)));
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      
      let mainTextColor = colors[0]; 
      const fontSize = Math.max(16, baseRadius * 0.3); // Responsive font
      
      ctx.font = `700 ${fontSize}px Rajdhani, sans-serif`; 
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = isDarkMode ? mainTextColor : 'rgba(41, 223, 255, 0.45)';
      ctx.shadowBlur = isDarkMode ? (15 + (vol * 20)) : 8;
      ctx.fillStyle = isDarkMode ? '#FFFFFF' : '#0284C7';
      
      let displayText = "NEXA";
      if (state === HUDState.GLITCH) {
          const glitchChars = "!@#$%^&*()_+";
          if (Math.random() > 0.7) displayText = "ERROR";
          if (Math.random() > 0.9) displayText = glitchChars.substring(0, 4);
      }

      ctx.fillText(displayText, width/2 + glitchOffsetX, height/2 + glitchOffsetY);
      ctx.shadowBlur = 0;

      if (rotationSpeed > 0) {
        ctx.font = '700 10px Rajdhani, monospace';
        // @ts-ignore
        ctx.letterSpacing = '2px';
        ctx.fillStyle = mainTextColor;
        
        let statusText = state === HUDState.IDLE ? 'ONLINE' : state;
        if (state === HUDState.REPAIRING) statusText = "SELF REPAIR";
        if (state === HUDState.SAFEMODE) statusText = "SAFE MODE";
        if (state === HUDState.GLITCH) statusText = "SYSTEM FAILURE";
        if (ecoMode) statusText += " [ECO]";
        
        const textShakeX = Math.random() * bass * 3;
        const textShakeY = Math.random() * bass * 3;

        ctx.fillText(statusText, width/2 + textShakeX + glitchOffsetX, height/2 + fontSize + 10 + textShakeY + glitchOffsetY);
        // @ts-ignore
        ctx.letterSpacing = '0px';
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
        cancelAnimationFrame(requestRef.current);
        if (containerRef.current) {
            resizeObserver.disconnect();
        }
    };
  }, [state, rotationSpeed, accentColor, ecoMode]); 

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden min-h-0">
        <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
});

// Master HUD Component routing cleanly between 3D Nebula Orb and Classic HUD
const HUD: React.FC<HUDProps> = React.memo(({
  state,
  rotationSpeed = 1,
  audioRef,
  accentColor = '#29DFFF',
  ecoMode = false,
  gestureData,
  visualMode = 'NEBULA',
  activeHighlightAgentId,
  customAgents,
  onResetZoom
}) => {
  if (visualMode === 'NEBULA' && state !== HUDState.CODING) {
    return (
      <div className="w-full h-full flex items-center justify-center overflow-hidden min-h-0 relative">
        <NebulaOrb
          state={state}
          rotationSpeed={rotationSpeed}
          audioRef={audioRef}
          accentColor={accentColor}
          ecoMode={ecoMode}
          gestureData={gestureData}
          activeHighlightAgentId={activeHighlightAgentId}
          customAgents={customAgents}
          onResetZoom={onResetZoom}
        />
      </div>
    );
  }

  return (
    <ClassicHUD
      state={state}
      rotationSpeed={rotationSpeed}
      audioRef={audioRef}
      accentColor={accentColor}
      ecoMode={ecoMode}
    />
  );
});

export default HUD;
