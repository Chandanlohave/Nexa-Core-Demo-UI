import React, { useState, useEffect, useRef } from 'react';
import { officeAudio } from './officeAudio';

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isCue?: boolean;
  isPocketed: boolean;
}

const TABLE_W = 380;
const TABLE_H = 200;
const POCKET_RADIUS = 14;

const POCKETS = [
  { x: 18, y: 18 },
  { x: TABLE_W / 2, y: 14 },
  { x: TABLE_W - 18, y: 18 },
  { x: 18, y: TABLE_H - 18 },
  { x: TABLE_W / 2, y: TABLE_H - 14 },
  { x: TABLE_W - 18, y: TABLE_H - 18 },
];

export const PoolMiniGameModal = ({ 
  isOpen = true,
  onClose,
  activeAgentName = 'Cypher',
  onAgentsPlayPool
}: { 
  isOpen?: boolean;
  onClose: () => void;
  activeAgentName?: string;
  onAgentsPlayPool?: (agent1: string, agent2: string) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [power, setPower] = useState(60);
  const [gameMode, setGameMode] = useState<'SOLO' | 'VS_AGENT' | 'AI_VS_AI'>('VS_AGENT');
  const [turn, setTurn] = useState<'USER' | 'AGENT' | 'AGENT_2'>('USER');
  const [agent1Name] = useState('Kronos');
  const [agent2Name] = useState('Cypher');
  const [agentSpeech, setAgentSpeech] = useState(`${activeAgentName}: "Break the rack! Let's see your angle calculation."`);
  const [mousePos, setMousePos] = useState({ x: 100, y: 100 });
  const [isMoving, setIsMoving] = useState(false);

  // Trigger agent movement to pool table
  useEffect(() => {
    if (isOpen && onAgentsPlayPool) {
      if (gameMode === 'AI_VS_AI') {
        onAgentsPlayPool('agent_kronos', 'agent_cypher');
      } else if (gameMode === 'VS_AGENT') {
        onAgentsPlayPool('agent_core', 'agent_cypher');
      }
    }
  }, [isOpen, gameMode, onAgentsPlayPool]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Balls state in ref for animation frame physics
  const ballsRef = useRef<Ball[]>([]);

  const initGame = () => {
    const balls: Ball[] = [];
    // Cue Ball
    balls.push({
      id: 0,
      x: 100,
      y: TABLE_H / 2,
      vx: 0,
      vy: 0,
      radius: 7,
      color: '#ffffff',
      isCue: true,
      isPocketed: false,
    });

    // Rack of balls
    const colors = ['#eab308', '#3b82f6', '#ef4444', '#a855f7', '#f97316', '#10b981', '#1e293b', '#ec4899'];
    let idx = 0;
    const startX = 260;
    const startY = TABLE_H / 2;
    const r = 7;

    for (let col = 0; col < 4; col++) {
      for (let row = 0; row <= col; row++) {
        if (idx >= colors.length) break;
        const x = startX + col * (r * 1.75);
        const y = startY + (row - col / 2) * (r * 2.1);
        balls.push({
          id: idx + 1,
          x,
          y,
          vx: 0,
          vy: 0,
          radius: r,
          color: colors[idx % colors.length],
          isPocketed: false,
        });
        idx++;
      }
    }

    ballsRef.current = balls;
    setScore(0);
    setTurn('USER');
  };

  useEffect(() => {
    initGame();
  }, []);

  // Main physics loop
  useEffect(() => {
    let animationFrameId: number;

    const updatePhysics = () => {
      const balls = ballsRef.current;
      let moving = false;
      const friction = 0.985;
      const minVelocity = 0.05;

      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        if (b.isPocketed) continue;

        // Apply velocity
        b.x += b.vx;
        b.y += b.vy;

        // Apply friction
        b.vx *= friction;
        b.vy *= friction;

        if (Math.abs(b.vx) < minVelocity) b.vx = 0;
        if (Math.abs(b.vy) < minVelocity) b.vy = 0;

        if (b.vx !== 0 || b.vy !== 0) moving = true;

        // Cushion bounce
        const cushionMargin = 22;
        if (b.x - b.radius < cushionMargin) {
          b.x = cushionMargin + b.radius;
          b.vx = -b.vx * 0.8;
          officeAudio?.playBallHit?.(0.2);
        } else if (b.x + b.radius > TABLE_W - cushionMargin) {
          b.x = TABLE_W - cushionMargin - b.radius;
          b.vx = -b.vx * 0.8;
          officeAudio?.playBallHit?.(0.2);
        }

        if (b.y - b.radius < cushionMargin) {
          b.y = cushionMargin + b.radius;
          b.vy = -b.vy * 0.8;
          officeAudio?.playBallHit?.(0.2);
        } else if (b.y + b.radius > TABLE_H - cushionMargin) {
          b.y = TABLE_H - cushionMargin - b.radius;
          b.vy = -b.vy * 0.8;
          officeAudio?.playBallHit?.(0.2);
        }

        // Pocket detection
        for (const p of POCKETS) {
          const dx = b.x - p.x;
          const dy = b.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < POCKET_RADIUS) {
            b.isPocketed = true;
            b.vx = 0;
            b.vy = 0;
            officeAudio?.playPocket?.();

            if (b.isCue) {
              // Scratch
              setTimeout(() => {
                b.isPocketed = false;
                b.x = 100;
                b.y = TABLE_H / 2;
                b.vx = 0;
                b.vy = 0;
              }, 600);
              setAgentSpeech(`${activeAgentName}: "Scratch! Ball in hand for next turn."`);
            } else {
              setScore(s => s + 100);
              setAgentSpeech(`${activeAgentName}: "Nice pot! Solid trajectory calculations."`);
            }
          }
        }
      }

      // Ball to ball collision
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const b1 = balls[i];
          const b2 = balls[j];
          if (b1.isPocketed || b2.isPocketed) continue;

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < b1.radius + b2.radius) {
            // Overlap resolution
            const overlap = (b1.radius + b2.radius) - dist;
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);

            b1.x -= (nx * overlap) / 2;
            b1.y -= (ny * overlap) / 2;
            b2.x += (nx * overlap) / 2;
            b2.y += (ny * overlap) / 2;

            // Elastic collision
            const kx = b1.vx - b2.vx;
            const ky = b1.vy - b2.vy;
            const p = 2 * (nx * kx + ny * ky) / 2;

            b1.vx -= p * nx;
            b1.vy -= p * ny;
            b2.vx += p * nx;
            b2.vy += p * ny;

            const hitVol = Math.min(Math.sqrt(b1.vx * b1.vx + b1.vy * b1.vy) / 6, 1);
            officeAudio?.playBallHit?.(hitVol);
          }
        }
      }

      setIsMoving(moving);

      // Render on canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Clear
          ctx.clearRect(0, 0, TABLE_W, TABLE_H);

          // Draw Pockets
          for (const p of POCKETS) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = '#090d16';
            ctx.fill();
            ctx.strokeStyle = '#27272a';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Draw Balls
          for (const b of balls) {
            if (b.isPocketed) continue;
            ctx.save();
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = b.color;
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 2;
            ctx.fill();

            // Ball highlight reflection
            ctx.beginPath();
            ctx.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.fill();
            ctx.restore();
          }

          // Draw Cue Stick & Aim Line if user is aiming & cue ball stopped
          const cueBall = balls[0];
          if (cueBall && !cueBall.isPocketed && !moving && turn === 'USER') {
            const dx = mousePos.x - cueBall.x;
            const dy = mousePos.y - cueBall.y;
            const angle = Math.atan2(dy, dx);

            // Dotted aim guide line
            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([4, 4]);
            ctx.moveTo(cueBall.x, cueBall.y);
            ctx.lineTo(cueBall.x + Math.cos(angle) * 120, cueBall.y + Math.sin(angle) * 120);
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();

            // Cue Stick
            const cueDist = 20 + (power / 100) * 15;
            const cueLen = 90;
            const startCueX = cueBall.x - Math.cos(angle) * cueDist;
            const startCueY = cueBall.y - Math.sin(angle) * cueDist;
            const endCueX = startCueX - Math.cos(angle) * cueLen;
            const endCueY = startCueY - Math.sin(angle) * cueLen;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(startCueX, startCueY);
            ctx.lineTo(endCueX, endCueY);
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Cue Tip
            ctx.beginPath();
            ctx.moveTo(startCueX, startCueY);
            ctx.lineTo(startCueX - Math.cos(angle) * 8, startCueY - Math.sin(angle) * 8);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      animationFrameId = requestAnimationFrame(updatePhysics);
    };

    animationFrameId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationFrameId);
  }, [mousePos, power, turn, activeAgentName]);

  const handleShoot = () => {
    const cueBall = ballsRef.current[0];
    if (!cueBall || isMoving || cueBall.isPocketed) return;

    const dx = mousePos.x - cueBall.x;
    const dy = mousePos.y - cueBall.y;
    const angle = Math.atan2(dy, dx);
    const speed = (power / 100) * 12 + 2;

    cueBall.vx = Math.cos(angle) * speed;
    cueBall.vy = Math.sin(angle) * speed;

    officeAudio?.playBallHit?.(0.9);

    if (gameMode === 'VS_AGENT') {
      setTimeout(() => {
        setTurn('AGENT');
        triggerAgentTurn();
      }, 2500);
    }
  };

  useEffect(() => {
    if (gameMode === 'AI_VS_AI' && !isMoving) {
      const timer = setTimeout(() => {
        triggerAutonomousShot();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameMode, isMoving, turn]);

  const triggerAutonomousShot = () => {
    const cueBall = ballsRef.current[0];
    const activeTargets = ballsRef.current.filter(b => !b.isCue && !b.isPocketed);
    if (!cueBall || activeTargets.length === 0) {
      setAgentSpeech(`🏆 TOURNAMENT COMPLETE! All balls potted!`);
      return;
    }

    const shooter = turn === 'AGENT_2' ? agent2Name : agent1Name;
    const target = activeTargets[Math.floor(Math.random() * activeTargets.length)];
    const dx = target.x - cueBall.x;
    const dy = target.y - cueBall.y;
    const angle = Math.atan2(dy, dx) + (Math.random() * 0.12 - 0.06);
    const speed = 7 + Math.random() * 4;

    cueBall.vx = Math.cos(angle) * speed;
    cueBall.vy = Math.sin(angle) * speed;
    officeAudio?.playBallHit?.(0.85);

    setAgentSpeech(`${shooter}: "瞄准 Bank Shot into corner pocket! Power ${Math.round(speed * 10)}%"`);
    setTurn(t => t === 'AGENT_2' ? 'AGENT' : 'AGENT_2');
  };

  const triggerAgentTurn = () => {
    setTimeout(() => {
      const cueBall = ballsRef.current[0];
      const activeTargets = ballsRef.current.filter(b => !b.isCue && !b.isPocketed);
      if (!cueBall || activeTargets.length === 0) {
        setTurn('USER');
        return;
      }

      // Agent picks nearest target ball
      const target = activeTargets[0];
      const dx = target.x - cueBall.x;
      const dy = target.y - cueBall.y;
      const angle = Math.atan2(dy, dx) + (Math.random() * 0.1 - 0.05);
      const speed = 7 + Math.random() * 3;

      cueBall.vx = Math.cos(angle) * speed;
      cueBall.vy = Math.sin(angle) * speed;
      officeAudio?.playBallHit?.(0.8);
      setAgentSpeech(`${activeAgentName}: "Target locked on ${target.color} ball. Executing angle vector."`);

      setTimeout(() => {
        setTurn('USER');
      }, 3000);
    }, 1500);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = TABLE_W / rect.width;
    const scaleY = TABLE_H / rect.height;
    setMousePos({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = TABLE_W / rect.width;
      const scaleY = TABLE_H / rect.height;
      setMousePos({
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 font-mono text-white relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎱</span>
            <div>
              <div className="text-xs font-bold text-cyan-400">BREAK LOUNGE // RETRO 8-BALL</div>
              <div className="text-[10px] text-zinc-400">Nexa Neural Physics Engine</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full font-bold">
              SCORE: {score}
            </span>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="p-1 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer text-xs font-bold border border-zinc-700 transition-colors"
              title="Close game"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Live Agent Banter Box */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-1.5 text-[11px] text-zinc-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="italic truncate">{agentSpeech}</span>
        </div>

        {/* 2D Green Felt Pool Table Canvas */}
        <div className="relative rounded-xl overflow-hidden border-4 border-[#854d0e] bg-[#15803d] shadow-[inset_0_0_20px_rgba(0,0,0,0.6)] cursor-crosshair">
          <canvas
            ref={canvasRef}
            width={TABLE_W}
            height={TABLE_H}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onClick={handleShoot}
            className="w-full h-auto block"
          />
        </div>

        {/* Power Slider & Controls */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">CUE SHOT POWER: <strong className="text-cyan-400">{power}%</strong></span>
            <span className="text-zinc-500">{turn === 'USER' ? '👉 YOUR TURN: Tap table to shoot' : `🤖 ${activeAgentName}'s Turn...`}</span>
          </div>
          <input
            type="range"
            min="20"
            max="100"
            value={power}
            onChange={(e) => setPower(Number(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Action Footer Buttons */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setGameMode(m => {
                  if (m === 'VS_AGENT') return 'AI_VS_AI';
                  if (m === 'AI_VS_AI') return 'SOLO';
                  return 'VS_AGENT';
                });
                officeAudio?.playBlip?.(600);
              }}
              className="text-[10px] px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-cyan-400 font-bold cursor-pointer"
            >
              MODE: {gameMode === 'VS_AGENT' ? `VS ${activeAgentName}` : gameMode === 'AI_VS_AI' ? `🤖 AUTO AI VS AI (${agent1Name} vs ${agent2Name})` : 'SOLO PRACTICE'}
            </button>
            <button
              onClick={initGame}
              className="text-[10px] px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 cursor-pointer"
            >
              🔄 RERACK
            </button>
          </div>
          <button
            onClick={handleShoot}
            disabled={isMoving || turn !== 'USER'}
            className="text-xs px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold cursor-pointer transition-all shadow-[0_0_12px_rgba(6,182,212,0.4)]"
          >
            STRIKE BALL ⚡
          </button>
        </div>

      </div>
    </div>
  );
};
