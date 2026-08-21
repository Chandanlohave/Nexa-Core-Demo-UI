const fs = require('fs');
let content = fs.readFileSync('components/NebulaOrb.tsx', 'utf8');

const regex = /\s*ctx\.globalCompositeOperation = 'source-over';\s*projectedAgents\.forEach\(\(\{ x, y, z, scale, agent \}\) => \{[\s\S]*?ctx\.restore\(\);\s*\}\s*\}\);\s*requestRef\.current = requestAnimationFrame\(render\);/m;

const replacement = `
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
      requestRef.current = requestAnimationFrame(render);`;

if (regex.test(content)) {
  fs.writeFileSync('components/NebulaOrb.tsx', content.replace(regex, replacement));
  console.log("SUCCESS");
} else {
  console.log("REGEX FAILED");
}
