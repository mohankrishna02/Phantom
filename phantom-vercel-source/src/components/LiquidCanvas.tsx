import React, { useEffect, useRef } from 'react';

export interface PulseWave {
  x: number;
  y: number;
  color: string;
  radius: number;
  maxRadius: number;
  opacity: number;
}

interface LiquidCanvasProps {
  externalPulses?: PulseWave[];
  onCanvasClick?: (xNorm: number, yNorm: number) => void;
  theme?: 'dark' | 'light';
}

interface LiquidOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  phase: number;
  speed: number;
}

export const LiquidCanvas: React.FC<LiquidCanvasProps> = ({
  externalPulses = [],
  onCanvasClick,
  theme = 'dark',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ripplesRef = useRef<PulseWave[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    active: false,
    targetX: 0,
    targetY: 0,
  });

  // Keep track of external pulses
  useEffect(() => {
    if (externalPulses.length > 0) {
      const latest = externalPulses[externalPulses.length - 1];
      if (latest && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        ripplesRef.current.push({
          x: latest.x * rect.width,
          y: latest.y * rect.height,
          color: latest.color,
          radius: 10,
          maxRadius: Math.max(rect.width, rect.height) * 0.7,
          opacity: 0.85,
        });
      }
    }
  }, [externalPulses]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Initialize organic fluid orbs
    const orbs: LiquidOrb[] = [
      {
        x: width * 0.25,
        y: height * 0.3,
        vx: 0.3,
        vy: 0.2,
        radius: 260,
        baseRadius: 260,
        color: 'rgba(56, 189, 248, 0.12)', // Cyan
        phase: 0,
        speed: 0.012,
      },
      {
        x: width * 0.75,
        y: height * 0.25,
        vx: -0.25,
        vy: 0.3,
        radius: 300,
        baseRadius: 300,
        color: 'rgba(147, 51, 234, 0.11)', // Purple
        phase: 2,
        speed: 0.015,
      },
      {
        x: width * 0.5,
        y: height * 0.7,
        vx: 0.2,
        vy: -0.25,
        radius: 280,
        baseRadius: 280,
        color: 'rgba(16, 185, 129, 0.09)', // Emerald
        phase: 4,
        speed: 0.01,
      },
      {
        x: width * 0.85,
        y: height * 0.8,
        vx: -0.3,
        vy: -0.15,
        radius: 220,
        baseRadius: 220,
        color: 'rgba(236, 72, 153, 0.08)', // Rose
        phase: 1.5,
        speed: 0.018,
      },
      {
        x: width * 0.15,
        y: height * 0.8,
        vx: 0.15,
        vy: -0.3,
        radius: 240,
        baseRadius: 240,
        color: 'rgba(59, 130, 246, 0.1)', // Blue
        phase: 3.2,
        speed: 0.014,
      },
    ];

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
      mouseRef.current.active = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        mouseRef.current.targetX = e.touches[0].clientX;
        mouseRef.current.targetY = e.touches[0].clientY;
        mouseRef.current.active = true;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    const handleClick = (e: MouseEvent) => {
      // Don't trigger if clicked on interactive buttons or inputs
      const target = e.target as HTMLElement;
      if (target.closest('button, input, textarea, a, [role="button"]')) {
        return;
      }

      const x = e.clientX;
      const y = e.clientY;

      ripplesRef.current.push({
        x,
        y,
        color: 'rgba(56, 189, 248, 0.9)',
        radius: 10,
        maxRadius: Math.max(width, height) * 0.6,
        opacity: 0.8,
      });

      if (onCanvasClick) {
        onCanvasClick(x / width, y / height);
      }
    };

    window.addEventListener('click', handleClick);

    let t = 0;
    const render = () => {
      t += 0.02;

      // Smooth mouse follow
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      ctx.clearRect(0, 0, width, height);

      // Obsidian dark or luminous light liquid gradient background
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.4,
        50,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.9
      );
      if (theme === 'light') {
        bgGrad.addColorStop(0, '#f8fafc');
        bgGrad.addColorStop(0.5, '#f1f5f9');
        bgGrad.addColorStop(1, '#e2e8f0');
      } else {
        bgGrad.addColorStop(0, '#090e1f');
        bgGrad.addColorStop(0.5, '#060914');
        bgGrad.addColorStop(1, '#03050a');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Update and draw fluid orbs with organic undulating radii
      ctx.save();
      for (const orb of orbs) {
        orb.phase += orb.speed;
        orb.radius = orb.baseRadius + Math.sin(orb.phase) * 35;

        // Move orbs
        orb.x += orb.vx;
        orb.y += orb.vy;

        // Repel slightly from mouse if active
        if (mouseRef.current.active) {
          const dx = orb.x - mouseRef.current.x;
          const dy = orb.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 400 && dist > 1) {
            orb.x += (dx / dist) * 1.2;
            orb.y += (dy / dist) * 1.2;
          }
        }

        // Screen boundary bounce
        if (orb.x - orb.radius < -100) {
          orb.x = -100 + orb.radius;
          orb.vx *= -1;
        } else if (orb.x + orb.radius > width + 100) {
          orb.x = width + 100 - orb.radius;
          orb.vx *= -1;
        }
        if (orb.y - orb.radius < -100) {
          orb.y = -100 + orb.radius;
          orb.vy *= -1;
        } else if (orb.y + orb.radius > height + 100) {
          orb.y = height + 100 - orb.radius;
          orb.vy *= -1;
        }

        // Draw radial glow
        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        grad.addColorStop(0, orb.color);
        grad.addColorStop(0.65, orb.color.replace(/[\d.]+\)$/, '0.04)'));
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Draw interactive mouse liquid aura
      if (mouseRef.current.active) {
        ctx.save();
        const mouseGrad = ctx.createRadialGradient(
          mouseRef.current.x,
          mouseRef.current.y,
          0,
          mouseRef.current.x,
          mouseRef.current.y,
          180
        );
        mouseGrad.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
        mouseGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.03)');
        mouseGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = mouseGrad;
        ctx.beginPath();
        ctx.arc(mouseRef.current.x, mouseRef.current.y, 180, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render expanding liquid ripples
      ctx.save();
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const r = ripplesRef.current[i];
        r.radius += 4.5;
        r.opacity *= 0.96;

        if (r.radius > r.maxRadius || r.opacity < 0.01) {
          ripplesRef.current.splice(i, 1);
          continue;
        }

        // Concentric caustic liquid waves
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = r.color.includes('rgba')
          ? r.color.replace(/[\d.]+\)$/, `${r.opacity})`)
          : `rgba(56, 189, 248, ${r.opacity})`;

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Secondary subtle inner ring
        if (r.radius > 25) {
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(255, 255, 255, ${r.opacity * 0.4})`;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius * 0.75, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onCanvasClick]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-auto z-0 transition-opacity duration-1000"
        style={{ width: '100vw', height: '100vh' }}
      />
      {/* SVG liquid displacement filter definition (usable across DOM elements if desired) */}
      <svg className="hidden">
        <filter id="liquid-glass-distortion" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.015 0.015" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    </>
  );
};
