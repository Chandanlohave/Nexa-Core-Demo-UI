
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
  gestureData?: GestureData;
  onResetZoom?: () => void;
}> = React.memo(({ state, rotationSpeed = 1, audioRef, accentColor = '#29DFFF', ecoMode = false, gestureData, onResetZoom }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const particlesRef = useRef<Array<{
    theta: number;
    phi: number;
    size: number;
    blinkOffset: number;
    randomPhase: number;
  }>>([]);
  const rotationRef = useRef({ x: 0, y: 0 });
  const matrixDropsRef = useRef<number[]>([]);
  
  const smoothedAudioRef = useRef({ vol: 0, bass: 0, mid: 0, treble: 0 });

  // Real-time Gesture tracking refs
  const gestureDataRef = useRef<GestureData | undefined>(gestureData);
  useEffect(() => {
    gestureDataRef.current = gestureData;
  }, [gestureData]);

  const gestureScaleRef = useRef<number>(1.0);
  const targetScaleRef = useRef<number>(1.0);
  const gestureTiltRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetTiltRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartRef = useRef<{ x: number; y: number; dist: number } | null>(null);
  const touchRotRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if ('touches' in e) {
      if (e.touches.length === 1) {
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dist: 0 };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartRef.current = { x: 0, y: 0, dist: Math.hypot(dx, dy) };
      }
    } else {
      touchStartRef.current = { x: e.clientX, y: e.clientY, dist: 0 };
    }
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStartRef.current) return;
    if ('touches' in e) {
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartRef.current.x;
        const dy = e.touches[0].clientY - touchStartRef.current.y;
        touchRotRef.current.y += dx * 0.006;
        touchRotRef.current.x += dy * 0.005;
        touchStartRef.current.x = e.touches[0].clientX;
        touchStartRef.current.y = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        if (touchStartRef.current.dist > 0) {
          const factor = currentDist / touchStartRef.current.dist;
          targetScaleRef.current = Math.max(0.4, Math.min(2.5, targetScaleRef.current * factor));
        }
        touchStartRef.current.dist = currentDist;
      }
    } else if (e.buttons === 1) {
      const dx = e.clientX - touchStartRef.current.x;
      const dy = e.clientY - touchStartRef.current.y;
      touchRotRef.current.y += dx * 0.006;
      touchRotRef.current.x += dy * 0.005;
      touchStartRef.current.x = e.clientX;
      touchStartRef.current.y = e.clientY;
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // RESIZE LOGIC: Use ResizeObserver with DPR scale compensation for ultra-sharp Retina rendering
    const updateSize = () => {
        if(containerRef.current && canvas) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            
            // Set actual canvas size (resolution)
            canvas.width = Math.max(1, Math.floor(width * dpr));
            canvas.height = Math.max(1, Math.floor(height * dpr));
            
            // Set CSS display size
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            
            // Scale context to match DPR
            ctx.scale(dpr, dpr);
            
            const fontSize = 16;
            const columns = Math.max(1, Math.floor(width / fontSize)); 
            if (matrixDropsRef.current.length !== columns) {
                // Initialize drops at random y positions for immediate effect
                matrixDropsRef.current = Array(columns).fill(1).map(() => Math.floor(Math.random() * -50));
            }
        }
    };
    
    // Initial sizing
    updateSize();

    // Listen for container resize
    const resizeObserver = new ResizeObserver(() => {
        updateSize();
    });
    
    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }

    const adjustColor = (hex: string, amount: number) => {
        let clean = hex.replace(/^#/, '');
        if (clean.length === 3) {
            clean = clean.split('').map(c => c + c).join('');
        }
        const num = parseInt(clean, 16);
        let r = ((num >> 16) & 255) + amount;
        let g = ((num >> 8) & 255) + amount;
        let b = (num & 255) + amount;
        r = Math.min(255, Math.max(0, r));
        g = Math.min(255, Math.max(0, g));
        b = Math.min(255, Math.max(0, b));
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };

    const getThemeColors = (isDark: boolean): string[] => {
      // 1. WARNING - RED
      if (state === HUDState.WARNING) {
        return ['#FF0000', '#FF3333', '#800000']; 
      }
      
      // 2. GLITCH - CHAOS (DARK RED/BLACK/RED)
      if (state === HUDState.GLITCH) {
        return ['#8B0000', '#000000', '#FF0000'];
      }

      // 3. LIVE MODE & VISION MODE - MILITARY GREEN
      if (state === HUDState.LIVE || state === HUDState.WATCHING) {
        return ['#00FF00', '#004400', '#CCFFCC'];
      }

      // 4. REPAIRING - WHITE/GREY
      if (state === HUDState.REPAIRING) {
        return ['#FFFFFF', '#E2E8F0', '#94A3B8'];
      }
      
      // 5. CODING - MATRIX GREEN
      if (state === HUDState.CODING) {
        return ['#0F0', '#003B00', '#008F11']; 
      }

      // 6. IDLE/SPEAKING/THINKING - ACCENT PALETTE (±40 hex luminance adjustments)
      const primary = accentColor || '#29DFFF';
      if (!isDark) {
        // High-contrast vibrant cyan shades for light theme clarity
        return [
          adjustColor(primary, -20),
          adjustColor(primary, -50),
          primary
        ];
      }
      return [
        primary,
        adjustColor(primary, 40),
        adjustColor(primary, -40)
      ];
    };

    // 1. Particle System Specifications & Counts:
    // Full Graphics: 900 particles | Eco: 200 particles | Coding: 0 particles
    const particleCount = state === HUDState.CODING ? 0 : (ecoMode ? 200 : 900); 
    
    if (state !== HUDState.CODING && particlesRef.current.length !== particleCount) {
        particlesRef.current = [];
        // Spherical distribution: θ = random(0, 2π), φ = arccos(2 * random(0, 1) - 1)
        for (let i = 0; i < particleCount; i++) {
            particlesRef.current.push({
                theta: Math.random() * 2 * Math.PI,
                phi: Math.acos(2 * Math.random() - 1),
                size: Math.random() * 1.6 + 0.6,
                blinkOffset: Math.random() * 100,
                randomPhase: Math.random() * Math.PI * 2
            });
        }
    }

    let lastFrameTime = 0;
    const animate = (time: number) => {
      // Auto-pause when document.hidden is true
      if (document.hidden) {
          requestRef.current = requestAnimationFrame(animate);
          return;
      }

      const now = performance.now();
      const deltaMs = now - lastFrameTime;

      // Eco / Battery Saver Mode: 30 FPS throttle cap (delta < 33ms)
      if (ecoMode && deltaMs < 33) {
          requestRef.current = requestAnimationFrame(animate);
          return;
      }

      const dt = lastFrameTime > 0 ? Math.min(0.05, deltaMs / 1000) : 0.016;
      lastFrameTime = now;
      const timeScale = dt * 60;

      if(!canvas || !containerRef.current) return;
      
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      
      // Air Gesture Processing (Touch-free 3D Scaling & Air Tilt)
      const gd = gestureDataRef.current;
      if (gd && gd.handDetected) {
          targetScaleRef.current = Math.max(0.35, Math.min(2.5, gd.scale || 1.0));
          targetTiltRef.current.x = gd.handPosition ? gd.handPosition.x : 0;
          targetTiltRef.current.y = gd.handPosition ? gd.handPosition.y : 0;
      } else {
          targetScaleRef.current = 1.0;
          targetTiltRef.current.x = 0;
          targetTiltRef.current.y = 0;
      }

      // Smooth scale & tilt interpolation with timeScale
      const scaleSpeed = Math.min(1, 0.16 * timeScale);
      const tiltSpeed = Math.min(1, 0.16 * timeScale);
      gestureScaleRef.current += (targetScaleRef.current - gestureScaleRef.current) * scaleSpeed;
      gestureTiltRef.current.x += (targetTiltRef.current.x - gestureTiltRef.current.x) * tiltSpeed;
      gestureTiltRef.current.y += (targetTiltRef.current.y - gestureTiltRef.current.y) * tiltSpeed;

      const currentScale = gestureScaleRef.current;
      // Dynamic baseRadius dynamically driven by hand gestures
      const baseRadius = Math.min(width, height) * 0.22 * currentScale;

      // CLEAN CLEAR for non-coding states
      if (state !== HUDState.CODING) {
          ctx.clearRect(0, 0, width, height);
      }
      
      const isDarkMode = document.documentElement.classList.contains('dark');
      const colors = getThemeColors(isDarkMode);

      // --- 2D MATRIX DIGITAL RAIN MODE (CODING / PHOENIX PROTOCOL) ---
      if (state === HUDState.CODING) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; 
          ctx.fillRect(0, 0, width, height);
          
          ctx.font = '16px monospace';
          const fontSize = 16;
          
          for (let i = 0; i < matrixDropsRef.current.length; i++) {
              const char = Math.random() > 0.5 ? '1' : '0';
              const displayChar = Math.random() > 0.85 
                ? (Math.floor(Math.random() * 16).toString(16).toUpperCase()) 
                : char;

              const x = i * fontSize;
              const y = matrixDropsRef.current[i] * fontSize;
              
              const isBright = Math.random() > 0.96;
              
              if (isBright) {
                  ctx.fillStyle = '#FFF'; // Glowing white drop tips
                  ctx.shadowBlur = 8;
                  ctx.shadowColor = '#FFF';
              } else {
                  ctx.fillStyle = colors[i % colors.length];
                  ctx.shadowBlur = 0;
              }
              
              ctx.fillText(displayChar, x, y);
              ctx.shadowBlur = 0;

              if (y > height && Math.random() > 0.975) {
                  matrixDropsRef.current[i] = 0;
              }
              matrixDropsRef.current[i]++;
          }
          
          // PHOENIX PROTOCOL overlay box
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.fillRect(width / 2 - 160, height / 2 - 45, 320, 90);
          ctx.strokeStyle = '#0F0';
          ctx.lineWidth = 1;
          ctx.strokeRect(width / 2 - 160, height / 2 - 45, 320, 90);
          
          ctx.shadowColor = '#0F0';
          ctx.shadowBlur = 8;
          ctx.font = '700 24px Rajdhani, sans-serif';
          ctx.fillStyle = '#FFF';
          ctx.textAlign = 'center';
          ctx.fillText("PHOENIX PROTOCOL", width / 2, height / 2 - 4);
          ctx.font = '12px monospace';
          ctx.fillStyle = '#0F0';
          ctx.fillText("REWRITING SOURCE CODE...", width / 2, height / 2 + 22);
          ctx.shadowBlur = 0;

          requestRef.current = requestAnimationFrame(animate);
          return;
      }

      // --- 3D PARTICLE SPHERE MODE ---
      // Speed Multipliers
      let speedMultiplier = rotationSpeed || 1;
      if (state === HUDState.SPEAKING) speedMultiplier *= 1.5;
      else if (state === HUDState.THINKING) speedMultiplier *= 2.5;
      else if (state === HUDState.LIVE || state === HUDState.WATCHING) speedMultiplier *= 4.0;
      else if (state === HUDState.GLITCH) speedMultiplier *= 5.0;
      
      const currentAudio = audioRef?.current; 

      // Audio-Reactive Frequency Modulation (LERP factor = 0.2 on input, 0.05 decay)
      if (currentAudio) {
          const smoothFactor = Math.min(1, 0.2 * timeScale); 
          smoothedAudioRef.current.vol = lerp(smoothedAudioRef.current.vol, currentAudio.vol || 0, smoothFactor);
          smoothedAudioRef.current.bass = lerp(smoothedAudioRef.current.bass, currentAudio.bass || 0, smoothFactor);
          smoothedAudioRef.current.mid = lerp(smoothedAudioRef.current.mid, currentAudio.mid || 0, smoothFactor);
          smoothedAudioRef.current.treble = lerp(smoothedAudioRef.current.treble, currentAudio.treble || 0, smoothFactor);
      } else {
          const decay = Math.min(1, 0.05 * timeScale);
          smoothedAudioRef.current.vol = lerp(smoothedAudioRef.current.vol, 0, decay);
          smoothedAudioRef.current.bass = lerp(smoothedAudioRef.current.bass, 0, decay);
          smoothedAudioRef.current.mid = lerp(smoothedAudioRef.current.mid, 0, decay);
          smoothedAudioRef.current.treble = lerp(smoothedAudioRef.current.treble, 0, decay);
      }

      const { vol, bass, mid, treble } = smoothedAudioRef.current;

      // Mid drives Y-axis spherical spin rate
      rotationRef.current.y += (0.003 + (mid * 0.01)) * speedMultiplier * timeScale;
      // Treble drives X-axis tilt
      rotationRef.current.x += (0.001 + (treble * 0.004)) * speedMultiplier * timeScale;
      
      // Glitch screen jitter (±10px)
      let glitchOffsetX = 0, glitchOffsetY = 0;
      if (state === HUDState.GLITCH) {
          glitchOffsetX = (Math.random() - 0.5) * 20;
          glitchOffsetY = (Math.random() - 0.5) * 20;
      }

      // Radius Dynamics (r):
      // r = baseRadius + globalExpansion + individualPulse + audioExpansion
      // globalExpansion = Math.sin(time * 0.002) * (baseRadius * 0.1) (Breathing effect)
      // audioExpansion = bass * (baseRadius * 0.4)
      const globalExpansion = Math.sin(time * 0.002) * (baseRadius * 0.1);
      const audioExpansion = bass * (baseRadius * 0.4);

      // Central Radial Glow Gradient modulated by volume (RMS)
      const glowColor = colors[0];
      const glowSize = baseRadius * 1.3 + (vol * baseRadius * 0.6);
      const gradient = ctx.createRadialGradient(
        width / 2 + glitchOffsetX, 
        height / 2 + glitchOffsetY, 
        baseRadius * 0.2, 
        width / 2, 
        height / 2, 
        glowSize
      );
      
      if (isDarkMode) {
        gradient.addColorStop(0, `${glowColor}25`);
        gradient.addColorStop(0.5, `${glowColor}08`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
      } else {
        gradient.addColorStop(0, `${glowColor}20`);
        gradient.addColorStop(0.5, `${glowColor}08`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Particle bloom layering: 'lighter' for glowing bloom in dark mode, 'source-over' in light mode for crisp dots
      ctx.globalCompositeOperation = isDarkMode ? 'lighter' : 'source-over';
      
      // Combine continuous auto-rotation with touch drag & hand gesture air tilt
      const handTiltY = gestureTiltRef.current.x * 0.85;
      const handTiltX = gestureTiltRef.current.y * 0.75;
      const angleY = rotationRef.current.y + touchRotRef.current.y + handTiltY;
      const angleX = rotationRef.current.x + touchRotRef.current.x + handTiltX;

      particlesRef.current.forEach((p, i) => {
        // Individual pulse: Math.sin(time * 0.002 + randomPhase) * 5
        const individualPulse = Math.sin(time * 0.002 + p.randomPhase) * 5;
        const r = baseRadius + globalExpansion + individualPulse + audioExpansion;

        // 3D Rotation Equations:
        // rotX = r * sin(φ) * cos(θ + rotY)
        // rotZ = r * sin(φ) * sin(θ + rotY)
        // rotY = r * cos(φ)
        let rotX = r * Math.sin(p.phi) * Math.cos(p.theta + angleY);
        let rotZ = r * Math.sin(p.phi) * Math.sin(p.theta + angleY);
        let rotY = r * Math.cos(p.phi);

        // Treble individual high-frequency particle jitter (5x on glitch)
        let shake = treble * 3 * Math.sin(time * 0.1 + i);
        if (state === HUDState.GLITCH) shake *= 5;
        rotX += shake;
        rotY += shake;

        // y2 = rotY * cos(rotX) - rotZ * sin(rotX)
        // z2 = rotY * sin(rotX) + rotZ * cos(rotX)
        const y2 = rotY * Math.cos(angleX) - rotZ * Math.sin(angleX);
        const z2 = rotY * Math.sin(angleX) + rotZ * Math.cos(angleX);
        
        // Dynamic Perspective 2D Projection adapted for real-time scale
        const focalDist = 300 * Math.max(0.8, Math.min(2.2, currentScale));
        const scale = focalDist / (focalDist + z2);
        const blink = Math.sin(time * 0.005 + p.blinkOffset);
        const brightness = 0.6 + blink * 0.4 + (vol * 1.5);
        const alpha = scale * scale * brightness;
        const screenX = (width / 2) + rotX * scale + glitchOffsetX;
        const screenY = (height / 2) + y2 * scale + glitchOffsetY;
        const particleRadius = Math.max(0.35, p.size * scale * Math.sqrt(Math.max(0.4, currentScale)));
        
        ctx.beginPath();
        ctx.arc(screenX, screenY, particleRadius, 0, Math.PI * 2);
        
        if (state === HUDState.GLITCH && Math.random() > 0.8) {
            ctx.fillStyle = '#000000';
        } else {
            ctx.fillStyle = colors[i % colors.length];
        }
        
        ctx.globalAlpha = Math.min(1, Math.max(0.06, alpha * (isDarkMode ? 1.0 : 0.85)));
        ctx.fill();
      });

      // Holographic air-gesture indicator ring when active
      if (gd && gd.handDetected && Math.abs(currentScale - 1.0) > 0.04) {
        ctx.save();
        ctx.strokeStyle = gd.gesture === 'PINCH' ? 'rgba(56, 189, 248, 0.45)' : 'rgba(41, 223, 255, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(width / 2 + glitchOffsetX, height / 2 + glitchOffsetY, baseRadius * 1.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Reset layer composition to 'source-over' for typography
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      
      const mainTextColor = colors[0]; 
      // Main Typography: Centered Rajdhani, sans-serif at fontSize = Math.max(16, baseRadius * 0.3)
      const fontSize = Math.max(16, baseRadius * 0.3);
      
      ctx.font = `700 ${fontSize}px Rajdhani, sans-serif`; 
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = isDarkMode ? mainTextColor : 'rgba(41, 223, 255, 0.6)';
      // Text shadow blur: 15 + vol * 20
      ctx.shadowBlur = isDarkMode ? (15 + (vol * 20)) : (8 + (vol * 12));
      ctx.fillStyle = isDarkMode ? '#FFFFFF' : '#0284C7';
      
      let displayText = "N.E.X.A.";
      if (state === HUDState.GLITCH) {
          const glitchChars = "!@#$%^&*()_+";
          if (Math.random() > 0.7) displayText = "ERROR";
          else if (Math.random() > 0.9) displayText = glitchChars.substring(0, 5);
      }

      ctx.fillText(displayText, width / 2 + glitchOffsetX, height / 2 + glitchOffsetY);
      ctx.shadowBlur = 0;

      if (rotationSpeed > 0) {
        // Sub-status Indicator: 10px Rajdhani, monospace with 2px letter-spacing
        ctx.font = '700 10px Rajdhani, monospace';
        // @ts-ignore
        ctx.letterSpacing = '2px';
        ctx.fillStyle = isDarkMode ? mainTextColor : '#0284C7';
        
        let statusText = 'ONLINE';
        if (state === HUDState.LISTENING) statusText = 'LISTENING';
        else if (state === HUDState.THINKING) statusText = 'THINKING';
        else if (state === HUDState.SPEAKING) statusText = 'SPEAKING';
        else if (state === HUDState.REPAIRING) statusText = 'SELF REPAIR';
        else if (state === HUDState.SAFEMODE) statusText = 'SAFE MODE';
        else if (state === HUDState.GLITCH) statusText = 'SYSTEM FAILURE';
        else if (state === HUDState.LIVE || state === HUDState.WATCHING) statusText = 'LIVE';
        else if (state === HUDState.WARNING) statusText = 'WARNING';
        else if (state === HUDState.STUDY_HUB) statusText = 'STUDY HUB';
        else if (state === HUDState.GENERATING) statusText = 'GENERATING';

        if (ecoMode) {
            statusText += " [ECO]";
        }
        
        // Status text vibration driven by bass
        const textShakeX = (Math.random() - 0.5) * bass * 6;
        const textShakeY = (Math.random() - 0.5) * bass * 6;

        ctx.fillText(
          statusText, 
          width / 2 + textShakeX + glitchOffsetX, 
          height / 2 + fontSize * 0.75 + 10 + textShakeY + glitchOffsetY
        );
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
    <div 
      ref={containerRef} 
      className="w-full h-full flex items-center justify-center overflow-hidden min-h-0 pointer-events-auto touch-none cursor-grab active:cursor-grabbing"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
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
      gestureData={gestureData}
      onResetZoom={onResetZoom}
    />
  );
});

export default HUD;
