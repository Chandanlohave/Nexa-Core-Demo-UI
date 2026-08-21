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
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.6
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
            width: 320,
            height: 240
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

      // 2. Exact Landmark Distance Calculations
      const wrist = landmarks[0];
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];
      const palmCenter = landmarks[9];

      // Pinch Distance: Thumb Tip (4) to Index Tip (8)
      const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

      // Distance from wrist to each fingertip (Hand Spread / Openness)
      const dThumb = Math.hypot(wrist.x - thumbTip.x, wrist.y - thumbTip.y);
      const dIndex = Math.hypot(wrist.x - indexTip.x, wrist.y - indexTip.y);
      const dMiddle = Math.hypot(wrist.x - middleTip.x, wrist.y - middleTip.y);
      const dRing = Math.hypot(wrist.x - ringTip.x, wrist.y - ringTip.y);
      const dPinky = Math.hypot(wrist.x - pinkyTip.x, wrist.y - pinkyTip.y);

      const avgFingerSpread = (dThumb + dIndex + dMiddle + dRing + dPinky) / 5;

      const isPointing = dIndex > 0.4 && dMiddle < 0.28 && dRing < 0.28 && dPinky < 0.28;

      // 3. Gesture Classification & Dynamic Scaling
      let targetScale = 1.0;
      let gestureType: GestureData['gesture'] = 'IDLE';

      if (isPointing) {
        targetScale = smoothedScaleRef.current; // Keep scale as is
        gestureType = 'POINTING';
      } else if (pinchDist < 0.08) {
        // Active Pinch Gesture -> Instant Smooth Shrink (0.35x - 0.7x)
        targetScale = 0.35 + (pinchDist / 0.08) * 0.35;
        gestureType = 'PINCH';
      } else if (avgFingerSpread > 0.48) {
        // Open Palm Spread -> Dramatic Nebula Expansion (1.4x - 2.5x)
        const spreadFactor = Math.min(1.0, (avgFingerSpread - 0.48) / 0.28);
        targetScale = 1.3 + spreadFactor * 1.2;
        gestureType = 'OPEN_PALM';
      } else if (avgFingerSpread < 0.26) {
        // Tight Closed Fist -> Collapse Core (0.4x - 0.6x)
        targetScale = 0.45;
        gestureType = 'FIST';
      } else {
        // Intermediate Natural Hand
        targetScale = 1.0 + (avgFingerSpread - 0.36) * 2.2;
        gestureType = targetScale > 1.15 ? 'OPEN_PALM' : (targetScale < 0.85 ? 'PINCH' : 'IDLE');
      }

      // Smooth Interpolation
      smoothedScaleRef.current += (targetScale - smoothedScaleRef.current) * 0.28;
      const finalScale = Math.max(0.35, Math.min(2.5, smoothedScaleRef.current));

      // 4. Normalized Hand Position for 3D Camera Tilt (-1 to 1)
      const normX = (0.5 - palmCenter.x) * 2; // Inverted for mirror
      const normY = (palmCenter.y - 0.5) * 2;
      smoothedPosRef.current.x += (normX - smoothedPosRef.current.x) * 0.25;
      smoothedPosRef.current.y += (normY - smoothedPosRef.current.y) * 0.25;

      setCurrentGesture(gestureType);
      setScaleDisplay(parseFloat(finalScale.toFixed(2)));

      onGestureUpdate({
        handDetected: true,
        gesture: gestureType,
        scale: finalScale,
        pinchDistance: pinchDist,
        handPosition: smoothedPosRef.current,
        fingerCount: gestureType === 'OPEN_PALM' ? 5 : (gestureType === 'PINCH' ? 2 : 0)
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
