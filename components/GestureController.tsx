import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Hand, RefreshCw, Eye, EyeOff, ShieldCheck, Zap, AlertCircle } from 'lucide-react';

export interface GestureData {
  handDetected: boolean;
  gesture: 'OPEN_PALM' | 'PINCH' | 'FIST' | 'POINTING' | 'IDLE';
  scale: number; // 0.35 (ultra shrink) to 2.5 (massive expand)
  pinchDistance: number; // 0 to 1
  handPosition: { x: number; y: number }; // Normalized -1 to 1 for 3D tilt
  fingerCount: number;
}

interface GestureControllerProps {
  onGestureUpdate: (data: GestureData) => void;
  isActive: boolean;
  onToggle: (active: boolean) => void;
}

export interface GestureControllerRef {
  resetZoom: () => void;
}

// Dynamic script loader utility for robust CDN fallback
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
};

export const GestureController = React.forwardRef<GestureControllerRef, GestureControllerProps>(({
  onGestureUpdate,
  isActive,
  onToggle
}, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const skeletonCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaPipeCameraRef = useRef<any>(null);
  const mediaPipeHandsRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentGesture, setCurrentGesture] = useState<string>('IDLE');
  const [scaleDisplay, setScaleDisplay] = useState<number>(1.0);
  const [isHandVisible, setIsHandVisible] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [showSkeletonPreview, setShowSkeletonPreview] = useState<boolean>(true);
  const [engineMode, setEngineMode] = useState<'MEDIAPIPE' | 'OPTICAL'>('OPTICAL');

  const smoothedScaleRef = useRef<number>(1.0);
  const smoothedPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const gestureHistoryRef = useRef<string[]>([]);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);

  React.useImperativeHandle(ref, () => ({
    resetZoom: () => {
      smoothedScaleRef.current = 1.0;
      setScaleDisplay(1.0);
    }
  }));

  // Cleanup camera and models
  const cleanup = useCallback(() => {
    if (mediaPipeCameraRef.current) {
      try {
        mediaPipeCameraRef.current.stop();
      } catch (e) {}
      mediaPipeCameraRef.current = null;
    }
    if (mediaPipeHandsRef.current) {
      try {
        mediaPipeHandsRef.current.close();
      } catch (e) {}
      mediaPipeHandsRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(t => t.stop());
      } catch (e) {}
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsHandVisible(false);
    setIsStarting(false);
    setCurrentGesture('IDLE');
    setScaleDisplay(1.0);
    setCameraError(null);
    prevFrameDataRef.current = null;

    onGestureUpdate({
      handDetected: false,
      gesture: 'IDLE',
      scale: 1.0,
      pinchDistance: 0.5,
      handPosition: { x: 0, y: 0 },
      fingerCount: 0
    });
  }, [onGestureUpdate]);

  // Main Hand Tracking Setup
  useEffect(() => {
    if (!isActive) {
      cleanup();
      return;
    }

    let isMounted = true;
    setIsStarting(true);
    setCameraError(null);

    async function initTracking() {
      try {
        // Request Camera Stream with fallback
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 320, max: 640 },
              height: { ideal: 240, max: 480 },
              frameRate: { ideal: 30 }
            },
            audio: false
          });
        } catch (constraintErr) {
          // Fallback to basic video constraint
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }

        if (!isMounted) {
          if (stream) stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          video.muted = true;
          await video.play().catch(e => console.warn('Video play warning:', e));
        }

        setHasPermission(true);
        setIsStarting(false);

        // Try Loading MediaPipe Hands CDN if not already loaded
        let win = window as any;
        if (!win.Hands || !win.Camera) {
          try {
            await Promise.all([
              loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
              loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js')
            ]);
            win = window as any;
          } catch (loadErr) {
            console.warn('MediaPipe CDN load failed, falling back to Optical:', loadErr);
          }
        }

        // Initialize MediaPipe if available, else run high-frequency Optical tracker
        if (win.Hands && win.Camera && video) {
          try {
            setEngineMode('MEDIAPIPE');
            const hands = new win.Hands({
              locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            hands.setOptions({
              maxNumHands: 1,
              modelComplexity: 1,
              minDetectionConfidence: 0.5,
              minTrackingConfidence: 0.5
            });

            hands.onResults((results: any) => {
              if (!isMounted) return;
              handleMediaPipeResults(results);
            });

            mediaPipeHandsRef.current = hands;

            const camera = new win.Camera(video, {
              onFrame: async () => {
                if (mediaPipeHandsRef.current && video.readyState >= 2) {
                  try {
                    await mediaPipeHandsRef.current.send({ image: video });
                  } catch (sendErr) {}
                }
              },
              width: 320,
              height: 240
            });

            camera.start();
            mediaPipeCameraRef.current = camera;
            return;
          } catch (mpInitErr) {
            console.warn('MediaPipe init error, switching to Optical tracker:', mpInitErr);
          }
        }

        // Fallback: Ultra-fast Optical motion & skin tracker
        setEngineMode('OPTICAL');
        startOpticalTracking(video);

      } catch (err: any) {
        console.error('Camera access error:', err);
        if (isMounted) {
          setHasPermission(false);
          setIsStarting(false);
          setCameraError(err?.message || 'Camera blocked or unavailable');
        }
      }
    }

    initTracking();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [isActive, facingMode, cleanup]);

  // 100% Precise MediaPipe 21-Joint Skeletal Math
  const handleMediaPipeResults = (results: any) => {
    const canvas = skeletonCanvasRef.current;
    const ctx = canvas ? canvas.getContext('2d') : null;

    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      setIsHandVisible(true);

      // 1. Draw Holographic Skeleton Overlay
      if (ctx && canvas && showSkeletonPreview) {
        const connections = [
          [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
          [0, 5], [5, 6], [6, 7], [7, 8], // Index
          [0, 9], [9, 10], [10, 11], [11, 12], // Middle
          [0, 13], [13, 14], [14, 15], [15, 16], // Ring
          [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
          [5, 9], [9, 13], [13, 17] // Palm Base
        ];

        ctx.strokeStyle = '#29DFFF';
        ctx.lineWidth = 2;
        connections.forEach(([i1, i2]) => {
          const p1 = landmarks[i1];
          const p2 = landmarks[i2];
          const x1 = (1 - p1.x) * canvas.width;
          const y1 = p1.y * canvas.height;
          const x2 = (1 - p2.x) * canvas.width;
          const y2 = p2.y * canvas.height;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        });

        // Draw Joints
        landmarks.forEach((p: any, idx: number) => {
          const x = (1 - p.x) * canvas.width;
          const y = p.y * canvas.height;
          ctx.fillStyle = idx === 4 || idx === 8 ? '#FFFFFF' : '#00F0FF';
          ctx.beginPath();
          ctx.arc(x, y, idx === 4 || idx === 8 ? 3.5 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 2. Scale-Invariant Landmark Calculations
      const wrist = landmarks[0];
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const indexMCP = landmarks[5];
      const middleTip = landmarks[12];
      const middleMCP = landmarks[9];
      const ringTip = landmarks[16];
      const ringMCP = landmarks[13];
      const pinkyTip = landmarks[20];
      const pinkyMCP = landmarks[17];
      const palmCenter = landmarks[9];

      const palmSize = Math.max(0.01, Math.hypot(wrist.x - middleMCP.x, wrist.y - middleMCP.y));

      const ratioIndex = Math.hypot(wrist.x - indexTip.x, wrist.y - indexTip.y) / Math.hypot(wrist.x - indexMCP.x, wrist.y - indexMCP.y);
      const ratioMiddle = Math.hypot(wrist.x - middleTip.x, wrist.y - middleTip.y) / Math.hypot(wrist.x - middleMCP.x, wrist.y - middleMCP.y);
      const ratioRing = Math.hypot(wrist.x - ringTip.x, wrist.y - ringTip.y) / Math.hypot(wrist.x - ringMCP.x, wrist.y - ringMCP.y);
      const ratioPinky = Math.hypot(wrist.x - pinkyTip.x, wrist.y - pinkyTip.y) / Math.hypot(wrist.x - pinkyMCP.x, wrist.y - pinkyMCP.y);

      const isIndexExtended = ratioIndex > 1.20;
      const isMiddleExtended = ratioMiddle > 1.20;
      const isRingExtended = ratioRing > 1.20;
      const isPinkyExtended = ratioPinky > 1.20;

      const extendedCount = (isIndexExtended ? 1 : 0) + (isMiddleExtended ? 1 : 0) + (isRingExtended ? 1 : 0) + (isPinkyExtended ? 1 : 0);

      const rawPinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
      const pinchRatio = rawPinchDist / palmSize;

      // 3. Gesture Classification
      const isPointing = isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended;
      const isPinch = pinchRatio < 0.45 && !isPointing;
      const isOpenPalm = extendedCount >= 3;
      const isFist = extendedCount === 0 && pinchRatio >= 0.45;

      let detectedGesture: GestureData['gesture'] = 'IDLE';
      let targetScale = 1.0;

      if (isPointing) {
        detectedGesture = 'POINTING';
        targetScale = smoothedScaleRef.current;
      } else if (isPinch) {
        detectedGesture = 'PINCH';
        const tightness = Math.max(0, Math.min(1.0, pinchRatio / 0.45));
        targetScale = 0.45 + tightness * 0.45;
      } else if (isOpenPalm) {
        detectedGesture = 'OPEN_PALM';
        const avgExtension = (ratioIndex + ratioMiddle + ratioRing + ratioPinky) / 4;
        const spreadFactor = Math.max(0, Math.min(1.0, (avgExtension - 1.20) / 0.50));
        targetScale = 1.25 + spreadFactor * 1.10;
      } else if (isFist) {
        detectedGesture = 'FIST';
        targetScale = 0.50;
      } else {
        detectedGesture = 'IDLE';
        targetScale = 1.0;
      }

      gestureHistoryRef.current.push(detectedGesture);
      if (gestureHistoryRef.current.length > 4) {
        gestureHistoryRef.current.shift();
      }
      const counts: Record<string, number> = {};
      gestureHistoryRef.current.forEach(g => { counts[g] = (counts[g] || 0) + 1; });
      let stableGesture: GestureData['gesture'] = detectedGesture;
      Object.entries(counts).forEach(([g, count]) => {
        if (count >= 2) stableGesture = g as GestureData['gesture'];
      });

      smoothedScaleRef.current += (targetScale - smoothedScaleRef.current) * 0.25;
      const finalScale = Math.max(0.40, Math.min(2.4, smoothedScaleRef.current));

      const isFront = facingMode === 'user';
      const normX = isFront ? (0.5 - palmCenter.x) * 2 : (palmCenter.x - 0.5) * 2;
      const normY = (palmCenter.y - 0.5) * 2;
      smoothedPosRef.current.x += (normX - smoothedPosRef.current.x) * 0.22;
      smoothedPosRef.current.y += (normY - smoothedPosRef.current.y) * 0.22;

      setCurrentGesture(stableGesture);
      setScaleDisplay(parseFloat(finalScale.toFixed(2)));

      onGestureUpdate({
        handDetected: true,
        gesture: stableGesture,
        scale: finalScale,
        pinchDistance: pinchRatio,
        handPosition: smoothedPosRef.current,
        fingerCount: extendedCount
      });
    } else {
      setIsHandVisible(false);
      smoothedScaleRef.current += (1.0 - smoothedScaleRef.current) * 0.12;
      smoothedPosRef.current.x *= 0.85;
      smoothedPosRef.current.y *= 0.85;

      setCurrentGesture('IDLE');
      setScaleDisplay(1.0);

      onGestureUpdate({
        handDetected: false,
        gesture: 'IDLE',
        scale: smoothedScaleRef.current,
        pinchDistance: 0.5,
        handPosition: smoothedPosRef.current,
        fingerCount: 0
      });
    }
  };

  // Optical Fallback Tracker (Instant, reliable, works everywhere)
  const startOpticalTracking = (video: HTMLVideoElement | null) => {
    if (!video) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 160;
    tempCanvas.height = 120;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    const loop = () => {
      if (video.readyState >= 2 && tempCtx) {
        tempCtx.drawImage(video, 0, 0, 160, 120);
        const imgData = tempCtx.getImageData(0, 0, 160, 120);
        const data = imgData.data;
        const prevData = prevFrameDataRef.current;

        let detectedPixels = 0;
        let sumX = 0;
        let sumY = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          // Skin color heuristic
          const isSkin = r > 50 && g > 35 && b > 20 && r > g && r > b && (r - g) > 12;
          
          // Motion detection heuristic
          let hasMotion = false;
          if (prevData) {
            const dr = Math.abs(r - prevData[i]);
            const dg = Math.abs(g - prevData[i + 1]);
            const db = Math.abs(b - prevData[i + 2]);
            if (dr + dg + db > 40) hasMotion = true;
          }

          if (isSkin || hasMotion) {
            detectedPixels++;
            sumX += (i / 4) % 160;
            sumY += Math.floor((i / 4) / 160);
          }
        }

        prevFrameDataRef.current = new Uint8ClampedArray(data);

        const hasHand = detectedPixels > 350;
        setIsHandVisible(hasHand);

        // Render Optical Tracking Dots on Preview Canvas
        const previewCanvas = skeletonCanvasRef.current;
        if (previewCanvas && showSkeletonPreview) {
          const pCtx = previewCanvas.getContext('2d');
          if (pCtx) {
            pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            if (hasHand && detectedPixels > 0) {
              const avgX = (sumX / detectedPixels) / 160;
              const avgY = (sumY / detectedPixels) / 120;
              const drawX = (1 - avgX) * previewCanvas.width;
              const drawY = avgY * previewCanvas.height;

              pCtx.fillStyle = 'rgba(41, 223, 255, 0.4)';
              pCtx.beginPath();
              pCtx.arc(drawX, drawY, 20, 0, Math.PI * 2);
              pCtx.fill();

              pCtx.fillStyle = '#00F0FF';
              pCtx.beginPath();
              pCtx.arc(drawX, drawY, 6, 0, Math.PI * 2);
              pCtx.fill();
            }
          }
        }

        if (hasHand && detectedPixels > 0) {
          const ratio = detectedPixels / (160 * 120);
          let target = 1.0;
          let gesture: GestureData['gesture'] = 'IDLE';

          if (ratio > 0.16) {
            target = 1.85; // Large hand spread / close = EXPAND
            gesture = 'OPEN_PALM';
          } else if (ratio < 0.06) {
            target = 0.55; // Small hand / fist = SHRINK
            gesture = 'PINCH';
          } else {
            target = 1.0;
            gesture = 'POINTING';
          }

          smoothedScaleRef.current += (target - smoothedScaleRef.current) * 0.22;
          const avgX = sumX / detectedPixels;
          const avgY = sumY / detectedPixels;
          const normX = ((80 - avgX) / 80);
          const normY = ((avgY - 60) / 60);

          smoothedPosRef.current.x += (normX - smoothedPosRef.current.x) * 0.2;
          smoothedPosRef.current.y += (normY - smoothedPosRef.current.y) * 0.2;

          setCurrentGesture(gesture);
          setScaleDisplay(parseFloat(smoothedScaleRef.current.toFixed(2)));

          onGestureUpdate({
            handDetected: true,
            gesture: gesture,
            scale: smoothedScaleRef.current,
            pinchDistance: 0.5,
            handPosition: smoothedPosRef.current,
            fingerCount: gesture === 'OPEN_PALM' ? 5 : (gesture === 'PINCH' ? 1 : 2)
          });
        } else {
          smoothedScaleRef.current += (1.0 - smoothedScaleRef.current) * 0.12;
          setCurrentGesture('IDLE');
          setScaleDisplay(1.0);
          onGestureUpdate({
            handDetected: false,
            gesture: 'IDLE',
            scale: smoothedScaleRef.current,
            pinchDistance: 0.5,
            handPosition: smoothedPosRef.current,
            fingerCount: 0
          });
        }
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  const toggleCameraFacing = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="relative pointer-events-auto flex flex-col items-end gap-2">
      {/* Top Air Gesture Sensor Toggle */}
      <div className="flex items-center gap-2 bg-black/90 backdrop-blur-md border border-cyan-500/40 px-2.5 py-1.5 rounded-full shadow-[0_0_20px_rgba(41,223,255,0.25)] transition-all">
        <button
          onClick={() => onToggle(!isActive)}
          className={`flex items-center gap-1.5 text-xs font-mono tracking-wider px-3 py-1 rounded-full transition-all ${
            isActive
              ? 'bg-nexa-cyan text-black font-bold shadow-[0_0_12px_#29dfff]'
              : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-700'
          }`}
          title="Air Gesture Control (Touchless Camera Scale)"
        >
          <Hand className="w-3.5 h-3.5 shrink-0" />
          <span>GESTURES:</span>
          <span className="font-bold">{isActive ? (isStarting ? 'STARTING...' : 'ON') : 'OFF'}</span>
        </button>

        {isActive && (
          <>
            <div className="h-4 w-[1px] bg-cyan-500/30" />

            {/* Gesture State Pill */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  isHandVisible ? 'bg-green-400 animate-ping' : 'bg-yellow-500 animate-pulse'
                }`}
              />
              <span className="text-zinc-200">
                {cameraError ? (
                  <span className="text-red-400 flex items-center gap-1 font-sans text-[10px]">
                    <AlertCircle className="w-3 h-3" /> CAM ERROR
                  </span>
                ) : isHandVisible ? (
                  currentGesture === 'OPEN_PALM' ? (
                    <span className="text-cyan-300 font-bold">EXPAND ({scaleDisplay}x)</span>
                  ) : currentGesture === 'PINCH' || currentGesture === 'FIST' ? (
                    <span className="text-amber-300 font-bold">SHRINK ({scaleDisplay}x)</span>
                  ) : (
                    <span className="text-nexa-cyan font-bold">TRACKED ({scaleDisplay}x)</span>
                  )
                ) : (
                  <span className="text-zinc-400">{isStarting ? 'CONNECTING...' : 'SHOW HAND'}</span>
                )}
              </span>
            </div>

            {/* Skeleton / Visual Preview Toggle Button */}
            <button
              onClick={() => setShowSkeletonPreview(prev => !prev)}
              className="p-1 text-zinc-400 hover:text-nexa-cyan rounded transition-colors"
              title={showSkeletonPreview ? 'Hide Preview' : 'Show Preview'}
            >
              {showSkeletonPreview ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            {/* Flip Camera Button */}
            <button
              onClick={toggleCameraFacing}
              className="p-1 text-zinc-400 hover:text-nexa-cyan rounded transition-colors"
              title="Flip Camera"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Real-time 21-Joint Holographic Skeletal / Optical HUD Mini-Window */}
      {isActive && showSkeletonPreview && (
        <div className="relative w-28 h-20 bg-black/85 border border-cyan-500/50 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(41,223,255,0.25)] backdrop-blur-sm">
          <canvas
            ref={skeletonCanvasRef}
            width={160}
            height={120}
            className="w-full h-full block"
          />
          <div className="absolute bottom-1 left-1.5 text-[8px] font-mono text-cyan-300/90 bg-black/75 px-1.5 py-0.5 rounded border border-cyan-500/30">
            {engineMode} // {isHandVisible ? 'LOCKED' : 'SEARCHING'}
          </div>
        </div>
      )}

      {/* 
        Active Off-Screen Video Feed for MediaPipe & Optical Processing.
        MUST NOT use display:none or className="hidden", as browsers suspend 
        frame decoding on hidden video elements! 
      */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '320px',
          height: '240px',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -9999
        }}
      />
    </div>
  );
});
