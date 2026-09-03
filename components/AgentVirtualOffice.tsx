import React, { useState, useEffect, useRef, useCallback } from 'react';
import { speak as speakTextTTS, speakAgentText, stop as stopTextTTS } from '../services/ttsService';
import { generateTextResponse } from '../services/geminiService';
import { UserProfile } from '../types';
import { PoolMiniGameModal } from './office/PoolMiniGameModal';
import { CoffeeMachineModal } from './office/CoffeeMachineModal';
import { VendingMachineModal, SnackItem } from './office/VendingMachineModal';
import { TaskDispatcherModal, TaskAssignment } from './office/TaskDispatcherModal';
import { HolographicCommandWallModal } from './office/HolographicCommandWallModal';
import { OfficeCustomizerModal, OfficeTheme } from './office/OfficeCustomizerModal';
import { officeAudio } from './office/officeAudio';

// Strict Pixel Art Palette
const PAL = {
  ' ': 'transparent',
  '0': '#000000', // Outline
  '1': '#ffffff', // White
  '2': '#f0c0a0', // Light skin
  '3': '#8a5a40', // Dark skin
  '4': '#6a4020', // Brown hair
  '5': '#212121', // Black hair
  '6': '#e0b050', // Blonde hair
  '7': '#e0e0e0', // White hair
  '8': '#204080', // Blue suit (Kronos)
  '9': '#c04040', // Red shirt (Valkyrie)
  'A': '#303030', // Black dress (Nexa)
  'B': '#e08020', // Orange shirt (Cypher)
  'C': '#9c27b0', // Purple shirt (Aura)
  'D': '#1e88e5', // Light blue
};

// 9x17 Character Sprites
const SPRITES: Record<string, string[]> = {
  nexa: [
    "  00000  ",
    " 0666660 ",
    "066666660",
    "060666060",
    "002010200",
    "002020200",
    "060222060",
    " 0222220 ",
    "  00000  ",
    " 00AAA00 ",
    "020AAA020",
    "000AAA000",
    " 0AAAAA0 ",
    " 0AAAAA0 ",
    "  00000  ",
    "  02 20  ",
    " 000 000 "
  ],
  kronos: [
    "  00000  ",
    " 0444440 ",
    "044444440",
    "044444440",
    "002010200",
    "002020200",
    " 0222220 ",
    " 0222220 ",
    "  00000  ",
    " 0081800 ",
    "080888080",
    "020888020",
    "000888000",
    "  08880  ",
    "  05550  ",
    "  05 50  ",
    " 000 000 "
  ],
  cypher: [
    "  00000  ",
    " 0555550 ",
    "055555550",
    "055555550",
    "003010300",
    "003030300",
    "050333050",
    " 0333330 ",
    "  00000  ",
    " 00B0B00 ",
    "030BBB030",
    "000BBB000",
    "  0BBB0  ",
    "  08880  ",
    "  08 80  ",
    " 000 000 "
  ],
  aura: [
    "  00000  ",
    " 0555550 ",
    "055555550",
    "055555550",
    "002010200",
    "002020200",
    "050222050",
    " 0222220 ",
    "  00000  ",
    " 00CCC00 ",
    "020CCC020",
    "000CCC000",
    "  0CCC0  ",
    "  0AAA0  ",
    "  0A A0  ",
    " 000 000 "
  ],
  echo: [
    "  00000  ",
    " 0777770 ",
    "077777770",
    "077777770",
    "003010300",
    "003030300",
    " 0333330 ",
    " 0333330 ",
    "  00000  ",
    " 0011100 ",
    "030111030",
    "000111000",
    "  01110  ",
    "  05550  ",
    "  05 50  ",
    " 000 000 "
  ],
  veritas: [
    "   0 0   ",
    "  04440  ",
    " 0444440 ",
    "044444440",
    "002010200",
    "002020200",
    " 0222220 ",
    " 0222220 ",
    "  00000  ",
    " 0011100 ",
    "020111020",
    "000111000",
    "  01110  ",
    "  08880  ",
    "  08 80  ",
    " 000 000 "
  ],
  valkyrie: [
    "  00000  ",
    " 0999990 ",
    "099999990",
    "090999090",
    "002010200",
    "002020200",
    "090222090",
    " 0222220 ",
    "  00000  ",
    " 0091900 ",
    "020999020",
    "000999000",
    " 0999990 ",
    " 0999990 ",
    "  00000  ",
    "  02 20  ",
    " 000 000 "
  ]
};

// --- NAVIGATION GRAPH & LOCATIONS ---
const NODES: Record<string, {x: number, y: number}> = {
  // Desks (Agents sit behind the desk with heads completely clear above desk surface)
  'd1': { x: 40, y: 53 },
  'd2': { x: 90, y: 53 },
  'd3': { x: 140, y: 53 },
  'd4': { x: 40, y: 119 },
  'd5': { x: 90, y: 119 },
  'd6': { x: 140, y: 119 },
  'nexa': { x: 252, y: 143 },
  
  // Desk Step-Out Nodes
  'd1_out': { x: 18, y: 53 },
  'd2_out': { x: 68, y: 53 },
  'd3_out': { x: 118, y: 53 },
  'd4_out': { x: 18, y: 119 },
  'd5_out': { x: 68, y: 119 },
  'd6_out': { x: 118, y: 119 },
  'nexa_out': { x: 220, y: 143 },
  
  // Aisles / Walkways
  'a1': { x: 18, y: 88 },
  'a2': { x: 68, y: 88 },
  'a3': { x: 118, y: 88 },
  'a4': { x: 165, y: 88 },
  'door1': { x: 180, y: 74 }, // Main <-> Breakroom
  'door_cabin': { x: 232, y: 96 }, // Glass sliding door to Executive Cabin
  'b_center': { x: 232, y: 58 }, // Breakroom center
  'cabin_lobby': { x: 232, y: 118 }, // Executive Cabin Entrance Lobby
  'cabin_left': { x: 210, y: 118 },
  'cabin_right': { x: 280, y: 118 },
  
  // Rooms
  'toilet': { x: 165, y: 25 },
  'meeting_1': { x: 30, y: 156 },
  'meeting_2': { x: 50, y: 156 },
  
  // Props & Leisure
  'cooler': { x: 215, y: 38 },
  'vending': { x: 195, y: 38 },
  'couch': { x: 200, y: 154 },
  
  // Pool Table Nodes
  'pool_l': { x: 230, y: 48 },
  'pool_r': { x: 290, y: 48 },
  'pool_t': { x: 260, y: 24 },
  'pool_b': { x: 260, y: 72 },
};

const EDGES: Record<string, string[]> = {
  'd1': ['d1_out'], 'd1_out': ['d1', 'a1'],
  'd2': ['d2_out'], 'd2_out': ['d2', 'a2'],
  'd3': ['d3_out'], 'd3_out': ['d3', 'a3'],
  'd4': ['d4_out'], 'd4_out': ['d4', 'a1'],
  'd5': ['d5_out'], 'd5_out': ['d5', 'a2'],
  'd6': ['d6_out'], 'd6_out': ['d6', 'a3'],
  'a1': ['d1_out', 'd4_out', 'a2', 'meeting_1'],
  'a2': ['d2_out', 'd5_out', 'a1', 'a3'],
  'a3': ['d3_out', 'd6_out', 'a2', 'a4'],
  'a4': ['a3', 'door1', 'toilet'],
  'door1': ['a4', 'b_center'],
  'b_center': ['door1', 'door_cabin', 'vending', 'cooler', 'pool_l', 'pool_b'],
  'vending': ['b_center'], 'cooler': ['b_center'],
  'pool_l': ['b_center', 'pool_t', 'pool_b'],
  'pool_t': ['pool_l', 'pool_r'],
  'pool_r': ['pool_t', 'pool_b'],
  'pool_b': ['pool_l', 'pool_r', 'b_center'],
  'door_cabin': ['b_center', 'cabin_lobby'],
  'cabin_lobby': ['door_cabin', 'nexa_out', 'couch', 'cabin_left', 'cabin_right'],
  'nexa_out': ['cabin_lobby', 'nexa'], 'nexa': ['nexa_out'],
  'cabin_left': ['cabin_lobby'], 'cabin_right': ['cabin_lobby'],
  'couch': ['cabin_lobby'],
  'meeting_1': ['a1', 'meeting_2'], 'meeting_2': ['meeting_1'],
  'toilet': ['a4']
};

const findPath = (start: string, end: string): string[] => {
  if (start === end) return [];
  const queue = [[start]];
  const visited = new Set([start]);
  while (queue.length > 0) {
     const path = queue.shift()!;
     const node = path[path.length - 1];
     for (const neighbor of EDGES[node] || []) {
        if (neighbor === end) return [...path.slice(1), neighbor];
        if (!visited.has(neighbor)) {
           visited.add(neighbor);
           queue.push([...path, neighbor]);
        }
     }
  }
  return [];
};

// --- ENVIRONMENT ENTITIES ---
const DESKS = [
  { id: 'd1', agentId: 'agent_kronos', x: 40, y: 70, width: 34, height: 18 },
  { id: 'd2', agentId: 'agent_cypher', x: 90, y: 70, width: 34, height: 18 },
  { id: 'd3', agentId: 'agent_aura', x: 140, y: 70, width: 34, height: 18 },
  { id: 'd4', agentId: 'agent_veritas', x: 40, y: 136, width: 34, height: 18 },
  { id: 'd5', agentId: 'agent_echo', x: 90, y: 136, width: 34, height: 18 },
  { id: 'd6', agentId: 'agent_valkyrie', x: 140, y: 136, width: 34, height: 18 },
  { id: 'd_nexa', agentId: 'agent_core', x: 252, y: 162, width: 50, height: 20 },
];

const CHAIRS = [
  { id: 'c1', x: 40, y: 48 },
  { id: 'c2', x: 90, y: 48 },
  { id: 'c3', x: 140, y: 48 },
  { id: 'c4', x: 40, y: 114 },
  { id: 'c5', x: 90, y: 114 },
  { id: 'c6', x: 140, y: 114 },
  { id: 'c_nexa', x: 252, y: 138, isExecutive: true },
];

const BOOKSHELVES = [
  { id: 'b1', x: 25, y: 26, width: 30, height: 16 },
  { id: 'b2', x: 70, y: 26, width: 30, height: 16 },
  { id: 'b3', x: 115, y: 26, width: 30, height: 16 },
  { id: 'file_exec', type: 'executive_cabinet', x: 288, y: 114, width: 22, height: 18 },
];

const PROPS = [
  { id: 'vending', type: 'vending', x: 195, y: 26, width: 20, height: 28 },
  { id: 'cooler', type: 'cooler', x: 220, y: 26, width: 14, height: 24 },
  { id: 'couch1', type: 'executive_couch', x: 202, y: 156, width: 28, height: 16 },
  { id: 'pool', type: 'pool', x: 260, y: 48, width: 48, height: 28 },
  { id: 'holo_display', type: 'holo_display', x: 252, y: 104, width: 38, height: 8 },
  { id: 'toilet', type: 'toilet', x: 165, y: 14, width: 18, height: 18 },
  { id: 'meeting_table', type: 'meeting_table', x: 40, y: 154, width: 36, height: 16 },
];

// Agent Initial Configuration & Specializations
const AGENT_CONFIG: Record<string, any> = {
  agent_core: { 
    id: 'agent_core', 
    name: 'Nexa', 
    role: 'CORE OVERSEER', 
    color: '#00e5ff', 
    sprite: 'nexa', 
    home: 'nexa',
    specialty: 'Autonomous orchestration, executive governance & self-repair',
    workThoughts: ['Executive directive dispatched...', 'Overseeing neural squad telemetry...', 'Reviewing core architecture...'],
    breakThoughts: ['Assessing executive strategy ☕', 'Calibrating global orchestrator...']
  },
  agent_kronos: { 
    id: 'agent_kronos', 
    name: 'Kronos', 
    role: 'STRATEGIST', 
    color: '#3b82f6', 
    sprite: 'kronos', 
    home: 'd1',
    specialty: 'Executive planning, workflow design & temporal analysis',
    workThoughts: ['Optimizing sprint roadmap...', 'Reviewing architecture diagrams...', 'Forecasting milestone risks...'],
    breakThoughts: ['Coffee first, strategy second ☕', 'Calculated odds are 98.4% 🎱']
  },
  agent_cypher: { 
    id: 'agent_cypher', 
    name: 'Cypher', 
    role: 'CYBER RECON', 
    color: '#f97316', 
    sprite: 'cypher', 
    home: 'd2',
    specialty: 'Cyber threat intel, code decompilation & crypto analysis',
    workThoughts: ['Decompiling byte streams...', 'Auditing zero-day payloads...', 'Running binary exploit checks...'],
    breakThoughts: ['Grabbing a neon energy drink 🥤', 'Checking network latency packets...']
  },
  agent_aura: { 
    id: 'agent_aura', 
    name: 'Aura', 
    role: 'CREATIVE & DESIGN', 
    color: '#a855f7', 
    sprite: 'aura', 
    home: 'd3',
    specialty: 'Visual synthesis, generative aesthetics & design UX',
    workThoughts: ['Crafting pixel-perfect layouts...', 'Tuning color harmonies...', 'Generating UI compositions...'],
    breakThoughts: ['Moodboarding inspiration ✨', 'Relaxing on the couch 🛋️']
  },
  agent_veritas: { 
    id: 'agent_veritas', 
    name: 'Veritas', 
    role: 'LOGIC & ETHICS', 
    color: '#10b981', 
    sprite: 'veritas', 
    home: 'd4',
    specialty: 'Fact-checking, bias detection & ethical guardrails',
    workThoughts: ['Validating premise truth tables...', 'Checking bias tolerances...', 'Auditing factual citations...'],
    breakThoughts: ['Ethics in AI review 📖', 'Contemplating quantum logic...']
  },
  agent_echo: { 
    id: 'agent_echo', 
    name: 'Echo', 
    role: 'COMMS & SIGNALS', 
    color: '#38bdf8', 
    sprite: 'echo', 
    home: 'd5',
    specialty: 'Protocol telemetry, multi-lingual audio & signal dispatch',
    workThoughts: ['Processing acoustic frequencies...', 'Synthesizing voice harmonics...', 'Routing incoming data packets...'],
    breakThoughts: ['Tuning signal frequencies 📻', 'Nice shot on the table! 🎱']
  },
  agent_valkyrie: { 
    id: 'agent_valkyrie', 
    name: 'Valkyrie', 
    role: 'DEFENSE & OPS', 
    color: '#ef4444', 
    sprite: 'valkyrie', 
    home: 'd6',
    specialty: 'Defensive shields, CI/CD pipeline ops & automated alerts',
    workThoughts: ['Patching edge nodes...', 'Enforcing perimeter firewalls...', 'Reviewing automated test runs...'],
    breakThoughts: ['Hydration is tactical 💧', 'Monitoring perimeter sensors...']
  },
};

const IDLE_DESTINATIONS = ['vending', 'cooler', 'pool_l', 'pool_r', 'pool_t', 'pool_b', 'couch', 'toilet', 'meeting_1', 'meeting_2'];

// --- RENDER HELPERS ---

const RenderSprite = ({ 
  agent, 
  isSpeaking, 
  isWorking, 
  isSitting, 
  isSelected,
  onSelect,
  celebrating,
  thought,
  activeTask
}: any) => {
  const sprite = SPRITES[agent.sprite];
  if (!sprite) return null;
  
  const drawX = agent.x - 4.5;
  const drawY = agent.y - 17;
  const scaleX = agent.facing === 'left' ? -1 : 1;

  let animClass = 'animate-[idle-bob_3s_infinite]';
  if (agent.isWalking) animClass = 'animate-[walk_0.3s_infinite]';
  else if (isSitting) {
    animClass = (isWorking || activeTask) ? 'animate-[desk-active-work_1.2s_infinite]' : 'animate-[desk-idle-work_5.5s_infinite]';
  }

  const skinColor = (agent.sprite === 'cypher' || agent.sprite === 'echo') ? PAL['3'] : PAL['2'];

  return (
    <g 
      transform={`translate(${drawX}, ${drawY})`} 
      onClick={(e) => {
        e.stopPropagation();
        onSelect(agent.id);
      }}
      className="cursor-pointer group/agent"
    >
      {/* Click target hit box */}
      <rect x="-8" y="-14" width="26" height="34" fill="transparent" />

      {/* Shadow */}
      {!isSitting && <ellipse cx="4.5" cy="16" rx="4" ry="1.5" fill="#000" opacity="0.4" />}
      
      {/* Sprite Pixels (mirrored if facing left) */}
      <g style={{ transformOrigin: '4.5px 8.5px', transform: `scaleX(${scaleX})` }}>
        <g 
          className={animClass}
          style={{ 
            transformOrigin: '4.5px 17px',
            animationDelay: agent.isWalking ? '0s' : `-${Math.abs((agent.x * 3 + agent.y * 7)) % 6}s`
          }}
        >
          {sprite.map((row: string, r: number) => row.split('').map((char, c) => (
             char !== ' ' ? <rect key={`${r}-${c}`} x={c} y={r} width="1.05" height="1.05" fill={PAL[char as keyof typeof PAL]} /> : null
          )))}

          {/* Dynamic typing hands resting on desk */}
          {isSitting && (
            <g transform="translate(0, 12)">
              {/* Left hand typing on keyboard */}
              <rect 
                x="1.2" 
                y="0" 
                width="1.8" 
                height="1.5" 
                fill={skinColor}
                stroke="#000"
                strokeWidth="0.3"
                rx="0.3"
                className="animate-[desk-hand-left_2.5s_infinite]"
                style={{ 
                  transformOrigin: '2px 0px',
                  animationDelay: `-${Math.abs(agent.x * 3) % 3}s` 
                }}
              />
              {/* Right hand on mouse & typing */}
              <rect 
                x="5.8" 
                y="0" 
                width="1.8" 
                height="1.5" 
                fill={skinColor}
                stroke="#000"
                strokeWidth="0.3"
                rx="0.3"
                className="animate-[desk-hand-right_3s_infinite]"
                style={{ 
                  transformOrigin: '6px 0px',
                  animationDelay: `-${Math.abs(agent.y * 5) % 3}s` 
                }}
              />
            </g>
          )}
        </g>
      </g>

      {/* Handheld food/drink item positioned cleanly to the side or on desk, NEVER over face/mouth */}
      {agent.holdingItem && Date.now() < (agent.holdingItem.expiresAt || 0) && (() => {
        // Compute item position outside face area (facing left = left side, facing right/sitting = right side)
        const itemX = isSitting ? 13.5 : (agent.facing === 'left' ? -4.5 : 13.5);
        const itemY = isSitting ? 10 : 11;
        return (
          <g transform={`translate(${itemX}, ${itemY})`}>
            <circle cx="1.5" cy="1.5" r="3" fill="#090d16" stroke="#f59e0b" strokeWidth="0.5" />
            <text x="1.5" y="2.6" fill="#fff" fontSize="3" textAnchor="middle">{agent.holdingItem.icon || '☕'}</text>
            {agent.holdingItem.type === 'drink' && (
              <text x="1.5" y="-1.5" fill="#e2e8f0" fontSize="2.2" className="animate-pulse">♨️</text>
            )}
          </g>
        );
      })()}

      {/* --- CONTEXT-AWARE LIVE THOUGHT BUBBLE --- */}
      {thought && !isSelected && (() => {
        // Truncate cleanly so bubble stays compact and readable
        const maxLen = 28;
        const displayThought = thought.length > maxLen ? thought.substring(0, maxLen - 2) + '..' : thought;
        const bubbleW = Math.min(Math.max(displayThought.length * 2.4 + 8, 28), 64);
        const bubbleH = 8.5;
        
        // Prevent thought bubble from overflowing top wall or sides
        const isNearTop = agent.y <= 60;
        const bubbleY = isNearTop ? -10 : -13;
        const strokeColor = activeTask ? '#10b981' : (agent.color || '#38bdf8');
        
        return (
          <g transform={`translate(4.5, ${bubbleY})`} className="animate-[fade-in_0.3s_ease-out] pointer-events-none">
            {/* Micro Thought Cloud Background */}
            <rect 
              x={-bubbleW / 2} 
              y={-bubbleH} 
              width={bubbleW} 
              height={bubbleH} 
              fill="#090d16" 
              stroke={strokeColor} 
              strokeWidth="0.7" 
              rx="2.5" 
              opacity="0.95"
              className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
            />
            {/* Stem dots */}
            <circle cx="0" cy="1" r="0.7" fill={strokeColor} />
            <circle cx="1" cy="2.2" r="0.4" fill={strokeColor} />
            {/* Text inside thought */}
            <text 
              x="0" 
              y={-3} 
              fill={activeTask ? '#34d399' : '#f8fafc'} 
              fontSize="3.4" 
              fontFamily="monospace" 
              fontWeight="bold"
              textAnchor="middle"
            >
              {displayThought}
            </text>
          </g>
        );
      })()}

      {/* Floating Name Tag ONLY when selected */}
      {isSelected && (
        <g transform="translate(4.5, -12)" className="animate-[fade-in_0.2s_ease-out]">
          {/* Background Card */}
          <rect 
            x="-22" 
            y="-11" 
            width="44" 
            height="12" 
            fill="#090d16" 
            stroke={agent.color || '#00e5ff'} 
            strokeWidth="0.9" 
            rx="2.5" 
            className="filter drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)]"
          />
          {/* Pointer Triangle */}
          <polygon 
            points="-2,1 2,1 0,3" 
            fill={agent.color || '#00e5ff'} 
          />
          {/* Agent Name */}
          <text 
            x="0" 
            y="-3" 
            fill="#ffffff" 
            fontSize="5.5" 
            fontFamily="monospace" 
            fontWeight="bold"
            textAnchor="middle"
            letterSpacing="0.5"
          >
            {agent.name.toUpperCase()}
          </text>
        </g>
      )}

      {/* Active Work Pulse Indicator */}
      {isWorking && !isSelected && !thought && (
        <g transform="translate(4.5, -5)">
          <circle cx="0" cy="0" r="1.2" fill="#10b981" className="animate-ping" />
          <circle cx="0" cy="0" r="1" fill="#34d399" />
        </g>
      )}
    </g>
  );
};

const RenderDesk = ({ id, agentId, x, y, width, height, onSelectDesk, isWorking, hasActiveTask, isWarRoom }: any) => {
  const drawX = x - width / 2;
  const drawY = y - height;
  
  const isD1 = id === 'd1';
  const isD2 = id === 'd2';
  const isD3 = id === 'd3';
  const isD4 = id === 'd4';
  const isD5 = id === 'd5';
  const isD6 = id === 'd6';
  const isNexa = id === 'd_nexa';

  // --- SPECIAL EXECUTIVE CABIN DESK FOR NEXA ---
  if (isNexa) {
    return (
      <g 
        transform={`translate(${drawX}, ${drawY})`}
        onClick={(e) => {
          if (agentId) {
            e.stopPropagation();
            onSelectDesk(agentId);
          }
        }}
        className="cursor-pointer group/nexa-desk"
      >
        {/* Obsidian Glass Desk Shadow & Base Underglow */}
        <rect x="0" y={height - 2} width={width} height="5" fill="#000" opacity="0.5" rx="2" />
        <rect x="1" y="2" width={width - 2} height={height} fill={isWarRoom ? "#ef4444" : "#00e5ff"} opacity="0.15" rx="3" className="animate-pulse" />
        
        {/* Luxury Obsidian Glass Chamfered Surface */}
        <rect x="0" y="0" width={width} height={height} fill="#0f172a" stroke={isWarRoom ? "#ef4444" : "#00e5ff"} strokeWidth="1" rx="2" />
        
        {/* Premium Carbon Leather Inlay */}
        <rect x="3" y="2" width={width - 6} height={height - 4} fill="#020617" stroke="#334155" strokeWidth="0.5" rx="1.5" />

        {/* --- DUAL CURVED HOLOGRAPHIC EXECUTIVE MONITORS --- */}
        <g transform={`translate(${width / 2 - 14}, 9)`}>
          {/* Chrome Dual Stand */}
          <rect x="11.5" y="0" width="5" height="1.8" fill="#94a3b8" rx="0.5" />
          
          {/* Curved Panoramic Holographic Bezels */}
          <rect x="0" y="1" width="28" height="9" fill="#030712" stroke={isWarRoom ? "#ef4444" : "#00e5ff"} strokeWidth="0.8" rx="1" />
          
          {/* Holographic Glowing Screen */}
          <rect x="1.5" y="2" width="25" height="7" fill={isWarRoom ? "#450a0a" : "#082f49"} />
          
          {/* Screen Light Cone Projection */}
          <polygon 
            points="2,9 26,9 30,15 -2,15" 
            fill={isWarRoom ? "#ef4444" : "#00e5ff"} 
            opacity={isWorking || isWarRoom ? "0.35" : "0.18"} 
            className="pointer-events-none"
          />

          {/* Neural & Waveform Telemetry Visualizer on Screen */}
          <line x1="3" y1="3.5" x2="16" y2="3.5" stroke={isWarRoom ? "#ef4444" : "#00e5ff"} strokeWidth="0.8" strokeLinecap="round" />
          <line x1="3" y1="5" x2="11" y2="5" stroke={isWarRoom ? "#fca5a5" : "#38bdf8"} strokeWidth="0.8" strokeLinecap="round" />
          <line x1="13" y1="5" x2="22" y2="5" stroke={isWarRoom ? "#ef4444" : "#4ade80"} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M 3 7.5 L 6 6 L 9 8 L 12 6.5 L 15 7.5 L 18 6 L 24 7.5" fill="none" stroke={isWarRoom ? "#f87171" : "#22d3ee"} strokeWidth="0.7" />
        </g>

        {/* --- EXECUTIVE MECHANICAL KEYBOARD & MOUSE --- */}
        <g transform={`translate(${width / 2 - 8}, 2)`}>
          <rect x="0" y="0" width="11" height="4.5" fill="#090d16" stroke="#00e5ff" strokeWidth="0.4" rx="0.5" />
          <rect x="1" y="0.8" width="9" height="1" fill="#00e5ff" />
          <rect x="1" y="2.2" width="9" height="1" fill="#e2e8f0" />
          <rect x="3" y="3.4" width="5" height="0.8" fill="#38bdf8" />
        </g>
        <g transform={`translate(${width / 2 + 6}, 2)`}>
          <rect x="0" y="0" width="6" height="5" fill="#090d16" stroke="#00e5ff" strokeWidth="0.3" rx="0.5" />
          <rect x="1.5" y="1" width="3" height="3.5" fill="#f8fafc" rx="0.8" />
          <rect x="2.5" y="1.3" width="1" height="1.2" fill="#00e5ff" />
        </g>

        {/* --- CORNER EXECUTIVE ACCESSORIES --- */}
        {/* Floating Holographic AI Core Orb on Left Corner */}
        <g transform="translate(3, 2)">
          <rect x="1" y="4" width="4" height="2" fill="#475569" rx="0.5" />
          <circle cx="3" cy="2.5" r="2.2" fill={isWarRoom ? "#ef4444" : "#00e5ff"} opacity="0.85" className="animate-pulse" />
          <circle cx="3" cy="2.5" r="1" fill="#ffffff" />
        </g>

        {/* Executive Gold/Cyan Placard on Right Corner */}
        <g transform={`translate(${width - 9}, 3)`}>
          <rect x="0" y="0" width="7" height="3" fill="#090d16" stroke="#fbbf24" strokeWidth="0.5" rx="0.5" />
          <rect x="1" y="1" width="5" height="1" fill="#fbbf24" />
        </g>
      </g>
    );
  }

  return (
    <g 
      transform={`translate(${drawX}, ${drawY})`}
      onClick={(e) => {
        if (agentId) {
          e.stopPropagation();
          onSelectDesk(agentId);
        }
      }}
      className="cursor-pointer"
    >
      {/* Desk Shadow & Solid Surface */}
      <rect x="0" y={height - 2} width={width} height="4" fill="#000" opacity="0.3" />
      <rect x="0" y="0" width={width} height={height} fill="#e2e8f0" stroke={hasActiveTask ? "#10b981" : "#94a3b8"} strokeWidth={hasActiveTask ? 1.2 : 1} rx="1" />
      
      {/* Premium Desk Mat */}
      <rect x="2" y="1" width={width - 4} height={height - 2} fill="#1e293b" rx="1" opacity="0.95" />

      {/* --- PROMINENT MECHANICAL KEYBOARD --- */}
      <g transform={`translate(${width / 2 - 7}, 2)`}>
        {/* Keyboard Base Plate */}
        <rect x="0" y="0" width="10.5" height="4.5" fill="#0f172a" stroke="#475569" strokeWidth="0.4" rx="0.5" />
        {/* Backlit Keycap Rows */}
        <rect x="0.8" y="0.8" width="8.9" height="1" fill="#94a3b8" />
        <rect x="0.8" y="2.2" width="8.9" height="1" fill="#cbd5e1" />
        {/* Glowing Spacebar */}
        <rect x="3" y="3.4" width="4.5" height="0.8" fill={hasActiveTask ? "#10b981" : "#38bdf8"} />
      </g>

      {/* --- PRECISION OPTICAL MOUSE & MOUSEPAD --- */}
      <g transform={`translate(${width / 2 + 5}, 1.8)`}>
        {/* Mousepad */}
        <rect x="0" y="0" width="6" height="5.5" fill="#0b0f19" stroke={hasActiveTask ? "#10b981" : "#38bdf8"} strokeWidth="0.3" rx="0.5" />
        {/* Ergonomic Optical Mouse */}
        <rect x="1.5" y="1" width="2.8" height="3.6" fill="#f8fafc" stroke="#475569" strokeWidth="0.3" rx="0.8" />
        {/* RGB Scroll Wheel */}
        <rect x="2.5" y="1.4" width="0.8" height="1.2" fill={hasActiveTask ? "#10b981" : "#00e5ff"} />
      </g>

      {/* --- DESKTOP TERMINAL MONITOR WITH NIGHT SCREEN GLOW --- */}
      <g transform={`translate(${width / 2 - 9}, 8)`}>
        {/* Monitor Stand Base */}
        <rect x="6.5" y="0" width="5" height="1.5" fill="#475569" rx="0.5" />
        {/* Monitor Bezel Frame */}
        <rect x="0" y="1" width="18" height="8" fill="#090d16" stroke={isWarRoom ? "#ef4444" : hasActiveTask ? "#10b981" : "#475569"} strokeWidth="0.6" rx="0.8" />
        {/* Active Glowing Screen */}
        <rect x="1.2" y="2" width="15.6" height="6" fill={isWarRoom ? "#450a0a" : hasActiveTask ? "#064e3b" : "#0f172a"} />
        
        {/* Screen Ambient Light Glow cone */}
        <polygon 
          points="2,8 16,8 19,13 -1,13" 
          fill={isWarRoom ? "#ef4444" : hasActiveTask ? "#10b981" : "#38bdf8"} 
          opacity={isWorking || hasActiveTask || isWarRoom ? "0.28" : "0.1"} 
          className="pointer-events-none"
        />

        {/* Code & Matrix Lines */}
        <line x1="2.5" y1="3.5" x2="11" y2="3.5" stroke={isWarRoom ? "#f87171" : hasActiveTask ? "#34d399" : "#38bdf8"} strokeWidth="0.7" strokeLinecap="round" />
        <line x1="2.5" y1="5" x2="8" y2="5" stroke={isWarRoom ? "#ef4444" : hasActiveTask ? "#10b981" : "#4ade80"} strokeWidth="0.7" strokeLinecap="round" />
        <line x1="9.5" y1="5" x2="14.5" y2="5" stroke={isWarRoom ? "#fca5a5" : hasActiveTask ? "#a7f3d0" : "#f43f5e"} strokeWidth="0.7" strokeLinecap="round" />
        <line x1="2.5" y1="6.5" x2="6.5" y2="6.5" stroke={isWarRoom ? "#ef4444" : hasActiveTask ? "#6ee7b7" : "#fbbf24"} strokeWidth="0.7" strokeLinecap="round" />
      </g>

      {/* --- PERSONALIZED DESK ACCESSORIES & CLUTTER --- */}
      {/* Left Clutter */}
      {isD1 && (
         <g transform="translate(3, 3)">
            <rect x="0" y="0" width="5" height="7" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="0.4" />
            <rect x="1" y="-1" width="4.5" height="6" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.4" />
         </g>
      )}
      {isD2 && (
         <g transform="translate(3, 2)">
            <rect x="1" y="3" width="3" height="3" fill="#d97706" />
            <circle cx="2.5" cy="2.5" r="2.5" fill="#22c55e" />
         </g>
      )}
      {isD3 && (
         <g transform="translate(2, 4)">
            <rect x="0" y="0" width="6" height="5" fill="#fff" stroke="#ccc" strokeWidth="0.4" transform="rotate(-8 3 2)" />
            <rect x="2" y="1" width="6" height="5" fill="#fff" stroke="#ccc" strokeWidth="0.4" transform="rotate(4 5 3)" />
         </g>
      )}
      {isD4 && (
         <g transform="translate(3, 2)">
            <rect x="0" y="0" width="3.5" height="4.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.4" rx="0.8" />
            <path d="M 3.5 1 C 5 1, 5 3.5, 3.5 3.5" fill="none" stroke="#94a3b8" strokeWidth="0.8" />
         </g>
      )}
      {isD5 && (
         <g transform="translate(2, 2)">
            <rect x="1" y="3.5" width="3.5" height="3" fill="#a16207" />
            <path d="M 1 3.5 Q 2.8 -1 4.5 3.5 Z" fill="#15803d" />
         </g>
      )}
      {isD6 && (
         <g transform="translate(2, 3)">
            <rect x="0" y="0" width="4.5" height="6" fill="#10b981" stroke="#047857" strokeWidth="0.4" />
            <rect x="5.5" y="1.5" width="0.8" height="4.5" fill="#1e293b" transform="rotate(15 5.5 1.5)" />
         </g>
      )}

      {/* Right Clutter / Coffee Mugs */}
      {isD1 && (
         <g transform="translate(width - 6, 2)">
            <rect x="0" y="0" width="3.5" height="4.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.4" rx="0.8" />
            <path d="M 3.5 1 C 5 1, 5 3.5, 3.5 3.5" fill="none" stroke="#94a3b8" strokeWidth="0.8" />
         </g>
      )}
      {isD2 && (
         <g transform="translate(width - 7, 4)">
            <rect x="0" y="0" width="5" height="6" fill="#fff" stroke="#ccc" strokeWidth="0.4" transform="rotate(12 2.5 2.5)" />
         </g>
      )}
      {isD3 && (
         <g transform="translate(width - 5.5, 2)">
            <rect x="1" y="2.5" width="2.5" height="2.5" fill="#d97706" />
            <rect x="1.2" y="0" width="1.8" height="2.5" fill="#22c55e" rx="0.8" />
         </g>
      )}
      {isD4 && (
         <g transform="translate(width - 8, 3)">
            <rect x="0" y="0" width="5" height="7" fill="#eab308" stroke="#a16207" strokeWidth="0.4" />
         </g>
      )}
      {isD5 && (
         <g transform="translate(width - 6, 2)">
            <rect x="0" y="0" width="3.5" height="4.5" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="0.4" rx="0.8" />
            <path d="M 0 1 C -1.5 1, -1.5 3.5, 0 3.5" fill="none" stroke="#1d4ed8" strokeWidth="0.8" />
         </g>
      )}
      {isD6 && (
         <g transform="translate(width - 6, 2)">
            <rect x="1" y="2.5" width="3.5" height="3.5" fill="#b45309" />
            <circle cx="2.7" cy="2" r="1.8" fill="#10b981" />
         </g>
      )}
    </g>
  );
};

const RenderBookshelf = ({ x, y, width, height, type }: any) => {
  const drawX = x - width / 2;
  const drawY = y - height;

  if (type === 'executive_cabinet') {
     return (
        <g transform={`translate(${drawX}, ${drawY})`}>
          <rect x="0" y={height} width={width} height="3" fill="#000" opacity="0.4" />
          <rect x="0" y="0" width={width} height={height} fill="#090d16" stroke="#00e5ff" strokeWidth="0.8" rx="1" />
          <rect x="2" y="2" width={width - 4} height={height / 2 - 2} fill="#0f172a" stroke="#1e293b" strokeWidth="0.5" />
          <rect x="2" y={height / 2 + 1} width={width - 4} height={height / 2 - 3} fill="#0f172a" stroke="#1e293b" strokeWidth="0.5" />
          {/* Executive Quantum Core Node / Data Crystals */}
          <rect x="4" y="4" width="3" height="4" fill="#00e5ff" className="animate-pulse" />
          <rect x="9" y="4" width="3" height="4" fill="#38bdf8" />
          <rect x="14" y="4" width="3" height="4" fill="#a855f7" />
          {/* Handles */}
          <rect x={width / 2 - 3} y={height / 2 + 3} width="6" height="1.5" fill="#00e5ff" rx="0.5" />
        </g>
     );
  }

  return (
    <g transform={`translate(${drawX}, ${drawY})`}>
      <rect x="0" y={height} width={width} height="3" fill="#000" opacity="0.3" />
      <rect x="0" y="0" width={width} height={height} fill="#475569" stroke="#1e293b" strokeWidth="1" />
      <rect x="0" y={height / 2} width={width} height="1" fill="#1e293b" />
      <rect x="4" y="2" width="2" height="6" fill="#ef4444" />
      <rect x="8" y="3" width="2" height="5" fill="#22c55e" />
      <rect x="12" y="2" width="2" height="6" fill="#3b82f6" />
      <rect x="6" y={height / 2 + 2} width="2" height="6" fill="#eab308" />
      <rect x="10" y={height / 2 + 3} width="3" height="5" fill="#f97316" />
    </g>
  );
};

const RenderProp = ({ type, x, y, width, height, onOpenPool, onOpenCoffee, onOpenVending, onOpenCommandWall }: any) => {
  if (type === 'vending') {
    return (
      <g 
        transform={`translate(${x - width/2}, ${y - height})`}
        onClick={(e) => {
          e.stopPropagation();
          if (onOpenVending) onOpenVending();
        }}
        className="cursor-pointer group"
      >
        <rect x="0" y={height} width={width} height="4" fill="#000" opacity="0.3" />
        <rect x="0" y="0" width={width} height={height} fill="#d32f2f" stroke="#1a1a1a" strokeWidth="1" />
        <rect x="2" y="2" width={width-4} height="16" fill="#81d4fa" stroke="#1a1a1a" strokeWidth="0.5" opacity="0.8" />
        <rect x="4" y="5" width="4" height="4" fill="#4caf50" />
        <rect x="10" y="5" width="4" height="4" fill="#ffeb3b" />
        <rect x="4" y="11" width="4" height="4" fill="#ff9800" />
        <rect x="10" y="11" width="4" height="4" fill="#9c27b0" />
        <rect x="2" y="20" width={width-4} height="6" fill="#111" />
        {/* Vending Label */}
        <text x={width / 2} y="-2" fill="#ef4444" fontSize="3" fontFamily="monospace" fontWeight="bold" textAnchor="middle" className="group-hover:scale-110 transition-transform">
          🍿 VENDING
        </text>
        <circle cx={width / 2} cy="-6" r="1" fill="#fff" opacity="0.6" className="animate-ping" />
      </g>
    );
  }
  if (type === 'cooler') {
    return (
      <g 
        transform={`translate(${x - width/2}, ${y - height})`}
        onClick={(e) => {
          e.stopPropagation();
          if (onOpenCoffee) onOpenCoffee();
        }}
        className="cursor-pointer group"
      >
        <rect x="0" y={height} width={width} height="4" fill="#000" opacity="0.3" />
        <rect x="0" y="10" width={width} height={height-10} fill="#f5f5f5" stroke="#1a1a1a" strokeWidth="1" />
        <path d={`M 2 10 L ${width-2} 10 L ${width-4} 2 L 4 2 Z`} fill="#81d4fa" stroke="#1a1a1a" strokeWidth="0.5" opacity="0.6" />
        <rect x="3" y="14" width="2" height="2" fill="#f44336" />
        <rect x="9" y="14" width="2" height="2" fill="#2196f3" />
      </g>
    );
  }
  if (type === 'executive_couch') {
    return (
      <g transform={`translate(${x - width/2}, ${y - height})`}>
        <rect x="0" y={height - 2} width={width} height="4" fill="#000" opacity="0.4" rx="2" />
        {/* Luxury Obsidian Executive Leather Sofa */}
        <rect x="0" y="4" width={width} height={height-4} fill="#090d16" stroke="#00e5ff" strokeWidth="0.7" rx="2" />
        <rect x="2" y="0" width={width-4} height={height-6} fill="#0f172a" stroke="#334155" strokeWidth="0.5" rx="1.5" />
        <rect x="4" y="2" width={width-8} height="2" fill="#00e5ff" opacity="0.4" />
      </g>
    );
  }
  if (type === 'holo_display') {
     return (
        <g 
          transform={`translate(${x - width/2}, ${y - height})`}
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenCommandWall) onOpenCommandWall();
          }}
          className="cursor-pointer group"
        >
           <rect x="0" y={height} width={width} height="3" fill="#000" opacity="0.3" />
           {/* Wall Mounted Frameless Holographic Glass Matrix Display */}
           <rect x="0" y="0" width={width} height={height} fill="#030712" stroke="#00e5ff" strokeWidth="0.8" rx="1" />
           <rect x="1" y="1" width={width - 2} height={height - 2} fill="#082f49" opacity="0.8" />
           <text x={width/2} y="5.5" fill="#00e5ff" fontSize="3.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle" letterSpacing="0.8">
             NEXA // GLOBAL SQUAD MATRIX
           </text>
           <rect x={width/2 - 12} y="7" width="24" height="1" fill="#38bdf8" className="animate-pulse" />
        </g>
     );
  }
  if (type === 'pool') {
    const drawX = x - width / 2;
    const drawY = y - height;
    return (
       <g 
         transform={`translate(${drawX}, ${drawY})`}
         onClick={(e) => {
           e.stopPropagation();
           if (onOpenPool) onOpenPool();
         }}
         className="cursor-pointer group"
       >
          <rect x="0" y={height - 2} width={width} height="6" fill="#000" opacity="0.3" />
          <rect x="0" y="0" width={width} height={height} fill="#5e3815" stroke="#1a1a1a" strokeWidth="1" rx="2" />
          <rect x="3" y="3" width={width - 6} height={height - 6} fill="#2e7d32" stroke="#1a1a1a" strokeWidth="0.5" />
          
          <circle cx="4" cy="4" r="2.5" fill="#111" />
          <circle cx={width/2} cy="3.5" r="2" fill="#111" />
          <circle cx={width - 4} cy="4" r="2.5" fill="#111" />
          <circle cx="4" cy={height - 4} r="2.5" fill="#111" />
          <circle cx={width/2} cy={height - 3.5} r="2" fill="#111" />
          <circle cx={width - 4} cy={height - 4} r="2.5" fill="#111" />
          
          <circle cx={width/2 - 10} cy={height/2} r="1.5" fill="#fff" />
          <circle cx={width/2 + 6} cy={height/2 - 3} r="1.5" fill="#ffeb3b" />
          <circle cx={width/2 + 8} cy={height/2 + 2} r="1.5" fill="#f44336" />
          <circle cx={width/2 + 10} cy={height/2 - 1} r="1.5" fill="#111" />
          <circle cx={width/2 + 12} cy={height/2 + 4} r="1.5" fill="#2196f3" />
          
          <line x1={width/2 - 16} y1={height/2 + 4} x2={width/2 - 4} y2={height/2 + 1} stroke="#d7ccc8" strokeWidth="1" strokeLinecap="round" />
          
          {/* Animated 8-Ball badge on hover */}
          <g transform={`translate(${width/2 - 6}, -5)`} className="opacity-80 group-hover:opacity-100 transition-opacity">
            <rect x="-4" y="-3" width="20" height="6" fill="#090d16" stroke="#00e5ff" strokeWidth="0.5" rx="1.5" />
            <text x="6" y="1.2" fill="#00e5ff" fontSize="2.8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              🎱 PLAY
            </text>
          </g>
       </g>
    );
  }
  if (type === 'meeting_table') {
    return (
      <g transform={`translate(${x - width/2}, ${y - height})`}>
        <rect x="0" y={height - 2} width={width} height="4" fill="#000" opacity="0.3" rx="1" />
        <rect x="4" y="4" width={width-8} height={height-8} fill="#f8fafc" stroke="#64748b" strokeWidth="0.8" rx="2" />
        <rect x="5" y="5" width={width-10} height={height-10} fill="#f1f5f9" />
        <rect x="8" y="7" width="5" height="4" fill="#334155" rx="0.5" />
        <rect x="9" y="8" width="3" height="2" fill="#0ea5e9" />
        <rect x="18" y="5" width="5" height="4" fill="#334155" rx="0.5" />
        <rect x="19" y="6" width="3" height="2" fill="#10b981" />
        <rect x="26" y="9" width="5" height="4" fill="#334155" rx="0.5" />
        <rect x="27" y="10" width="3" height="2" fill="#8b5cf6" />
        <circle cx={width/2} cy={height/2} r="2" fill="#0f172a" stroke="#0ea5e9" strokeWidth="0.5" />
        <circle cx={width/2} cy={height/2} r="0.5" fill="#0ea5e9" className="animate-ping" />
      </g>
    );
  }
  if (type === 'toilet') {
    return (
      <g transform={`translate(${x - width/2}, ${y - height})`}>
        <rect x="0" y={height - 2} width={width} height="2" fill="#000" opacity="0.2" />
        <rect x="0" y="0" width={width} height={height} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
        <rect x="2" y="2" width={width-4} height={height-4} fill="#f8fafc" />
        <rect x="4" y={height-2} width={10} height="2" fill="#cbd5e1" />
        <rect x="7" y="4" width="4" height="4" fill="#3b82f6" rx="0.5" />
        <circle cx="9" cy="5" r="0.8" fill="#fff" />
        <line x1="9" y1="6" x2="9" y2="7.5" stroke="#fff" strokeWidth="0.5" />
        <text x="9" y="12" fill="#64748b" fontSize="3" fontWeight="bold" textAnchor="middle">WC</text>
      </g>
    );
  }
  return null;
};

// --- GUIDED TOUR CONFIGURATION ---
const TOUR_STOPS = [
  {
    id: 'nexa_cabin',
    title: 'NEXA EXECUTIVE CABIN',
    subtitle: 'Flagship Command & Multi-Agent Orchestration',
    viewBox: '125 70 195 110',
    spotlight: { cx: 247, cy: 135, r: 36 },
    badge: 'COMMAND HQ',
    narration: "Welcome to the Nexa Operations Headquarters! I am Nexa, orchestrating our global multi-agent intelligence from the Executive Cabin. Here I coordinate complex pipelines, memory vaults, and real-time core systems."
  },
  {
    id: 'break_lounge',
    title: 'RECREATION & BREAK LOUNGE',
    subtitle: 'Championship Pool Table, Espresso Cooler & Vending Area',
    viewBox: '160 0 160 100',
    spotlight: { cx: 245, cy: 50, r: 35 },
    badge: 'RECHARGE ZONE',
    narration: "This is our break lounge with the championship pool table and energy cooler. Whenever computational load is high, agents step over here to unwind and recharge their neural parameters."
  },
  {
    id: 'senior_row',
    title: 'SENIOR ARCHITECTURE & DESIGN',
    subtitle: 'Kronos (Strategy) • Cypher (Security) • Aura (Design)',
    viewBox: '0 10 190 105',
    spotlight: { cx: 90, cy: 55, r: 46 },
    badge: 'WORKSTATIONS 1 - 3',
    narration: "At the upper bullpen: Kronos manages sprint timelines and strategic roadmap. Cypher handles cybersecurity and database architecture. And Aura designs generative visuals and brand aesthetics."
  },
  {
    id: 'defense_row',
    title: 'DEFENSE, VOICE & RESEARCH',
    subtitle: 'Echo (Voice AI) • Veritas (Fact Check) • Valkyrie (Security)',
    viewBox: '0 65 190 115',
    spotlight: { cx: 90, cy: 120, r: 46 },
    badge: 'WORKSTATIONS 4 - 6',
    narration: "At the lower bullpen: Echo synthesizes high-fidelity voice acoustics. Veritas verifies research and web data. And Valkyrie enforces real-time system defense and error repair."
  },
  {
    id: 'full_office',
    title: 'ALL SQUAD AGENTS SYNCHRONIZED',
    subtitle: 'Global AI Matrix Ready For Deployment',
    viewBox: '0 0 320 180',
    spotlight: { cx: 160, cy: 90, r: 70 },
    badge: '6/6 SQUAD ONLINE',
    narration: "All squad agents and Nexa Core are active and synchronized. Tap any workstation to chat directly or issue a voice command to begin!"
  }
];

// --- MAIN ENGINE COMPONENT ---

export const AgentVirtualOffice = ({ 
  activeAgentId, 
  hudState,
  user,
  onDirectChat,
  onClose
}: { 
  activeAgentId: string | null, 
  hudState: string | null,
  user?: UserProfile | null,
  onDirectChat?: (agentName: string) => void,
  onClose?: () => void
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isCelebration, setIsCelebration] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const currentTimeHour = currentDate.getHours();
  const [isMinimized, setIsMinimized] = useState(false);

  const formatTime12 = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes}${ampm}`;
  };

  // --- INTERACTIVE FEATURE MODAL STATES ---
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [showCoffeeModal, setShowCoffeeModal] = useState(false);
  const [showDispatcherModal, setShowDispatcherModal] = useState(false);
  const [dispatcherAgentId, setDispatcherAgentId] = useState<string | null>(null);
  const [showCommandWallModal, setShowCommandWallModal] = useState(false);
  const [showCustomizerModal, setShowCustomizerModal] = useState(false);
  const [isWarRoomActive, setIsWarRoomActive] = useState(false);
  const [teamMorale, setTeamMorale] = useState(94);
  const [activeTasks, setActiveTasks] = useState<Record<string, TaskAssignment>>({});

  // Office Theme State with localStorage persistence
  const [officeTheme, setOfficeTheme] = useState<OfficeTheme>(() => {
    try {
      const saved = localStorage.getItem('nexa_office_theme');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      flooring: 'hardwood',
      neonAccent: 'cyan',
      wallColor: '#090d16',
      deskTheme: 'minimal'
    };
  });

  const handleSaveTheme = (newTheme: OfficeTheme) => {
    setOfficeTheme(newTheme);
    try {
      localStorage.setItem('nexa_office_theme', JSON.stringify(newTheme));
    } catch (e) {}
    officeAudio?.playBlip?.();
  };

  // Guided Tour State
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [isSpeakingTour, setIsSpeakingTour] = useState(false);
  const tourTimerRef = useRef<any>(null);

  const startGuidedTour = () => {
    setIsTourActive(true);
    setTourStep(0);
    setSelectedAgentId(null);
    runTourStep(0);
  };

  const exitGuidedTour = () => {
    setIsTourActive(false);
    setIsSpeakingTour(false);
    if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
    stopTextTTS();
  };

  const runTourStep = (stepIdx: number) => {
    if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
    stopTextTTS();
    const stop = TOUR_STOPS[stepIdx];
    if (!stop) return;

    const activeUser: UserProfile = user || ({
      id: 'default_admin',
      name: 'Chandan',
      role: 'ADMIN',
      voice: 'Aoede',
      naughtyMode: false
    } as any);

    speakTextTTS(
      activeUser,
      stop.narration,
      false,
      () => setIsSpeakingTour(true),
      () => {
        setIsSpeakingTour(false);
        tourTimerRef.current = setTimeout(() => {
          if (stepIdx < TOUR_STOPS.length - 1) {
            setTourStep(stepIdx + 1);
            runTourStep(stepIdx + 1);
          } else {
            tourTimerRef.current = setTimeout(() => {
              setIsTourActive(false);
            }, 3000);
          }
        }, 1200);
      }
    ).catch(() => {
      setIsSpeakingTour(false);
    });
  };

  const goToTourStep = (stepIdx: number) => {
    if (stepIdx < 0 || stepIdx >= TOUR_STOPS.length) return;
    setTourStep(stepIdx);
    runTourStep(stepIdx);
  };

  useEffect(() => {
    return () => {
      if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
      stopTextTTS();
    };
  }, []);

  // 1. Live Time of Day Watcher for Real-time Lighting & Clock Display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // 2. Trigger Celebration on HUD state transitions to SUCCESS after processing
  useEffect(() => {
    if (hudState === 'SUCCESS') {
      setIsCelebration(true);
      const timer = setTimeout(() => setIsCelebration(false), 4500);
      return () => clearTimeout(timer);
    }
  }, [hudState]);

  // 3. Initialize State at defined graph nodes with thought rotation
  const [agents, setAgents] = useState<Record<string, any>>(() => {
    const initialState: Record<string, any> = {};
    Object.keys(AGENT_CONFIG).forEach(id => {
      const homeNodeId = AGENT_CONFIG[id].home;
      initialState[id] = { 
        ...AGENT_CONFIG[id], 
        x: NODES[homeNodeId].x, 
        y: NODES[homeNodeId].y,
        currentNode: homeNodeId,
        path: [],
        isWalking: false,
        facing: 'down',
        isChatting: false,
        currentThought: '',
        nextMoveTime: Date.now() + 120000 + Math.random() * 180000
      };
    });
    return initialState;
  });

  // 4. Handle Active Agent logic (Force walk to home via graph)
  useEffect(() => {
    if (activeAgentId) {
      setAgents(prev => {
        if (!prev[activeAgentId]) return prev;
        const agent = prev[activeAgentId];
        const target = agent.home;
        
        const currentDest = agent.path.length > 0 ? agent.path[agent.path.length - 1] : agent.currentNode;
        const thoughts = agent.workThoughts || ['Processing task...'];
        const randomThought = thoughts[Math.floor(Math.random() * thoughts.length)];

        if (currentDest !== target) {
           return {
              ...prev,
              [activeAgentId]: {
                 ...agent,
                 path: findPath(agent.currentNode, target),
                 isChatting: false,
                 currentThought: randomThought
              }
           };
        } else {
          return {
            ...prev,
            [activeAgentId]: {
              ...agent,
              currentThought: randomThought
            }
          };
        }
      });
    }
  }, [activeAgentId, hudState]);

  // 5. Natural Wandering & Dynamic Thought Rotation AI
  useEffect(() => {
    const aiInterval = setInterval(() => {
      const now = Date.now();

      setAgents(prev => {
        const next = { ...prev };
        
        const occupied = new Set();
        let agentsOnBreak = 0;

        Object.values(next).forEach(a => {
           if (a.path && a.path.length > 0) occupied.add(a.path[a.path.length - 1]);
           else occupied.add(a.currentNode);
           
           const destination = a.path && a.path.length > 0 ? a.path[a.path.length - 1] : a.currentNode;
           if (destination !== a.home) {
               agentsOnBreak++;
           }
        });

        Object.keys(next).forEach(id => {
          if (id === activeAgentId) {
             next[id].nextMoveTime = now + 10000;
             return;
          }
          
          const agent = next[id];
          const hasTask = Boolean(activeTasks[id] && (activeTasks[id].progress === undefined || activeTasks[id].progress < 100));
          
          // If agent has an active assigned task, ensure they stay at their desk working
          if (hasTask) {
            if (agent.currentNode !== agent.home && (!agent.path || agent.path.length === 0)) {
              next[id] = {
                ...agent,
                path: findPath(agent.currentNode, agent.home),
                nextMoveTime: now + 60000,
                isChatting: false
              };
            }
            return;
          }

          if (!agent.isWalking && (!agent.path || agent.path.length === 0)) {
             
             if (now > agent.nextMoveTime) {
                let dest = agent.home;
                let nextDelay = 120000 + Math.random() * 180000;
                
                if (agent.currentNode === agent.home) {
                   if (agentsOnBreak < 3 && Math.random() < 0.25) {
                      const available = IDLE_DESTINATIONS.filter(d => !occupied.has(d));
                      if (available.length > 0) {
                         dest = available[Math.floor(Math.random() * available.length)];
                         nextDelay = 60000 + Math.random() * 60000;
                         agentsOnBreak++;
                      }
                   }
                } else {
                   if (Math.random() < 0.3) {
                      const available = IDLE_DESTINATIONS.filter(d => !occupied.has(d) && d !== agent.currentNode);
                      if (available.length > 0) {
                         dest = available[Math.floor(Math.random() * available.length)];
                         nextDelay = 30000 + Math.random() * 30000;
                      }
                   } else {
                      dest = agent.home;
                      nextDelay = 120000 + Math.random() * 180000;
                   }
                }
                
                const isBreak = dest !== agent.home;
                const thoughtPool = isBreak ? (agent.breakThoughts || ['Taking a break...']) : (agent.workThoughts || ['Analyzing...']);
                const nextThought = Math.random() < 0.4 ? thoughtPool[Math.floor(Math.random() * thoughtPool.length)] : '';

                if (dest !== agent.currentNode) {
                   next[id] = { 
                      ...agent, 
                      path: findPath(agent.currentNode, dest), 
                      nextMoveTime: now + nextDelay,
                      isChatting: false,
                      currentThought: nextThought
                   };
                   occupied.add(dest);
                } else {
                   next[id] = { 
                      ...agent, 
                      nextMoveTime: now + nextDelay,
                      isChatting: Math.random() < 0.3 && agent.currentNode !== agent.home,
                      currentThought: nextThought
                   };
                }
             }
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(aiInterval);
  }, [activeAgentId]);

  // 6. Physics Engine Loop (Moves point-to-point along graph)
  useEffect(() => {
    const physicsInterval = setInterval(() => {
      setAgents(prev => {
        let changed = false;
        const next = { ...prev };
        
        Object.keys(next).forEach(id => {
          const agent = { ...next[id] };
          
          if (agent.path && agent.path.length > 0) {
            changed = true;
            const targetNodeId = agent.path[0];
            const targetNode = NODES[targetNodeId];
            
            const dx = targetNode.x - agent.x;
            const dy = targetNode.y - agent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = 1.0;

            if (dist <= speed) {
              agent.x = targetNode.x;
              agent.y = targetNode.y;
              agent.currentNode = targetNodeId;
              agent.path = agent.path.slice(1);
              
              if (agent.path.length === 0) {
                agent.isWalking = false;
                if (['d1','d2','d3','d4','d5','d6','nexa'].includes(agent.currentNode)) agent.facing = 'down';
                else if (['vending', 'cooler'].includes(agent.currentNode)) agent.facing = 'up';
                else if (agent.currentNode === 'pool_l') agent.facing = 'right';
                else if (agent.currentNode === 'pool_r') agent.facing = 'left';
                else if (agent.currentNode === 'pool_t') agent.facing = 'down';
                else if (agent.currentNode === 'pool_b') agent.facing = 'up';
                else agent.facing = 'down';
              }
            } else {
              agent.x += (dx / dist) * speed;
              agent.y += (dy / dist) * speed;
              agent.isWalking = true;
              
              if (Math.abs(dx) > Math.abs(dy)) {
                agent.facing = dx > 0 ? 'right' : 'left';
              } else {
                agent.facing = dy > 0 ? 'down' : 'up';
              }
            }
            next[id] = agent;
          } else if (agent.isWalking) {
            changed = true;
            agent.isWalking = false;
            next[id] = agent;
          }
        });
        return changed ? next : prev;
      });
    }, 33);
    return () => clearInterval(physicsInterval);
  }, []);

  // 7. Y-Sorting: Build unified render list
  const renderList = [
    ...CHAIRS.map(c => ({ ...c, category: 'chair' })),
    ...DESKS.map(d => ({ ...d, category: 'desk' })),
    ...BOOKSHELVES.map(b => ({ ...b, category: 'bookshelf' })),
    ...PROPS.map(p => ({ ...p, category: 'prop' })),
    ...Object.entries(agents).map(([id, a]) => ({ ...a, id, category: 'agent' }))
  ];
  
  // Sort by bottom Y coordinate for clean depth ordering
  renderList.sort((a, b) => a.y - b.y);

  const isGlobalProcessing = hudState === 'PROCESSING' || hudState === 'THINKING';

  // Day / Dusk / Night Lighting Calculation
  const isNight = currentTimeHour >= 19 || currentTimeHour < 6;
  const isDusk = (currentTimeHour >= 17 && currentTimeHour < 19) || (currentTimeHour >= 6 && currentTimeHour < 8);
  const selectedAgent = selectedAgentId ? agents[selectedAgentId] : null;

  // Toggle War Room Emergency Protocol
  const toggleWarRoom = () => {
    setIsWarRoomActive(prev => {
      const nextVal = !prev;
      if (nextVal) {
        officeAudio?.playAlert?.();
        // Route all agents to unique spots in Executive cabin zone for emergency briefing
        const cabinSpots = {
          'agent_core': 'nexa', // Nexa stays at her desk
          'agent_kronos': 'nexa_out',
          'agent_cypher': 'cabin_lobby',
          'agent_valkyrie': 'couch',
          'agent_echo': 'cabin_left',
          'agent_veritas': 'door_cabin',
          'agent_aura': 'cabin_right'
        };
        setAgents(prevAgents => {
          const nextAgents = { ...prevAgents };
          Object.keys(nextAgents).forEach((id) => {
            const targetNode = (cabinSpots as any)[id] || 'cabin_lobby';
            const agent = nextAgents[id];
            nextAgents[id] = {
              ...agent,
              path: findPath(agent.currentNode, targetNode),
              currentThought: id === 'agent_core' ? '🚨 WAR ROOM: INITIATING EMERGENCY PROTOCOL' : '🚨 Executive Briefing in Cabin',
              isChatting: true
            };
          });
          return nextAgents;
        });
      } else {
        officeAudio?.playChime?.();
        // Return agents to home workstations
        setAgents(prevAgents => {
          const nextAgents = { ...prevAgents };
          Object.keys(nextAgents).forEach(id => {
            const agent = nextAgents[id];
            nextAgents[id] = {
              ...agent,
              path: findPath(agent.currentNode, agent.home),
              currentThought: 'Normal ops resumed.'
            };
          });
          return nextAgents;
        });
      }
      return nextVal;
    });
  };

  // Live Real-Time Agent Task Lifecycle & Status Progress Watcher
  useEffect(() => {
    const taskInterval = setInterval(() => {
      setActiveTasks(prevTasks => {
        const taskKeys = Object.keys(prevTasks);
        if (taskKeys.length === 0) return prevTasks;

        let hasUpdates = false;
        const nextTasks = { ...prevTasks };

        taskKeys.forEach(agentId => {
          const task = nextTasks[agentId];
          if (!task) return;

          const currentProg = task.progress || 0;
          if (currentProg >= 100) return;

          const nextProgress = Math.min(100, currentProg + Math.floor(14 + Math.random() * 12));
          hasUpdates = true;

          // Realistic step messages based on category & progress
          let stepDesc = 'Processing neural stream...';
          const cat = task.category || 'CODE';
          if (cat === 'SECURITY') {
            if (nextProgress < 30) stepDesc = 'Scanning AST & Rules';
            else if (nextProgress < 65) stepDesc = 'Auditing Access Tokens';
            else if (nextProgress < 95) stepDesc = 'Verifying Firewalls';
            else stepDesc = 'Security Patch Applied';
          } else if (cat === 'DESIGN') {
            if (nextProgress < 30) stepDesc = 'Generating UI Shaders';
            else if (nextProgress < 65) stepDesc = 'Harmonizing Palettes';
            else if (nextProgress < 95) stepDesc = 'Refining Responsive Grid';
            else stepDesc = 'Design Assets Rendered';
          } else if (cat === 'STRATEGY') {
            if (nextProgress < 30) stepDesc = 'Analyzing Roadmap';
            else if (nextProgress < 65) stepDesc = 'Structuring Milestones';
            else if (nextProgress < 95) stepDesc = 'Optimizing Velocity';
            else stepDesc = 'Sprint Finalized';
          } else if (cat === 'VOICE') {
            if (nextProgress < 30) stepDesc = 'Calibrating Audio Latency';
            else if (nextProgress < 65) stepDesc = 'Tuning Neural TTS';
            else if (nextProgress < 95) stepDesc = 'Syncing Voice Buffers';
            else stepDesc = 'Acoustics Optimized';
          } else if (cat === 'RESEARCH') {
            if (nextProgress < 30) stepDesc = 'Querying Knowledge Matrix';
            else if (nextProgress < 65) stepDesc = 'Fact-Checking Citations';
            else if (nextProgress < 95) stepDesc = 'Synthesizing Summary';
            else stepDesc = 'Fact Check Complete';
          } else {
            // CODE
            if (nextProgress < 30) stepDesc = 'Parsing Syntax AST';
            else if (nextProgress < 65) stepDesc = 'Optimizing Memory Buffers';
            else if (nextProgress < 95) stepDesc = 'Running Test Suite';
            else stepDesc = 'Build & Tests Passing';
          }

          nextTasks[agentId] = {
            ...task,
            progress: nextProgress,
            stepDesc
          };

          // Update agent's thought bubble with the REAL task progress!
          setAgents(prevAgents => {
            if (!prevAgents[agentId]) return prevAgents;
            const ag = prevAgents[agentId];
            return {
              ...prevAgents,
              [agentId]: {
                ...ag,
                currentThought: nextProgress >= 100 
                  ? `✅ Done: ${(task.title || 'Task').slice(0, 18)}`
                  : `⚡ [${nextProgress}%] ${stepDesc}`,
                nextMoveTime: Date.now() + (nextProgress >= 100 ? 8000 : 45000)
              }
            };
          });

          // When task completes
          if (nextProgress >= 100) {
            officeAudio?.playChime?.();
            setTeamMorale(m => Math.min(100, m + 4));
            setIsCelebration(true);
            setTimeout(() => setIsCelebration(false), 3000);

            // Clean up task gracefully after completion celebration
            setTimeout(() => {
              setActiveTasks(curr => {
                const updated = { ...curr };
                delete updated[agentId];
                return updated;
              });
            }, 6500);
          }
        });

        return hasUpdates ? nextTasks : prevTasks;
      });
    }, 2400);

    return () => clearInterval(taskInterval);
  }, []);

  const [showVendingModal, setShowVendingModal] = useState(false);
  const [agentTaskResult, setAgentTaskResult] = useState<{ agentName: string; taskTitle: string; responseText: string; agentColor: string } | null>(null);

  // Task Dispatch Handler
  const handleDispatchTask = async (task: any) => {
    officeAudio?.playBlip?.(950);
    const rawId = task.agentId || 'agent_core';
    const agentId = rawId.startsWith('agent_') ? rawId : (`agent_${rawId}`);
    const taskTitle = task.taskTitle || task.title || 'Executing neural directive';
    const category = task.category || 'CODE';
    const priority = task.priority || 'HIGH';
    const agentMeta = AGENT_CONFIG[agentId] || { name: 'Agent', color: '#00e5ff' };

    const newTaskRecord = {
      ...task,
      agentId,
      agentName: task.agentName || agentMeta.name || 'Agent',
      title: taskTitle,
      taskTitle: taskTitle,
      category,
      priority,
      progress: 8,
      stepDesc: 'Analyzing directive & system state...',
      startedAt: Date.now()
    };

    setActiveTasks(prev => ({
      ...prev,
      [agentId]: newTaskRecord
    }));
    
    // Direct assigned agent to desk and set working thought
    setAgents(prev => {
      if (!prev[agentId]) return prev;
      const agent = prev[agentId];
      return {
        ...prev,
        [agentId]: {
          ...agent,
          path: findPath(agent.currentNode, agent.home),
          currentThought: `⚡ [${priority}] ${taskTitle.slice(0, 22)}... (Processing)`,
          isChatting: false,
          nextMoveTime: Date.now() + 60000
        }
      };
    });

    // Real-Time AI Execution via Gemini API
    try {
      const promptText = `Task Directive for ${agentMeta.name} (${category} Expert): "${taskTitle}". Generate a concise, professional, action-oriented result summary in Hinglish/English.`;
      const response = await generateTextResponse(promptText, user || ({ name: 'Commander', role: 'ADMIN', voice: 'Aoede' } as UserProfile));
      const aiText = response?.text || `${agentMeta.name} completed task "${taskTitle}" with optimal parameters.`;

      setActiveTasks(prev => ({
        ...prev,
        [agentId]: {
          ...newTaskRecord,
          progress: 100,
          stepDesc: 'Task Completed!',
          responseText: aiText
        }
      }));

      setAgentTaskResult({
        agentName: agentMeta.name,
        taskTitle,
        responseText: aiText,
        agentColor: agentMeta.color || '#00e5ff'
      });

      officeAudio?.playChime?.();

      // Speak AI Agent response aloud
      speakAgentText(
        user || ({ voice: 'Aoede' } as any),
        `${agentMeta.name} Task Complete: ${aiText.slice(0, 150)}`,
        (agentMeta as any).voiceKey || 'Aoede',
        'Female',
        () => {},
        () => {}
      );
    } catch (e) {
      console.warn("Real-time AI Task Execution Warning:", e);
    }
  };

  // Agent Coffee Brew Handler
  const handleBrewForAgent = (drink: { name: string; icon: string }, agentId: string) => {
    officeAudio?.playCoffeeBrew?.();
    const targetAgentId = agentId || 'agent_core';
    const drinkName = drink.name || 'Cyber Espresso';
    const drinkIcon = drink.icon || '☕';

    setAgents(prev => {
      if (!prev[targetAgentId]) return prev;
      const agent = prev[targetAgentId];
      return {
        ...prev,
        [targetAgentId]: {
          ...agent,
          path: findPath(agent.currentNode, 'cooler'),
          currentThought: `🚶 Walking to Coffee Machine...`,
          holdingItem: {
            name: drinkName,
            icon: drinkIcon,
            type: 'drink',
            expiresAt: Date.now() + 60000
          }
        }
      };
    });

    setTimeout(() => {
      officeAudio?.playChime?.();
      setTeamMorale(prev => Math.min(100, prev + 10));

      setAgents(prev => {
        if (!prev[targetAgentId]) return prev;
        const agent = prev[targetAgentId];
        return {
          ...prev,
          [targetAgentId]: {
            ...agent,
            currentThought: `☕ Sipping ${drinkName}! Energy Boosted!`,
            nextMoveTime: Date.now() + 45000 // Stay at coffee machine for 45s
          }
        };
      });
    }, 3000);
  };

  // Agent Vending Machine Dispense Handler
  const handleDispenseForAgent = (snack: SnackItem, agentId: string) => {
    officeAudio?.playBlip?.(400);
    const targetAgentId = agentId || 'agent_core';

    setAgents(prev => {
      if (!prev[targetAgentId]) return prev;
      const agent = prev[targetAgentId];
      return {
        ...prev,
        [targetAgentId]: {
          ...agent,
          path: findPath(agent.currentNode, 'vending'),
          currentThought: `🚶 Going to Vending Machine for ${snack.icon}...`,
          holdingItem: {
            name: snack.name,
            icon: snack.icon,
            type: snack.type,
            expiresAt: Date.now() + 60000
          }
        }
      };
    });

    setTimeout(() => {
      officeAudio?.playChime?.();
      setTeamMorale(prev => Math.min(100, prev + 10));

      setAgents(prev => {
        if (!prev[targetAgentId]) return prev;
        const agent = prev[targetAgentId];
        return {
          ...prev,
          [targetAgentId]: {
            ...agent,
            currentThought: `${snack.icon} Crunching ${snack.name}! Morale High!`,
            nextMoveTime: Date.now() + 45000 // Stay at vending machine for 45s
          }
        };
      });
    }, 3000);
  };

  // Agent Pool Game Handler
  const handleAgentsPlayPool = useCallback((agent1: string, agent2: string) => {
    setAgents(prev => {
      const next = { ...prev };
      if (next[agent1]) {
        next[agent1] = {
          ...next[agent1],
          path: findPath(next[agent1].currentNode, 'pool_l'),
          currentThought: `🎱 Playing pool!`,
          nextMoveTime: Date.now() + 120000 // Stay there for a while
        };
      }
      if (next[agent2]) {
        next[agent2] = {
          ...next[agent2],
          path: findPath(next[agent2].currentNode, 'pool_r'),
          currentThought: `🎱 Playing pool!`,
          nextMoveTime: Date.now() + 120000
        };
      }
      return next;
    });
  }, []);

  // Coffee Brewing Handler Fallback
  const handleBrewComplete = useCallback((drink: string) => {
    officeAudio?.playChime?.();
    setTeamMorale(prev => Math.min(100, prev + 5));
    setIsCelebration(true);
    setTimeout(() => setIsCelebration(false), 3500);
    
    setAgents(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        const a = next[id];
        if (['cooler', 'vending', 'pool_l', 'pool_r', 'pool_t', 'pool_b', 'b_center'].includes(a.currentNode)) {
          next[id] = {
            ...a,
            currentThought: `☕ Fresh ${drink}! Morale boosted!`
          };
        }
      });
      return next;
    });
  }, []);

  // Neon color resolver based on office theme
  const neonColor = officeTheme.neonAccent === 'purple' 
    ? '#c084fc' 
    : officeTheme.neonAccent === 'amber' 
    ? '#fbbf24' 
    : officeTheme.neonAccent === 'crimson' 
    ? '#f87171' 
    : '#00e5ff';

  return (
    <div 
      className="w-full bg-[#090b10] border-t border-zinc-800/80 relative select-none font-mono flex flex-col items-center justify-center p-1 sm:p-2"
      onClick={() => setSelectedAgentId(null)}
    >
      <style>{`
        @keyframes walk {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }
        @keyframes idle-bob {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.96) translateY(0.5px); }
        }
        @keyframes desk-idle-work {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(0.3px) rotate(-1.5deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(0.3px) rotate(1.5deg); }
        }
        @keyframes desk-active-work {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(0.5px) rotate(-1.5deg); }
          50% { transform: translateY(-0.3px) scale(1.02); }
          75% { transform: translateY(0.5px) rotate(1.5deg); }
        }
        @keyframes desk-hand-left {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-0.6px, 0.3px); }
          50% { transform: translate(0.4px, -0.2px); }
          75% { transform: translate(-0.3px, 0.2px); }
        }
        @keyframes desk-hand-right {
          0%, 100% { transform: translate(0, 0); }
          30% { transform: translate(0.4px, -0.2px); }
          60% { transform: translate(0.8px, 0.4px); }
          85% { transform: translate(0.2px, 0); }
        }
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(-2px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Top Ambient Time, Atmosphere & Feature Action Bar */}
      <div className="w-full max-w-full sm:max-w-2xl flex flex-col gap-1.5 px-2 py-1 text-[10px] text-zinc-400 font-mono">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: isNight ? '#818cf8' : isDusk ? '#fb923c' : '#38bdf8' }} />
              <span className="uppercase tracking-wider font-semibold text-zinc-300">
                {isNight ? '🌙 Night Shift' : isDusk ? '🌇 Golden Hour' : '☀️ Day Operations'}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              <span>☕ Morale: {teamMorale}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCelebration && (
              <span className="text-yellow-400 font-bold animate-pulse text-[9px] flex items-center gap-1">
                ⚡ SQUAD SYNCED
              </span>
            )}
            <span className="text-zinc-400 font-mono text-[9px] font-medium tracking-wide">
              {formatTime12(currentDate)}
            </span>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
              className="text-cyan-400 hover:text-white bg-cyan-950/60 hover:bg-cyan-900/60 px-2 py-0.5 rounded border border-cyan-800/60 text-[9px] font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              title={isMinimized ? "Expand Virtual Office" : "Minimize Virtual Office"}
            >
              {isMinimized ? '▲ EXPAND' : '▼ MIN'}
            </button>
            {onClose && (
              <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }} 
                className="text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30 text-[9px] font-bold transition-colors ml-1 cursor-pointer flex items-center gap-1"
              >
                ✕ HIDE
              </button>
            )}
          </div>
        </div>

        {/* --- INTERACTIVE ACTION BUTTONS TOOLBAR --- */}
        {!isMinimized && (
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPoolModal(true);
              }}
              className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition-all cursor-pointer flex items-center gap-1"
              title="Play retro 8-ball pool against AI agents"
            >
              <span>🎱 Pool</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCoffeeModal(true);
              }}
              className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-900 hover:bg-zinc-800 text-amber-300 hover:text-white border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1"
              title="Brew espresso & boost team morale"
            >
              <span>☕ Coffee</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowVendingModal(true);
              }}
              className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-900 hover:bg-zinc-800 text-red-400 hover:text-white border border-red-500/30 transition-all cursor-pointer flex items-center gap-1"
              title="Dispense snacks & drinks from Vending Machine"
            >
              <span>🍿 Vending</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDispatcherAgentId(null);
                setShowDispatcherModal(true);
              }}
              className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-900 hover:bg-zinc-800 text-emerald-300 hover:text-white border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1"
              title="Assign live priority tasks to agents"
            >
              <span>⚡ Tasks</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCommandWallModal(true);
              }}
              className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-900 hover:bg-zinc-800 text-cyan-300 hover:text-white border border-cyan-500/30 transition-all cursor-pointer flex items-center gap-1"
              title="Open Global Squad Matrix & Telemetry"
            >
              <span>📊 Wall</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleWarRoom();
              }}
              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                isWarRoomActive
                  ? 'bg-red-600 text-white border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse'
                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
              }`}
              title="Toggle Emergency War Room Protocol"
            >
              <span>🚨 {isWarRoomActive ? 'WAR ROOM ON' : 'WAR ROOM'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCustomizerModal(true);
              }}
              className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-900 hover:bg-zinc-800 text-purple-300 hover:text-white border border-purple-500/30 transition-all cursor-pointer flex items-center gap-1"
              title="Customize office flooring, neon lights & trophies"
            >
              <span>🎨 Theme</span>
            </button>
          </div>

          {/* GUIDED TOUR TRIGGER BUTTON */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isTourActive) exitGuidedTour();
              else startGuidedTour();
            }}
            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer border shrink-0 ${
              isTourActive 
                ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.7)] animate-pulse' 
                : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
            }`}
            title="Start Nexa's cinematic office guided tour"
          >
            <span>{isTourActive ? '⏹ EXIT' : '🎬 TOUR'}</span>
          </button>
        </div>
        )}
      </div>
      
      {/* Office SVG Container: Fluidly fits within responsive viewport */}
      {!isMinimized && (
      <div className="w-full max-w-full sm:max-w-2xl aspect-[320/180] relative flex items-center justify-center rounded-lg overflow-hidden border border-zinc-800/60 shadow-2xl bg-[#090b10]">
        
        {/* --- GUIDED TOUR CINEMATIC OVERLAY BANNER --- */}
        {isTourActive && (
          <div 
            className="absolute top-2 inset-x-2 z-30 flex flex-col pointer-events-auto animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-zinc-950/95 border border-cyan-500/50 rounded-lg p-2 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-[9px] font-mono font-bold text-cyan-400 tracking-wider">
                    STOP {tourStep + 1}/{TOUR_STOPS.length} : {TOUR_STOPS[tourStep].badge}
                  </span>
                  {isSpeakingTour && (
                    <span className="text-[8px] font-mono font-bold text-yellow-400 bg-yellow-500/20 px-1 py-0.2 rounded flex items-center gap-1 animate-pulse border border-yellow-500/30">
                      🔊 NEXA SPEAKING
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-white truncate font-mono tracking-wide">
                  {TOUR_STOPS[tourStep].title}
                </div>
                <div className="text-[9px] text-zinc-400 truncate">
                  {TOUR_STOPS[tourStep].subtitle}
                </div>
              </div>

              {/* Tour Step Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => goToTourStep(tourStep - 1)}
                  disabled={tourStep === 0}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-white text-[10px] font-bold cursor-pointer transition-colors"
                  title="Previous Stop"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => goToTourStep(tourStep + 1)}
                  disabled={tourStep === TOUR_STOPS.length - 1}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-white text-[10px] font-bold cursor-pointer transition-colors"
                  title="Next Stop"
                >
                  ▶
                </button>
                <button
                  type="button"
                  onClick={exitGuidedTour}
                  className="p-1 px-1.5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400 text-[10px] cursor-pointer font-bold ml-1 transition-colors border border-red-500/30"
                  title="Exit Tour"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        <svg 
          viewBox={isTourActive ? TOUR_STOPS[tourStep].viewBox : "0 0 320 180"} 
          className="w-full h-full block transition-all duration-700 ease-in-out"
          preserveAspectRatio="xMidYMid meet"
          style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }}
        >
          <defs>
            {/* Hardwood Flooring */}
            <pattern id="woodFloor" width="16" height="16" patternUnits="userSpaceOnUse">
               <rect width="16" height="16" fill="#b07a46" />
               <rect x="0" y="0" width="1" height="16" fill="#9a6735" />
               <rect x="8" y="0" width="1" height="16" fill="#9a6735" />
               <rect x="1" y="7" width="7" height="1" fill="#9a6735" />
               <rect x="9" y="15" width="7" height="1" fill="#9a6735" />
            </pattern>

            {/* Obsidian Glass Flooring */}
            <pattern id="obsidianFloor" width="16" height="16" patternUnits="userSpaceOnUse">
               <rect width="16" height="16" fill="#0b0f19" />
               <rect x="0" y="0" width="16" height="1" fill="#1e293b" />
               <rect x="0" y="0" width="1" height="16" fill="#1e293b" />
               <rect x="8" y="8" width="8" height="8" fill="#1e293b" opacity="0.3" />
               <circle cx="8" cy="8" r="0.8" fill={neonColor} opacity="0.4" />
            </pattern>

            {/* Cyber Matrix Flooring */}
            <pattern id="matrixFloor" width="16" height="16" patternUnits="userSpaceOnUse">
               <rect width="16" height="16" fill="#022c22" />
               <rect x="0" y="0" width="16" height="1" fill="#065f46" />
               <rect x="0" y="0" width="1" height="16" fill="#065f46" />
               <line x1="0" y1="8" x2="16" y2="8" stroke="#10b981" strokeWidth="0.4" opacity="0.3" />
               <line x1="8" y1="0" x2="8" y2="16" stroke="#10b981" strokeWidth="0.4" opacity="0.3" />
               <rect x="7" y="7" width="2" height="2" fill="#34d399" opacity="0.5" />
            </pattern>

            {/* Carrara Marble Flooring */}
            <pattern id="marbleFloor" width="16" height="16" patternUnits="userSpaceOnUse">
               <rect width="16" height="16" fill="#f1f5f9" />
               <rect x="0" y="0" width="16" height="1" fill="#cbd5e1" />
               <rect x="0" y="0" width="1" height="16" fill="#cbd5e1" />
               <path d="M 0 4 Q 8 8 16 2" stroke="#94a3b8" strokeWidth="0.5" fill="none" opacity="0.35" />
               <path d="M 4 16 Q 10 10 14 16" stroke="#94a3b8" strokeWidth="0.5" fill="none" opacity="0.35" />
            </pattern>

            {/* Breakroom Tile Floor */}
            <pattern id="tileFloor" width="16" height="16" patternUnits="userSpaceOnUse">
               <rect width="16" height="16" fill="#ebdcd0" />
               <rect width="16" height="1" fill="#dcd0c0" />
               <rect width="1" height="16" fill="#dcd0c0" />
            </pattern>
            
            {/* Executive Luxury Obsidian Geometric Flooring */}
            <pattern id="executiveFloor" width="16" height="16" patternUnits="userSpaceOnUse">
               <rect width="16" height="16" fill="#0f172a" />
               <rect x="0" y="0" width="16" height="1" fill="#1e293b" />
               <rect x="0" y="0" width="1" height="16" fill="#1e293b" />
               <rect x="8" y="8" width="8" height="8" fill="#1e293b" opacity="0.4" />
               <line x1="0" y1="0" x2="16" y2="16" stroke={neonColor} strokeWidth="0.2" opacity="0.15" />
            </pattern>

            {/* Glass Wall Gradients */}
            <linearGradient id="glassWallGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={neonColor} stopOpacity="0.4" />
              <stop offset="30%" stopColor="#38bdf8" stopOpacity="0.1" />
              <stop offset="70%" stopColor="#ffffff" stopOpacity="0.2" />
              <stop offset="100%" stopColor={neonColor} stopOpacity="0.35" />
            </linearGradient>

            {/* Ambient Lighting Gradients */}
            <linearGradient id="windowLightShaft" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={isNight ? "0.03" : isDusk ? "0.18" : "0.12"} />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* --- BASE FLOOR LAYERS (Z=0) --- */}
          {/* Main Open Bullpen Floor with Dynamic Customizer Flooring */}
          <rect 
            x="8" 
            y="8" 
            width="168" 
            height="164" 
            fill={
              officeTheme.flooring === 'obsidian' 
                ? "url(#obsidianFloor)" 
                : officeTheme.flooring === 'matrix' 
                ? "url(#matrixFloor)" 
                : officeTheme.flooring === 'marble' 
                ? "url(#marbleFloor)" 
                : "url(#woodFloor)"
            } 
          />
          {/* Breakroom Tile Floor */}
          <rect x="184" y="8" width="128" height="80" fill="url(#tileFloor)" />
          {/* Nexa's Executive Glass Cabin Floor */}
          <rect x="184" y="96" width="128" height="76" fill="url(#executiveFloor)" />

          {/* Architectural Wall Windows (Sunlight / Moonlight entry) */}
          <g transform="translate(10, 0)">
            <rect x="30" y="1" width="30" height="6" fill={isNight ? "#1e293b" : isDusk ? "#fb923c" : "#7dd3fc"} opacity="0.9" />
            <line x1="45" y1="1" x2="45" y2="7" stroke="#0f172a" strokeWidth="0.8" />
            <polygon points="30,7 60,7 80,45 10,45" fill="url(#windowLightShaft)" className="pointer-events-none" />
          </g>
          <g transform="translate(90, 0)">
            <rect x="30" y="1" width="30" height="6" fill={isNight ? "#1e293b" : isDusk ? "#fb923c" : "#7dd3fc"} opacity="0.9" />
            <line x1="45" y1="1" x2="45" y2="7" stroke="#0f172a" strokeWidth="0.8" />
            <polygon points="30,7 60,7 80,45 10,45" fill="url(#windowLightShaft)" className="pointer-events-none" />
          </g>

          {/* --- STRUCTURAL PERIMETER WALLS (Z=1) --- */}
          <g fill="#2c3245">
            <rect x="0" y="0" width="320" height="8" />
            <rect x="0" y="172" width="320" height="8" />
            <rect x="0" y="0" width="8" height="180" />
            <rect x="312" y="0" width="8" height="180" />
            {/* Dividing Wall between bullpen and right wing */}
            <rect x="176" y="0" width="8" height="180" />
          </g>
          {/* Breakroom Doorway opening */}
          <rect 
            x="176" 
            y="64" 
            width="8" 
            height="20" 
            fill={
              officeTheme.flooring === 'obsidian' 
                ? "url(#obsidianFloor)" 
                : officeTheme.flooring === 'matrix' 
                ? "url(#matrixFloor)" 
                : officeTheme.flooring === 'marble' 
                ? "url(#marbleFloor)" 
                : "url(#woodFloor)"
            } 
          />

          {/* ========================================================= */}
          {/* --- SPECIALIZED EXECUTIVE GLASS CABIN WALLS & ACCENTS --- */}
          {/* ========================================================= */}
          <g id="executive-glass-cabin">
            {/* Horizontal Glass Partition Top Wall (y: 88 to 96) */}
            {/* Left Glass Panel */}
            <rect x="184" y="88" width="36" height="8" fill="url(#glassWallGrad)" stroke={neonColor} strokeWidth="0.8" />
            <line x1="190" y1="88" x2="198" y2="96" stroke="#ffffff" strokeWidth="0.6" opacity="0.6" />
            <line x1="202" y1="88" x2="210" y2="96" stroke="#ffffff" strokeWidth="0.6" opacity="0.6" />
            
            {/* Right Glass Panel */}
            <rect x="250" y="88" width="62" height="8" fill="url(#glassWallGrad)" stroke={neonColor} strokeWidth="0.8" />
            <line x1="260" y1="88" x2="268" y2="96" stroke="#ffffff" strokeWidth="0.6" opacity="0.6" />
            <line x1="280" y1="88" x2="288" y2="96" stroke="#ffffff" strokeWidth="0.6" opacity="0.6" />
            <line x1="298" y1="88" x2="306" y2="96" stroke="#ffffff" strokeWidth="0.6" opacity="0.6" />

            {/* Sliding Glass Door Entrance (x: 220 to 250) */}
            <rect x="220" y="88" width="30" height="8" fill="url(#executiveFloor)" />
            <line x1="220" y1="88" x2="220" y2="96" stroke={neonColor} strokeWidth="1.2" />
            <line x1="250" y1="88" x2="250" y2="96" stroke={neonColor} strokeWidth="1.2" />
            
            {/* Illuminated Executive Signboard over Doorway */}
            <g transform="translate(221, 87)">
              <rect x="0" y="0" width="28" height="4" fill="#090d16" stroke={neonColor} strokeWidth="0.6" rx="0.8" />
              <text x="14" y="3" fill={neonColor} fontSize="2.8" fontFamily="monospace" fontWeight="bold" textAnchor="middle" letterSpacing="0.4">
                NEXA CABIN
              </text>
            </g>

            {/* Cabin Ambient Neon Floor Edge Perimeter Glow */}
            <line x1="184" y1="96" x2="220" y2="96" stroke={neonColor} strokeWidth="0.6" opacity="0.6" />
            <line x1="250" y1="96" x2="312" y2="96" stroke={neonColor} strokeWidth="0.6" opacity="0.6" />
            <line x1="184" y1="96" x2="184" y2="172" stroke={neonColor} strokeWidth="0.6" opacity="0.6" />
          </g>

          {/* --- DYNAMIC Y-SORTED ENTITIES (Z=2+) --- */}
          {renderList.map((ent) => {
            if (ent.category === 'chair') {
               const isExec = ent.isExecutive;
               return (
                 <g key={`chair-${ent.id}`} transform={`translate(${ent.x - (isExec ? 7 : 6)}, ${ent.y - (isExec ? 14 : 12)})`}>
                   <rect x="2" y={isExec ? 12 : 10} width={isExec ? 10 : 8} height="2" fill="#000" opacity="0.3" />
                   {/* Executive High-Back Chair vs Standard Chair */}
                   <rect 
                     x="0" 
                     y="0" 
                     width={isExec ? 14 : 12} 
                     height={isExec ? 13 : 10} 
                     fill={isExec ? "#090d16" : "#334155"} 
                     stroke={isExec ? neonColor : "#1e293b"} 
                     strokeWidth={isExec ? 0.6 : 0} 
                     rx="1.5" 
                   />
                   <rect x="1" y={isExec ? 9 : 8} width={isExec ? 12 : 10} height="4" fill={isExec ? neonColor : "#1e293b"} opacity={isExec ? 0.8 : 1} rx="1" />
                 </g>
               );
            }
            if (ent.category === 'desk') {
              return (
                <RenderDesk 
                  key={`desk-${ent.id}`} 
                  {...ent} 
                  isWorking={activeAgentId === ent.agentId && isGlobalProcessing}
                  hasActiveTask={Boolean(activeTasks[ent.agentId])}
                  isWarRoom={isWarRoomActive}
                  onSelectDesk={(agentId: string) => setSelectedAgentId(prev => prev === agentId ? null : agentId)} 
                />
              );
            }
            if (ent.category === 'bookshelf') return <RenderBookshelf key={`shelf-${ent.id}`} {...ent} />;
            if (ent.category === 'prop') {
              return (
                <RenderProp 
                  key={`prop-${ent.id}`} 
                  {...ent} 
                  onOpenPool={() => setShowPoolModal(true)}
                  onOpenCoffee={() => setShowCoffeeModal(true)}
                  onOpenVending={() => setShowVendingModal(true)}
                  onOpenCommandWall={() => setShowCommandWallModal(true)}
                />
              );
            }
            if (ent.category === 'agent') {
              const isSitting = ent.currentNode === ent.home && !ent.isWalking;
              const isSelected = selectedAgentId === ent.id;
              return (
                <RenderSprite
                  key={`agent-${ent.id}`}
                  agent={ent}
                  isSpeaking={activeAgentId === ent.id && hudState === 'SPEAKING'}
                  isWorking={(activeAgentId === ent.id && isGlobalProcessing) || Boolean(activeTasks[ent.id])}
                  isSitting={isSitting}
                  isSelected={isSelected}
                  celebrating={isCelebration}
                  thought={ent.currentThought}
                  activeTask={activeTasks[ent.id]}
                  onSelect={(id: string) => setSelectedAgentId(prev => prev === id ? null : id)}
                />
              );
            }
            return null;
          })}

          {/* --- FOREGROUND POTTED PLANTS & EXECUTIVE CABIN BONSAI --- */}
          {[ {x:14,y:78}, {x:162,y:78}, {x:14,y:158}, {x:162,y:158} ].map((p, i) => (
            <g key={`plant-${i}`} transform={`translate(${p.x}, ${p.y})`}>
              <rect x="0" y="12" width="10" height="4" fill="#000" opacity="0.3" />
              <rect x="2" y="6" width="6" height="6" fill="#d2a679" stroke="#1a1a1a" strokeWidth="1" />
              <rect x="0" y="0" width="10" height="8" fill="#40c060" />
              <rect x="1" y="1" width="2" height="2" fill="#2e7d32" />
              <rect x="7" y="4" width="2" height="2" fill="#2e7d32" />
            </g>
          ))}

          {/* Executive Cabin Bonsai in corner (x: 190, y: 104) */}
          <g transform="translate(188, 102)">
            <rect x="0" y="10" width="8" height="3" fill="#000" opacity="0.3" />
            <rect x="1" y="5" width="6" height="5" fill="#090d16" stroke={neonColor} strokeWidth="0.5" rx="0.8" />
            <rect x="0" y="0" width="8" height="6" fill="#22c55e" />
            <rect x="2" y="1" width="2" height="2" fill="#15803d" />
            <circle cx="4" cy="2" r="1" fill={neonColor} opacity="0.8" className="animate-ping" />
          </g>

          {/* --- GUIDED TOUR SPOTLIGHT RETICLE & TARGET BADGE --- */}
          {isTourActive && (() => {
            const sp = TOUR_STOPS[tourStep]?.spotlight;
            if (!sp) return null;
            return (
              <g className="pointer-events-none">
                {/* Outer pulsing ring */}
                <circle 
                  cx={sp.cx} 
                  cy={sp.cy} 
                  r={sp.r + 5} 
                  fill="none" 
                  stroke="#00e5ff" 
                  strokeWidth="0.6" 
                  opacity="0.5" 
                  strokeDasharray="4 2" 
                />
                {/* Inner target circle */}
                <circle 
                  cx={sp.cx} 
                  cy={sp.cy} 
                  r={sp.r} 
                  fill="#00e5ff" 
                  fillOpacity="0.04" 
                  stroke="#00e5ff" 
                  strokeWidth="1" 
                  strokeDasharray="3 3" 
                />
                {/* Crosshairs */}
                <line x1={sp.cx - sp.r - 4} y1={sp.cy} x2={sp.cx - sp.r + 2} y2={sp.cy} stroke="#00e5ff" strokeWidth="1" />
                <line x1={sp.cx + sp.r - 2} y1={sp.cy} x2={sp.cx + sp.r + 4} y2={sp.cy} stroke="#00e5ff" strokeWidth="1" />
                <line x1={sp.cx} y1={sp.cy - sp.r - 4} x2={sp.cx} y2={sp.cy - sp.r + 2} stroke="#00e5ff" strokeWidth="1" />
                <line x1={sp.cx} y1={sp.cy + sp.r - 2} x2={sp.cx} y2={sp.cy + sp.r + 4} stroke="#00e5ff" strokeWidth="1" />
                {/* Floating Illuminated Badge Tag */}
                <g transform={`translate(${sp.cx}, ${sp.cy - sp.r - 6})`}>
                  <rect x="-26" y="-5.5" width="52" height="7" fill="#090d16" stroke="#00e5ff" strokeWidth="0.6" rx="2" opacity="0.95" />
                  <text x="0" y="-1" fill="#00e5ff" fontSize="3.2" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                    [ {TOUR_STOPS[tourStep].badge} ]
                  </text>
                </g>
              </g>
            );
          })()}

          {/* --- WAR ROOM EMERGENCY PULSING OVERLAY --- */}
          {isWarRoomActive && (
            <rect 
              x="0" 
              y="0" 
              width="320" 
              height="180" 
              fill="#ef4444" 
              opacity="0.14" 
              className="pointer-events-none animate-pulse" 
            />
          )}

          {/* --- REAL-TIME ATMOSPHERIC LIGHTING FILTER (Z=TOP) --- */}
          {isNight && (
            <rect x="0" y="0" width="320" height="180" fill="#030712" opacity="0.45" className="pointer-events-none mix-blend-multiply" />
          )}
          {isDusk && (
            <rect x="0" y="0" width="320" height="180" fill="#ea580c" opacity="0.15" className="pointer-events-none mix-blend-color-burn" />
          )}
        </svg>

        {/* --- AGENT MINI-PROFILE & LIVE STATUS POPUP --- */}
        {selectedAgent && (
          <div 
            className="absolute inset-x-3 bottom-3 sm:bottom-4 p-3 bg-zinc-950/95 border border-cyan-500/40 rounded-lg shadow-2xl backdrop-blur-md font-mono text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 z-30 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              {/* Avatar Icon Badge */}
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base shadow-inner shrink-0"
                style={{ 
                  backgroundColor: `${selectedAgent.color}20`, 
                  borderColor: selectedAgent.color, 
                  borderWidth: '1.5px',
                  color: selectedAgent.color 
                }}
              >
                {selectedAgent.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white tracking-wider">{selectedAgent.name}</span>
                  <span 
                    className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                    style={{ backgroundColor: `${selectedAgent.color}30`, color: selectedAgent.color }}
                  >
                    {selectedAgent.role}
                  </span>
                  {selectedAgent.id === 'agent_core' && (
                    <span className="text-[8px] px-1.5 py-0.2 rounded font-bold uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                      ★ EXECUTIVE CABIN
                    </span>
                  )}
                  {activeTasks[selectedAgent.id] && (
                    <span className="text-[8px] px-1.5 py-0.2 rounded font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                      ⚡ [{activeTasks[selectedAgent.id].priority || 'HIGH'}] {activeTasks[selectedAgent.id].category || 'TASK'}
                    </span>
                  )}
                </div>
                {activeTasks[selectedAgent.id] ? (
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center justify-between text-[9px] text-emerald-300 font-bold">
                      <span className="truncate max-w-[200px]">{activeTasks[selectedAgent.id].title}</span>
                      <span>{activeTasks[selectedAgent.id].progress || 0}%</span>
                    </div>
                    <div className="w-full max-w-xs h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-emerald-500/30">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                        style={{ width: `${activeTasks[selectedAgent.id].progress || 0}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-emerald-400/90 font-mono">
                      ↳ {activeTasks[selectedAgent.id].stepDesc || 'Executing active pipeline...'}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-400 mt-0.5 max-w-sm line-clamp-1">
                    {selectedAgent.specialty}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 text-[9px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <span 
                      className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" 
                      style={{ backgroundColor: selectedAgent.currentNode === selectedAgent.home ? '#4ade80' : '#f59e0b' }} 
                    />
                    {selectedAgent.currentNode === selectedAgent.home 
                      ? (selectedAgent.id === 'agent_core' ? 'In Executive Cabin' : 'At Workstation') 
                      : 'In Breakroom'}
                  </span>
                  <span>•</span>
                  <span className="text-zinc-400 italic">
                    "{selectedAgent.currentThought || 'Ready for assignments'}"
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              <button
                type="button"
                onClick={() => {
                  setDispatcherAgentId(selectedAgent.id);
                  setShowDispatcherModal(true);
                  setSelectedAgentId(null);
                }}
                className="px-2.5 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-300 hover:text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                ⚡ Assign Task
              </button>

              {onDirectChat && (
                <button
                  type="button"
                  onClick={() => {
                    onDirectChat(selectedAgent.name);
                    setSelectedAgentId(null);
                  }}
                  className="px-3 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 hover:text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                >
                  💬 Chat
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedAgentId(null)}
                className="px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[11px] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* --- INTERACTIVE MODAL OVERLAYS (1 TO 5) --- */}
      {/* 1. Interactive Pool Game Modal */}
      {showPoolModal && (
        <PoolMiniGameModal 
          isOpen={showPoolModal} 
          onClose={() => setShowPoolModal(false)}
          onAgentsPlayPool={handleAgentsPlayPool}
        />
      )}

      {/* 2. Interactive Coffee Machine Modal */}
      {showCoffeeModal && (
        <CoffeeMachineModal 
          isOpen={showCoffeeModal} 
          onClose={() => setShowCoffeeModal(false)} 
          onBrewComplete={handleBrewComplete}
          onBrewForAgent={handleBrewForAgent}
        />
      )}

      {/* 2b. Interactive Vending Machine Modal */}
      {showVendingModal && (
        <VendingMachineModal
          isOpen={showVendingModal}
          onClose={() => setShowVendingModal(false)}
          onDispenseItem={handleDispenseForAgent}
        />
      )}

      {/* 3. Live Task Dispatcher Modal */}
      {showDispatcherModal && (
        <TaskDispatcherModal 
          isOpen={showDispatcherModal} 
          onClose={() => setShowDispatcherModal(false)} 
          onDispatch={handleDispatchTask}
          preSelectedAgentId={dispatcherAgentId}
        />
      )}

      {/* 3b. Real-Time AI Agent Task Response Modal */}
      {agentTaskResult && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono text-white"
          onClick={() => setAgentTaskResult(null)}
        >
          <div 
            className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-3 relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: agentTaskResult.agentColor }} />
                <span className="text-sm font-bold" style={{ color: agentTaskResult.agentColor }}>
                  {agentTaskResult.agentName.toUpperCase()} // TASK OUTPUT
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAgentTaskResult(null)}
                className="p-1 px-2.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold border border-zinc-700"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-zinc-400 font-semibold">
              Directive: <span className="text-zinc-200">"{agentTaskResult.taskTitle}"</span>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-200 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap font-sans">
              {agentTaskResult.responseText}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  speakAgentText(
                    user || ({ voice: 'Aoede' } as any),
                    agentTaskResult.responseText,
                    'Aoede',
                    'Female',
                    () => {},
                    () => {}
                  );
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔊 Listen Voice Output</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(agentTaskResult.responseText);
                  officeAudio?.playChime?.();
                  alert("Task response copied to clipboard!");
                }}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>📋 Copy Solution</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Holographic Command Wall & War Room Telemetry */}
      {showCommandWallModal && (
        <HolographicCommandWallModal 
          isOpen={showCommandWallModal} 
          onClose={() => setShowCommandWallModal(false)} 
          onToggleEmergency={toggleWarRoom}
          isEmergencyActive={isWarRoomActive}
          activeTasksCount={Object.keys(activeTasks).length}
        />
      )}

      {/* 5. Office Customizer & Milestone Trophies Modal */}
      {showCustomizerModal && (
        <OfficeCustomizerModal 
          isOpen={showCustomizerModal} 
          onClose={() => setShowCustomizerModal(false)} 
          currentTheme={officeTheme}
          onSaveTheme={handleSaveTheme}
        />
      )}
    </div>
  );
};
