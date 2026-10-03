import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, VRM } from '@pixiv/three-vrm';
import { HUDState } from '../../types';
import { 
  getStoredCustomVRM, 
  saveCustomVRMModel, 
  clearCustomVRMModel, 
  DEFAULT_BUNDLED_AVATAR, 
  VRMModelMeta 
} from './vrmModelStore';
import { NexaHologramAvatar2D } from './NexaHologramAvatar2D';

// In-memory ArrayBuffer cache for the bundled offline VRM model to prevent re-fetching
let cachedBundledBuffer: ArrayBuffer | null = null;

interface NexaAnimeAvatarProps {
  state: HUDState;
  audioRef?: React.MutableRefObject<{ vol: number; bass: number; mid: number; treble: number } | null>;
  accentColor?: string;
  ecoMode?: boolean;
  onOpenModelManager?: () => void;
  lipSyncSensitivity?: number;
}

export const NexaAnimeAvatar: React.FC<NexaAnimeAvatarProps> = ({
  state,
  audioRef,
  accentColor = '#29DFFF',
  ecoMode = false,
  onOpenModelManager,
  lipSyncSensitivity = 1.2
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modelMeta, setModelMeta] = useState<VRMModelMeta>(DEFAULT_BUNDLED_AVATAR);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [renderMode, setRenderMode] = useState<'3D' | '2D'>('3D');
  const [isUploadingVRM, setIsUploadingVRM] = useState<boolean>(false);
  const [vrmNotice, setVrmNotice] = useState<string | null>(null);

  // References for Three.js instance lifecycle
  const vrmRef = useRef<VRM | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameIdRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);
  const isReducedMotionRef = useRef<boolean>(false);

  // Camera framing and auto-fit refs
  const cameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.1, 0));
  const defaultCameraPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.15, 2.15));
  const defaultCameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.1, 0));

  // Dynamic state refs for animation loop
  const stateRef = useRef<HUDState>(state);
  const audioRefLocal = useRef(audioRef);
  const sensitivityRef = useRef<number>(lipSyncSensitivity);
  
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { audioRefLocal.current = audioRef; }, [audioRef]);
  useEffect(() => { sensitivityRef.current = lipSyncSensitivity; }, [lipSyncSensitivity]);

  // Direct .VRM file picker handler
  const handleDirectVRMUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVRM(true);
    setVrmNotice(`Saving & validating "${file.name}"...`);

    try {
      const meta = await saveCustomVRMModel(file);
      setModelMeta(meta);
      cachedBundledBuffer = null;
      setVrmNotice(`✓ Successfully loaded "${meta.title}". Starting 3D...`);
      setRenderMode('3D');
      setRetryCount((c) => c + 1);
      setTimeout(() => setVrmNotice(null), 5000);
    } catch (err: any) {
      console.error('Custom VRM Import Failed:', err);
      setVrmNotice(`VRM error: ${err?.message || 'Could not parse .vrm model'}`);
      setTimeout(() => setVrmNotice(null), 6000);
    } finally {
      setIsUploadingVRM(false);
      e.target.value = '';
    }
  };

  const handleResetToBundled = async () => {
    setIsUploadingVRM(true);
    try {
      await clearCustomVRMModel();
      setModelMeta(DEFAULT_BUNDLED_AVATAR);
      cachedBundledBuffer = null;
      setVrmNotice('Reverted to official bundled avatar.');
      setRetryCount((c) => c + 1);
      setTimeout(() => setVrmNotice(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingVRM(false);
    }
  };

  // Orbit / Touch / Pinch-Zoom controls
  const isDraggingRef = useRef<boolean>(false);
  const previousPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const userRotationRef = useRef<{ y: number; x: number }>({ y: 0, x: 0 });
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistRef = useRef<number>(0);
  const pinchStartZoomRef = useRef<number>(2.15);

  const handlePointerDown = (e: React.PointerEvent) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 1) {
      isDraggingRef.current = true;
      previousPointerRef.current = { x: e.clientX, y: e.clientY };
    } else if (activePointersRef.current.size === 2) {
      isDraggingRef.current = false;
      const pts = Array.from(activePointersRef.current.values());
      pinchStartDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartZoomRef.current = cameraRef.current?.position.z || 2.15;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // 2-finger pinch to zoom on mobile
    if (activePointersRef.current.size === 2 && cameraRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchStartDistRef.current > 10) {
        const factor = pinchStartDistRef.current / Math.max(10, dist);
        const newZ = Math.max(1.1, Math.min(3.5, pinchStartZoomRef.current * factor));
        cameraRef.current.position.z = newZ;
      }
      return;
    }

    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousPointerRef.current.x;
    const deltaY = e.clientY - previousPointerRef.current.y;
    previousPointerRef.current = { x: e.clientX, y: e.clientY };

    // Finger UP -> Avatar looks UP (-deltaY)
    // Finger DOWN -> Avatar looks DOWN (+deltaY)
    // Finger RIGHT -> Avatar looks RIGHT (+deltaX)
    // Finger LEFT -> Avatar looks LEFT (-deltaX)
    userRotationRef.current.y = Math.max(-0.55, Math.min(0.55, userRotationRef.current.y + deltaX * 0.008));
    userRotationRef.current.x = Math.max(-0.40, Math.min(0.40, userRotationRef.current.x - deltaY * 0.007));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size === 0) {
      isDraggingRef.current = false;
    }
  };

  const handleZoom = (deltaZoom: number) => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    const newZ = Math.max(1.1, Math.min(3.5, cam.position.z + deltaZoom));
    cam.position.z = newZ;
  };

  const handlePanY = (deltaY: number) => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    cam.position.y += deltaY;
    if (cameraTargetRef.current) {
      cameraTargetRef.current.y += deltaY;
      cam.lookAt(cameraTargetRef.current);
    }
  };

  const handleResetFit = () => {
    if (cameraRef.current && defaultCameraPosRef.current && defaultCameraTargetRef.current) {
      cameraRef.current.position.copy(defaultCameraPosRef.current);
      cameraTargetRef.current.copy(defaultCameraTargetRef.current);
      cameraRef.current.lookAt(cameraTargetRef.current);
    }
    userRotationRef.current = { y: 0, x: 0 };
  };

  // Helper to fetch bundled model buffer with fallback URLs
  const fetchBundledModelBuffer = async (): Promise<ArrayBuffer> => {
    if (cachedBundledBuffer) {
      return cachedBundledBuffer;
    }

    const candidateUrls = [
      '/models/three-vrm-girl.vrm',
      './models/three-vrm-girl.vrm',
      'models/three-vrm-girl.vrm'
    ];

    if (typeof window !== 'undefined' && window.location.origin) {
      candidateUrls.push(`${window.location.origin}/models/three-vrm-girl.vrm`);
    }

    let lastError: any = null;
    for (const url of candidateUrls) {
      try {
        const response = await fetch(url, {
          headers: { 'Accept': 'model/gltf-binary,application/octet-stream,*/*' }
        });
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          // Verify valid glTF binary header: 0x46546C67 ("glTF")
          if (buffer.byteLength >= 20) {
            const dataView = new DataView(buffer);
            const magic = dataView.getUint32(0, true);
            if (magic === 0x46546C67) {
              cachedBundledBuffer = buffer;
              return buffer;
            }
          }
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw new Error(lastError?.message || 'Could not fetch bundled VRM asset from static paths.');
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let activeCanvas: HTMLCanvasElement | null = canvasRef.current;
    if (!activeCanvas) return;

    let isDisposed = false;
    setIsLoading(true);
    setLoadError(null);

    isReducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Three.js Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera: Portrait view facing female anime character
    const width = Math.max(1, container.clientWidth || 360);
    const height = Math.max(1, container.clientHeight || 480);
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 20.0);
    camera.position.set(0.0, 1.35, 1.32);
    camera.lookAt(0.0, 1.25, 0.0);
    cameraRef.current = camera;

    // 3. Renderer with Mobile Optimization (Clean Untainted Canvas Initialization)
    let renderer: THREE.WebGLRenderer | null = null;

    // Strategy 1: Three.js initialization with hardware antialiasing & high precision
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: activeCanvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
        precision: 'highp',
        stencil: false,
        depth: true,
        failIfMajorPerformanceCaveat: false
      });
    } catch (err1) {
      console.warn('Initial Three.js WebGL attempt failed, replacing with clean canvas:', err1);
      // Strategy 2: If previous canvas had context locks, replace with completely fresh canvas
      if (activeCanvas.parentNode) {
        try {
          const freshCanvas = document.createElement('canvas');
          freshCanvas.className = 'block w-full h-full touch-none';
          activeCanvas.replaceWith(freshCanvas);
          activeCanvas = freshCanvas;

          renderer = new THREE.WebGLRenderer({
            canvas: freshCanvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
            precision: 'highp'
          });
        } catch (err2) {
          console.warn('Second WebGL attempt failed:', err2);
        }
      }
    }

    if (!renderer) {
      console.warn('WebGL currently unavailable in this browser session. Activating 2D HD Anime Companion.');
      setRenderMode('2D');
      setIsLoading(false);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    // 4. Lighting: Ambient + soft directional + cyan neon rim matching Nexa HUD
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(1.0, 2.0, 1.5);
    scene.add(dirLight);

    const rimLight = new THREE.PointLight(new THREE.Color(accentColor), 2.0, 5.0);
    rimLight.position.set(-1.0, 1.5, -0.5);
    scene.add(rimLight);

    // Subtle cyan holographic pedestal
    const pedestalGeometry = new THREE.RingGeometry(0.35, 0.45, 32);
    const pedestalMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(accentColor),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3
    });
    const pedestalMesh = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
    pedestalMesh.rotation.x = -Math.PI / 2;
    pedestalMesh.position.y = 0.02;
    scene.add(pedestalMesh);

    // 5. Load VRM model (Bundled model or user-imported custom model)
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const loadModel = async () => {
      try {
        const customData = await getStoredCustomVRM();
        if (isDisposed) return;

        let bufferToParse: ArrayBuffer;
        if (customData && customData.buffer) {
          bufferToParse = customData.buffer;
          setModelMeta(customData.meta);
        } else {
          bufferToParse = await fetchBundledModelBuffer();
        }

        if (isDisposed) return;

        loader.parse(
          bufferToParse,
          '',
          (gltf: any) => {
            if (isDisposed) {
              VRMUtils.deepDispose(gltf.scene);
              return;
            }

            const vrm = gltf.userData.vrm as VRM;
            if (!vrm) {
              setLoadError('Parsed glTF file does not contain VRM humanoid extensions.');
              setIsLoading(false);
              return;
            }

            // Ensure skinned meshes don't disappear during camera movement (do not alter MToon materials)
            vrm.scene.traverse((obj: any) => {
              if (obj.isMesh) {
                obj.frustumCulled = false;
                obj.castShadow = true;
                obj.receiveShadow = true;
              }
            });

            // Rotate model to face camera
            vrm.scene.rotation.y = Math.PI;
            scene.add(vrm.scene);
            vrmRef.current = vrm;

            // Auto-frame camera dynamically for balanced FULL-BODY with compact, elegant size & generous margins
            // Target Y: 0.68m keeps head cleanly below top header buttons and whole body well-proportioned
            const targetY = 0.68;
            cameraTargetRef.current.set(0.0, targetY, 0.0);
            defaultCameraTargetRef.current.set(0.0, targetY, 0.0);

            // Framing distance (~4.85m - 5.15m) gives compact, cute avatar scaling with ample negative space
            const aspect = width / height;
            let fullBodyDistance = 4.85;
            if (aspect < 0.5) {
              fullBodyDistance = 5.15; // Tall mobile screens (20:9 / 21:9)
            } else if (aspect < 0.65) {
              fullBodyDistance = 4.95;
            }

            if (cameraRef.current) {
              cameraRef.current.position.set(0.0, targetY, fullBodyDistance);
              cameraRef.current.lookAt(cameraTargetRef.current);
              defaultCameraPosRef.current.copy(cameraRef.current.position);
            }

            // Populate metadata directly from the loaded VRM
            if (vrm.meta) {
              const rawMeta = vrm.meta as any;
              setModelMeta({
                title: rawMeta.title || rawMeta.name || 'three-vrm-girl',
                author: rawMeta.author || rawMeta.authors?.[0] || 'pixiv Inc.',
                version: rawMeta.version || '1.1',
                licenseName: rawMeta.licenseName || 'VRoid Hub License (Redistribution Allowed)',
                otherPermissionUrl: rawMeta.otherPermissionUrl || 'https://hub.vroid.com/license',
                allowedUserName: rawMeta.allowedUserName || 'Everyone',
                commercialUsage: rawMeta.commercialUsage || rawMeta.commercialUssageName || 'Allow',
                isCustom: !!(customData && customData.buffer),
                fileSize: '5.4 MB'
              });
            }

            // Initial pose setup
            applyNaturalCompanionPose(vrm, 0, stateRef.current || HUDState.IDLE);

            setIsLoading(false);
            setLoadError(null);
          },
          (err: any) => {
            if (isDisposed) return;
            console.error('Nexa VRM Parse Error:', err);
            setIsLoading(false);
            setLoadError('Failed to parse VRM character model.');
          }
        );
      } catch (err: any) {
        if (!isDisposed) {
          console.error('Nexa VRM Load Error:', err);
          setIsLoading(false);
          setLoadError(err?.message || 'Error loading bundled 3D character.');
        }
      }
    };

    // Helper: Enforce anime companion posture (stable, grounded, hands behind back, interactive gestures)
    const applyNaturalCompanionPose = (targetVrm: VRM, timeVal: number, currentHudState: HUDState) => {
      if (!targetVrm.humanoid) return;

      const breath = Math.sin(timeVal * 2.0) * 0.008; // Subtle vertical chest breathing only (NO pendulum sway)

      // Hips, Spine & Chest: Rock-solid stability, grounded feet, zero left-right pendulum movement
      const hips = targetVrm.humanoid.getNormalizedBoneNode('hips');
      const spine = targetVrm.humanoid.getNormalizedBoneNode('spine');
      const chest = targetVrm.humanoid.getNormalizedBoneNode('chest');
      if (hips) {
        hips.rotation.set(0, 0, 0); // Grounded on pedestal, no pendulum swing
      }
      if (spine) {
        spine.rotation.set(breath, 0, 0); // Vertical breathing only
      }
      if (chest) {
        chest.rotation.set(breath * 0.6, 0, 0);
      }

      const leftUpperArm = targetVrm.humanoid.getNormalizedBoneNode('leftUpperArm');
      const rightUpperArm = targetVrm.humanoid.getNormalizedBoneNode('rightUpperArm');
      const leftLowerArm = targetVrm.humanoid.getNormalizedBoneNode('leftLowerArm');
      const rightLowerArm = targetVrm.humanoid.getNormalizedBoneNode('rightLowerArm');
      const leftHand = targetVrm.humanoid.getNormalizedBoneNode('leftHand');
      const rightHand = targetVrm.humanoid.getNormalizedBoneNode('rightHand');

      // STATE-BASED HAND BEHAVIOR:
      // In IDLE & LISTENING: Hands politely clasped behind her back (Ushirode pose)
      // In SPEAKING: Expressive conversational arm gesture
      // In THINKING: Hand to chin/cheek pondering gesture
      if (currentHudState === HUDState.SPEAKING) {
        // Left arm stays polite behind/beside back
        if (leftUpperArm) leftUpperArm.rotation.set(-0.18, 0.10, 1.30);
        if (leftLowerArm) leftLowerArm.rotation.set(0.20, 0.30, 0.65);
        if (leftHand) leftHand.rotation.set(0.12, 0.20, 0.20);

        // Right arm gestures expressively during speech
        const speakPulse = Math.sin(timeVal * 5.0) * 0.08;
        if (rightUpperArm) rightUpperArm.rotation.set(0.35 + speakPulse, -0.12, -0.75);
        if (rightLowerArm) rightLowerArm.rotation.set(0.55, -0.25, -0.35);
        if (rightHand) rightHand.rotation.set(0.15, -0.15, -0.10);
      } else if (currentHudState === HUDState.THINKING) {
        // Left arm behind back
        if (leftUpperArm) leftUpperArm.rotation.set(-0.20, 0.10, 1.32);
        if (leftLowerArm) leftLowerArm.rotation.set(0.20, 0.30, 0.65);
        if (leftHand) leftHand.rotation.set(0.12, 0.20, 0.20);

        // Right arm comes up to cheek/chin in cute pondering gesture
        if (rightUpperArm) rightUpperArm.rotation.set(0.80, -0.18, -0.45);
        if (rightLowerArm) rightLowerArm.rotation.set(1.35, -0.25, -0.20);
        if (rightHand) rightHand.rotation.set(0.25, 0.10, -0.10);
      } else {
        // IDLE & LISTENING: Hands held gracefully and steadily behind back
        if (leftUpperArm) {
          leftUpperArm.rotation.set(-0.22, 0.10, 1.34);
        }
        if (rightUpperArm) {
          rightUpperArm.rotation.set(-0.22, -0.10, -1.34);
        }
        if (leftLowerArm) {
          leftLowerArm.rotation.set(0.20, 0.32, 0.68);
        }
        if (rightLowerArm) {
          rightLowerArm.rotation.set(0.20, -0.32, -0.68);
        }
        if (leftHand) {
          leftHand.rotation.set(0.12, 0.20, 0.25);
        }
        if (rightHand) {
          rightHand.rotation.set(0.12, -0.20, -0.25);
        }
      }

      // FINGERS: Soft feminine relaxed curl applied every frame
      const fingerNames = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'] as const;
      const joints = ['Proximal', 'Intermediate', 'Distal'] as const;

      for (const side of ['left', 'right'] as const) {
        const sign = side === 'left' ? 1 : -1;

        for (const f of fingerNames) {
          for (const j of joints) {
            let bone = targetVrm.humanoid.getNormalizedBoneNode(`${side}${f}${j}` as any);
            if (!bone && f === 'Thumb' && j === 'Intermediate') {
              bone = targetVrm.humanoid.getNormalizedBoneNode(`${side}ThumbMetacarpal` as any);
            }

            if (bone) {
              if (f === 'Thumb') {
                const bend = j === 'Proximal' ? 0.22 : 0.28;
                bone.rotation.set(0.16, 0.12 * sign, bend * sign);
              } else {
                const depth = f === 'Little' ? 0.12 : f === 'Ring' ? 0.08 : f === 'Middle' ? 0.04 : 0.0;
                const curlZ = (j === 'Proximal' ? 0.38 : 0.46) + depth;
                bone.rotation.set(0.08, 0.02 * sign, curlZ * sign);
              }
            }
          }
        }
      }
    };

    loadModel();

    // 6. Animation Loop (60 FPS Native Smooth Rendering)
    let lastRenderTime = 0;
    const clock = new THREE.Clock();

    let blinkTimer = 0;
    let blinkDuration = 0.15;
    let nextBlinkTime = 3.0;
    let currentMouthOpen = 0;

    const animate = (timestamp: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      if (!isVisibleRef.current || isDisposed) return;

      // When ecoMode is enabled, cap at 30 FPS for battery saving. Otherwise, run at smooth 60 FPS!
      if (ecoMode) {
        const elapsedSinceLast = timestamp - lastRenderTime;
        if (elapsedSinceLast < 33.3) return;
        lastRenderTime = timestamp;
      }

      const delta = Math.min(0.05, clock.getDelta());
      const time = clock.getElapsedTime();
      const vrm = vrmRef.current;

      if (vrm) {
        const currentState = stateRef.current;
        const audio = audioRefLocal.current?.current;
        const sensitivity = sensitivityRef.current || 1.2;
        const reducedMotion = isReducedMotionRef.current;

        // Apply companion posture: hands behind back in idle, interactive in speech/thinking
        if (!reducedMotion) {
          applyNaturalCompanionPose(vrm, time, currentState);
        }

        // 2. Head Tilt & Rotation Based on Assistant State + User Drag Orbit + Idle Shoe Glance
        if (vrm.humanoid) {
          const head = vrm.humanoid.getNormalizedBoneNode('head');

          if (head) {
            let targetTiltX = userRotationRef.current.x;
            let targetTiltY = userRotationRef.current.y;
            let targetTiltZ = 0;

            if (!reducedMotion) {
              if (currentState === HUDState.LISTENING) {
                targetTiltZ = -0.06; // Subtle attentive ear-tilt towards user
                targetTiltX += 0.03;
              } else if (currentState === HUDState.THINKING) {
                targetTiltY += 0.08; // Pondering glance away
                targetTiltX -= 0.05; // Pondering look up
              } else if (currentState === HUDState.SPEAKING) {
                targetTiltX += Math.sin(time * 7.5) * 0.022; // Gentle rhythmic speaking nod
              }
            }

            head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, targetTiltX, 0.1);
            head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetTiltY, 0.1);
            head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, targetTiltZ, 0.1);
          }
        }

        // 3. Natural Blinking
        blinkTimer += delta;
        let blinkWeight = 0;
        if (blinkTimer >= nextBlinkTime) {
          const blinkProgress = (blinkTimer - nextBlinkTime) / blinkDuration;
          if (blinkProgress <= 0.5) {
            blinkWeight = blinkProgress * 2.0;
          } else if (blinkProgress <= 1.0) {
            blinkWeight = (1.0 - blinkProgress) * 2.0;
          } else {
            blinkTimer = 0;
            nextBlinkTime = 2.5 + Math.random() * 3.5;
          }
        }

        // 4. Amplitude-Based Lip-Sync from Outgoing Playback Audio Only
        const isSpeaking = currentState === HUDState.SPEAKING || (currentState === HUDState.LIVE && (audio?.vol || 0) > 0.015);
        let targetMouth = 0;

        if (isSpeaking && audio) {
          const rawVol = Math.max(0, audio.vol || 0);
          targetMouth = Math.min(1.0, rawVol * 2.8 * sensitivity);
        }

        // Smooth mouth movement; snap closed immediately on stop/silence
        if (targetMouth > 0.02) {
          currentMouthOpen = THREE.MathUtils.lerp(currentMouthOpen, targetMouth, 0.35);
        } else {
          currentMouthOpen = THREE.MathUtils.lerp(currentMouthOpen, 0.0, 0.5);
          if (currentMouthOpen < 0.01) currentMouthOpen = 0.0;
        }

        // 5. Update VRM Expressions
        if (vrm.expressionManager) {
          vrm.expressionManager.setValue('blink', blinkWeight);
          vrm.expressionManager.setValue('aa', currentMouthOpen);
          vrm.expressionManager.setValue('oh', currentMouthOpen * 0.3);

          let happyVal = 0.15; // Natural subtle companion smile
          let angryVal = 0;
          let relaxedVal = 0;
          let surprisedVal = 0;

          if (currentState === HUDState.WARNING || currentState === HUDState.GLITCH) {
            angryVal = 0.7;
            happyVal = 0;
          } else if (currentState === HUDState.LISTENING) {
            relaxedVal = 0.4;
          } else if (currentState === HUDState.THINKING) {
            surprisedVal = 0.15;
          }

          vrm.expressionManager.setValue('happy', happyVal);
          vrm.expressionManager.setValue('angry', angryVal);
          vrm.expressionManager.setValue('relaxed', relaxedVal);
          vrm.expressionManager.setValue('surprised', surprisedVal);

          vrm.expressionManager.update();
        }

        vrm.update(delta);
      }

      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // 7. Responsive Resizing
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;

      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 8. Visibility Change (Pause rendering when app is backgrounded)
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Dispose all resources on unmount
    return () => {
      isDisposed = true;
      cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (vrmRef.current) {
        VRMUtils.deepDispose(vrmRef.current.scene);
        vrmRef.current = null;
      }

      scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m: any) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        rendererRef.current = null;
      }
    };
  }, [ecoMode, accentColor, retryCount]);

  if (renderMode === '2D') {
    return (
      <NexaHologramAvatar2D
        state={state}
        audioRef={audioRef}
        accentColor={accentColor}
        ecoMode={ecoMode}
        onOpenModelManager={onOpenModelManager}
        onRetryWebGL={() => {
          setRenderMode('3D');
          setRetryCount((c) => c + 1);
        }}
        onTriggerFileSelect={() => fileInputRef.current?.click()}
        activeModelMeta={modelMeta}
        isCustomModel={modelMeta.isCustom}
        onResetToDefault={handleResetToBundled}
        vrmNotice={vrmNotice}
        isUploadingVRM={isUploadingVRM}
        lipSyncSensitivity={lipSyncSensitivity}
      />
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative flex items-center justify-center overflow-hidden touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Hidden File Input for Native VRM File Selection */}
      <input 
        ref={fileInputRef} 
        type="file" 
        accept=".vrm" 
        onChange={handleDirectVRMUpload} 
        className="hidden" 
      />

      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Floating Notice / Toast */}
      {vrmNotice && (
        <div className="absolute top-14 z-50 px-4 py-2 rounded-xl bg-black/90 backdrop-blur-md border border-nexa-cyan/80 text-nexa-cyan text-xs font-mono font-bold text-center shadow-[0_0_20px_rgba(41,223,255,0.4)] animate-bounce">
          {vrmNotice}
        </div>
      )}

      {/* Top Header & Avatar Controls Bar (Pinned Left to leave Right completely open for Air Gesture Sensor) */}
      <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-1.5 max-w-[calc(100%-145px)] pointer-events-auto">
        <div 
          onClick={onOpenModelManager}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-nexa-cyan/40 text-nexa-cyan text-[10px] font-mono hover:bg-nexa-cyan/20 transition-all cursor-pointer shadow-sm group"
          title="Character details and settings"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-nexa-cyan animate-pulse"></span>
          <span className="font-semibold tracking-wider uppercase max-w-[95px] truncate">{modelMeta.title}</span>
          <span className="text-[8px] text-zinc-400 group-hover:text-white">⚙</span>
        </div>

        <button
          onClick={handleResetFit}
          className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-zinc-400 hover:text-white text-[10px] font-mono transition-colors flex items-center justify-center"
          title="Reset Camera View"
        >
          ↺
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingVRM}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-nexa-cyan/20 hover:bg-nexa-cyan/35 border border-nexa-cyan text-nexa-cyan text-[10px] font-mono font-bold shadow-[0_0_10px_rgba(41,223,255,0.25)] transition-all cursor-pointer"
          title="Import downloaded .vrm anime character file"
        >
          <span>📂</span>
          <span>{isUploadingVRM ? '...' : 'LOAD .VRM'}</span>
        </button>

        <button
          onClick={() => setRenderMode('2D')}
          className="px-2 py-1 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-[9px] font-mono transition-colors"
          title="Switch to 2D HD Anime Mode"
        >
          🎨 2D
        </button>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-nexa-cyan/20 border-t-nexa-cyan animate-spin"></div>
            <div className="w-8 h-8 rounded-full border border-dashed border-nexa-cyan/40 animate-spin-reverse-slow"></div>
          </div>
          <div className="mt-4 text-xs font-mono font-bold tracking-widest text-nexa-cyan uppercase animate-pulse">
            INITIALIZING 3D ANIME COMPANION...
          </div>
          <div className="text-[9px] font-mono text-zinc-400 mt-1">
            Loading Three-VRM Bundled Asset
          </div>
        </div>
      )}

      {/* Error Notice */}
      {loadError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/85 backdrop-blur-md text-center pointer-events-auto">
          <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 mb-3 text-lg font-mono">
            ⚠
          </div>
          <div className="text-sm font-mono font-bold text-red-400 tracking-wider mb-1">
            AVATAR LOAD NOTICE
          </div>
          <p className="text-xs text-zinc-300 max-w-sm mb-4 font-mono leading-relaxed">
            {loadError}
          </p>
          <button
            onClick={() => {
              setLoadError(null);
              setIsLoading(true);
              cachedBundledBuffer = null;
              setRetryCount(c => c + 1);
            }}
            className="px-3.5 py-1.5 rounded-full bg-nexa-cyan/20 border border-nexa-cyan text-nexa-cyan hover:bg-nexa-cyan/30 text-xs font-mono font-bold transition-all shadow-sm"
          >
            RETRY LOADING AVATAR
          </button>
        </div>
      )}
    </div>
  );
};

export default NexaAnimeAvatar;
