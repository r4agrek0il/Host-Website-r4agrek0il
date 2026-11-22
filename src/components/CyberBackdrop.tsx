import { useEffect, useRef } from 'react';

interface CyberBackdropProps {
  isPlaying: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
}

export default function CyberBackdrop({ isPlaying }: CyberBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const playingRef = useRef(isPlaying);

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      pointerRef.current = {
        x: e.clientX / Math.max(1, window.innerWidth),
        y: e.clientY / Math.max(1, window.innerHeight),
      };
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    let width = 0;
    let height = 0;

    const particles: Particle[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (particles.length === 0) {
        const count = width < 768 ? 22 : 44;
        for (let i = 0; i < count; i++) {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            radius: Math.random() * 1.6 + 0.8,
            color: i % 3 === 0 ? '255, 123, 0' : '0, 240, 255',
            alpha: Math.random() * 0.45 + 0.15,
          });
        }
      }
    };

    resize();
    window.addEventListener('resize', resize);

    let tick = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const px = (pointerRef.current.x - 0.5) * 32;
      const py = (pointerRef.current.y - 0.5) * 24;
      const speedMult = playingRef.current ? 1.65 : 0.75;

      // Subtle drifting dual-tone nebula/aurora glow (8-14% opacity)
      const cyanX = width * 0.28 + Math.sin(tick * 0.004) * 90 - px * 0.8;
      const cyanY = height * 0.24 + Math.cos(tick * 0.003) * 60 - py * 0.8;
      const cyanGrad = ctx.createRadialGradient(cyanX, cyanY, 10, cyanX, cyanY, width * 0.46);
      cyanGrad.addColorStop(0, playingRef.current ? 'rgba(0, 240, 255, 0.13)' : 'rgba(0, 240, 255, 0.09)');
      cyanGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = cyanGrad;
      ctx.fillRect(0, 0, width, height);

      const orangeX = width * 0.74 + Math.cos(tick * 0.0035) * 90 + px * 0.8;
      const orangeY = height * 0.62 + Math.sin(tick * 0.0042) * 70 + py * 0.8;
      const orangeGrad = ctx.createRadialGradient(orangeX, orangeY, 10, orangeX, orangeY, width * 0.44);
      orangeGrad.addColorStop(0, playingRef.current ? 'rgba(255, 123, 0, 0.13)' : 'rgba(255, 123, 0, 0.08)');
      orangeGrad.addColorStop(1, 'rgba(255, 123, 0, 0)');
      ctx.fillStyle = orangeGrad;
      ctx.fillRect(0, 0, width, height);

      // Perspective cybernetic horizon grid
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.055)';
      ctx.lineWidth = 1;
      const horizonY = height * 0.58 + py * 0.35;
      const vanishX = width * 0.5 + px * 1.1;

      for (let i = -8; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(vanishX + i * 28, horizonY);
        ctx.lineTo(vanishX + i * 240, height + 20);
        ctx.stroke();
      }

      for (let r = 1; r <= 6; r++) {
        const t = r / 6;
        const y = horizonY + Math.pow(t, 1.8) * (height - horizonY);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // Floating neon micro-particles with gentle mouse parallax
      for (const p of particles) {
        if (!prefersReduced) {
          p.x += p.vx * speedMult;
          p.y += p.vy * speedMult;
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
        }

        const drawX = p.x + px * (p.radius * 0.45);
        const drawY = p.y + py * (p.radius * 0.45);

        ctx.beginPath();
        ctx.arc(drawX, drawY, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${playingRef.current ? p.alpha * 1.25 : p.alpha})`;
        ctx.fill();
      }

      if (!prefersReduced) {
        tick += speedMult;
        rafId = window.requestAnimationFrame(render);
      }
    };

    render();
    return () => {
      window.removeEventListener('resize', resize);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
