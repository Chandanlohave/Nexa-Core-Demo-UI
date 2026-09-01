import React, { useState, useEffect } from 'react';

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
  'nexa': { x: 250, y: 147 },
  
  // Desk Step-Out Nodes
  'd1_out': { x: 18, y: 53 },
  'd2_out': { x: 68, y: 53 },
  'd3_out': { x: 118, y: 53 },
  'd4_out': { x: 18, y: 119 },
  'd5_out': { x: 68, y: 119 },
  'd6_out': { x: 118, y: 119 },
  'nexa_out': { x: 215, y: 147 },
  
  // Aisles / Walkways
  'a1': { x: 18, y: 88 },
  'a2': { x: 68, y: 88 },
  'a3': { x: 118, y: 88 },
  'a4': { x: 165, y: 88 },
  'door1': { x: 180, y: 74 }, // Main <-> Breakroom
  'door2': { x: 232, y: 88 }, // Breakroom <-> Lounge
  'b_center': { x: 232, y: 58 }, // Breakroom center
  'l_center': { x: 232, y: 122 }, // Lounge center
  
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
  'a1': ['d1_out', 'd4_out', 'a2'],
  'a2': ['d2_out', 'd5_out', 'a1', 'a3'],
  'a3': ['d3_out', 'd6_out', 'a2', 'a4'],
  'a4': ['a3', 'door1'],
  'door1': ['a4', 'b_center'],
  'b_center': ['door1', 'door2', 'vending', 'cooler', 'pool_l', 'pool_b'],
  'vending': ['b_center'], 'cooler': ['b_center'],
  'pool_l': ['b_center', 'pool_t', 'pool_b'],
  'pool_t': ['pool_l', 'pool_r'],
  'pool_r': ['pool_t', 'pool_b'],
  'pool_b': ['pool_l', 'pool_r', 'b_center'],
  'door2': ['b_center', 'l_center'],
  'l_center': ['door2', 'nexa_out', 'couch'],
  'nexa_out': ['l_center', 'nexa'], 'nexa': ['nexa_out'],
  'couch': ['l_center']
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
  { id: 'd_nexa', agentId: 'agent_core', x: 250, y: 164, width: 44, height: 18 },
];

const CHAIRS = [
  { id: 'c1', x: 40, y: 48 },
  { id: 'c2', x: 90, y: 48 },
  { id: 'c3', x: 140, y: 48 },
  { id: 'c4', x: 40, y: 114 },
  { id: 'c5', x: 90, y: 114 },
  { id: 'c6', x: 140, y: 114 },
  { id: 'c_nexa', x: 250, y: 142 },
];

const BOOKSHELVES = [
  { id: 'b1', x: 25, y: 26, width: 30, height: 16 },
  { id: 'b2', x: 70, y: 26, width: 30, height: 16 },
  { id: 'b3', x: 115, y: 26, width: 30, height: 16 },
  { id: 'file1', type: 'file_cabinet', x: 190, y: 104, width: 24, height: 16 },
  { id: 'file2', type: 'file_cabinet', x: 280, y: 104, width: 24, height: 16 },
];

const PROPS = [
  { id: 'vending', type: 'vending', x: 195, y: 26, width: 20, height: 28 },
  { id: 'cooler', type: 'cooler', x: 220, y: 26, width: 14, height: 24 },
  { id: 'couch1', type: 'couch', x: 200, y: 158, width: 30, height: 16 },
  { id: 'pool', type: 'pool', x: 260, y: 48, width: 48, height: 28 },
  { id: 'whiteboard', type: 'whiteboard', x: 250, y: 108, width: 40, height: 10 },
];

// Agent Initial Configuration
const AGENT_CONFIG: Record<string, any> = {
  agent_core: { id: 'agent_core', name: 'Nexa', role: 'CORE OVERSEER', color: '#00e5ff', sprite: 'nexa', home: 'nexa' },
  agent_kronos: { id: 'agent_kronos', name: 'Kronos', role: 'STRATEGIST', color: '#3b82f6', sprite: 'kronos', home: 'd1' },
  agent_cypher: { id: 'agent_cypher', name: 'Cypher', role: 'CYBER RECON', color: '#f97316', sprite: 'cypher', home: 'd2' },
  agent_aura: { id: 'agent_aura', name: 'Aura', role: 'CREATIVE', color: '#a855f7', sprite: 'aura', home: 'd3' },
  agent_veritas: { id: 'agent_veritas', name: 'Veritas', role: 'LOGIC & ETHICS', color: '#10b981', sprite: 'veritas', home: 'd4' },
  agent_echo: { id: 'agent_echo', name: 'Echo', role: 'COMMS & SIGNALS', color: '#38bdf8', sprite: 'echo', home: 'd5' },
  agent_valkyrie: { id: 'agent_valkyrie', name: 'Valkyrie', role: 'DEFENSE & OPS', color: '#ef4444', sprite: 'valkyrie', home: 'd6' },
};

const IDLE_DESTINATIONS = ['vending', 'cooler', 'pool_l', 'pool_r', 'pool_t', 'pool_b', 'couch'];

// --- RENDER HELPERS ---

const RenderSprite = ({ 
  agent, 
  isSpeaking, 
  isWorking, 
  isSitting, 
  isSelected,
  onSelect
}: any) => {
  const sprite = SPRITES[agent.sprite];
  if (!sprite) return null;
  
  const drawX = agent.x - 4.5;
  const drawY = agent.y - 17;
  const scaleX = agent.facing === 'left' ? -1 : 1;

  let animClass = 'animate-[idle-bob_3s_infinite]';
  if (agent.isWalking) animClass = 'animate-[walk_0.3s_infinite]';
  else if (isSitting) {
    animClass = isWorking ? 'animate-[desk-active-work_1.2s_infinite]' : 'animate-[desk-idle-work_5.5s_infinite]';
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
      <rect x="-6" y="-12" width="22" height="32" fill="transparent" />

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

      {/* Floating Name Tag ONLY when selected */}
      {isSelected && (
        <g transform="translate(4.5, -12)" className="animate-[fade-in_0.2s_ease-out]">
          {/* Background Card */}
          <rect 
            x="-20" 
            y="-10" 
            width="40" 
            height="11" 
            fill="#090d16" 
            stroke={agent.color || '#00e5ff'} 
            strokeWidth="0.8" 
            rx="2" 
            className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          />
          {/* Pointer Triangle */}
          <polygon 
            points="-2,1 2,1 0,3" 
            fill={agent.color || '#00e5ff'} 
          />
          {/* Agent Name */}
          <text 
            x="0" 
            y="-2.5" 
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
      {isWorking && !isSelected && (
        <g transform="translate(3, -6)">
          <rect x="0" y="0" width="3" height="3" fill="#ffeb3b" stroke="#000" strokeWidth="0.5" />
          <rect x="1" y="0.5" width="1" height="2" fill="#000" />
        </g>
      )}
    </g>
  );
};

const RenderDesk = ({ id, agentId, x, y, width, height, onSelectDesk }: any) => {
  const drawX = x - width / 2;
  const drawY = y - height;
  
  const isD1 = id === 'd1';
  const isD2 = id === 'd2';
  const isD3 = id === 'd3';
  const isD4 = id === 'd4';
  const isD5 = id === 'd5';
  const isD6 = id === 'd6';
  const isNexa = id === 'd_nexa';

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
      <rect x="0" y="0" width={width} height={height} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" rx="1" />
      
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
        <rect x="3" y="3.4" width="4.5" height="0.8" fill="#38bdf8" />
      </g>

      {/* --- PRECISION OPTICAL MOUSE & MOUSEPAD --- */}
      <g transform={`translate(${width / 2 + 5}, 1.8)`}>
        {/* Mousepad */}
        <rect x="0" y="0" width="6" height="5.5" fill="#0b0f19" stroke="#38bdf8" strokeWidth="0.3" rx="0.5" />
        {/* Ergonomic Optical Mouse */}
        <rect x="1.5" y="1" width="2.8" height="3.6" fill="#f8fafc" stroke="#475569" strokeWidth="0.3" rx="0.8" />
        {/* RGB Scroll Wheel */}
        <rect x="2.5" y="1.4" width="0.8" height="1.2" fill="#00e5ff" />
      </g>

      {/* --- DESKTOP TERMINAL MONITOR --- */}
      <g transform={`translate(${width / 2 - 9}, 8)`}>
        {/* Monitor Stand Base */}
        <rect x="6.5" y="0" width="5" height="1.5" fill="#475569" rx="0.5" />
        {/* Monitor Bezel Frame */}
        <rect x="0" y="1" width="18" height="8" fill="#090d16" stroke="#475569" strokeWidth="0.6" rx="0.8" />
        {/* Active Glowing Screen */}
        <rect x="1.2" y="2" width="15.6" height="6" fill="#0f172a" />
        {/* Code & Matrix Lines */}
        <line x1="2.5" y1="3.5" x2="11" y2="3.5" stroke="#38bdf8" strokeWidth="0.7" strokeLinecap="round" />
        <line x1="2.5" y1="5" x2="8" y2="5" stroke="#4ade80" strokeWidth="0.7" strokeLinecap="round" />
        <line x1="9.5" y1="5" x2="14.5" y2="5" stroke="#f43f5e" strokeWidth="0.7" strokeLinecap="round" />
        <line x1="2.5" y1="6.5" x2="6.5" y2="6.5" stroke="#fbbf24" strokeWidth="0.7" strokeLinecap="round" />
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
      {isNexa && (
         <g transform="translate(4, 3)">
            <rect x="0" y="0" width="7" height="8" fill="#fff" stroke="#ccc" strokeWidth="0.4" />
            <rect x="8" y="1.5" width="3.5" height="4.5" fill="#ef4444" stroke="#991b1b" strokeWidth="0.4" rx="0.8" />
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
      {isNexa && (
         <g transform="translate(width - 8, 2)">
            <rect x="1" y="3" width="4" height="3.5" fill="#a16207" />
            <circle cx="3" cy="2" r="2" fill="#22c55e" />
         </g>
      )}
    </g>
  );
};

const RenderBookshelf = ({ x, y, width, height, type }: any) => {
  const drawX = x - width / 2;
  const drawY = y - height;

  if (type === 'file_cabinet') {
     return (
        <g transform={`translate(${drawX}, ${drawY})`}>
          <rect x="0" y={height} width={width} height="3" fill="#000" opacity="0.2" />
          <rect x="0" y="0" width={width} height={height} fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
          <rect x="2" y="2" width={width - 4} height={height / 2 - 2} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
          <rect x="2" y={height / 2 + 1} width={width - 4} height={height / 2 - 3} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
          <rect x={width / 2 - 3} y="4" width="6" height="2" fill="#94a3b8" />
          <rect x={width / 2 - 3} y={height / 2 + 3} width="6" height="2" fill="#94a3b8" />
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

const RenderProp = ({ type, x, y, width, height }: any) => {
  if (type === 'vending') {
    return (
      <g transform={`translate(${x - width/2}, ${y - height})`}>
        <rect x="0" y={height} width={width} height="4" fill="#000" opacity="0.3" />
        <rect x="0" y="0" width={width} height={height} fill="#d32f2f" stroke="#1a1a1a" strokeWidth="1" />
        <rect x="2" y="2" width={width-4} height="16" fill="#81d4fa" stroke="#1a1a1a" strokeWidth="0.5" opacity="0.8" />
        <rect x="4" y="5" width="4" height="4" fill="#4caf50" />
        <rect x="10" y="5" width="4" height="4" fill="#ffeb3b" />
        <rect x="4" y="11" width="4" height="4" fill="#ff9800" />
        <rect x="10" y="11" width="4" height="4" fill="#9c27b0" />
        <rect x="2" y="20" width={width-4} height="6" fill="#111" />
      </g>
    );
  }
  if (type === 'cooler') {
    return (
      <g transform={`translate(${x - width/2}, ${y - height})`}>
        <rect x="0" y={height} width={width} height="4" fill="#000" opacity="0.3" />
        <rect x="0" y="10" width={width} height={height-10} fill="#f5f5f5" stroke="#1a1a1a" strokeWidth="1" />
        <path d={`M 2 10 L ${width-2} 10 L ${width-4} 2 L 4 2 Z`} fill="#81d4fa" stroke="#1a1a1a" strokeWidth="0.5" opacity="0.6" />
        <rect x="3" y="14" width="2" height="2" fill="#f44336" />
        <rect x="9" y="14" width="2" height="2" fill="#2196f3" />
      </g>
    );
  }
  if (type === 'couch') {
    return (
      <g transform={`translate(${x - width/2}, ${y - height})`}>
        <rect x="0" y={height - 2} width={width} height="4" fill="#000" opacity="0.3" />
        <rect x="0" y="4" width={width} height={height-4} fill="#4caf50" stroke="#1a1a1a" strokeWidth="1" rx="2" />
        <rect x="2" y="0" width={width-4} height={height-6} fill="#81c784" stroke="#1a1a1a" strokeWidth="1" rx="2" />
      </g>
    );
  }
  if (type === 'whiteboard') {
     return (
        <g transform={`translate(${x - width/2}, ${y - height})`}>
           <rect x="0" y={height} width={width} height="4" fill="#000" opacity="0.2" />
           <rect x="4" y="2" width="2" height={height+2} fill="#94a3b8" />
           <rect x={width-6} y="2" width="2" height={height+2} fill="#94a3b8" />
           <rect x="0" y="0" width={width} height={height} fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
           <path d={`M 4 4 Q 8 2 12 5 T 20 4`} fill="none" stroke="#2563eb" strokeWidth="0.5" />
           <path d={`M 5 7 L 15 7`} fill="none" stroke="#ef4444" strokeWidth="0.5" />
        </g>
     );
  }
  if (type === 'pool') {
    const drawX = x - width / 2;
    const drawY = y - height;
    return (
       <g transform={`translate(${drawX}, ${drawY})`}>
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
       </g>
    );
  }
  return null;
};

// --- MAIN ENGINE COMPONENT ---

export const AgentVirtualOffice = ({ activeAgentId, hudState }: { activeAgentId: string | null, hudState: string | null }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // 1. Initialize State at defined graph nodes
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
        nextMoveTime: Date.now() + 120000 + Math.random() * 180000
      };
    });
    return initialState;
  });

  // 2. Handle Active Agent logic (Force walk to home via graph)
  useEffect(() => {
    if (activeAgentId) {
      setAgents(prev => {
        if (!prev[activeAgentId]) return prev;
        const agent = prev[activeAgentId];
        const target = agent.home;
        
        const currentDest = agent.path.length > 0 ? agent.path[agent.path.length - 1] : agent.currentNode;
        if (currentDest !== target) {
           return {
              ...prev,
              [activeAgentId]: {
                 ...agent,
                 path: findPath(agent.currentNode, target),
                 isChatting: false
              }
           };
        }
        return prev;
      });
    }
  }, [activeAgentId, hudState]);

  // 3. Natural Wandering AI
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
                
                if (dest !== agent.currentNode) {
                   next[id] = { 
                      ...agent, 
                      path: findPath(agent.currentNode, dest), 
                      nextMoveTime: now + nextDelay,
                      isChatting: false 
                   };
                   occupied.add(dest);
                } else {
                   next[id] = { 
                      ...agent, 
                      nextMoveTime: now + nextDelay,
                      isChatting: Math.random() < 0.3 && agent.currentNode !== agent.home 
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

  // 4. Physics Engine Loop (Moves point-to-point along graph)
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

  // 5. Y-Sorting: Build unified render list
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
      
      {/* Office SVG Container: Perfectly fits within viewport frame */}
      <div className="w-full max-w-[560px] aspect-[320/180] relative flex items-center justify-center rounded-lg overflow-hidden border border-zinc-800/60 shadow-2xl bg-[#090b10]">
        <svg 
          viewBox="0 0 320 180" 
          className="w-full h-full block"
          preserveAspectRatio="xMidYMid meet"
          style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }}
        >
          <defs>
            <pattern id="woodFloor" width="16" height="16" patternUnits="userSpaceOnUse">
               <rect width="16" height="16" fill="#b07a46" />
               <rect x="0" y="0" width="1" height="16" fill="#9a6735" />
               <rect x="8" y="0" width="1" height="16" fill="#9a6735" />
               <rect x="1" y="7" width="7" height="1" fill="#9a6735" />
               <rect x="9" y="15" width="7" height="1" fill="#9a6735" />
            </pattern>
            <pattern id="tileFloor" width="16" height="16" patternUnits="userSpaceOnUse">
               <rect width="16" height="16" fill="#ebdcd0" />
               <rect width="16" height="1" fill="#dcd0c0" />
               <rect width="1" height="16" fill="#dcd0c0" />
            </pattern>
            <pattern id="blueCarpet" width="8" height="8" patternUnits="userSpaceOnUse">
               <rect width="8" height="8" fill="#4a7294" />
               <rect x="0" y="0" width="2" height="2" fill="#426685" />
               <rect x="4" y="4" width="2" height="2" fill="#426685" />
            </pattern>
          </defs>

          {/* --- BASE FLOOR LAYERS (Z=0) --- */}
          <rect x="8" y="8" width="168" height="164" fill="url(#woodFloor)" />
          <rect x="184" y="8" width="128" height="80" fill="url(#tileFloor)" />
          <rect x="184" y="96" width="128" height="76" fill="url(#blueCarpet)" />

          {/* --- WALLS (Z=1) --- */}
          <g fill="#2c3245">
            <rect x="0" y="0" width="320" height="8" />
            <rect x="0" y="172" width="320" height="8" />
            <rect x="0" y="0" width="8" height="180" />
            <rect x="312" y="0" width="8" height="180" />
            <rect x="176" y="0" width="8" height="180" />
            <rect x="176" y="88" width="144" height="8" />
          </g>
          <rect x="176" y="64" width="8" height="20" fill="url(#woodFloor)" />
          <rect x="220" y="88" width="24" height="8" fill="url(#tileFloor)" />

          {/* --- DYNAMIC Y-SORTED ENTITIES (Z=2+) --- */}
          {renderList.map((ent) => {
            if (ent.category === 'chair') {
               return (
                 <g key={`chair-${ent.id}`} transform={`translate(${ent.x - 6}, ${ent.y - 12})`}>
                   <rect x="2" y="10" width="8" height="2" fill="#000" opacity="0.2" />
                   <rect x="0" y="0" width="12" height="10" fill="#334155" rx="1" />
                   <rect x="1" y="8" width="10" height="4" fill="#1e293b" rx="1" />
                 </g>
               );
            }
            if (ent.category === 'desk') {
              return (
                <RenderDesk 
                  key={`desk-${ent.id}`} 
                  {...ent} 
                  onSelectDesk={(agentId: string) => setSelectedAgentId(prev => prev === agentId ? null : agentId)} 
                />
              );
            }
            if (ent.category === 'bookshelf') return <RenderBookshelf key={`shelf-${ent.id}`} {...ent} />;
            if (ent.category === 'prop') return <RenderProp key={`prop-${ent.id}`} {...ent} />;
            if (ent.category === 'agent') {
              const isSitting = ent.currentNode === ent.home && !ent.isWalking;
              const isSelected = selectedAgentId === ent.id;
              return (
                <RenderSprite
                  key={`agent-${ent.id}`}
                  agent={ent}
                  isSpeaking={activeAgentId === ent.id && hudState === 'SPEAKING'}
                  isWorking={activeAgentId === ent.id && isGlobalProcessing}
                  isSitting={isSitting}
                  isSelected={isSelected}
                  onSelect={(id: string) => setSelectedAgentId(prev => prev === id ? null : id)}
                />
              );
            }
            return null;
          })}

          {/* --- FOREGROUND POTTED PLANTS --- */}
          {[ {x:14,y:14}, {x:162,y:14}, {x:14,y:158}, {x:162,y:158} ].map((p, i) => (
            <g key={`plant-${i}`} transform={`translate(${p.x}, ${p.y})`}>
              <rect x="0" y="12" width="10" height="4" fill="#000" opacity="0.3" />
              <rect x="2" y="6" width="6" height="6" fill="#d2a679" stroke="#1a1a1a" strokeWidth="1" />
              <rect x="0" y="0" width="10" height="8" fill="#40c060" />
              <rect x="1" y="1" width="2" height="2" fill="#2e7d32" />
              <rect x="7" y="4" width="2" height="2" fill="#2e7d32" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
