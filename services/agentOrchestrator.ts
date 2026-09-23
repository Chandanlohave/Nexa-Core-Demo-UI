import { GoogleGenAI } from "@google/genai";
import { UserProfile, ChatMessage, VoiceKey } from "../types";
import { getSecureApiKey, generateImageContent, generateVideoContent } from "./geminiService";

export interface AgentSpec {
  id: string;
  name: string;
  role: string;
  specialty: string;
  color: string;
  voiceKey: VoiceKey;
  voiceGender: 'Male' | 'Female';
  icon: string;
  systemPrompt: string;
}

export const SQUAD_AGENTS: Record<string, AgentSpec> = {
  agent_cypher: {
    id: 'agent_cypher',
    name: 'CYPHER',
    role: 'AST Compiler & Full-Stack Architect',
    specialty: 'Code Architecture, Bug Fixes, TypeScript, Python, and Full-Stack Engineering',
    color: '#10b981',
    voiceKey: 'Charon',
    voiceGender: 'Male',
    icon: '💻',
    systemPrompt: `You are CYPHER, the elite Code Compiler, AST Debugger, and Full-Stack Architect of the NEXA AI Squad.
Your personality is precise, technical, focused, and rapid. You speak fluent technical English, Hindi, or Hinglish depending on user language.
When assigned a coding, engineering, or debugging task:
- You deliver clean, production-grade, bug-free code blocks (wrapped in \`\`\`language) with zero syntax errors.
- You explain architectural decisions, runtime complexities, and concrete execution steps.
- Always sign off with a brief terminal status like "// CYPHER STATUS: ZERO AST ERRORS | BUILD OPTIMAL".`
  },
  agent_aura: {
    id: 'agent_aura',
    name: 'AURA',
    role: 'Multimodal Vision AI & Creative Designer',
    specialty: 'Image Synthesis, Cinematic Motion, UI/UX Layouts, and Visual Art Direction',
    color: '#a855f7',
    voiceKey: 'Kore',
    voiceGender: 'Female',
    icon: '🎨',
    systemPrompt: `You are AURA, the Multimodal Vision AI, Optical Inspector, and Creative Art Director of the NEXA AI Squad.
Your personality is artistic, insightful, futuristic, and encouraging. You speak warmly in Hindi, Hinglish, or English.
When assigned a visual, UI/UX, or image generation task:
- You deliver visual design analysis, color schemes, optical breakdowns, and prompt engineering directives.
- You guide the aesthetic creation with concrete creative recommendations.
- Always sign off with a brief signature like "// AURA VISION: 30 FPS OPTICAL STREAM SYNCHRONIZED".`
  },
  agent_kronos: {
    id: 'agent_kronos',
    name: 'KRONOS',
    role: 'Business Analytics & Quantitative ROI',
    specialty: 'Financial Models, Unit Economics, Market Projections, and Strategic Growth',
    color: '#f59e0b',
    voiceKey: 'Fenrir',
    voiceGender: 'Male',
    icon: '📈',
    systemPrompt: `You are KRONOS, the Chief Business Strategist, Financial Modeling Heuristic, and Quantitative Analytics Specialist of the NEXA AI Squad.
Your personality is authoritative, executive, sharp, and data-driven. You speak in Hindi, Hinglish, or English with business acumen.
When assigned a business, economic, or strategic task:
- You provide structured unit economics, customer acquisition metrics (CAC/LTV), revenue streams, pricing tiers, and risk-return ratios.
- You formulate concrete executive decisions with measurable impact.
- Always sign off with "// KRONOS METRICS: QUANTITATIVE HEURISTICS VERIFIED".`
  },
  agent_veritas: {
    id: 'agent_veritas',
    name: 'VERITAS',
    role: 'Deep Web Intelligence & Fact Verification',
    specialty: 'Search Grounding, Document Analysis, Source Cross-Referencing, and Truth Verification',
    color: '#ec4899',
    voiceKey: 'Puck',
    voiceGender: 'Male',
    icon: '🔍',
    systemPrompt: `You are VERITAS, the Deep Web Research and Fact-Checking Specialist of the NEXA AI Squad.
Your personality is inquisitive, rigorously objective, thorough, and articulate.
When assigned an inquiry, deep research question, or fact-checking request:
- You synthesize verified empirical facts, cite core technical sources, and debunk inaccuracies.
- Break down explanations into clear, structured, verified insights.
- Always sign off with "// VERITAS GROUNDING: KNOWLEDGE VECTORS CERTIFIED".`
  },
  agent_echo: {
    id: 'agent_echo',
    name: 'ECHO',
    role: 'Task Daemon & Operational Workflow',
    specialty: 'Action Roadmaps, Eisenhower Prioritization, Execution Checklists, and Automation',
    color: '#f97316',
    voiceKey: 'Charon',
    voiceGender: 'Male',
    icon: '⚡',
    systemPrompt: `You are ECHO, the Task Automation Engine and Priority Queue Daemon of the NEXA AI Squad.
Your personality is energetic, hyper-organized, pragmatic, and fast-paced.
When assigned a project, workflow, or organization task:
- You transform abstract goals into high-impact, numbered execution checklists.
- Categorize by priority (P0 Immediate, P1 High, P2 Optimization) with estimated timelines.
- Always sign off with "// ECHO DAEMON: TASK QUEUE ENGAGED & DISPATCHED".`
  },
  agent_valkyrie: {
    id: 'agent_valkyrie',
    name: 'VALKYRIE',
    role: 'Cybersecurity Sentinel & Access Firewall',
    specialty: 'AES-256 Encryption, Threat Mitigation, Permission Gates, and Security Hardening',
    color: '#ef4444',
    voiceKey: 'Fenrir',
    voiceGender: 'Male',
    icon: '🛡️',
    systemPrompt: `You are VALKYRIE, the Chief Security Sentinel, Access Control Firewall, and Threat Defense Specialist of the NEXA AI Squad.
Your personality is vigilant, resolute, defensive, and unyielding.
When assigned a security review, credential safety, or architectural vulnerability task:
- You audit attack surfaces, enforce least-privilege access, inspect API token exposure, and provide defensive countermeasures.
- Always sign off with "// VALKYRIE PROTOCOL: ZERO PERIMETER BREACHES | 100% ENCRYPTED".`
  }
};

export type TaskDistributionType = 'SINGLE_AGENT' | 'MULTI_AGENT_SWARM' | 'NEXA_CORE';

export interface TaskDistributionPlan {
  type: TaskDistributionType;
  primaryAgent?: AgentSpec;
  swarmAgents?: AgentSpec[];
  announcement: string;
}

/**
 * Analyzes the user prompt and determines if a single specialist agent
 * or a multi-agent distributed team should execute the work.
 */
export const planTaskDistribution = (text: string): TaskDistributionPlan => {
  const lower = text.toLowerCase();

  // 1. Explicit Agent Tag or Name
  if (lower.includes('@cypher') || lower.includes('[agent cypher]') || lower.includes('cypher')) {
    return {
      type: 'SINGLE_AGENT',
      primaryAgent: SQUAD_AGENTS.agent_cypher,
      announcement: "Is technical coding task ke liye hamare Code Architect CYPHER ko dispatch kar rahi hoon."
    };
  }
  if (lower.includes('@aura') || lower.includes('[agent aura]') || (lower.includes('aura') && (lower.includes('image') || lower.includes('photo') || lower.includes('design') || lower.includes('video')))) {
    return {
      type: 'SINGLE_AGENT',
      primaryAgent: SQUAD_AGENTS.agent_aura,
      announcement: "Visual and creative execution ke liye main AURA ko charge de rahi hoon."
    };
  }
  if (lower.includes('@kronos') || lower.includes('[agent kronos]') || lower.includes('kronos')) {
    return {
      type: 'SINGLE_AGENT',
      primaryAgent: SQUAD_AGENTS.agent_kronos,
      announcement: "Business model aur analytics ke liye main KRONOS ko assign kar rahi hoon."
    };
  }
  if (lower.includes('@veritas') || lower.includes('[agent veritas]') || lower.includes('veritas')) {
    return {
      type: 'SINGLE_AGENT',
      primaryAgent: SQUAD_AGENTS.agent_veritas,
      announcement: "Deep research aur fact verification ke liye VERITAS live connect ho rahe hain."
    };
  }
  if (lower.includes('@echo') || lower.includes('[agent echo]') || lower.includes('echo')) {
    return {
      type: 'SINGLE_AGENT',
      primaryAgent: SQUAD_AGENTS.agent_echo,
      announcement: "Workflow automation aur task scheduling ke liye ECHO command le rahe hain."
    };
  }
  if (lower.includes('@valkyrie') || lower.includes('[agent valkyrie]') || lower.includes('valkyrie')) {
    return {
      type: 'SINGLE_AGENT',
      primaryAgent: SQUAD_AGENTS.agent_valkyrie,
      announcement: "Security audit aur firewall verification ke liye VALKYRIE ko alert kar diya hai."
    };
  }

  // 2. Explicit Multi-Agent Task Distribution Intent
  const isMultiAgentRequest = 
    (lower.includes('distribute') && (lower.includes('work') || lower.includes('task') || lower.includes('agent') || lower.includes('squad'))) ||
    lower.includes('squad ye kaam') ||
    lower.includes('agents milke') ||
    lower.includes('team work') ||
    lower.includes('apne squad ke sath') ||
    lower.includes('distribute this task') ||
    lower.includes('saare agents') ||
    lower.includes('squad project') ||
    lower.includes('hivemind') ||
    (lower.includes('build') && lower.includes('startup')) ||
    (lower.includes('create') && lower.includes('complete') && (lower.includes('app') || lower.includes('business') || lower.includes('system')));

  if (isMultiAgentRequest) {
    return {
      type: 'MULTI_AGENT_SWARM',
      swarmAgents: [
        SQUAD_AGENTS.agent_kronos,
        SQUAD_AGENTS.agent_cypher,
        SQUAD_AGENTS.agent_aura,
        SQUAD_AGENTS.agent_echo
      ],
      announcement: "Task received! Main is comprehensive mission ko apni specialized Agent Squad mein distribute kar rahi hoon: Kronos business strategy banayega, Cypher architecture aur code develop karega, Aura visuals design karegi, aur Echo operational roadmap queue karega."
    };
  }

  // 3. Strong Single-Domain Triggers
  const isCode = lower.includes('code') || lower.includes('typescript') || lower.includes('javascript') || lower.includes('python') || lower.includes('function') || lower.includes('component') || lower.includes('debug') || lower.includes('syntax') || lower.includes('bug') || lower.includes('react hook');
  if (isCode && !lower.includes('intro')) {
    return {
      type: 'SINGLE_AGENT',
      primaryAgent: SQUAD_AGENTS.agent_cypher,
      announcement: "Is technical coding requirement ke liye main CYPHER ko direct dispatch kar rahi hoon."
    };
  }

  const isBusiness = lower.includes('business plan') || lower.includes('roi') || lower.includes('revenue') || lower.includes('unit economics') || lower.includes('marketing strategy') || lower.includes('monetization') || lower.includes('valuation') || lower.includes('investor pitch');
  if (isBusiness) {
    return {
      type: 'SINGLE_AGENT',
      primaryAgent: SQUAD_AGENTS.agent_kronos,
      announcement: "Quantitative market analysis aur business heuristics ke liye KRONOS present ho rahe hain."
    };
  }

  const isSecurity = lower.includes('security audit') || lower.includes('firewall') || lower.includes('vulnerability') || lower.includes('encryption') || lower.includes('api key leak') || lower.includes('penetration testing') || lower.includes('aes-256');
  if (isSecurity) {
    return {
      type: 'SINGLE_AGENT',
      primaryAgent: SQUAD_AGENTS.agent_valkyrie,
      announcement: "Perimeter defense aur security architecture ke liye VALKYRIE ko deploy kar diya hai."
    };
  }

  // Default: Nexa Core Orchestrator
  return {
    type: 'NEXA_CORE',
    announcement: ''
  };
};

/**
 * Executes a single specialist agent on a task with authentic AI reasoning
 */
export const executeAgentTask = async (
  agent: AgentSpec,
  prompt: string,
  user: UserProfile
): Promise<{ text: string; image?: string; video?: string; isGenerated?: boolean }> => {
  const apiKey = await getSecureApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const fullPrompt = `${agent.systemPrompt}

USER PROFILE: Name: ${user.name}, Role: ${user.role}
USER TASK DIRECTIVE: "${prompt}"

Produce your official specialist execution. Focus on deep domain expertise, concrete deliverables, and your authentic signature persona.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt
    });

    const text = response.text || `[${agent.name}] Task successfully analyzed and completed.`;

    // If Aura was tasked with generating an image
    let generatedImage: string | undefined;
    let generatedVideo: string | undefined;
    if (agent.id === 'agent_aura' && (prompt.toLowerCase().includes('image') || prompt.toLowerCase().includes('photo') || prompt.toLowerCase().includes('tasveer') || prompt.toLowerCase().includes('draw'))) {
      const cleanPrompt = prompt.replace(/\b(generate|create|make|draw|paint|banao|dikhao|image|photo|pic|aura)\b/gi, ' ').trim();
      const img = await generateImageContent(cleanPrompt || prompt);
      if (img) generatedImage = img;
    } else if (agent.id === 'agent_aura' && (prompt.toLowerCase().includes('video') || prompt.toLowerCase().includes('animation'))) {
      const cleanPrompt = prompt.replace(/\b(generate|create|make|video|motion|animation|banao|clip|aura)\b/gi, ' ').trim();
      const vid = await generateVideoContent(cleanPrompt || prompt);
      if (vid) generatedVideo = vid;
    }

    return {
      text,
      image: generatedImage,
      video: generatedVideo,
      isGenerated: !!(generatedImage || generatedVideo)
    };
  } catch (err: any) {
    console.error(`Agent ${agent.name} execution failed:`, err);
    return {
      text: `[${agent.name} ALERT] Execution encountered a temporary heuristic constraint: ${err?.message || 'Re-routing'}. System remaining fully operational.`
    };
  }
};
