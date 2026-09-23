import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Hand, RefreshCw, Eye, EyeOff, ShieldCheck, Zap } from 'lucide-react';

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
  const [currentGesture, setCurrentGesture] = useState<string>('IDLE');
  const [scaleDisplay, setScaleDisplay] = useState<number>(1.0);
  const [isHandVisible, setIsHandVisible] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [showSkeletonPreview, setShowSkeletonPreview] = useState<boolean>(true);
  const [engineMode, setEngineMode] = useState<'MEDIAPIPE' | 'OPTICAL'>('MEDIAPIPE');

  const smoothedScaleRef = useRef<number>(1.0);
  const smoothedPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const gestureHistoryRef = useRef<string[]>([]);

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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsHandVisible(false);
    setCurrentGesture('IDLE');
    setScaleDisplay(1.0);
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

    async function initTracking() {
      try {
        // Request Camera Stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 320 },
            height: { ideal: 240 },
            frameRate: { ideal: 30 }
          },
          audio: false
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setHasPermission(true);

        // Check if MediaPipe Hands is loaded from CDN
        const win = window as any;
        if (win.Hands && win.Camera && video) {
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
                await mediaPipeHandsRef.current.send({ image: video });
              }
            },
            width: 640,
            height: 480
          });

          camera.start();
          mediaPipeCameraRef.current = camera;
        } else {
          // Fallback to high-frequency optical motion analysis
          setEngineMode('OPTICAL');
          startOpticalTracking(video);
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setHasPermission(false);
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
        // Draw Bones
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
          // Invert X because camera is mirrored
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
      const thumbMCP = landmarks[2];
      const indexTip = landmarks[8];
      const indexMCP = landmarks[5];
      const middleTip = landmarks[12];
      const middleMCP = landmarks[9];
      const ringTip = landmarks[16];
      const ringMCP = landmarks[13];
      const pinkyTip = landmarks[20];
      const pinkyMCP = landmarks[17];
      const palmCenter = landmarks[9];

      // Hand palm baseline distance (Wrist to Middle MCP)
      const palmSize = Math.max(0.01, Math.hypot(wrist.x - middleMCP.x, wrist.y - middleMCP.y));

      // Extension ratios for each finger (Tip-Wrist distance vs MCP-Wrist distance)
      const ratioIndex = Math.hypot(wrist.x - indexTip.x, wrist.y - indexTip.y) / Math.hypot(wrist.x - indexMCP.x, wrist.y - indexMCP.y);
      const ratioMiddle = Math.hypot(wrist.x - middleTip.x, wrist.y - middleTip.y) / Math.hypot(wrist.x - middleMCP.x, wrist.y - middleMCP.y);
      const ratioRing = Math.hypot(wrist.x - ringTip.x, wrist.y - ringTip.y) / Math.hypot(wrist.x - ringMCP.x, wrist.y - ringMCP.y);
      const ratioPinky = Math.hypot(wrist.x - pinkyTip.x, wrist.y - pinkyTip.y) / Math.hypot(wrist.x - pinkyMCP.x, wrist.y - pinkyMCP.y);

      const isIndexExtended = ratioIndex > 1.20;
      const isMiddleExtended = ratioMiddle > 1.20;
      const isRingExtended = ratioRing > 1.20;
      const isPinkyExtended = ratioPinky > 1.20;

      const extendedCount = (isIndexExtended ? 1 : 0) + (isMiddleExtended ? 1 : 0) + (isRingExtended ? 1 : 0) + (isPinkyExtended ? 1 : 0);

      // Normalized Pinch Distance (Thumb Tip to Index Tip relative to palm size)
      const rawPinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
      const pinchRatio = rawPinchDist / palmSize;

      // 3. Robust Gesture Classification
      const isPointing = isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended;
      const isPinch = pinchRatio < 0.45 && !isPointing;
      const isOpenPalm = extendedCount >= 3;
      const isFist = extendedCount === 0 && pinchRatio >= 0.45;

      let detectedGesture: GestureData['gesture'] = 'IDLE';
      let targetScale = 1.0;

      if (isPointing) {
        detectedGesture = 'POINTING';
        targetScale = smoothedScaleRef.current; // Maintain current zoom
      } else if (isPinch) {
        detectedGesture = 'PINCH';
        // Smoothly shrink scale based on pinch tightness (0.35x - 0.85x)
        const tightness = Math.max(0, Math.min(1.0, pinchRatio / 0.45));
        targetScale = 0.35 + tightness * 0.50;
      } else if (isOpenPalm) {
        detectedGesture = 'OPEN_PALM';
        // Smoothly expand scale based on finger openness (1.35x - 2.50x)
        const avgExtension = (ratioIndex + ratioMiddle + ratioRing + ratioPinky) / 4;
        const spreadFactor = Math.max(0, Math.min(1.0, (avgExtension - 1.20) / 0.50));
        targetScale = 1.35 + spreadFactor * 1.15;
      } else if (isFist) {
        detectedGesture = 'FIST';
        targetScale = 0.45;
      } else {
        detectedGesture = 'IDLE';
        targetScale = 1.0;
      }

      // Gesture Stabilization (Majority Voting Filter across 4 frames to eliminate flicker)
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

      // Smooth Interpolation for Scale
      smoothedScaleRef.current += (targetScale - smoothedScaleRef.current) * 0.25;
      const finalScale = Math.max(0.35, Math.min(2.5, smoothedScaleRef.current));

      // 4. Normalized Hand Position for 3D Camera Tilt (-1 to 1)
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

  // Optical fallback tracking
  const startOpticalTracking = (video: HTMLVideoElement | null) => {
    if (!video) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 160;
    tempCanvas.height = 120;
    const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });

    const loop = () => {
      if (video.readyState >= 2 && ctx) {
        ctx.drawImage(video, 0, 0, 160, 120);
        const data = ctx.getImageData(0, 0, 160, 120).data;
        let skinCount = 0;
        let sumX = 0, sumY = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          if (r > 60 && g > 40 && b > 20 && r > g && r > b && (r - g) > 15) {
            skinCount++;
            sumX += (i / 4) % 160;
            sumY += Math.floor((i / 4) / 160);
          }
        }

        const hasHand = skinCount > 400;
        setIsHandVisible(hasHand);

        if (hasHand) {
          const ratio = skinCount / (160 * 120);
          const target = ratio > 0.14 ? 1.8 : (ratio < 0.05 ? 0.5 : 1.0);
          smoothedScaleRef.current += (target - smoothedScaleRef.current) * 0.2;
          setCurrentGesture(target > 1.2 ? 'OPEN_PALM' : (target < 0.8 ? 'PINCH' : 'IDLE'));
          setScaleDisplay(parseFloat(smoothedScaleRef.current.toFixed(2)));

          onGestureUpdate({
            handDetected: true,
            gesture: target > 1.2 ? 'OPEN_PALM' : 'PINCH',
            scale: smoothedScaleRef.current,
            pinchDistance: 0.5,
            handPosition: { x: ((80 - sumX / skinCount) / 80), y: ((sumY / skinCount - 60) / 60) },
            fingerCount: 5
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
      {/* Top Air Gesture Status Card */}
      <div className="flex items-center gap-2 bg-black/85 backdrop-blur-md border border-nexa-cyan/50 px-3 py-1.5 rounded-full shadow-[0_0_20px_rgba(41,223,255,0.3)] transition-all">
        <button
          onClick={() => onToggle(!isActive)}
          className={`flex items-center gap-1.5 text-xs font-mono tracking-wider px-3 py-1 rounded-full transition-all ${
            isActive
              ? 'bg-nexa-cyan text-black font-bold shadow-[0_0_12px_#29dfff]'
              : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-700'
          }`}
          title="Air Gesture Control (Touchless Camera Scale)"
        >
          <Hand className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AIR GESTURE:</span>
          <span>{isActive ? 'ACTIVE' : 'OFF'}</span>
        </button>

        {isActive && (
          <>
            <div className="h-4 w-[1px] bg-nexa-cyan/30" />

            {/* Gesture State Pill */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  isHandVisible ? 'bg-green-400 animate-ping' : 'bg-yellow-500 animate-pulse'
                }`}
              />
              <span className="text-zinc-200">
                {isHandVisible ? (
                  currentGesture === 'OPEN_PALM' ? (
                    <span className="text-purple-300 font-bold">EXPAND ({scaleDisplay}x)</span>
                  ) : currentGesture === 'PINCH' || currentGesture === 'FIST' ? (
                    <span className="text-amber-300 font-bold">SHRINK ({scaleDisplay}x)</span>
                  ) : (
                    <span className="text-nexa-cyan font-bold">TRACKED ({scaleDisplay}x)</span>
                  )
                ) : (
                  <span className="text-zinc-400">SHOW HAND</span>
                )}
              </span>
            </div>

            {/* Skeleton Toggle Button */}
            <button
              onClick={() => setShowSkeletonPreview(prev => !prev)}
              className="p-1 text-zinc-400 hover:text-nexa-cyan rounded transition-colors"
              title={showSkeletonPreview ? 'Hide Skeleton' : 'Show Skeleton'}
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

      {/* Real-time 21-Joint Holographic Skeletal HUD Overlay */}
      {isActive && showSkeletonPreview && (
        <div className="relative w-28 h-20 bg-black/80 border border-nexa-cyan/40 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(41,223,255,0.2)] backdrop-blur-sm">
          <canvas
            ref={skeletonCanvasRef}
            width={160}
            height={120}
            className="w-full h-full block"
          />
          <div className="absolute bottom-1 left-1.5 text-[8px] font-mono text-nexa-cyan/80 bg-black/60 px-1 rounded">
            {engineMode} 21-JOINT
          </div>
        </div>
      )}

      {/* Hidden Video Feed for MediaPipe Analysis */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
      />
    </div>
  );
});
