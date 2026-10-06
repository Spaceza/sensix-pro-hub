import { useEffect, useRef } from "react";
import type { Preference } from "@/lib/sensi-engine";

interface CyberGridCanvasProps {
  preference: Preference;
  intensity?: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  seed: number;
  hue: number;
  alpha: number;
}

export function CyberGridCanvas({ preference }: CyberGridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });
  const sparksRef = useRef<Spark[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let width = 0;
    let height = 0;
    let gridOffset = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    window.addEventListener("resize", resize);
    resize();

    const handlePointerMove = (e: PointerEvent) => {
      pointerRef.current.targetX = e.clientX / Math.max(1, window.innerWidth);
      pointerRef.current.targetY = e.clientY / Math.max(1, window.innerHeight);
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    // Initialize initial sparks
    const SPARK_COUNT = preference === "high" ? 65 : preference === "low" ? 30 : 45;
    sparksRef.current = Array.from({ length: SPARK_COUNT }, () => createSpark(width, height, true));

    function createSpark(w: number, h: number, randomizeY = false): Spark {
      const isHigh = preference === "high";
      const isLow = preference === "low";
      const hue = isHigh ? (Math.random() > 0.4 ? 355 : 30) : isLow ? (Math.random() > 0.4 ? 185 : 210) : (Math.random() > 0.35 ? 42 : 24);
      const speedMult = isHigh ? 2.2 : isLow ? 0.6 : 1.2;
      return {
        x: Math.random() * (w || 1000),
        y: randomizeY ? Math.random() * (h || 800) : (h || 800) + Math.random() * 40,
        vx: (Math.random() - 0.5) * 0.9 * speedMult,
        vy: -(Math.random() * 1.6 + 0.8) * speedMult,
        size: Math.random() * 2.8 + 1.2,
        life: 0,
        maxLife: Math.random() * 180 + 120,
        seed: Math.random() * 100,
        hue,
        alpha: Math.random() * 0.7 + 0.3,
      };
    }

    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Smooth pointer parallax interpolation
      const ptr = pointerRef.current;
      ptr.x += (ptr.targetX - ptr.x) * 0.05;
      ptr.y += (ptr.targetY - ptr.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Grid speed by mode
      const gridSpeed = (preference === "high" ? 75 : preference === "low" ? 18 : 38) * dt;
      gridOffset = (gridOffset + gridSpeed) % 40;

      // 1. Perspective 3D Grid on Horizon
      const horizonY = height * 0.62 + (ptr.y - 0.5) * 40;
      const vanishingX = width * 0.5 + (ptr.x - 0.5) * 80;

      ctx.save();
      // Horizon Glow Line
      const horizonGlow = ctx.createLinearGradient(0, horizonY - 40, 0, horizonY + 20);
      const glowColor =
        preference === "high"
          ? "rgba(255, 35, 60, "
          : preference === "low"
            ? "rgba(0, 240, 255, "
            : "rgba(255, 204, 0, ";
      horizonGlow.addColorStop(0, `${glowColor}0)`);
      horizonGlow.addColorStop(0.7, `${glowColor}0.18)`);
      horizonGlow.addColorStop(1, `${glowColor}0)`);
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, horizonY - 40, width, 60);

      // Radial perspective lines converging to vanishing point
      const lineCount = 28;
      ctx.lineWidth = 1;
      for (let i = -lineCount; i <= lineCount; i++) {
        const spread = (i / lineCount) * width * 1.8;
        const startX = vanishingX + spread;
        ctx.strokeStyle = `${glowColor}${Math.max(0.02, 0.12 - Math.abs(i) / lineCount * 0.1)})`;
        ctx.beginPath();
        ctx.moveTo(vanishingX, horizonY);
        ctx.lineTo(startX, height);
        ctx.stroke();
      }

      // Horizontal depth lines with geometric z-spacing
      const depthSteps = 16;
      for (let i = 1; i <= depthSteps; i++) {
        const depth = Math.pow(i / depthSteps, 2.2);
        const y = horizonY + depth * (height - horizonY) + gridOffset * depth * 0.4;
        if (y <= height && y >= horizonY) {
          const alpha = depth * (preference === "high" ? 0.22 : 0.12);
          ctx.strokeStyle = `${glowColor}${alpha})`;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 2. Rising Lobby Sparks / Embers Particle System
      const sparks = sparksRef.current;
      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i];
        s.life += dt * 60;
        s.y += s.vy;
        s.x += s.vx + Math.sin(now * 0.003 + s.seed) * 0.6;

        // Subtle repulsion from cursor
        const dx = s.x - ptr.x * width;
        const dy = s.y - ptr.y * height;
        const dist = Math.hypot(dx, dy);
        if (dist < 140 && dist > 1) {
          const force = (1 - dist / 140) * 1.8;
          s.x += (dx / dist) * force;
          s.y += (dy / dist) * force;
        }

        const lifeRatio = s.life / s.maxLife;
        if (s.life >= s.maxLife || s.y < -30) {
          sparks[i] = createSpark(width, height, false);
          continue;
        }

        const alpha = Math.sin(lifeRatio * Math.PI) * s.alpha;
        ctx.save();
        ctx.fillStyle = `hsla(${s.hue}, 95%, 60%, ${alpha})`;
        ctx.shadowColor = `hsla(${s.hue}, 100%, 50%, ${alpha * 0.8})`;
        ctx.shadowBlur = preference === "high" ? 12 : 7;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * (1 - lifeRatio * 0.35), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [preference]);

  return (
    <canvas
      ref={canvasRef}
      className="cyber-grid-canvas"
      aria-hidden="true"
    />
  );
}
