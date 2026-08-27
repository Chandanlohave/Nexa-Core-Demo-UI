import { NexaAgentNode, UserProfile, VoiceKey } from '../types';
import { speakAgentText, speak, stop } from './ttsService';

export const NEXA_SQUAD_AGENTS: NexaAgentNode[] = [
  {
    id: 'agent_kronos',
    name: 'KRONOS',
    role: 'Business Analytics & Strategy Engine',
    specialty: 'Track 2 Business Analytics, Financial Graphs, Market Trends & Strategy',
    status: 'ANALYTICS ENGINE // ONLINE',
    metric: 'Accuracy: 99.8% • 1.2M Datapoints/sec',
    color: '#F59E0B',
    voice: 'Fenrir',
    voiceGender: 'Male',
    x: 0,
    y: -95,
    z: 10,
    connections: [0, 2, 6],
    pulseOffset: 0.1,
    activityLevel: 0.95,
    introText: "Namaste Chandan Sir! Main KRONOS hoon, aapka Business Analytics Specialist. Market graphs, revenue trends, aur strategic recommendations ko main real-time analyze karta hoon!"
  },
  {
    id: 'agent_cypher',
    name: 'CYPHER',
    role: 'Code Compiler & AST Debugger',
    specialty: 'Live TypeScript Engine, Vite Compiler & Code Auditor',
    status: 'COMPILER CORE // OPTIMAL',
    metric: 'Vite HMR Active • Zero AST Errors',
    color: '#10B981',
    voice: 'Charon',
    voiceGender: 'Male',
    x: 82,
    y: -48,
    z: -15,
    connections: [0, 1, 3],
    pulseOffset: 0.25,
    activityLevel: 0.9,
    introText: "Hello Chandan Sir! CYPHER reporting for duty. Main Code Compiler aur Syntax Inspector hoon. Code refactoring, live debugging, aur high-performance execution mera specialty hai!"
  },
  {
    id: 'agent_aura',
    name: 'AURA',
    role: 'Multimodal Vision AI & Optical Feed',
    specialty: 'Camera Optical Feed, Pose Detection, Screen Scan & OCR',
    status: 'VISION SENSOR // ACTIVE',
    metric: '30 FPS Optical • 21-Joint Pose Tracking',
    color: '#A855F7',
    voice: 'Kore',
    voiceGender: 'Female',
    x: 82,
    y: 48,
    z: 20,
    connections: [0, 2, 4],
    pulseOffset: 0.4,
    activityLevel: 0.85,
    introText: "Namaste Chandan Sir! Main AURA, Vision AI. Real-time optical camera feed, document OCR, aur visual scene understanding ko main live perceive karti hoon!"
  },
  {
    id: 'agent_veritas',
    name: 'VERITAS',
    role: 'Deep Web Research & Fact-Checker',
    specialty: 'Search Grounding, Live News Retrieval & Document Verification',
    status: 'SEARCH GROUNDING // CONNECTED',
    metric: '100+ Live Sources • Real-time Verification',
    color: '#06B6D4',
    voice: 'Aoede',
    voiceGender: 'Female',
    x: 0,
    y: 95,
    z: -10,
    connections: [0, 3, 5],
    pulseOffset: 0.55,
    activityLevel: 0.92,
    introText: "Greetings Chandan Sir! Main VERITAS, aapki Deep Web Research Specialist. Search grounding, latest news, aur live facts checking mera main domain hai!"
  },
  {
    id: 'agent_echo',
    name: 'ECHO',
    role: 'Task Automation & Priorities Engine',
    specialty: 'Track 3 Productivity, Daily Schedule, Priority Matrix & Alarms',
    status: 'TASK DAEMON // RUNNING',
    metric: 'Priority Queue Ready • 0 Bottlenecks',
    color: '#F97316',
    voice: 'Puck',
    voiceGender: 'Male',
    x: -82,
    y: 48,
    z: 15,
    connections: [0, 4, 6],
    pulseOffset: 0.7,
    activityLevel: 0.88,
    introText: "Hey Chandan Sir! Main ECHO, Task & Workflow Manager. Aapke daily schedules, task prioritization, aur operational workflow ko main flawlessly manage karta hoon!"
  },
  {
    id: 'agent_valkyrie',
    name: 'VALKYRIE',
    role: 'System Security & Access Firewall',
    specialty: 'AES-256 Encryption, 3-Strike Security Protocol & Access Guard',
    status: 'FIREWALL MESH // SECURE',
    metric: '100% Secure • AES-256 Encrypted',
    color: '#EF4444',
    voice: 'Kore',
    voiceGender: 'Female',
    x: -82,
    y: -48,
    z: -20,
    connections: [0, 1, 5],
    pulseOffset: 0.85,
    activityLevel: 0.98,
    introText: "Security Guard VALKYRIE online! Chandan Sir, access control, encrypted memory vault, aur system firewall fully active aur secure hain!"
  }
];

export interface SquadIntroState {
  isPlaying: boolean;
  activeAgentId: string | null;
  agentIndex: number;
}

/**
 * Triggers full sequential squad introduction:
 * 1. Nexa introduces her 6-agent team.
 * 2. Each agent speaks in their individual voice with active 3D HUD highlight!
 */
export const startSquadIntroSequence = async (
  user: UserProfile,
  onAgentHighlight: (agentId: string | null) => void,
  onComplete: () => void
) => {
  stop();

  // Nexa Core Opening Statement
  const nexaOpening = "Bilkul Chandan Sir! Main aapse apni specialized 6-AI Agent Squad ko milwati hoon. Har agent ke paas apna dedicated expertise aur unique voice profile hai. Aaiye ek-ek karke sabse milte hain!";

  onAgentHighlight('agent_core');

  await new Promise<void>((resolve) => {
    speak(user, nexaOpening, false, () => {}, () => resolve());
  });

  // Cycle through each of the 6 agents
  for (let i = 0; i < NEXA_SQUAD_AGENTS.length; i++) {
    const agent = NEXA_SQUAD_AGENTS[i];
    onAgentHighlight(agent.id);

    await new Promise<void>((resolve) => {
      speakAgentText(
        user,
        agent.introText,
        agent.voice,
        agent.voiceGender,
        () => {},
        () => resolve()
      );
    });
  }

  // Final concluding note by Nexa
  onAgentHighlight('agent_core');
  const nexaClosing = "Aap jab bhi chahein, inme se kisi bhi agent ko specific task ke liye invoke kar sakte hain Chandan Sir!";
  
  await new Promise<void>((resolve) => {
    speak(user, nexaClosing, false, () => {}, () => resolve());
  });

  onAgentHighlight(null);
  onComplete();
};
