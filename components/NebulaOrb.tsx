import React, { useEffect, useRef, useState } from 'react';
import { HUDState } from '../types';
import { GestureData } from './GestureController';

interface Particle {
  baseRadius: number;
  angle: number;
  speed: number;
  height: number;
  heightFreq: number;
  size: number;
  color: string;
  alpha: number;
  zone: 'core_gold' | 'mid_magenta' | 'outer_cyan' | 'far_stars';
}

export interface NexaAgentNode {
  id: string;
  name: string;
  role: string;
  status: string;
  metric: string;
  color: string;
  x: number;
  y: number;
  z: number;
  connections: number[];
  pulseOffset: number;
  activityLevel: number; // 0 to 1
}

interface DataPacket {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
  color: string;
  payloadType: string;
}

interface NebulaOrbProps {
  state: HUDState;
  rotationSpeed?: number;
  audioRef?: React.MutableRefObject<{ vol: number; bass: number; mid: number; treble: number } | null>;
  accentColor?: string;
  ecoMode?: boolean;
  gestureData?: GestureData;
  onSelectAgent?: (agent: NexaAgentNode) => void;
  onResetZoom?: () => void;
}

export const NebulaOrb: React.FC<NebulaOrbProps> = React.memo(({
  state,
  rotationSpeed = 1,
  audioRef,
  accentColor = '#29DFFF',
  ecoMode = false,
  gestureData,
  onSelectAgent,
  onResetZoom
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<number>(0);

  const particlesRef = useRef<Particle[]>([]);
  const agentsRef = useRef<NexaAgentNode[]>([]);
  const packetsRef = useRef<DataPacket[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<NexaAgentNode | null>(null);
  const [isZoomedInUi, setIsZoomedInUi] = useState(false);
  const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(1.0);

  // 3D Camera Angles and Dynamics
  const cameraRef = useRef({
    pitch: 0.28,
    yaw: 0,
    targetPitch: 0.28,
    targetYaw: 0,
    zoom: 1.0,
    targetZoom: 1.0,
    panX: 0,
    panY: 0
  });

  const smoothedAudioRef = useRef({ vol: 0, bass: 0, mid: 0, treble: 0 });
  const touchStartRef = useRef<{ x: number; y: number; dist: number } | null>(null);
  
  const gestureRef = useRef<{ gesture: string; x: number; y: number }>({ gesture: 'IDLE', x: 0, y: 0 });

  // Initialize Galaxy Particles & Real NEXA AI Agents Network
  useEffect(() => {
    const count = ecoMode ? 2500 : 7500;
    const particles: Particle[] = [];

    // Pure Nexa Blue & White Color Palette for realistic sci-fi glow
    const coreColors = ['#FFFFFF', '#E0F2FE', '#BAE6FD'];
    const midColors = ['#29DFFF', '#00F0FF', '#38BDF8', '#7DD3FC'];
    const outerColors = ['#0EA5E9', '#0284C7', '#2563EB', '#1D4ED8'];
    const starColors = ['#FFFFFF', '#F8FAFC', '#CBD5E1'];

    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      let zone: Particle['zone'];
      let baseRadius: number;
      let color: string;
      let size = Math.random() * 0.7 + 0.3; // Much smaller, no "bouncy ball" look
      let heightSpread = 16; // Tighter height spread for an orb shape

      if (rand < 0.28) {
        // Inner Core: White / Cyan Glow
        zone = 'core_gold';
        baseRadius = 15 + Math.pow(Math.random(), 1.4) * 35; // Tighter core
        color = coreColors[Math.floor(Math.random() * coreColors.length)];
        size = Math.random() * 1.0 + 0.5;
        heightSpread = 12;
      } else if (rand < 0.70) {
        // Mid Ring: Nexa Cyan
        zone = 'mid_magenta';
        baseRadius = 50 + Math.pow(Math.random(), 1.3) * 55;
        color = midColors[Math.floor(Math.random() * midColors.length)];
        size = Math.random() * 0.8 + 0.3;
        heightSpread = 20;
      } else if (rand < 0.93) {
        // Outer Vortex: Deep Blue
        zone = 'outer_cyan';
        baseRadius = 100 + Math.pow(Math.random(), 1.2) * 60;
        color = outerColors[Math.floor(Math.random() * outerColors.length)];
        size = Math.random() * 0.6 + 0.2;
        heightSpread = 28;
      } else {
        // Star Halo
        zone = 'far_stars';
        baseRadius = 160 + Math.random() * 80;
        color = starColors[Math.floor(Math.random() * starColors.length)];
        size = Math.random() * 0.5 + 0.2;
        heightSpread = 40;
      }

      particles.push({
        baseRadius,
        angle: Math.random() * Math.PI * 2,
        speed: (0.002 + (1 / (baseRadius * 0.08 + 1)) * 0.004) * (Math.random() > 0.12 ? 1 : -0.6),
        height: Math.acos(2 * Math.random() - 1), // Spherical phi angle (0 to PI)
        heightFreq: 0,
        size,
        color,
        alpha: Math.random() * 0.6 + 0.1,
        zone
      });
    }

    particlesRef.current = particles;

    // Real NEXA AI Agent Nodes connected with thin laser threads (Dhaage)
    // Coords are multiplied by ~0.55 to compress them inside the orb
    const agents: NexaAgentNode[] = [
      {
        id: 'agent_core',
        name: 'NEXA QUANTUM CORE',
        role: 'Central Orchestration & Dispatcher',
        status: 'SYNAPSE SYNC // 100%',
        metric: 'Latency: 2ms • 60 FPS',
        color: '#FFFFFF',
        x: 0,
        y: -5,
        z: 0,
        connections: [1, 2, 3, 4, 5, 6, 7],
        pulseOffset: 0,
        activityLevel: 1.0
      },
      {
        id: 'agent_vision',
        name: 'VISION ANALYZER',
        role: 'Live Camera OCR & Multimodal Feed',
        status: 'MONITORING OPTICAL FEED',
        metric: '30 FPS • 21-Joint Pose',
        color: '#29DFFF',
        x: -90,
        y: -45,
        z: 28,
        connections: [0, 2, 4],
        pulseOffset: 0.15,
        activityLevel: 0.85
      },
      {
        id: 'agent_reasoning',
        name: 'REASONING ENGINE',
        role: 'Gemini 2.0 Flash Deep Thinking',
        status: 'READY FOR PROMPT',
        metric: 'Chain-of-Thought Active',
        color: '#0EA5E9',
        x: -100,
        y: 22,
        z: -17,
        connections: [0, 1, 3],
        pulseOffset: 0.3,
        activityLevel: 0.95
      },
      {
        id: 'agent_voice',
        name: 'VOICE SYNTHESIS',
        role: 'Aoede / Kore Neural Audio TTS',
        status: state === HUDState.SPEAKING ? 'TRANSMITTING AUDIO' : 'AUDIO BUFFER READY',
        metric: '48 kHz • Zero-Latency',
        color: '#BAE6FD',
        x: -60,
        y: 72,
        z: 33,
        connections: [0, 2, 6],
        pulseOffset: 0.45,
        activityLevel: state === HUDState.SPEAKING ? 1.0 : 0.6
      },
      {
        id: 'agent_memory',
        name: 'MEMORY VAULT',
        role: 'Context Cache & User Recollection',
        status: '12 ENTITIES LOADED',
        metric: 'Encrypted Firestore Key',
        color: '#2563EB',
        x: 83,
        y: -66,
        z: 22,
        connections: [0, 1, 5],
        pulseOffset: 0.6,
        activityLevel: 0.75
      },
      {
        id: 'agent_code',
        name: 'CODE COMPILER',
        role: 'Live TypeScript & AST Inspector',
        status: 'ENVIRONMENT STABLE',
        metric: 'Vite HMR • Zero Errors',
        color: '#38BDF8',
        x: 105,
        y: -22,
        z: -22,
        connections: [0, 4, 6],
        pulseOffset: 0.75,
        activityLevel: 0.7
      },
      {
        id: 'agent_tasks',
        name: 'TASK AUTOMATION',
        role: 'Background Schedules & Alarms',
        status: 'DAEMON ACTIVE',
        metric: '0 Pending Alerts',
        color: '#7DD3FC',
        x: 94,
        y: 44,
        z: 17,
        connections: [0, 3, 5, 7],
        pulseOffset: 0.9,
        activityLevel: 0.8
      },
      {
        id: 'agent_security',
        name: 'SECURITY MESH',
        role: '3-Strike Role & Access Firewall',
        status: 'SECURE SESSION',
        metric: 'AES-256 Verified',
        color: '#0284C7',
        x: 22,
        y: 88,
        z: -11,
        connections: [0, 6],
        pulseOffset: 0.5,
        activityLevel: 0.9
      }
    ];

    agentsRef.current = agents;

    // Initial Data Packets streaming along thin threads (Dhaage)
    const packets: DataPacket[] = [];
    agents.forEach((agent, fromIdx) => {
      agent.connections.forEach(toIdx => {
        packets.push({
          fromNode: fromIdx,
          toNode: toIdx,
          progress: Math.random(),
          speed: Math.random() * 0.008 + 0.004,
          color: Math.random() > 0.5 ? '#29DFFF' : '#FFFFFF',
          payloadType: 'DATA_STREAM'
        });
      });
    });
    packetsRef.current = packets;
  }, [ecoMode, state]);

  // Sync Gesture Data (Scale, Air Tilt)
  useEffect(() => {
    if (gestureData && gestureData.handDetected) {
      cameraRef.current.targetZoom = gestureData.scale;
      cameraRef.current.panX = gestureData.handPosition.x * 0.55;
      cameraRef.current.panY = gestureData.handPosition.y * 0.4;
      gestureRef.current = {
        gesture: gestureData.gesture,
        x: gestureData.handPosition.x,
        y: gestureData.handPosition.y
      };
    } else {
      cameraRef.current.panX *= 0.92;
      cameraRef.current.panY *= 0.92;
      gestureRef.current.gesture = 'IDLE';
    }
  }, [gestureData]);

  // Touch and Mouse Handlers for smooth drag & pinch zoom
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
        cameraRef.current.targetYaw += dx * 0.006;
        cameraRef.current.targetPitch += dy * 0.005;
        touchStartRef.current.x = e.touches[0].clientX;
        touchStartRef.current.y = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        if (touchStartRef.current.dist > 0) {
          const factor = currentDist / touchStartRef.current.dist;
          cameraRef.current.targetZoom = Math.max(0.4, Math.min(2.6, cameraRef.current.targetZoom * factor));
        }
        touchStartRef.current.dist = currentDist;
      }
    } else if (e.buttons === 1) {
      const dx = e.clientX - touchStartRef.current.x;
      const dy = e.clientY - touchStartRef.current.y;
      cameraRef.current.targetYaw += dx * 0.006;
      cameraRef.current.targetPitch += dy * 0.005;
      touchStartRef.current.x = e.clientX;
      touchStartRef.current.y = e.clientY;
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY * -0.0015;
    cameraRef.current.targetZoom = Math.max(0.4, Math.min(2.6, cameraRef.current.targetZoom + delta));
  };

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateSize = () => {
      if (containerRef.current && canvas) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);

    const render = (time: number) => {
      if (document.hidden) {
        requestRef.current = requestAnimationFrame(render);
        return;
      }

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, width, height);

      // Audio Smoothing
      const audio = audioRef?.current;
      if (audio) {
        smoothedAudioRef.current.vol += (audio.vol - smoothedAudioRef.current.vol) * 0.2;
        smoothedAudioRef.current.bass += (audio.bass - smoothedAudioRef.current.bass) * 0.25;
        smoothedAudioRef.current.mid += (audio.mid - smoothedAudioRef.current.mid) * 0.2;
        smoothedAudioRef.current.treble += (audio.treble - smoothedAudioRef.current.treble) * 0.2;
      } else {
        smoothedAudioRef.current.vol *= 0.9;
        smoothedAudioRef.current.bass *= 0.9;
        smoothedAudioRef.current.mid *= 0.9;
        smoothedAudioRef.current.treble *= 0.9;
      }

      // Audio values are still smoothed but not used for scaling anymore to keep rotation simple

      // Smooth Camera Transforms
      const cam = cameraRef.current;
      cam.yaw += (cam.targetYaw - cam.yaw) * 0.08;
      cam.pitch += (cam.targetPitch - cam.pitch) * 0.08;
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.12;

      setCurrentZoomLevel(cam.zoom);

      // Auto Continuous Galaxy Orbit Rotation
      let autoSpeed = 0.0022 * rotationSpeed;
      if (state === HUDState.THINKING) autoSpeed *= 2.5;
      if (state === HUDState.SPEAKING) autoSpeed *= 1.6;
      cam.yaw += autoSpeed;

      const currentPitch = cam.pitch + cam.panY;
      const currentYaw = cam.yaw + cam.panX;

      const centerX = width / 2;
      const centerY = height / 2;

      // Dynamic Scale & Zoom Factor
      // Mobile portrait safe dimension
      const baseDim = Math.min(width, height);
      const scaleBase = (baseDim / 540) * cam.zoom;

      // Is User in Zoomed-in Detailed Agent Mode? (Zoom > 1.25x)
      const isZoomedIn = cam.zoom > 1.25;
      const zoomProgress = Math.max(0, Math.min(1.0, (cam.zoom - 1.0) / 0.8));

      if (isZoomedIn !== isZoomedInUi) {
        setIsZoomedInUi(isZoomedIn);
      }

      // =========================================================
      // 1. PROJECT 3D AGENT NODES
      // =========================================================
      const agents = agentsRef.current;
      const projectedAgents: { x: number; y: number; z: number; scale: number; agent: NexaAgentNode; index: number }[] = [];

      agents.forEach((agent, index) => {
        // Expand distance when zoomed in for crystal clear spacing
        const spreadFactor = 1.0 + zoomProgress * 0.45;
        const radX = (agent.x * spreadFactor) * scaleBase;
        const radY = (agent.y * spreadFactor) * scaleBase;
        const radZ = (agent.z * spreadFactor) * scaleBase;

        // 3D Rotation Matrix
        let rx = radX * Math.cos(currentYaw) + radZ * Math.sin(currentYaw);
        let rz = -radX * Math.sin(currentYaw) + radZ * Math.cos(currentYaw);
        let ry = radY * Math.cos(currentPitch) - rz * Math.sin(currentPitch);
        let fz = radY * Math.sin(currentPitch) + rz * Math.cos(currentPitch);

        const fov = 420;
        const scale = fov / (fov + fz);
        const px = centerX + rx * scale;
        const py = centerY + ry * scale;

        projectedAgents.push({ x: px, y: py, z: fz, scale, agent, index });
      });

      // =========================================================
      // 2. DRAW THIN LASER THREADS (DHAAGE) & REAL-TIME DATA PACKETS
      // =========================================================
      ctx.lineWidth = Math.max(0.75, 1.2 * scaleBase * (1 - zoomProgress * 0.3));

      // Render connected thin thread filaments
      projectedAgents.forEach((p1) => {
        p1.agent.connections.forEach((targetIdx) => {
          const p2 = projectedAgents[targetIdx];
          if (p2) {
            const threadAlpha = Math.max(0.15, Math.min(0.65, 0.5 - (p1.z + p2.z) / 1400)) * (0.8 + zoomProgress * 0.4);
            
            // Ultra-thin luminous thread line (Dhaaga) - Pure Nexa Blue & White
            const threadGrad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            threadGrad.addColorStop(0, `rgba(41, 223, 255, ${threadAlpha})`);
            threadGrad.addColorStop(0.5, `rgba(2, 132, 199, ${threadAlpha * 0.9})`);
            threadGrad.addColorStop(1, `rgba(255, 255, 255, ${threadAlpha})`);

            ctx.strokeStyle = threadGrad;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });

      // Render Active Live Data Packets Streaming along Threads
      const packets = packetsRef.current;
      packets.forEach((pkt) => {
        pkt.progress += pkt.speed;
        if (pkt.progress > 1.0) {
          pkt.progress = 0;
        }

        const p1 = projectedAgents[pkt.fromNode];
        const p2 = projectedAgents[pkt.toNode];
        if (p1 && p2) {
          const curX = p1.x + (p2.x - p1.x) * pkt.progress;
          const curY = p1.y + (p2.y - p1.y) * pkt.progress;

          // Packet trailing tail
          const tailProgress = Math.max(0, pkt.progress - 0.08);
          const tailX = p1.x + (p2.x - p1.x) * tailProgress;
          const tailY = p1.y + (p2.y - p1.y) * tailProgress;

          const tailGrad = ctx.createLinearGradient(tailX, tailY, curX, curY);
          tailGrad.addColorStop(0, 'rgba(0,0,0,0)');
          tailGrad.addColorStop(1, pkt.color);

          ctx.strokeStyle = tailGrad;
          ctx.lineWidth = 2.5 * scaleBase;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(curX, curY);
          ctx.stroke();

          // Glowing photon head
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(curX, curY, 1.8 * scaleBase, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // =========================================================
      // 3. VIBRANT 3D MULTI-LAYER NEBULA STARS PARTICLES
      // =========================================================
      ctx.globalCompositeOperation = 'lighter';

      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.angle += p.speed;
        const dynamicR = p.baseRadius * scaleBase;
        
        const theta = p.angle;
        const phi = p.height;

        // Spherical Coordinates to Cartesian
        let px = dynamicR * Math.sin(phi) * Math.cos(theta);
        let pz = dynamicR * Math.sin(phi) * Math.sin(theta);
        let py = dynamicR * Math.cos(phi);

        let rx = px * Math.cos(currentYaw) + pz * Math.sin(currentYaw);
        let rz = -px * Math.sin(currentYaw) + pz * Math.cos(currentYaw);
        let ry = py * Math.cos(currentPitch) - rz * Math.sin(currentPitch);
        let fz = py * Math.sin(currentPitch) + rz * Math.cos(currentPitch);

        const fov = 440;
        const scale = fov / (fov + fz);
        const screenX = centerX + rx * scale;
        const screenY = centerY + ry * scale;

        // When zoomed in, outer particle density softens so agent cards shine clearly
        const densityFade = isZoomedIn ? (1.0 - zoomProgress * 0.35) : 1.0;
        const depthAlpha = Math.max(0.08, Math.min(1.0, scale * p.alpha * densityFade));
        const finalSize = Math.max(0.5, p.size * scale);

        ctx.fillStyle = p.color;
        ctx.globalAlpha = depthAlpha;
        ctx.beginPath();
        ctx.arc(screenX, screenY, finalSize, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;

      // =========================================================
      // 5. AGENT HOLOGRAPHIC CARDS & LIVE TELEMETRY (DYNAMIC ON ZOOM)
      // =========================================================
      ctx.globalCompositeOperation = 'source-over';

      let closestAgentId = null;
      let pointerX = centerX;
      let pointerY = centerY;
      const isPointing = gestureRef.current.gesture === 'POINTING';
      
      if (isPointing && isZoomedIn) {
        pointerX = centerX - gestureRef.current.x * (width / 2);
        pointerY = centerY + gestureRef.current.y * (height / 2);
        
        let minDist = Infinity;
        projectedAgents.forEach((p) => {
          const dist = Math.hypot(p.x - pointerX, p.y - pointerY);
          if (dist < minDist && dist < 120 * scaleBase) {
            minDist = dist;
            closestAgentId = p.agent.id;
          }
        });
        
        ctx.save();
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pointerX, pointerY, 8, 0, Math.PI * 2);
        ctx.moveTo(pointerX - 12, pointerY);
        ctx.lineTo(pointerX + 12, pointerY);
        ctx.moveTo(pointerX, pointerY - 12);
        ctx.lineTo(pointerX, pointerY + 12);
        ctx.stroke();
        ctx.restore();
      }

      projectedAgents.forEach(({ x, y, z, scale, agent }) => {
        const nodeAlpha = Math.max(0.3, Math.min(1.0, 1.0 - z / 600));
        ctx.globalAlpha = nodeAlpha;

        ctx.fillStyle = agent.color;
        ctx.beginPath();
        ctx.arc(x, y, 4 * scaleBase, 0, Math.PI * 2);
        ctx.fill();

        if (isZoomedIn) {
          const isSelected = closestAgentId === agent.id;

          ctx.strokeStyle = isSelected ? '#00F0FF' : '#FFFFFF';
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.beginPath();
          ctx.arc(x, y, (isSelected ? 9 : 7) * scaleBase, 0, Math.PI * 2);
          ctx.stroke();

          const badgeX = x + 14 * scaleBase;
          const badgeY = y - 12 * scaleBase;

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(badgeX, badgeY + 8);
          ctx.stroke();

          if (isSelected) {
            ctx.save();
            const cardAlpha = Math.min(1.0, 0.2 + zoomProgress * 0.8);
            ctx.globalAlpha = cardAlpha * nodeAlpha;
            const cardW = Math.min(180, width * 0.45);
            const cardH = 54;

            ctx.fillStyle = 'rgba(3, 7, 18, 0.92)';
            ctx.strokeStyle = agent.color;
            ctx.lineWidth = 1.5;
            ctx.shadowColor = agent.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY - 10, cardW, cardH, 6);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#22C55E';
            ctx.beginPath();
            ctx.arc(badgeX + 8, badgeY + 2, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.font = '700 11px Rajdhani, sans-serif';
            ctx.fillStyle = agent.color;
            ctx.fillText(agent.name, badgeX + 16, badgeY + 5);

            ctx.font = '500 9px Rajdhani, sans-serif';
            ctx.fillStyle = '#E2E8F0';
            ctx.fillText(agent.role, badgeX + 8, badgeY + 19);

            ctx.font = '600 8.5px Rajdhani, monospace';
            ctx.fillStyle = '#38BDF8';
            ctx.fillText(agent.status, badgeX + 8, badgeY + 31);

            ctx.font = '400 8px Rajdhani, monospace';
            ctx.fillStyle = '#94A3B8';
            ctx.fillText(agent.metric, badgeX + 8, badgeY + 41);
            
            ctx.restore();
          } else {
            ctx.font = '600 10px Rajdhani, monospace';
            const labelWidth = ctx.measureText(agent.name).width;
            const boxW = labelWidth + 14;
            const boxH = 18;

            ctx.fillStyle = 'rgba(4, 8, 16, 0.9)';
            ctx.strokeStyle = agent.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY - 10, boxW, boxH, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(agent.name, badgeX + 7, badgeY + 2);
          }
        }
      });
      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(requestRef.current);
      observer.disconnect();
    };
  }, [state, rotationSpeed, accentColor, ecoMode]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      className="w-full h-full flex items-center justify-center overflow-hidden min-h-0 relative select-none touch-none cursor-grab active:cursor-grabbing"
    >
      <canvas ref={canvasRef} className="block w-full h-full pointer-events-auto" />
    </div>
  );
});

export default NebulaOrb;
