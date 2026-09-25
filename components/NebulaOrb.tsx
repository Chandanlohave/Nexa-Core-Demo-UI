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

interface CoreParticle {
  theta: number;
  phi: number;
  size: number;
  speedOffset: number;
  blinkOffset: number;
  randomPhase: number;
  color?: string;
  category?: MemoryCategory;
  categoryLabel?: string;
  text?: string;
  timestamp?: number;
  connections?: number[];
}

const adjustColor = (color: string, amount: number) => {
  return '#' + color.replace(/^#/, '').replace(/../g, c => ('0'+Math.min(255, Math.max(0, parseInt(c, 16) + amount)).toString(16)).substr(-2));
};

const getThemeColors = (state: HUDState, coreColor: string) => {
  if (state === HUDState.WARNING) return ['#FF0000', '#FF3333', '#800000']; 
  if (state === HUDState.GLITCH) return ['#8B0000', '#000000', '#FF0000'];
  if (state === HUDState.LIVE || state === HUDState.WATCHING) return ['#10B981', '#059669', '#34D399'];
  if (state === HUDState.REPAIRING) return ['#FFFFFF', '#E2E8F0', '#94A3B8'];
  if (state === HUDState.CODING) return ['#10B981', '#059669', '#047857']; 

  const primary = coreColor || '#29DFFF';
  const secondary = '#00F0FF';
  const tertiary = '#38BDF8';
  return [primary, secondary, tertiary, '#22D3EE', '#7DD3FC'];
};

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

export type MemoryCategory = 'PERSONAL' | 'TECH' | 'BUSINESS' | 'SYSTEM';

export interface MemoryParticleNode {
  id: string;
  text: string;
  role: 'user' | 'model' | 'system';
  category: MemoryCategory;
  color: string;
  categoryLabel: string;
  timestamp: number;
  theta: number;
  phi: number;
  baseRadius: number;
  speed: number;
  size: number;
  connections: number[];
}

export const categorizeMemory = (msg: any): {
  category: MemoryCategory;
  color: string;
  categoryLabel: string;
} => {
  const text = (msg?.text || msg?.content || msg?.message || '').toLowerCase();
  const role = msg?.role || '';
  
  // TECH: Code, dev, APIs, TypeScript, bugs, system architecture, engineering
  if (
    text.includes('code') || text.includes('bug') || text.includes('error') || 
    text.includes('api') || text.includes('typescript') || text.includes('python') || 
    text.includes('compiler') || text.includes('phoenix') || text.includes('dev') || 
    text.includes('func') || text.includes('const ') || text.includes('import ') || 
    text.includes('git') || text.includes('database') || text.includes('schema') ||
    text.includes('component') || text.includes('react')
  ) {
    return { category: 'TECH', color: '#10B981', categoryLabel: 'TECH' };
  }

  // BUSINESS: Strategy, ROI, market, finance, revenue, milestones, projects, tasks
  if (
    text.includes('business') || text.includes('market') || text.includes('finance') || 
    text.includes('money') || text.includes('client') || text.includes('strategy') || 
    text.includes('task') || text.includes('plan') || text.includes('target') || 
    text.includes('project') || text.includes('roi') || text.includes('sales') ||
    text.includes('budget') || text.includes('growth') || text.includes('schedule')
  ) {
    return { category: 'BUSINESS', color: '#F59E0B', categoryLabel: 'BUSINESS' };
  }

  // PERSONAL: User queries, profile, identity, Chandan, preferences, family
  if (
    role === 'user' ||
    text.includes('chandan') || text.includes('name') || text.includes('personal') || 
    text.includes('family') || text.includes('lohave') || text.includes('remember') || 
    text.includes('user') || text.includes('preference') || text.includes('live') || 
    text.includes('home') || text.includes('about me') || text.includes('who am i') ||
    text.includes('identity') || text.includes('profile') || text.includes('habit')
  ) {
    return { category: 'PERSONAL', color: '#29DFFF', categoryLabel: 'PERSONAL' };
  }

  // SYSTEM: NEXA core consciousness & system - Prominently Electric Cyan with Purple Accents
  if (text.length % 2 === 0) {
    return { category: 'SYSTEM', color: '#00E5FF', categoryLabel: 'NEXA CORE' };
  }
  return { category: 'SYSTEM', color: '#A855F7', categoryLabel: 'SYSTEM' };
};

interface DataPacket {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
  color: string;
  payloadType: string;
}

interface SynapticSignal {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
  color: string;
  payloadType: string;
  signalStrength: number;
  direction: 'outward' | 'inward' | 'internal';
}

interface NebulaOrbProps {
  state: HUDState;
  rotationSpeed?: number;
  audioRef?: React.MutableRefObject<{ vol: number; bass: number; mid: number; treble: number } | null>;
  accentColor?: string;
  ecoMode?: boolean;
  gestureData?: GestureData;
  activeHighlightAgentId?: string | null;
  customAgents?: NexaAgentNode[];
  messages?: any[];
  onSelectAgent?: (agent: NexaAgentNode) => void;
  onResetZoom?: () => void;
}

const NebulaOrbComponent: React.FC<NebulaOrbProps> = ({
  state,
  rotationSpeed = 1,
  audioRef,
  accentColor = '#29DFFF',
  ecoMode = false,
  gestureData,
  activeHighlightAgentId,
  customAgents = [],
  messages = [],
  onSelectAgent,
  onResetZoom
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<number>(0);

  const lastTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const coreParticlesRef = useRef<CoreParticle[]>([]);
  const coreRotRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const agentsRef = useRef<NexaAgentNode[]>([]);
  const packetsRef = useRef<DataPacket[]>([]);

  // Real-Time Memory Particle Constellation System
  const memoryNodesRef = useRef<MemoryParticleNode[]>([]);
  const memoryPacketsRef = useRef<SynapticSignal[]>([]);
  const [isMemoryOrbExpanded, setIsMemoryOrbExpanded] = useState<boolean>(false);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });
  const [activeMemoryNode, setActiveMemoryNode] = useState<{
    categoryLabel: string;
    category: MemoryCategory;
    color: string;
    text: string;
    timestamp?: number;
  } | null>(null);
  const lastHoveredMemIdRef = useRef<string | null>(null);

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
    // Optimized particle count for stable, buttery 60 FPS across all devices
    const count = ecoMode ? 100 : 250;
    const particles: Particle[] = [];
    
    const isLive = state === HUDState.LIVE || state === HUDState.WATCHING;

    // Pure Nexa Blue & White Color Palette for realistic sci-fi glow
    const coreColors = isLive ? ['#FFFFFF', '#ECFCCB', '#D9F99D'] : ['#FFFFFF', '#E0F2FE', '#BAE6FD'];
    const midColors = isLive ? ['#84CC16', '#65A30D', '#A3E635', '#BEF264'] : ['#29DFFF', '#00F0FF', '#38BDF8', '#7DD3FC'];
    const outerColors = isLive ? ['#4D7C0F', '#3F6212', '#166534', '#15803D'] : ['#0EA5E9', '#0284C7', '#2563EB', '#1D4ED8'];
    const starColors = isLive ? ['#FFFFFF', '#F7FEE7', '#E4F8B8'] : ['#FFFFFF', '#F8FAFC', '#CBD5E1'];

    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      let zone: Particle['zone'];
      let baseRadius: number;
      let color: string;
      let size = Math.random() * 0.6 + 0.2; // Sleek micro dust
      let heightSpread = 12;

      if (rand < 0.38) {
        // Tight Inner Reactor Core (Enlarged)
        zone = 'core_gold';
        baseRadius = 10 + Math.pow(Math.random(), 1.4) * 40;
        color = coreColors[Math.floor(Math.random() * coreColors.length)];
        size = Math.random() * 1.1 + 0.4;
        heightSpread = 16;
      } else if (rand < 0.72) {
        // Core Halo
        zone = 'mid_magenta';
        baseRadius = 40 + Math.pow(Math.random(), 1.3) * 45;
        color = midColors[Math.floor(Math.random() * midColors.length)];
        size = Math.random() * 0.7 + 0.3;
        heightSpread = 22;
      } else if (rand < 0.92) {
        // Outer Core Dust
        zone = 'outer_cyan';
        baseRadius = 50 + Math.pow(Math.random(), 1.2) * 35;
        color = outerColors[Math.floor(Math.random() * outerColors.length)];
        size = Math.random() * 0.5 + 0.2;
        heightSpread = 22;
      } else {
        // Far Space Stars (Very faint)
        zone = 'far_stars';
        baseRadius = 90 + Math.random() * 110;
        color = starColors[Math.floor(Math.random() * starColors.length)];
        size = Math.random() * 0.4 + 0.15;
        heightSpread = 35;
      }

      particles.push({
        baseRadius,
        angle: Math.random() * Math.PI * 2,
        speed: (0.002 + (1 / (baseRadius * 0.08 + 1)) * 0.004) * (Math.random() > 0.12 ? 1 : -0.6),
        height: Math.acos(2 * Math.random() - 1),
        heightFreq: 0,
        size,
        color,
        alpha: Math.random() * 0.45 + 0.1,
        zone
      });
    }

    particlesRef.current = particles;

    // Real NEXA AI 6-Agent Network connected with thin laser threads (Enlarged Hexagon Spacing)
    const agents: NexaAgentNode[] = [
      {
        id: 'agent_core',
        name: 'NEXA QUANTUM CORE',
        role: 'Central Dispatcher',
        status: 'SYNAPSE SYNC // 100%',
        metric: 'Latency: 2ms • 60 FPS',
        color: '#FFFFFF',
        x: 0,
        y: 0,
        z: 0,
        connections: [1, 2, 3, 4, 5, 6],
        pulseOffset: 0,
        activityLevel: 1.0
      },
      {
        id: 'agent_kronos',
        name: 'KRONOS',
        role: 'Business Analytics & Strategy Engine',
        status: 'ANALYTICS ENGINE // ONLINE',
        metric: 'Accuracy: 99.8% • 1.2M Datapoints/sec',
        color: '#F59E0B',
        x: 0,
        y: -160,
        z: 10,
        connections: [0, 2, 6],
        pulseOffset: 0.1,
        activityLevel: 0.95
      },
      {
        id: 'agent_cypher',
        name: 'CYPHER',
        role: 'Code Compiler & AST Debugger',
        status: 'COMPILER CORE // OPTIMAL',
        metric: 'Vite HMR Active • Zero AST Errors',
        color: '#10B981',
        x: 138,
        y: -80,
        z: -10,
        connections: [0, 1, 3],
        pulseOffset: 0.25,
        activityLevel: 0.9
      },
      {
        id: 'agent_aura',
        name: 'AURA',
        role: 'Multimodal Vision AI & Optical Feed',
        status: 'VISION SENSOR // ACTIVE',
        metric: '30 FPS Optical • 21-Joint Pose',
        color: '#A855F7',
        x: 138,
        y: 80,
        z: 15,
        connections: [0, 2, 4],
        pulseOffset: 0.4,
        activityLevel: 0.85
      },
      {
        id: 'agent_veritas',
        name: 'VERITAS',
        role: 'Deep Web Research & Fact-Checker',
        status: 'SEARCH GROUNDING // CONNECTED',
        metric: '100+ Live Sources',
        color: '#EC4899',
        x: 0,
        y: 160,
        z: -10,
        connections: [0, 3, 5],
        pulseOffset: 0.55,
        activityLevel: 0.92
      },
      {
        id: 'agent_echo',
        name: 'ECHO',
        role: 'Task Automation & Priorities Engine',
        status: 'TASK DAEMON // RUNNING',
        metric: 'Priority Queue Ready',
        color: '#F97316',
        x: -138,
        y: 80,
        z: 10,
        connections: [0, 4, 6],
        pulseOffset: 0.7,
        activityLevel: 0.88
      },
      {
        id: 'agent_valkyrie',
        name: 'VALKYRIE',
        role: 'System Security & Access Firewall',
        status: 'FIREWALL MESH // SECURE',
        metric: '100% Secure • AES-256 Encrypted',
        color: '#EF4444',
        x: -138,
        y: -80,
        z: -15,
        connections: [0, 1, 5],
        pulseOffset: 0.85,
        activityLevel: 0.98
      }
    ];

    // Merge custom sub-agents into 3D orbit dynamically
    if (customAgents && customAgents.length > 0) {
      customAgents.forEach((ca, idx) => {
        const angle = ((idx + 1) * Math.PI * 2) / (customAgents.length + 1);
        const radius = 220;
        agents.push({
          ...ca,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          z: (idx % 2 === 0 ? 1 : -1) * 25,
          connections: [0, 1, (idx % 6) + 1]
        });
      });
    }

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
  }, [ecoMode, state, customAgents]);

  // Initialize 3D Spherical Core Memory Particles (Exact Classic Aesthetics & 60 FPS)
  useEffect(() => {
    const msgCount = messages ? messages.length : 0;
    // Core orb particle count matching Classic view (200 normal, 120 eco for pure 60FPS)
    const targetCount = ecoMode ? 120 : 200;
    const particles: CoreParticle[] = [];

    for (let i = 0; i < targetCount; i++) {
      const msg = msgCount > 0 ? messages[i % msgCount] : null;
      // Prominently Electric Blue (55%+) with Tech Emerald, Business Amber & System Purple Accents
      const blueShades = ['#29DFFF', '#00E5FF', '#38BDF8'];
      const defaultCat = (
        i % 4 === 0 || i % 4 === 2 
          ? { category: 'PERSONAL' as const, color: blueShades[i % blueShades.length], categoryLabel: 'NEXA CORE' } :
        i % 4 === 1 
          ? { category: 'TECH' as const, color: '#10B981', categoryLabel: 'TECH' } :
        (i % 8 === 3 
          ? { category: 'BUSINESS' as const, color: '#F59E0B', categoryLabel: 'BUSINESS' } 
          : { category: 'SYSTEM' as const, color: '#A855F7', categoryLabel: 'SYSTEM' }
        )
      );
      const cat = msg ? categorizeMemory(msg) : defaultCat;

      particles.push({
        theta: Math.random() * 2 * Math.PI,
        phi: Math.acos(2 * Math.random() - 1),
        size: Math.random() * 1.5 + 0.6,
        speedOffset: (0.001 + Math.random() * 0.002) * (i % 2 === 0 ? 1 : -1),
        blinkOffset: Math.random() * 100,
        randomPhase: Math.random() * Math.PI * 2,
        color: cat.color,
        category: cat.category,
        categoryLabel: cat.categoryLabel,
        text: msg ? String(msg.text || msg.content || '') : '',
        timestamp: msg ? Number(msg.timestamp || Date.now()) : Date.now()
      });
    }

    coreParticlesRef.current = particles;
  }, [ecoMode, state, customAgents, messages]);

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

      const now = performance.now();
      const dt = lastTimeRef.current > 0 ? Math.min(0.04, (now - lastTimeRef.current) / 1000) : 0.016;
      lastTimeRef.current = now;
      const timeScale = dt * 60; // Exact normalized 60 FPS multiplier

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, width, height);

      // Audio Smoothing with timeScale normalization
      const audio = audioRef?.current;
      if (audio) {
        smoothedAudioRef.current.vol += (audio.vol - smoothedAudioRef.current.vol) * Math.min(1, 0.22 * timeScale);
        smoothedAudioRef.current.bass += (audio.bass - smoothedAudioRef.current.bass) * Math.min(1, 0.28 * timeScale);
        smoothedAudioRef.current.mid += (audio.mid - smoothedAudioRef.current.mid) * Math.min(1, 0.22 * timeScale);
        smoothedAudioRef.current.treble += (audio.treble - smoothedAudioRef.current.treble) * Math.min(1, 0.22 * timeScale);
      } else {
        const decay = Math.pow(0.9, timeScale);
        smoothedAudioRef.current.vol *= decay;
        smoothedAudioRef.current.bass *= decay;
        smoothedAudioRef.current.mid *= decay;
        smoothedAudioRef.current.treble *= decay;
      }

      // Smooth Camera Transforms
      const cam = cameraRef.current;
      cam.yaw += (cam.targetYaw - cam.yaw) * Math.min(1, 0.09 * timeScale);
      cam.pitch += (cam.targetPitch - cam.pitch) * Math.min(1, 0.09 * timeScale);
      cam.zoom += (cam.targetZoom - cam.zoom) * Math.min(1, 0.12 * timeScale);

      setCurrentZoomLevel(cam.zoom);

      // Auto Continuous Galaxy Orbit Rotation
      let autoSpeed = 0.0022 * rotationSpeed;
      if (state === HUDState.THINKING) autoSpeed *= 2.2;
      if (state === HUDState.SPEAKING) autoSpeed *= 1.5;
      cam.yaw += autoSpeed * timeScale;

      const currentPitch = cam.pitch + cam.panY;
      const currentYaw = cam.yaw + cam.panX;

      const centerX = width / 2;
      const centerY = height / 2;

      // Dynamic Scale & Zoom Factor
      const baseDim = Math.min(width, height);
      const scaleBase = (baseDim / 540) * cam.zoom;

      // Is User in Zoomed-in Detailed Agent Mode? (Zoom > 1.25x)
      const isZoomedIn = cam.zoom > 1.25;
      const zoomProgress = Math.max(0, Math.min(1.0, (cam.zoom - 1.0) / 0.8));

      if (isZoomedIn !== isZoomedInUi) {
        setIsZoomedInUi(isZoomedIn);
      }

      // Responsive Orbit Scale for spacious, well-proportioned agent hexagon without clipping
      const responsiveOrbitScale = Math.min(0.95, Math.max(0.70, (width - 30) / 410));

      // Theme detection for proper light vs dark rendering
      const isDarkMode = document.documentElement.classList.contains('dark');

      // =========================================================
      // 0. SCI-FI HUD BACKGROUND & VOLUMETRIC SPATIAL GLOW
      // =========================================================
      ctx.save();
      
      const isListeningMode = state === HUDState.LISTENING;
      const isLiveMode = state === HUDState.LIVE;
      const listenPulse = isListeningMode ? Math.sin(time * 0.005) * 0.5 + 0.5 : 0;
      
      // Dynamic Background Radial Gradient (Tailored for Dark / Light mode)
      const bgGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.85);
      if (isDarkMode) {
        if (isListeningMode) {
          bgGlow.addColorStop(0, `rgba(6, 182, 212, ${0.18 + listenPulse * 0.10})`);
          bgGlow.addColorStop(0.35, `rgba(16, 185, 129, ${0.08 + listenPulse * 0.05})`);
          bgGlow.addColorStop(0.65, 'rgba(3, 105, 161, 0.03)');
          bgGlow.addColorStop(1, 'rgba(2, 6, 23, 0.96)');
        } else if (isLiveMode) {
          bgGlow.addColorStop(0, 'rgba(16, 185, 129, 0.14)');
          bgGlow.addColorStop(0.35, 'rgba(5, 150, 105, 0.07)');
          bgGlow.addColorStop(0.65, 'rgba(4, 120, 87, 0.02)');
          bgGlow.addColorStop(1, 'rgba(2, 6, 23, 0.96)');
        } else {
          bgGlow.addColorStop(0, 'rgba(41, 223, 255, 0.10)');
          bgGlow.addColorStop(0.35, 'rgba(6, 182, 212, 0.04)');
          bgGlow.addColorStop(0.65, 'rgba(3, 105, 161, 0.01)');
          bgGlow.addColorStop(1, 'rgba(2, 6, 23, 0.96)');
        }
      } else {
        // Crisp, clean luminous light mode matching NEXA clean canvas
        if (isListeningMode) {
          bgGlow.addColorStop(0, 'rgba(207, 250, 254, 0.45)');
          bgGlow.addColorStop(0.4, 'rgba(240, 249, 255, 0.20)');
          bgGlow.addColorStop(1, 'rgba(255, 255, 255, 1.0)');
        } else if (isLiveMode) {
          bgGlow.addColorStop(0, 'rgba(220, 252, 231, 0.40)');
          bgGlow.addColorStop(0.4, 'rgba(240, 249, 255, 0.20)');
          bgGlow.addColorStop(1, 'rgba(255, 255, 255, 1.0)');
        } else {
          bgGlow.addColorStop(0, 'rgba(224, 247, 250, 0.40)');
          bgGlow.addColorStop(0.4, 'rgba(240, 249, 255, 0.15)');
          bgGlow.addColorStop(1, 'rgba(255, 255, 255, 1.0)');
        }
      }

      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);

      // Cyber Matrix Background Dot Grid
      ctx.fillStyle = isDarkMode ? 'rgba(41, 223, 255, 0.06)' : 'rgba(41, 223, 255, 0.22)';
      const gridSpacing = Math.max(36, Math.floor(width / 16));
      for (let gx = (centerX % gridSpacing); gx < width; gx += gridSpacing) {
        for (let gy = (centerY % gridSpacing); gy < height; gy += gridSpacing) {
          ctx.fillRect(gx, gy, 1.2, 1.2);
        }
      }

      // Tactical HUD Compass Radar Rings
      const hudRings = [140 * scaleBase, 220 * scaleBase, 310 * scaleBase];
      hudRings.forEach((r, idx) => {
        ctx.strokeStyle = isDarkMode
          ? (idx === 1 ? 'rgba(41, 223, 255, 0.18)' : 'rgba(41, 223, 255, 0.08)')
          : (idx === 1 ? 'rgba(41, 223, 255, 0.35)' : 'rgba(41, 223, 255, 0.18)');
        ctx.lineWidth = 1;
        ctx.setLineDash(idx === 0 ? [6, 12] : idx === 1 ? [2, 8] : [1, 15]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Tactical HUD Axis Crosshairs
      ctx.strokeStyle = isDarkMode ? 'rgba(41, 223, 255, 0.08)' : 'rgba(41, 223, 255, 0.22)';
      ctx.lineWidth = 1;
      const coreRBase = Math.max(48, Math.min(width * 0.16, 75)) * scaleBase;
      const coreAvoidR = coreRBase * 1.35;
      const armLen = 380 * scaleBase;
      ctx.beginPath();
      ctx.moveTo(centerX - armLen, centerY); ctx.lineTo(centerX - coreAvoidR, centerY);
      ctx.moveTo(centerX + coreAvoidR, centerY); ctx.lineTo(centerX + armLen, centerY);
      ctx.moveTo(centerX, centerY - armLen); ctx.lineTo(centerX, centerY - coreAvoidR);
      ctx.moveTo(centerX, centerY + coreAvoidR); ctx.lineTo(centerX, centerY + armLen);
      ctx.stroke();

      // Corner Telemetry HUD Labels
      ctx.font = '600 9px Rajdhani, monospace';
      ctx.fillStyle = isDarkMode ? 'rgba(41, 223, 255, 0.28)' : 'rgba(15, 23, 42, 0.55)';
      ctx.textAlign = 'left';
      ctx.fillText('SYS.MATRIX // v5.2', 16, 24);
      ctx.fillText('6/6 AGENTS SYNCED', 16, 36);

      ctx.textAlign = 'right';
      ctx.fillText('LATENCY: 1.2ms', width - 16, 24);
      ctx.fillText('60 FPS // SYNAPSE', width - 16, 36);
      ctx.restore();

      // =========================================================
      // 1. PROJECT 3D AGENT NODES
      // =========================================================
      const agents = agentsRef.current;
      const projectedAgents: { x: number; y: number; z: number; scale: number; agent: NexaAgentNode; index: number }[] = [];

      agents.forEach((agent, index) => {
        const spreadFactor = 1.0 + zoomProgress * 0.45;
        const radX = (agent.x * responsiveOrbitScale * spreadFactor) * scaleBase;
        const radY = (agent.y * responsiveOrbitScale * spreadFactor) * scaleBase;
        const radZ = (agent.z * responsiveOrbitScale * spreadFactor) * scaleBase;

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
      // 2. DRAW 3D STARDUST GALAXY PARTICLES (Fast & Silky 60FPS)
      // =========================================================
      ctx.save();
      ctx.globalCompositeOperation = isDarkMode ? 'lighter' : 'source-over';

      const particles = particlesRef.current;
      const isVoiceActive = state === HUDState.SPEAKING || state === HUDState.LIVE || state === HUDState.WATCHING;
      const audioExpansion = isVoiceActive ? (smoothedAudioRef.current.vol * 35) : 0;
      const densityFade = isZoomedIn ? (1.0 - zoomProgress * 0.35) : 1.0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.angle += p.speed * timeScale;

        const dynamicR = (p.baseRadius + (audioExpansion * Math.random())) * scaleBase;
        const theta = p.angle;
        const phi = p.height;

        let px = dynamicR * Math.sin(phi) * Math.cos(theta);
        let pz = dynamicR * Math.sin(phi) * Math.sin(theta);
        let py = dynamicR * Math.cos(phi);

        let rx = px * Math.cos(currentYaw) + pz * Math.sin(currentYaw);
        let rz = -px * Math.sin(currentYaw) + pz * Math.cos(currentYaw);
        let ry = py * Math.cos(currentPitch) - rz * Math.sin(currentPitch);
        let fz = py * Math.sin(currentPitch) + rz * Math.cos(currentPitch);

        const fov = 420;
        const scale = fov / (fov + fz);
        const screenX = centerX + rx * scale;
        const screenY = centerY + ry * scale;

        const depthAlpha = Math.max(0.04, Math.min(0.75, scale * p.alpha * densityFade * (isDarkMode ? 1.0 : 0.75)));
        const audioSizeBoost = isVoiceActive ? (smoothedAudioRef.current.bass * 1.2 * Math.random()) : 0;
        const finalSize = Math.max(0.35, (p.size + audioSizeBoost) * scale);

        // Adjust white particles in light mode so they shine as bright glowing cyan stardust
        let particleColor = p.color;
        if (!isDarkMode && (particleColor === '#FFFFFF' || particleColor === '#F8FAFC')) {
          particleColor = '#38BDF8';
        }

        ctx.fillStyle = particleColor;
        ctx.globalAlpha = depthAlpha;
        ctx.beginPath();
        ctx.arc(screenX, screenY, finalSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // =========================================================
      // 3. DRAW THIN LASER THREADS, RADIAL CORE RAYS & DATA PACKETS
      // =========================================================
      ctx.lineWidth = Math.max(0.75, 1.2 * scaleBase * (1 - zoomProgress * 0.3));
      const isLiveNow = state === HUDState.LIVE || state === HUDState.WATCHING;

      // A. Radial Laser Lines connecting Central Core Outer Edge to each Sub-Agent
      const coreR = Math.max(52, Math.min(width * 0.14, 68)) * scaleBase;
      const pulseBoost = Math.sin(time * 0.001) * 1.5 * scaleBase;
      const activeCoreR = coreR + pulseBoost;

      projectedAgents.forEach(({ x, y, agent, index }) => {
        if (index === 0) return;
        const isHighlighted = activeHighlightAgentId === agent.id;

        const angle = Math.atan2(y - centerY, x - centerX);
        const startR = activeCoreR * 1.05;
        const startX = centerX + Math.cos(angle) * startR;
        const startY = centerY + Math.sin(angle) * startR;

        const lineGrad = ctx.createLinearGradient(startX, startY, x, y);
        lineGrad.addColorStop(0, 'rgba(41, 223, 255, 0.45)');
        lineGrad.addColorStop(1, isHighlighted ? agent.color : `${agent.color}66`);

        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = (isHighlighted ? 2.0 : 1.0) * scaleBase;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();
      });

      // B. Inter-agent Filament Connection Threads
      projectedAgents.forEach((p1) => {
        if (p1.index === 0) return;
        p1.agent.connections.forEach((targetIdx) => {
          if (targetIdx === 0) return;
          const p2 = projectedAgents[targetIdx];
          if (p2) {
            let threadAlpha = Math.max(0.10, Math.min(0.50, 0.40 - (p1.z + p2.z) / 1500)) * (0.8 + zoomProgress * 0.4);
            if (state === HUDState.SPEAKING || isLiveNow) {
              threadAlpha = Math.min(0.8, threadAlpha + smoothedAudioRef.current.vol * 0.35);
            }
            
            const threadGrad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            if (isLiveNow) {
              threadGrad.addColorStop(0, `rgba(16, 185, 129, ${threadAlpha})`);
              threadGrad.addColorStop(0.5, `rgba(5, 150, 105, ${threadAlpha * 0.8})`);
              threadGrad.addColorStop(1, `rgba(52, 211, 153, ${threadAlpha})`);
            } else {
              threadGrad.addColorStop(0, `rgba(41, 223, 255, ${threadAlpha})`);
              threadGrad.addColorStop(0.5, `rgba(14, 165, 233, ${threadAlpha * 0.8})`);
              threadGrad.addColorStop(1, `rgba(56, 189, 248, ${threadAlpha})`);
            }

            ctx.strokeStyle = threadGrad;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });

      // =========================================================
      // 4. 3D HOLOGRAPHIC QUANTUM CORE ORB & DYNAMIC AGENT TAKEOVER
      // =========================================================
      ctx.save();
      ctx.translate(centerX, centerY);

      // Determine active highlighted sub-agent for Core Takeover
      const activeAgent = (activeHighlightAgentId || selectedAgent?.id)
        ? agentsRef.current.find(a => a.id === activeHighlightAgentId || a.name === activeHighlightAgentId || a.id === selectedAgent?.id)
        : null;

      // Determine Dynamic Core Color Theme & Labels
      let coreColor = '#29DFFF'; // Default NEXA Signature Electric Cyan
      let coreTitle = 'NEXA CORE';
      let coreStatus = '● ONLINE';

      if (activeHighlightAgentId === 'agent_core') {
        coreColor = '#29DFFF';
        coreTitle = 'NEXA (CORE)';
        coreStatus = '● SQUAD ORCHESTRATOR';
      } else if (activeAgent) {
        coreColor = activeAgent.color;
        coreTitle = activeAgent.name;
        coreStatus = `● ${activeAgent.role.toUpperCase()}`;
      } else if (state === HUDState.LIVE) {
        coreColor = '#10B981'; // Neon Emerald
        coreTitle = 'LIVE MODE';
        coreStatus = '● SYNCED';
      } else if (state === HUDState.LISTENING) {
        coreColor = '#06B6D4'; // Cyan-Teal
        coreTitle = 'LISTENING...';
        coreStatus = '● VOICE COMMAND';
      }

      // A. Volumetric Outer Plasma Glow Field (Subtle, refined glow)
      const outerGlowR = activeCoreR * 1.35;
      const outerGlowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, outerGlowR);
      outerGlowGrad.addColorStop(0, isDarkMode ? `${coreColor}20` : `${coreColor}14`);
      outerGlowGrad.addColorStop(0.35, isDarkMode ? `${coreColor}0C` : `${coreColor}06`);
      outerGlowGrad.addColorStop(0.7, isDarkMode ? `${coreColor}03` : `${coreColor}02`);
      outerGlowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = outerGlowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, outerGlowR, 0, Math.PI * 2);
      ctx.fill();

      // A1. Continuous Expanding Core Shockwaves (Soft, elegant pulses)
      for (let i = 0; i < 3; i++) {
        const waveProgress = ((time * 0.00015) + i * 0.33) % 1;
        const waveRadius = activeCoreR * 0.85 + waveProgress * (100 * scaleBase);
        const waveAlpha = Math.max(0, (1 - waveProgress) * (isDarkMode ? 0.16 : 0.12));

        ctx.strokeStyle = coreColor;
        ctx.globalAlpha = waveAlpha;
        ctx.lineWidth = Math.max(0.5, (1.1 - waveProgress * 0.7) * scaleBase);
        ctx.beginPath();
        ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // B. CONCENTRIC CIRCULAR ROUND RINGS AROUND THE ORB WITH PULSE ANIMATION
      // Dynamic Pulse Wave (breathing rhythm + audio bass reaction)
      const pulseCycle = Math.sin(time * 0.0028);
      const ringPulse = 1.0 + (pulseCycle * 0.075) + (smoothedAudioRef.current.bass * 0.15);
      const pulseGlow = Math.max(0.65, 0.85 + Math.sin(time * 0.0035) * 0.25);

      // Ring 1: Inner Concentric Round Ring - CLOCKWISE ROTATION
      const r1 = activeCoreR * 1.25 * ringPulse;
      ctx.save();
      ctx.rotate(time * 0.0006); // Smooth Clockwise Rotation
      ctx.strokeStyle = isDarkMode ? `rgba(41, 223, 255, ${0.80 * pulseGlow})` : `rgba(2, 132, 199, ${0.85 * pulseGlow})`;
      ctx.lineWidth = 1.6 * scaleBase;
      ctx.shadowColor = coreColor;
      ctx.shadowBlur = isDarkMode ? 12 * pulseGlow : 4;
      // High-tech sci-fi segmented dashes matching HUD aesthetic
      ctx.setLineDash([20 * scaleBase, 10 * scaleBase, 6 * scaleBase, 10 * scaleBase]);
      ctx.beginPath();
      ctx.arc(0, 0, r1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ring 1 Orbiting Photon Node (traversing Clockwise)
      const orbAngle1 = time * 0.0012;
      const orbX1 = Math.cos(orbAngle1) * r1;
      const orbY1 = Math.sin(orbAngle1) * r1;
      ctx.fillStyle = isDarkMode ? '#FFFFFF' : '#00E5FF';
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(orbX1, orbY1, 3.2 * scaleBase, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Ring 2: Outer Concentric Round Ring - ANTICLOCKWISE / COUNTER-CLOCKWISE ROTATION
      const r2 = activeCoreR * 1.48 * ringPulse;
      ctx.save();
      ctx.rotate(-time * 0.0005); // Smooth Anti-Clockwise Rotation
      ctx.strokeStyle = isDarkMode ? `rgba(255, 255, 255, ${0.75 * pulseGlow})` : `rgba(14, 165, 233, ${0.85 * pulseGlow})`;
      ctx.lineWidth = 1.4 * scaleBase;
      ctx.shadowColor = isDarkMode ? '#FFFFFF' : '#0284C7';
      ctx.shadowBlur = isDarkMode ? 8 * pulseGlow : 3;
      // Precision arc dashes
      ctx.setLineDash([32 * scaleBase, 14 * scaleBase, 4 * scaleBase, 14 * scaleBase]);
      ctx.beginPath();
      ctx.arc(0, 0, r2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ring 2 Orbiting Photon Node (traversing Anti-Clockwise)
      const orbAngle2 = -time * 0.0010 + Math.PI;
      const orbX2 = Math.cos(orbAngle2) * r2;
      const orbY2 = Math.sin(orbAngle2) * r2;
      ctx.fillStyle = coreColor;
      ctx.shadowColor = coreColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(orbX2, orbY2, 3.5 * scaleBase, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // C. Rotating Precision Aperture HUD Ring
      ctx.save();
      ctx.rotate(time * 0.0002);
      const tickCount = 36;
      ctx.strokeStyle = `${coreColor}99`;
      ctx.lineWidth = 1.0 * scaleBase;
      for (let i = 0; i < tickCount; i++) {
        const angle = (i * Math.PI * 2) / tickCount;
        const innerRadius = activeCoreR * 1.08;
        const outerRadius = activeCoreR * (i % 3 === 0 ? 1.18 : 1.13);
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
        ctx.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
        ctx.stroke();
      }
      ctx.restore();

      // D. MASTER SPECIFICATION: 3D PARTICLE HUD SYSTEM (IRIS EDITION)
      let speedMultiplier = rotationSpeed || 1;
      if (state === HUDState.SPEAKING) speedMultiplier *= 1.4;
      if (state === HUDState.THINKING) speedMultiplier *= 2.2;
      if (state === HUDState.LIVE || state === HUDState.WATCHING) speedMultiplier *= 3.0;
      if (state === HUDState.GLITCH) speedMultiplier *= 4.0;

      const { vol, bass, mid, treble } = smoothedAudioRef.current;

      // Audio-Reactive Frequency Modulation with timeScale
      coreRotRef.current.y += (0.003 + mid * 0.008) * speedMultiplier * timeScale;
      coreRotRef.current.x += (0.001 + treble * 0.004) * speedMultiplier * timeScale;

      // GLITCH Jitter
      let glitchOffsetX = 0, glitchOffsetY = 0;
      if (state === HUDState.GLITCH) {
        glitchOffsetX = (Math.random() - 0.5) * 8;
        glitchOffsetY = (Math.random() - 0.5) * 8;
      }

      const baseRadius = activeCoreR * 0.88;
      const globalExpansion = Math.sin(time * 0.002) * (baseRadius * 0.08);
      const coreAudioExpansion = bass * (baseRadius * 0.35);

      const colors = getThemeColors(state, coreColor);
      const glowColor = colors[0];
      const glowSize = baseRadius * 1.3 + (vol * baseRadius * 0.6);

      // Central Radial Glow Gradient (Soft, controlled halo)
      const coreGrad = ctx.createRadialGradient(glitchOffsetX, glitchOffsetY, baseRadius * 0.2, 0, 0, glowSize);
      coreGrad.addColorStop(0, isDarkMode ? `${glowColor}18` : `${glowColor}10`);
      coreGrad.addColorStop(0.5, isDarkMode ? `${glowColor}06` : `${glowColor}03`);
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = coreGrad;
      ctx.fillRect(-glowSize, -glowSize, glowSize * 2, glowSize * 2);

      // 3D Spherical Particle Shell Projection with Classic Aesthetics & 60 FPS
      ctx.save();
      ctx.globalCompositeOperation = isDarkMode ? 'lighter' : 'source-over';

      const coreParticles = coreParticlesRef.current;
      const projCoreParticles: { x: number; y: number; z2: number; scale: number; alpha: number; radius: number; p: CoreParticle; index: number }[] = [];

      for (let i = 0; i < coreParticles.length; i++) {
        const p = coreParticles[i];
        let shake = treble * 2.5 * Math.sin(time * 0.1 + i);
        if (state === HUDState.GLITCH) shake *= 4;

        const individualPulse = Math.sin((time * 0.002) + p.randomPhase) * 4;
        const r = baseRadius + globalExpansion + individualPulse + coreAudioExpansion;

        let rotX = r * Math.sin(p.phi) * Math.cos(p.theta + coreRotRef.current.y);
        let rotZ = r * Math.sin(p.phi) * Math.sin(p.theta + coreRotRef.current.y);
        let rotY = r * Math.cos(p.phi);

        rotX += shake;
        rotY += shake;

        let y2 = rotY * Math.cos(coreRotRef.current.x) - rotZ * Math.sin(coreRotRef.current.x);
        let z2 = rotY * Math.sin(coreRotRef.current.x) + rotZ * Math.cos(coreRotRef.current.x);

        const scale = 300 / (300 + z2);
        const blink = Math.sin(time * 0.005 + p.blinkOffset);
        const brightness = 0.6 + blink * 0.4 + (vol * 1.5);
        const alpha = scale * scale * brightness;

        const screenX = rotX * scale + glitchOffsetX;
        const screenY = y2 * scale + glitchOffsetY;
        const radius = Math.max(0.4, p.size * scale);

        projCoreParticles.push({ x: screenX, y: screenY, z2, scale, alpha, radius, p, index: i });
      }

      // A. Delicate Synaptic Interconnecting Filaments & Moving Neural Impulses (Exact Classic Algorithm)
      for (let i = 0; i < projCoreParticles.length; i++) {
        const item1 = projCoreParticles[i];
        const nextIdx = (i + 1) % projCoreParticles.length;
        const item2 = projCoreParticles[nextIdx];
        if (item2 && Math.abs(item1.z2 - item2.z2) < 45) {
          let lineAlpha = Math.max(0.04, Math.min(0.25, 0.18 - (item1.z2 + item2.z2) / 1200));
          if (state === HUDState.SPEAKING) lineAlpha = Math.min(0.65, lineAlpha * (1.3 + vol * 2.0));
          if (isMemoryOrbExpanded) lineAlpha = Math.min(0.90, lineAlpha * 2.2);

          ctx.strokeStyle = item1.p.color || '#29DFFF';
          ctx.globalAlpha = lineAlpha;
          ctx.lineWidth = (isMemoryOrbExpanded ? 1.0 : 0.6) * scaleBase;
          ctx.beginPath();
          ctx.moveTo(item1.x, item1.y);
          ctx.lineTo(item2.x, item2.y);
          ctx.stroke();

          // Synaptic Action Potential Electrical Spark (Slowed down to smooth, natural neural impulse speed)
          const sparkProgress = (time * 0.00032 * (state === HUDState.SPEAKING ? 1.35 : 1.0) + i * 0.18) % 1;
          const sparkX = item1.x + (item2.x - item1.x) * sparkProgress;
          const sparkY = item1.y + (item2.y - item1.y) * sparkProgress;

          ctx.fillStyle = '#FFFFFF';
          ctx.globalAlpha = Math.min(1.0, lineAlpha * 2.2);
          ctx.beginPath();
          ctx.arc(sparkX, sparkY, 1.2 * scaleBase, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // B. Draw Clean Memory Hub Category Core Particles
      let hoveredParticle: { x: number; y: number; p: CoreParticle } | null = null;
      let minHoverDist = 20;

      projCoreParticles.forEach((item) => {
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);

        if (state === HUDState.GLITCH && Math.random() > 0.8) {
          ctx.fillStyle = '#000000';
        } else {
          ctx.fillStyle = item.p.color || '#29DFFF';
        }

        ctx.globalAlpha = Math.min(1, Math.max(0.06, item.alpha * (isDarkMode ? 1.0 : 0.85)));
        ctx.fill();

        // Mouse Hover Check (Offset by central translation)
        const canvasMouseX = mousePosRef.current.x - centerX;
        const canvasMouseY = mousePosRef.current.y - centerY;
        const dist = Math.hypot(item.x - canvasMouseX, item.y - canvasMouseY);
        if (dist < minHoverDist) {
          minHoverDist = dist;
          hoveredParticle = { x: item.x, y: item.y, p: item.p };
        }
      });
      ctx.restore();

      // D. Send Hovered Particle Tag to Side Window (Keeping central orb completely clear & pristine)
      const foundHover = hoveredParticle as { x: number; y: number; p: CoreParticle } | null;
      if (foundHover && foundHover.p && foundHover.p.text) {
        if (lastHoveredMemIdRef.current !== foundHover.p.text) {
          lastHoveredMemIdRef.current = foundHover.p.text;
          setActiveMemoryNode({
            categoryLabel: foundHover.p.categoryLabel || 'SYSTEM',
            category: foundHover.p.category || 'SYSTEM',
            color: foundHover.p.color || '#29DFFF',
            text: foundHover.p.text,
            timestamp: foundHover.p.timestamp
          });
        }
      }

      // E. Central Typography & Overlay (Exact Classic Layout)
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;

      let mainTextColor = colors[0];
      const fontSize = Math.max(16, baseRadius * 0.32);

      ctx.font = `700 ${fontSize}px Rajdhani, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = isDarkMode ? mainTextColor : 'rgba(41, 223, 255, 0.6)';
      ctx.shadowBlur = isDarkMode ? (15 + (vol * 20)) : 8;
      ctx.fillStyle = isDarkMode ? '#FFFFFF' : '#0284C7';

      let displayText = (activeHighlightAgentId === 'agent_core' || !activeAgent) ? "N.E.X.A." : coreTitle;
      if (state === HUDState.GLITCH) {
        const glitchChars = "!@#$%^&*()_+";
        if (Math.random() > 0.7) displayText = "ERROR";
        if (Math.random() > 0.9) displayText = glitchChars.substring(0, 4);
      }

      ctx.fillText(displayText, glitchOffsetX, glitchOffsetY);
      ctx.shadowBlur = 0;

      if (rotationSpeed > 0) {
        ctx.font = '700 10px Rajdhani, monospace';
        // @ts-ignore
        ctx.letterSpacing = '3px';
        ctx.fillStyle = isDarkMode ? '#29DFFF' : '#0284C7';

        let statusText = state === HUDState.IDLE ? 'ONLINE' : (state === HUDState.LISTENING ? 'LISTENING' : (state === HUDState.THINKING ? 'THINKING' : (state === HUDState.SPEAKING ? 'SPEAKING' : state)));
        if (state === HUDState.REPAIRING) statusText = "SELF REPAIR";
        if (state === HUDState.SAFEMODE) statusText = "SAFE MODE";
        if (state === HUDState.GLITCH) statusText = "SYSTEM FAILURE";
        if (ecoMode) statusText += " [ECO]";

        const textShakeX = (Math.random() - 0.5) * bass * 4;
        const textShakeY = (Math.random() - 0.5) * bass * 4;

        ctx.fillText(statusText, textShakeX + glitchOffsetX, fontSize * 0.75 + 10 + textShakeY + glitchOffsetY);
        // @ts-ignore
        ctx.letterSpacing = '0px';
      }
      ctx.restore();

      // F. Concentric Audio Waveform Spectrum Rings (Perfectly centered around 0, 0)
      const isAudioActive = state === HUDState.SPEAKING || state === HUDState.LISTENING || state === HUDState.LIVE;
      if (isAudioActive) {
        ctx.save();
        const audioVol = smoothedAudioRef.current.vol || (0.35 + Math.sin(time * 0.01) * 0.2);
        const eqBars = 36;
        const innerEqR = activeCoreR * 1.5;

        for (let i = 0; i < eqBars; i++) {
          const angle = (i * Math.PI * 2) / eqBars;
          const freqAmp = Math.sin(time * 0.008 + i * 0.4) * 0.5 + 0.5;
          const barHeight = (6 + freqAmp * 20 * audioVol) * scaleBase;

          const x1 = Math.cos(angle) * innerEqR;
          const y1 = Math.sin(angle) * innerEqR;
          const x2 = Math.cos(angle) * (innerEqR + barHeight);
          const y2 = Math.sin(angle) * (innerEqR + barHeight);

          ctx.strokeStyle = `${coreColor}AA`;
          ctx.lineWidth = 1.4 * scaleBase;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.restore();

      // Render Active Live Data Packets Streaming along Threads
      const packets = packetsRef.current;
      packets.forEach((pkt) => {
        pkt.progress += pkt.speed * timeScale;
        if (pkt.progress > 1.0) {
          pkt.progress = 0;
        }

        const p1 = projectedAgents[pkt.fromNode];
        const p2 = projectedAgents[pkt.toNode];
        if (p1 && p2) {
          const curX = p1.x + (p2.x - p1.x) * pkt.progress;
          const curY = p1.y + (p2.y - p1.y) * pkt.progress;

          // Don't render packet if it is inside or crossing the central core orb
          const distToCore = Math.hypot(curX - centerX, curY - centerY);
          if (distToCore < activeCoreR * 1.05) return;

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

          ctx.fillStyle = isDarkMode ? '#FFFFFF' : '#00E5FF';
          ctx.beginPath();
          ctx.arc(curX, curY, 2 * scaleBase, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // =========================================================
      // 5. AGENT SATELLITE NODES & TARGET RETICLES
      // =========================================================
      let closestAgentId: string | null = null;
      let pointerX = centerX;
      let pointerY = centerY;
      const isPointing = gestureRef.current.gesture === 'POINTING';
      
      if (isPointing && isZoomedIn) {
        pointerX = centerX - gestureRef.current.x * (width / 2);
        pointerY = centerY + gestureRef.current.y * (height / 2);
        
        let minDist = Infinity;
        projectedAgents.forEach((p) => {
          if (p.index === 0) return;
          const dist = Math.hypot(p.x - pointerX, p.y - pointerY);
          if (dist < minDist && dist < 120 * scaleBase) {
            minDist = dist;
            closestAgentId = p.agent.id;
          }
        });
      }

      projectedAgents.forEach(({ x, y, z, scale, agent, index }) => {
        if (index === 0) return; // Skip central core node, rendered above

        const isHighlighted = activeHighlightAgentId === agent.id;
        const nodeAlpha = isHighlighted ? 1.0 : Math.max(0.4, Math.min(1.0, 1.0 - z / 800));
        ctx.globalAlpha = nodeAlpha;

        // Target Reticle Node
        const nodeR = (isHighlighted ? 9 : 7.5) * scaleBase;
        
        // Outer Glowing Circle
        ctx.strokeStyle = agent.color;
        ctx.lineWidth = 1.8 * scaleBase;
        ctx.shadowColor = isDarkMode ? agent.color : 'transparent';
        ctx.shadowBlur = isDarkMode ? (isHighlighted ? 16 : 8) : 0;
        ctx.beginPath();
        ctx.arc(x, y, nodeR, 0, Math.PI * 2);
        ctx.stroke();

        // Inner Filled Core Dot
        ctx.fillStyle = agent.color;
        ctx.beginPath();
        ctx.arc(x, y, 3.2 * scaleBase, 0, Math.PI * 2);
        ctx.fill();

        // Crosshair Target Ticks
        const tickLen = 3 * scaleBase;
        ctx.strokeStyle = agent.color;
        ctx.lineWidth = 1 * scaleBase;
        ctx.beginPath();
        ctx.moveTo(x - nodeR - tickLen, y); ctx.lineTo(x - nodeR, y);
        ctx.moveTo(x + nodeR, y); ctx.lineTo(x + nodeR + tickLen, y);
        ctx.moveTo(x, y - nodeR - tickLen); ctx.lineTo(x, y - nodeR);
        ctx.moveTo(x, y + nodeR); ctx.lineTo(x, y + nodeR + tickLen);
        ctx.stroke();

        // Pulsing Outer Halo Ring
        const pulseHalo = (nodeR + 4 + Math.sin(time * 0.006 + agent.pulseOffset) * 2.5) * scaleBase;
        ctx.strokeStyle = agent.color;
        ctx.globalAlpha = nodeAlpha * (isHighlighted ? 0.8 : 0.35);
        ctx.lineWidth = 1 * scaleBase;
        ctx.beginPath();
        ctx.arc(x, y, pulseHalo, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = nodeAlpha;
        ctx.shadowBlur = 0;

        // 3. Quad-Direction Typography (Zero Overlap Guaranteed)
        ctx.save();
        ctx.font = '700 11px Rajdhani, sans-serif';
        
        const isTop = y < centerY - 60;
        const isBottom = y > centerY + 60;
        const isRight = x > centerX + 40;
        const isLeft = x < centerX - 40;

        let textX = x;
        let textY = y;

        if (isTop) {
          ctx.textAlign = 'center';
          textX = x;
          textY = y - nodeR - 14 * scaleBase;
        } else if (isBottom) {
          ctx.textAlign = 'center';
          textX = x;
          textY = y + nodeR + 16 * scaleBase;
        } else if (isRight) {
          ctx.textAlign = 'left';
          textX = x + nodeR + 12 * scaleBase;
          textY = y - 2 * scaleBase;
        } else if (isLeft) {
          ctx.textAlign = 'right';
          textX = x - nodeR - 12 * scaleBase;
          textY = y - 2 * scaleBase;
        } else {
          ctx.textAlign = 'left';
          textX = x + nodeR + 10 * scaleBase;
          textY = y;
        }

        // Draw Agent Name
        ctx.fillStyle = isDarkMode ? '#FFFFFF' : '#0F172A';
        ctx.shadowColor = isDarkMode ? agent.color : 'transparent';
        ctx.shadowBlur = isDarkMode ? 8 : 0;
        ctx.fillText(agent.name, textX, textY);

        // Expanded Holographic Card on Selection/Highlight (Positioned strictly outward away from central core)
        const isSelected = closestAgentId === agent.id || isHighlighted;
        if (isSelected) {
          const cardW = Math.min(168, width * 0.40);
          const cardH = 44;
          
          // Position card strictly away from center core orb
          const isLeftCard = x < centerX;
          const isTopCard = y < centerY;
          
          let rawBadgeX = isLeftCard 
            ? x - cardW - 10 * scaleBase 
            : x + 10 * scaleBase;
            
          let rawBadgeY = isTopCard 
            ? y - cardH - 6 * scaleBase 
            : y + 8 * scaleBase;

          // Safe bounds checking
          let badgeX = Math.max(10, Math.min(width - cardW - 10, rawBadgeX));
          let badgeY = Math.max(60, Math.min(height - cardH - 80, rawBadgeY));

          // If on mobile screen space is tight and card gets too close to center orb, push it further outward to edges
          const cardCenterX = badgeX + cardW / 2;
          const cardCenterY = badgeY + cardH / 2;
          const distToCore = Math.hypot(cardCenterX - centerX, cardCenterY - centerY);
          const safeCoreDist = activeCoreR + 35;
          
          if (distToCore < safeCoreDist) {
            if (isLeftCard) {
              badgeX = Math.max(8, x - cardW - 12);
            } else {
              badgeX = Math.min(width - cardW - 8, x + 12);
            }
            if (isTopCard) {
              badgeY = Math.max(56, y - cardH - 12);
            } else {
              badgeY = Math.min(height - cardH - 80, y + 16);
            }
          }

          ctx.fillStyle = isDarkMode ? 'rgba(3, 7, 18, 0.94)' : 'rgba(255, 255, 255, 0.96)';
          ctx.strokeStyle = agent.color;
          ctx.lineWidth = 1.2;
          ctx.shadowColor = isDarkMode ? agent.color : 'rgba(0, 0, 0, 0.08)';
          ctx.shadowBlur = isDarkMode ? 12 : 4;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(badgeX, badgeY, cardW, cardH, 6);
          } else {
            ctx.rect(badgeX, badgeY, cardW, cardH);
          }
          ctx.fill();
          ctx.stroke();

          ctx.textAlign = 'left';
          ctx.font = '600 8.5px Rajdhani, monospace';
          ctx.fillStyle = isDarkMode ? '#38BDF8' : '#0284C7';
          ctx.fillText(agent.status, badgeX + 8, badgeY + 16);

          ctx.font = '400 8px Rajdhani, monospace';
          ctx.fillStyle = isDarkMode ? '#94A3B8' : '#475569';
          ctx.fillText(agent.metric, badgeX + 8, badgeY + 31);
        }

        ctx.restore();
      });
      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(requestRef.current);
      observer.disconnect();
    };
  }, [state, rotationSpeed, accentColor, ecoMode, activeHighlightAgentId, isMemoryOrbExpanded]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleTouchStart}
      onMouseMove={handleMouseMove}
      onMouseUp={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      onDoubleClick={() => setIsMemoryOrbExpanded(!isMemoryOrbExpanded)}
      className="w-full h-full flex items-center justify-center overflow-hidden min-h-0 relative select-none touch-none cursor-grab active:cursor-grabbing"
    >
      <canvas ref={canvasRef} className="block w-full h-full pointer-events-auto" />

      {/* Futuristic Side HUD Window for Particle Tags & Neural Telemetry */}
      {activeMemoryNode && (
        <div className="absolute top-16 left-3 sm:left-5 z-40 max-w-[230px] sm:max-w-[270px] bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 rounded-xl p-3 shadow-[0_0_20px_rgba(41,223,255,0.22)] animate-fade-in pointer-events-auto select-text">
          <div className="flex items-center justify-between gap-2 border-b border-cyan-500/20 pb-1.5 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: activeMemoryNode.color }} />
              <span className="text-[10.5px] font-mono font-bold tracking-wider" style={{ color: activeMemoryNode.color }}>
                [{activeMemoryNode.categoryLabel}] NODE
              </span>
            </div>
            <button
              onClick={() => setActiveMemoryNode(null)}
              className="text-slate-400 hover:text-white text-xs px-1 hover:bg-white/10 rounded transition-colors"
              title="Close window"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-200 font-sans line-clamp-3 leading-relaxed">
            {activeMemoryNode.text}
          </p>
          <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
              SYNAPSE ACTIVE
            </span>
            <span style={{ color: activeMemoryNode.color }}>SYNCED</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const NebulaOrb = React.memo(NebulaOrbComponent);
NebulaOrb.displayName = 'NebulaOrb';

export default NebulaOrb;
