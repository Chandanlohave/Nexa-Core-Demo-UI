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
    introText: "Kronos online. Sir, aapke business analytics aur data tracking ka charge mere paas hai. Market trends se lekar complex revenue insights tak, main sab kuch real-time handle kar lunga."
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
    introText: "Cypher here, Sir. Main aapka backend aur syntax inspector hoon. Agar code mein koi bhi bug ho, ya complex architecture build karna ho, leave the heavy lifting to me."
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
    introText: "Hello Sir, main Aura. Meri specialty visual intelligence hai. Aapke camera feeds, images aur scene understanding ko process karke, main aapko real-time insights dungi."
  },
  {
    id: 'agent_veritas',
    name: 'VERITAS',
    role: 'Deep Web Research & Fact-Checker',
    specialty: 'Search Grounding, Live News Retrieval & Document Verification',
    status: 'SEARCH GROUNDING // CONNECTED',
    metric: '100+ Live Sources • Real-time Verification',
    color: '#EC4899',
    voice: 'Aoede',
    voiceGender: 'Female',
    x: 0,
    y: 95,
    z: -10,
    connections: [0, 3, 5],
    pulseOffset: 0.55,
    activityLevel: 0.92,
    introText: "Veritas reporting, Sir. Main deep web research aur fact-checking handle karti hoon. Agar aapko duniya bhar ki latest news ya grounded data chahiye, I am your agent."
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
    introText: "Echo online! Sir, aapka time aur tasks manage karna meri zimmedari hai. Scheduling se lekar priority queues tak, I'll keep your workflow flawless."
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
    introText: "Valkyrie standing by. Sir, aapke system ki security aur access control mere haath me hai. Data vaults aur firewall hamesha active rahenge."
  }
];

export interface SquadIntroState {
  isPlaying: boolean;
  activeAgentId: string | null;
  agentIndex: number;
}

/**
 * Triggers full sequential squad introduction:
 * 1. Nexa introduces her AI Agent Squad.
 * 2. Each agent takes center core position on 3D HUD & speaks in their individual voice!
 */
export const startSquadIntroSequence = async (
  user: UserProfile,
  customAgents: NexaAgentNode[] = [],
  onAgentHighlight: (agentId: string | null) => void,
  onComplete: () => void,
  isLiveMode: boolean = false
) => {
  stop();

  const allAgents = [...NEXA_SQUAD_AGENTS, ...customAgents];

  // Nexa Core Opening Statement
  const nexaOpening = "Haan Chandan Sir, bilkul. Main aapse apni core team aur specialized agents ko milwati hoon. Guys, please go ahead and introduce yourselves to Sir.";
  
  onAgentHighlight('agent_core');
  
  await new Promise<void>((resolve) => {
    speak(user, nexaOpening, false, () => {}, () => resolve());
  });

  // Cycle through each agent (Each takes center core position & speaks in distinct voice)
  for (let i = 0; i < allAgents.length; i++) {
    const agent = allAgents[i];
    onAgentHighlight(agent.id);

    await new Promise<void>((resolve) => {
      speakAgentText(
        user,
        agent.introText || `Sir, main ${agent.name} hoon, ${agent.role}. Aapke commands execute karne ke liye ready hoon.`,
        agent.voice || 'Fenrir',
        agent.voiceGender || 'Male',
        () => {},
        () => resolve()
      );
    });
  }

  // Final concluding note by Nexa
  onAgentHighlight('agent_core');
  const nexaClosing = "Toh ye thi meri team Chandan Sir. Jab bhi kisi specialized task ki zarurat ho, aap sidhe inhe command de sakte hain.";
  
  await new Promise<void>((resolve) => {
    speak(user, nexaClosing, false, () => {}, () => resolve());
  });

  onAgentHighlight(null);
  onComplete();
};
