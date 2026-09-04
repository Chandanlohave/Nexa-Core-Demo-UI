
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export const VOICES = {
  Aoede: { 
    name: 'Aoede', 
    description: 'Sweet & Energetic (Female)', 
    gender: 'Female', 
    style: 'Sweet, bright, energetic, youthful female voice.' 
  },
  Kore: { 
    name: 'Kore', 
    description: 'Calm & Soft (Female)', 
    gender: 'Female', 
    style: 'Soothing, soft, clear, natural female voice.' 
  },
  Fenrir: {
    name: 'Fenrir',
    description: 'Deep & Authoritative (Male)',
    gender: 'Male',
    style: 'Deep, confident, commanding, analytical male voice.'
  },
  Charon: {
    name: 'Charon',
    description: 'Techy & Precise (Male)',
    gender: 'Male',
    style: 'Focused, techy, quick-paced, precise male developer voice.'
  },
  Puck: {
    name: 'Puck',
    description: 'Friendly & Energetic (Male)',
    gender: 'Male',
    style: 'Upbeat, friendly, clear, dynamic male voice.'
  }
} as const;

export type VoiceKey = keyof typeof VOICES;

export interface NexaAgentNode {
  id: string;
  name: string;
  role: string;
  specialty: string;
  status: string;
  metric: string;
  color: string;
  voice: VoiceKey;
  voiceGender: 'Male' | 'Female';
  x: number;
  y: number;
  z: number;
  connections: number[];
  pulseOffset: number;
  activityLevel: number;
  introText: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  mobile: string; // Now a mandatory unique identifier for users
  role: UserRole;
  gender: 'male' | 'female' | 'other';
  voice?: VoiceKey; // Voice selection
  warningCount?: number; // Tracks user offenses for the 3-strike rule
  photoUrl?: string; // Base64 compressed image
  voiceprintId?: string; // Biometric voiceprint hash
  voiceEnrolledAt?: number;
  lastLoginDate?: string;
  accessKey?: string;
  customApiKey?: string;
  groqKey?: string;
}

export interface AccessKeyDefinition {
  key: string;
  assignedMobile?: string; // If set, only this mobile can use it
  assignedName?: string; // Name of the linked user
  createdBy: string;
  createdAt: any;
  createdDate?: string;
}

export interface MapLocation {
  title: string;
  uri: string;
  rating?: number;
  userRatingCount?: number;
  address?: string;
  source?: string; // e.g. "Google Maps"
}

// --- WIDGET TYPES ---
export type WidgetType = 'WEATHER' | 'FINANCE' | 'NEWS' | 'CODE' | 'BUSINESS_STRATEGY' | 'TASK_OPERATIONS';

export interface WidgetPayload {
  type: WidgetType;
  data: any;
}

export interface Reminder {
  id: string;
  time: number; // Timestamp
  message: string;
  completed: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isAngry?: boolean;
  sources?: { title: string; url: string }[]; // Added for Search Grounding
  image?: string; // Base64 image string if the user sent an image
  video?: string; // Video URI for generated videos
  isGenerated?: boolean; // True if the content (image/video) was created by NEXA
  mapLocations?: MapLocation[]; // For Google Maps results
  widget?: WidgetPayload; // NEW: Structured data for UI widgets
}

export interface UserFact {
  id: string;
  content: string; // "User lives in Delhi"
  confidence: number;
  timestamp: number;
}

export enum HUDState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  WARNING = 'WARNING',
  GLITCH = 'GLITCH', // Level 2 Anger
  STUDY_HUB = 'STUDY HUB',
  LIVE = 'LIVE',
  WATCHING = 'WATCHING', // Vision processing
  GENERATING = 'GENERATING', // Image/Video Generation
  REPAIRING = 'REPAIRING', // Phase 14: Self Repair
  SAFEMODE = 'SAFE MODE', // Phase 14: Critical Failure
  CODING = 'CODING' // Phase 15: The Phoenix Protocol
}

export interface AppConfig {
  animationsEnabled: boolean;
  hudRotationSpeed: number;
  micRotationSpeed: number;
  theme: 'light' | 'dark' | 'system';
  naughtyModeOverride?: boolean; // Added for Admin override
  accentColor?: string; // HEX Color for the UI Theme
  phoenixEnabled?: boolean; // Safety switch for self-coding
  ecoMode?: boolean; // Battery Saver Mode
  hudMode?: 'matrix' | 'classic'; // System Matrix HUD Mode
}

export interface StudyHubSubject {
  courseCode: string;
  courseName: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g., "2-5 PM", "10 AM - 1 PM"
  bookName?: string; // New: Optional Book Name
  topics?: string[]; // New: List of topics generated for the book
  currentTopicIndex?: number; // New: Progress tracking
}

// --- AGENTIC TYPES ---
export type ActionType = 
  | 'THEME_DARK' 
  | 'THEME_LIGHT' 
  | 'CHANGE_COLOR' // NEW: Voice Color Control
  | 'OPEN_STUDY_HUB' 
  | 'OPEN_ADMIN_PANEL' 
  | 'OPEN_SETTINGS' 
  | 'CLOSE_PANELS'
  | 'GENERATE_IMAGE' 
  | 'GENERATE_VIDEO'
  | 'EDIT_IMAGE'
  | 'MAKE_CALL'
  | 'LOOKUP_CONTACT' // NEW: Contact Picker Action
  | 'DRAFT_SMS'
  | 'DRAFT_WHATSAPP'
  | 'OPEN_APP'
  | 'LOGOUT'
  | 'MODIFY_CODE' // NEW: Self-Programming Action
  | 'SET_REMINDER' // NEW: Reminder Action
  | 'ANALYZE_BUSINESS_DATA' // Track 2: Business Decision Intelligence
  | 'ORGANIZE_TASKS' // Track 3: Operational AI Agent Automation
  | 'OPEN_TACTICAL_HUB' // Ultron Matrix & Autonomous Evolution Hub
  | 'ASSIMILATE_AI_MODEL' // Dynamic model/agent assimilation
  | 'SCAN_TRENDING_AI' // Internet/GitHub trending AI discovery
  | 'PUSH_EVOLUTION_TO_GITHUB' // Commit evolution manifest to GitHub
  | 'OPEN_SQUAD_PANEL'
  | 'INTRODUCE_SQUAD'
  | 'HIGHLIGHT_AGENT'
  | 'NONE';

export interface AgentResponse {
  text: string;
  action?: ActionType;
  actionParams?: any; // To pass prompt to generators
  mapLocations?: MapLocation[];
  widget?: WidgetPayload;
}
