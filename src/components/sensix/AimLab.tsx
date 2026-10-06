import { useEffect, useRef, useState } from "react";
import {
  Crosshair,
  RotateCcw,
  Volume2,
  VolumeX,
  Shield,
  Zap,
  MoveHorizontal,
  Flame,
  Activity,
  Sliders,
  Sparkles,
} from "lucide-react";
import type { Preference, EngineInput } from "@/lib/sensi-engine";

export interface AimLabProps {
  sound: boolean;
  baseFire: number;
  baseFireY?: number;
  preference: Preference;
  stretchedScreen?: boolean;
  fps?: EngineInput["fps"];
  touchSampling?: number;
  sensiGeral?: number;
  dpi?: number;
  pointerSpeed?: number;
  onResult: (result: TrainingResult | null) => void;
}

export interface TrainingResult {
  speed: number;
  accel: number;
  headDwell: number;
  stability: number;
  accuracy: number;
  headshots: number;
  bodyshots: number;
  overshoots: number;
  factor: number;
  fireButton: number;
  fireButtonY: number;
  pullPattern: "Linear" | "Puxada em J" | "Meia-Lua";
  scenario: "Preso no Peito" | "Capa Cravado" | "Puxada Pé-Cabeça" | "Overshoot";
  hsRate: number;
  chestLockRate: number;
  overshootRate: number;
}

interface Point {
  x: number;
  y: number;
  t: number;
}

interface Damage {
  x: number;
  y: number;
  value: number;
  type: "head" | "body" | "leg" | "miss";
  born: number;
}

interface Tracer {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  head: boolean;
  born: number;
}

interface HeatHit {
  x: number;
  y: number;
  type: "head" | "chest" | "overshoot" | "limb";
}

export function AimLab({
  sound,
  baseFire,
  baseFireY = 22,
  preference,
  stretchedScreen = false,
  fps = 60,
  touchSampling = 240,
  sensiGeral = 184,
  dpi = 411,
  pointerSpeed = 5,
  onResult,
}: AimLabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioContext | null>(null);

  // States
  const [metrics, setMetrics] = useState<TrainingResult | null>(null);
  const [stockLvl3, setStockLvl3] = useState(true);
  const [strafeEnabled, setStrafeEnabled] = useState(false);
  const [aimAssistLock, setAimAssistLock] = useState(false);
  const [overshootActive, setOvershootActive] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<TrainingResult["scenario"]>("Preso no Peito");
  const [detectedPattern, setDetectedPattern] = useState<TrainingResult["pullPattern"]>("Linear");
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [fireButtonSize, setFireButtonSize] = useState(baseFire);
  const [fireButtonYPos, setFireButtonYPos] = useState(baseFireY);

  // Heatmap spots
  const [heatHits, setHeatHits] = useState<HeatHit[]>([]);

  // Telemetry refs for RAF loop
  const pointerPos = useRef<{ x: number; y: number }>({ x: 300, y: 260 });
  const reticlePos = useRef<{ x: number; y: number }>({ x: 300, y: 260 });
  const fireButtonDragOrigin = useRef<{ x: number; y: number } | null>(null);
  const isShooting = useRef(false);
  const lastShotTime = useRef(0);
  const pathPoints = useRef<Point[]>([]);
  const bloomRadius = useRef(0);
  const damagesRef = useRef<Damage[]>([]);
  const tracersRef = useRef<Tracer[]>([]);
  const headDwellTime = useRef(0);
  const headDwellStart = useRef<number | null>(null);

  // Dummy target position & strafe
  const targetPos = useRef({ x: 0.5, y: 0.44, vx: 0.0018, direction: 1 });

  // Update button size & Y if prop changes and not custom modified
  useEffect(() => {
    setFireButtonSize(baseFire);
  }, [baseFire]);

  useEffect(() => {
    setFireButtonYPos(baseFireY);
  }, [baseFireY]);

  // Procedural Web Audio Sound Synthesizer
  const playGunshot = (isHead: boolean) => {
    if (!sound) return;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = audioRef.current ?? new AudioContextClass();
    audioRef.current = ctx;
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;

    // 1. Kick transient (punchy bass impact of Free Fire UMP-45)
    const kickOsc = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kickOsc.type = "sine";
    kickOsc.frequency.setValueAtTime(isHead ? 155 : 120, now);
    kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.065);
    kickGain.gain.setValueAtTime(0.18, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    kickOsc.connect(kickGain).connect(ctx.destination);
    kickOsc.start(now);
    kickOsc.stop(now + 0.075);

    // 2. Gunpowder crack noise burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
    }
    const noiseSource = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();

    noiseSource.buffer = noiseBuffer;
    filter.type = "bandpass";
    filter.frequency.value = isHead ? 2600 : 1600;
    filter.Q.value = 1.2;
    noiseGain.gain.setValueAtTime(isHead ? 0.24 : 0.16, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noiseSource.connect(filter).connect(noiseGain).connect(ctx.destination);
    noiseSource.start(now);

    // 3. Headshot metallic bell "PING" if critical head hit
    if (isHead) {
      const bellOsc = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bellOsc.type = "triangle";
      bellOsc.frequency.setValueAtTime(1880, now);
      bellOsc.frequency.exponentialRampToValueAtTime(840, now + 0.14);
      bellGain.gain.setValueAtTime(0.22, now);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      bellOsc.connect(bellGain).connect(ctx.destination);
      bellOsc.start(now);
      bellOsc.stop(now + 0.16);
    }
  };

  const playDeniedBeep = () => {
    if (!sound) return;
    try {
      const ctx = audioRef.current ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioRef.current = ctx;
      if (ctx.state === "suspended") void ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(210, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // ignore
    }
  };

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const arena = arenaRef.current;
    if (!canvas || !arena) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;

    const resize = () => {
      const rect = arena.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Default reticle centered on target torso if starting
      if (reticlePos.current.x === 300) {
        reticlePos.current = { x: rect.width * 0.5, y: rect.height * 0.44 };
        pointerPos.current = { x: rect.width * 0.5, y: rect.height * 0.44 };
      }
    };

    const obs = new ResizeObserver(resize);
    obs.observe(arena);
    resize();

    let lastLoopTime = performance.now();

    const loop = (now: number) => {
      const rect = arena.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const dt = Math.min((now - lastLoopTime) / 1000, 0.05);
      lastLoopTime = now;

      ctx.clearRect(0, 0, w, h);

      // 1. Tactical Arena Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "rgba(8, 12, 16, 0.95)");
      bgGrad.addColorStop(1, "rgba(4, 6, 8, 0.98)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Cyber Grid
      ctx.strokeStyle = "rgba(143, 222, 230, 0.05)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 2. Strafe Target Physics
      if (strafeEnabled) {
        targetPos.current.x += targetPos.current.vx * targetPos.current.direction;
        if (targetPos.current.x > 0.72) {
          targetPos.current.x = 0.72;
          targetPos.current.direction = -1;
        } else if (targetPos.current.x < 0.28) {
          targetPos.current.x = 0.28;
          targetPos.current.direction = 1;
        }
      }

      const tx = targetPos.current.x * w;
      const ty = targetPos.current.y * h;
      const targetScale = 1.0;

      // Draw Free Fire Character Dummy with Anatomical Hitboxes
      drawFreeFireDummy(ctx, tx, ty, targetScale, preference);

      // Hitbox dimensions
      const headCenter = { x: tx, y: ty - 84 * targetScale };
      const headRadius = 22 * targetScale;
      const chestCenter = { x: tx, y: ty - 18 * targetScale };
      const chestHalfW = 34 * targetScale;
      const chestHalfH = 46 * targetScale;
      const legCenter = { x: tx, y: ty + 56 * targetScale };
      const legHalfW = 28 * targetScale;
      const legHalfH = 42 * targetScale;

      // 3. Aim Assist Magnetic Gravity & Reticle Dynamics
      const reticle = reticlePos.current;

      // Distance from chest magnet
      const distToChest = Math.hypot(reticle.x - chestCenter.x, reticle.y - chestCenter.y);
      const isNearChest = distToChest < 85;

      // Evaluate flick acceleration
      const recentPoints = pathPoints.current.slice(-5);
      let flickAcc = 0;
      if (recentPoints.length >= 2) {
        const p1 = recentPoints[0];
        const p2 = recentPoints[recentPoints.length - 1];
        const pdt = Math.max(1, p2.t - p1.t);
        const pdist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        flickAcc = pdist / pdt; // px/ms
      }

      // Aim Assist Magnetic Gravity Force G = 10
      const GRAVITATIONAL_PULL_FORCE = 10;
      const flickBreaksMagnet = flickAcc > 1.35;
      const isLockedInChest = isShooting.current && isNearChest && !flickBreaksMagnet;

      setAimAssistLock(isLockedInChest);

      // Apply magnet attraction towards chest center if locked (G=10)
      if (isLockedInChest) {
        const pullStrength = (GRAVITATIONAL_PULL_FORCE / 10) * 0.24;
        reticle.x += (chestCenter.x - reticle.x) * pullStrength;
        reticle.y += (chestCenter.y - reticle.y) * pullStrength;
      }

      // Check Overshoot: Reticle is higher than head top with no head hit
      const isOvershoot = reticle.y < headCenter.y - headRadius - 15 && Math.abs(reticle.x - headCenter.x) < 70;
      setOvershootActive(isOvershoot);

      // Hit test current reticle position
      const headDist = Math.hypot(reticle.x - headCenter.x, reticle.y - headCenter.y);
      const isHeadHit = headDist <= headRadius;
      const isChestHit =
        !isHeadHit &&
        Math.abs(reticle.x - chestCenter.x) <= chestHalfW &&
        Math.abs(reticle.y - chestCenter.y) <= chestHalfH;
      const isLegHit =
        !isHeadHit &&
        !isChestHit &&
        Math.abs(reticle.x - legCenter.x) <= legHalfW &&
        Math.abs(reticle.y - legCenter.y) <= legHalfH;

      // 4. Weapon Shooting Mechanics (UMP-45 Rate: 98ms)
      const fireInterval = 98;
      if (isShooting.current && now - lastShotTime.current >= fireInterval) {
        lastShotTime.current = now;

        // Dynamic Bloom Dispersion
        const maxBloom = stockLvl3 ? 14 : 28;
        const bloomStep = stockLvl3 ? 1.4 : 2.8;
        bloomRadius.current = Math.min(maxBloom, bloomRadius.current + bloomStep);

        const jitterAngle = Math.random() * Math.PI * 2;
        const jitterDist = Math.random() * bloomRadius.current;
        const impactX = reticle.x + Math.cos(jitterAngle) * jitterDist;
        const impactY = reticle.y + Math.sin(jitterAngle) * jitterDist;

        // Re-eval impact with jitter
        const bulletHeadDist = Math.hypot(impactX - headCenter.x, impactY - headCenter.y);
        const bulletIsHead = bulletHeadDist <= headRadius;
        const bulletIsChest =
          !bulletIsHead &&
          Math.abs(impactX - chestCenter.x) <= chestHalfW &&
          Math.abs(impactY - chestCenter.y) <= chestHalfH;
        const bulletIsLeg =
          !bulletIsHead &&
          !bulletIsChest &&
          Math.abs(impactX - legCenter.x) <= legHalfW &&
          Math.abs(impactY - legCenter.y) <= legHalfH;

        // Audio
        playGunshot(bulletIsHead);

        // Tracer bullet line from weapon muzzle (bottom right)
        tracersRef.current.push({
          x1: w * 0.85,
          y1: h * 0.95,
          x2: impactX,
          y2: impactY,
          head: bulletIsHead,
          born: now,
        });

        // Record Damage & Heatmap spot
        if (bulletIsHead) {
          const dmgVal = Math.floor(Math.random() * 8) + 137;
          damagesRef.current.push({ x: impactX, y: impactY, value: dmgVal, type: "head", born: now });
          setHeatHits((prev) => [...prev.slice(-30), { x: impactX - tx, y: impactY - ty, type: "head" }]);
        } else if (bulletIsChest) {
          const dmgVal = Math.floor(Math.random() * 4) + 24;
          damagesRef.current.push({ x: impactX, y: impactY, value: dmgVal, type: "body", born: now });
          setHeatHits((prev) => [...prev.slice(-30), { x: impactX - tx, y: impactY - ty, type: "chest" }]);
        } else if (bulletIsLeg) {
          const dmgVal = Math.floor(Math.random() * 3) + 18;
          damagesRef.current.push({ x: impactX, y: impactY, value: dmgVal, type: "leg", born: now });
          setHeatHits((prev) => [...prev.slice(-30), { x: impactX - tx, y: impactY - ty, type: "limb" }]);
        } else if (isOvershoot) {
          setHeatHits((prev) => [...prev.slice(-30), { x: impactX - tx, y: impactY - ty, type: "overshoot" }]);
        }
      }

      // Natural bloom decay when not shooting
      if (!isShooting.current && bloomRadius.current > 0) {
        bloomRadius.current = Math.max(0, bloomRadius.current - dt * 40);
      }

      // 5. Render Tracers
      tracersRef.current = tracersRef.current.filter((t) => now - t.born < 110);
      for (const t of tracersRef.current) {
        const age = (now - t.born) / 110;
        ctx.strokeStyle = t.head
          ? `rgba(255, 45, 60, ${1 - age})`
          : `rgba(255, 204, 0, ${(1 - age) * 0.9})`;
        ctx.lineWidth = t.head ? 2.5 : 1.6;
        ctx.beginPath();
        ctx.moveTo(t.x1, t.y1);
        ctx.lineTo(t.x2, t.y2);
        ctx.stroke();
      }

      // 6. Render Floating Damage Numbers
      damagesRef.current = damagesRef.current.filter((d) => now - d.born < 700);
      for (const d of damagesRef.current) {
        const age = (now - d.born) / 700;
        const isCrit = d.type === "head";
        ctx.save();
        ctx.font = isCrit ? "900 32px Orbitron" : "700 20px Orbitron";
        ctx.textAlign = "center";
        ctx.fillStyle = isCrit
          ? `rgba(255, 35, 50, ${1 - age})`
          : `rgba(255, 215, 0, ${1 - age})`;
        ctx.shadowColor = isCrit ? "rgba(255, 30, 45, 0.9)" : "rgba(255, 200, 0, 0.8)";
        ctx.shadowBlur = isCrit ? 16 : 8;
        ctx.fillText(String(d.value), d.x, d.y - age * 45);
        ctx.restore();
      }

      // 7. Render Free Fire Reticle (Aim Assist State Indicator)
      const reticleColor = isHeadHit
        ? "#ff2244" // Vermelho Capa
        : isLockedInChest
          ? "#ffcc00" // Amarelo Peito Lock
          : isOvershoot
            ? "#ffffff" // Branco Overshoot
            : "#00f0ff"; // Ciano Busca

      const reticleSize = 16 + bloomRadius.current;

      ctx.save();
      ctx.strokeStyle = reticleColor;
      ctx.lineWidth = isHeadHit ? 2.4 : 1.6;
      ctx.shadowColor = reticleColor;
      ctx.shadowBlur = isHeadHit ? 14 : 8;

      // Outer circle
      ctx.beginPath();
      ctx.arc(reticle.x, reticle.y, reticleSize, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair notches
      const notchLen = 10;
      ctx.beginPath();
      ctx.moveTo(reticle.x - reticleSize - notchLen, reticle.y);
      ctx.lineTo(reticle.x - reticleSize + 2, reticle.y);
      ctx.moveTo(reticle.x + reticleSize - 2, reticle.y);
      ctx.lineTo(reticle.x + reticleSize + notchLen, reticle.y);
      ctx.moveTo(reticle.x, reticle.y - reticleSize - notchLen);
      ctx.lineTo(reticle.x, reticle.y - reticleSize + 2);
      ctx.moveTo(reticle.x, reticle.y + reticleSize - 2);
      ctx.lineTo(reticle.x, reticle.y + reticleSize + notchLen);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = reticleColor;
      ctx.beginPath();
      ctx.arc(reticle.x, reticle.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Head dwell time counting
      if (isShooting.current && isHeadHit) {
        if (headDwellStart.current === null) headDwellStart.current = now;
        headDwellTime.current += dt * 1000;
      } else {
        headDwellStart.current = null;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      obs.disconnect();
    };
  }, [sound, stockLvl3, strafeEnabled, preference]);

  // Pointer event handlers - THE FIRE BUTTON IS THE ONLY DRAGGING TRIGGER!
  const handleFirePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;

    isShooting.current = true;
    lastShotTime.current = 0;
    damagesRef.current = [];
    tracersRef.current = [];
    pathPoints.current = [];
    headDwellTime.current = 0;

    fireButtonDragOrigin.current = { x: e.clientX, y: e.clientY };

    // Initial drag point
    pathPoints.current.push({
      x: reticlePos.current.x,
      y: reticlePos.current.y,
      t: performance.now(),
    });

    setWarningMessage(null);
  };

  const handleFirePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isShooting.current || !fireButtonDragOrigin.current) return;
    const origin = fireButtonDragOrigin.current;

    // Raw delta moved from the fire button
    const rawDx = e.clientX - origin.x;
    const rawDy = e.clientY - origin.y;

    // Apply Stretched Screen vector multiplier if enabled (makes X 28% faster and Y heavier)
    const stretchX = stretchedScreen ? 1.28 : 1.0;
    const stretchY = stretchedScreen ? 0.92 : 1.0; // requires more physical travel for vertical capa

    const arenaRect = arenaRef.current?.getBoundingClientRect();
    if (!arenaRect) return;

    // PHYSICAL MULTIPLIER: Simulator strictly uses the configured sensitivity!
    const currentSensitivityScale = ((sensiGeral ?? 184) / 100) * (411 / (dpi ?? 411)) * ((pointerSpeed ?? 5) / 5);
    const nextX = Math.max(20, Math.min(arenaRect.width - 20, reticlePos.current.x + rawDx * currentSensitivityScale * stretchX * 0.18));
    const nextY = Math.max(20, Math.min(arenaRect.height - 20, reticlePos.current.y + rawDy * currentSensitivityScale * stretchY * 0.18));

    reticlePos.current = { x: nextX, y: nextY };

    // Reset origin anchor to enable continuous relative drag
    fireButtonDragOrigin.current = { x: e.clientX, y: e.clientY };

    pathPoints.current.push({
      x: nextX,
      y: nextY,
      t: performance.now(),
    });
  };

  const handleFirePointerUp = () => {
    if (!isShooting.current) return;
    isShooting.current = false;
    fireButtonDragOrigin.current = null;

    // Process drag analytics
    evaluateDragTelemetry();
  };

  // Clicking outside the fire button alerts the user that Native Free Fire only aims via Fire Button
  const handleArenaPointerDown = (e: React.PointerEvent) => {
    if (isShooting.current) return;
    playDeniedBeep();
    setWarningMessage("TRAVA NATIVA: SEGURE E ARRASTE O BOTÃO DE TIRO PARA MIRAR E ATIRAR!");
    window.setTimeout(() => setWarningMessage(null), 2800);
  };

  // Evaluate gesture vector, scenario, stability, and biomechanics
  const evaluateDragTelemetry = () => {
    const pts = pathPoints.current;
    if (pts.length < 3) return;

    const first = pts[0];
    const last = pts[pts.length - 1];
    const dt = Math.max(1, last.t - first.t);
    const totalDist = Math.hypot(last.x - first.x, last.y - first.y);
    const speed = +(totalDist / dt).toFixed(2);

    // Initial acceleration in first 80ms
    const earlyPts = pts.filter((p) => p.t - first.t <= 90);
    const earlyLast = earlyPts.length > 1 ? earlyPts[earlyPts.length - 1] : first;
    const earlyDist = Math.hypot(earlyLast.x - first.x, earlyLast.y - first.y);
    const accel = +(earlyDist / Math.max(1, earlyLast.t - first.t)).toFixed(2);

    // Pull pattern recognition (Linear vs J-Pull vs Meia-Lua)
    let pattern: TrainingResult["pullPattern"] = "Linear";
    let maxLateralDisplacement = 0;
    let lateralDirectionChanges = 0;

    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - first.x;
      if (Math.abs(dx) > maxLateralDisplacement) maxLateralDisplacement = Math.abs(dx);
      if (i > 2) {
        const prevDx = pts[i - 1].x - pts[i - 2].x;
        const currDx = pts[i].x - pts[i - 1].x;
        if (prevDx * currDx < -2) lateralDirectionChanges++;
      }
    }

    if (maxLateralDisplacement > 45 && lateralDirectionChanges >= 1) {
      pattern = "Puxada em J";
    } else if (maxLateralDisplacement > 65) {
      pattern = "Meia-Lua";
    }
    setDetectedPattern(pattern);

    // Straight-line jitter analysis
    const lineDx = last.x - first.x;
    const lineDy = last.y - first.y;
    const lineLen = Math.max(1, Math.hypot(lineDx, lineDy));
    const jitter =
      pts.reduce(
        (sum, p) =>
          sum + Math.abs(lineDy * p.x - lineDx * p.y + last.x * first.y - last.y * first.x) / lineLen,
        0
      ) / pts.length;

    const stability = Math.max(0, Math.min(100, Math.round(100 - jitter * 6.5)));

    // Damage tally
    const headshots = damagesRef.current.filter((d) => d.type === "head").length;
    const bodyshots = damagesRef.current.filter((d) => d.type === "body" || d.type === "leg").length;
    const totalHits = headshots + bodyshots;
    const overshoots = heatHits.filter((h) => h.type === "overshoot").length;
    const totalSamples = Math.max(1, totalHits + overshoots);

    const hsRate = Math.round((headshots / totalSamples) * 100);
    const chestLockRate = Math.round((bodyshots / totalSamples) * 100);
    const overshootRate = Math.round((overshoots / totalSamples) * 100);

    // Scenario classification
    let scenario: TrainingResult["scenario"] = "Preso no Peito";
    if (overshootRate > 35) {
      scenario = "Overshoot";
    } else if (hsRate > 50) {
      // Check if started low (leg/chest) then head
      const hadEarlyBody = damagesRef.current.slice(0, 2).some((d) => d.type === "leg" || d.type === "body");
      scenario = hadEarlyBody ? "Puxada Pé-Cabeça" : "Capa Cravado";
    }
    setCurrentScenario(scenario);

    // Biomechanical correction factor
    let factor = 1.0;
    let recButton = fireButtonSize;
    let recButtonY = fireButtonYPos;

    if (scenario === "Overshoot" || speed > 2.2) {
      factor = 0.88; // Lower sensitivity
      recButton = Math.min(65, fireButtonSize + 5);
    } else if (scenario === "Preso no Peito" || speed < 0.4) {
      factor = 1.12; // Boost sensitivity
      recButton = Math.max(10, fireButtonSize - 4);
      recButtonY = Math.max(10, fireButtonYPos - 4);
    } else if (stability < 55) {
      factor = 0.95;
    }
    recButton = Math.min(65, Math.max(10, recButton));
    recButtonY = Math.min(65, Math.max(10, recButtonY));

    const result: TrainingResult = {
      speed,
      accel,
      headDwell: Math.round(headDwellTime.current),
      stability,
      accuracy: Math.min(100, Math.round((totalHits / Math.max(1, totalHits + overshoots)) * 100)),
      headshots,
      bodyshots,
      overshoots,
      factor,
      fireButton: recButton,
      fireButtonY: recButtonY,
      pullPattern: pattern,
      scenario,
      hsRate,
      chestLockRate,
      overshootRate,
    };

    setMetrics(result);
    onResult(result);
  };

  const handleReset = () => {
    setMetrics(null);
    setHeatHits([]);
    onResult(null);
    damagesRef.current = [];
    tracersRef.current = [];
    pathPoints.current = [];
    bloomRadius.current = 0;
    reticlePos.current = { x: 300, y: 260 };
  };

  return (
    <div className="aimlab-shell">
      {/* Playable Arena */}
      <div
        ref={arenaRef}
        className="aimlab-arena"
        onPointerDown={handleArenaPointerDown}
      >
        <canvas ref={canvasRef} aria-label="Arena balística Free Fire" />

        {/* HUD Top Bar */}
        <div className="arena-top">
          <span>
            <i className={aimAssistLock ? "status-pulse-gold" : "status-pulse"} />
            UMP-45 // NATIVE ENGINE (98ms CYCLE)
          </span>
          <div className="arena-top-badges">
            <span className={`hud-badge ${stockLvl3 ? "is-active" : ""}`}>
              <Shield size={12} />
              {stockLvl3 ? "CORONHA NVL 3" : "SEM CORONHA"}
            </span>
            <span className={`hud-badge ${strafeEnabled ? "is-active" : ""}`}>
              <MoveHorizontal size={12} />
              {strafeEnabled ? "STRAFE ATIVO" : "ALVO FIXO"}
            </span>
            <span
              className={`hud-badge ${
                aimAssistLock
                  ? "is-locked"
                  : overshootActive
                    ? "is-overshoot"
                    : "is-ready"
              }`}
            >
              {aimAssistLock
                ? "AIM ASSIST // IMÃ NO PEITO"
                : overshootActive
                  ? "OVERSHOOT // PASSOU DO CAPA"
                  : "MIRA // PRONTA"}
            </span>
          </div>
        </div>

        {/* Warning notification when clicking outside button */}
        {warningMessage && (
          <div className="native-aim-alert">
            <Zap size={16} />
            <span>{warningMessage}</span>
          </div>
        )}

        {/* THE EXCLUSIVE FLOATING FIRE BUTTON (HUD DRAG CONTROLLER) */}
        <div
          className="aim-fire-container"
          style={{
            bottom: `${fireButtonYPos}%`,
            right: "12%",
          }}
        >
          <button
            type="button"
            className={`aim-fire-btn ${isShooting.current ? "is-firing" : ""}`}
            style={{
              width: `${Math.max(50, Math.min(110, fireButtonSize * 1.1))}px`,
              height: `${Math.max(50, Math.min(110, fireButtonSize * 1.1))}px`,
            }}
            onPointerDown={handleFirePointerDown}
            onPointerMove={handleFirePointerMove}
            onPointerUp={handleFirePointerUp}
            onPointerCancel={handleFirePointerUp}
            aria-label="Pressione e arraste para puxar o capa"
          >
            <Crosshair size={Math.max(22, fireButtonSize * 0.42)} />
            <small>PUXAR CAPA</small>
            <div className="fire-btn-ring" />
          </button>
          <span className="fire-btn-label">
            BOTÃO {fireButtonSize}% · Y {fireButtonYPos}%
          </span>
        </div>

        {/* Controls Overlay in Arena Corner */}
        <div className="arena-quick-toggles">
          <button
            type="button"
            className={`toggle-chip ${stockLvl3 ? "chip-active" : ""}`}
            onClick={() => setStockLvl3(!stockLvl3)}
            title="Reduz a dispersão do tiro contínuo facilitando capa tardio"
          >
            <Shield size={13} />
            CORONHA 3
          </button>
          <button
            type="button"
            className={`toggle-chip ${strafeEnabled ? "chip-active" : ""}`}
            onClick={() => setStrafeEnabled(!strafeEnabled)}
            title="Boneco anda de um lado para o outro testando rastreamento vetorial"
          >
            <MoveHorizontal size={13} />
            STRAFE
          </button>
        </div>
      </div>

      {/* Telemetry & Biomechanical Diagnostic Aside */}
      <aside className="aim-telemetry">
        <div className="telemetry-head">
          <div>
            <small>BIOMECHANICAL SCANNER // FF 04.7</small>
            <h3>TELEMETRIA DE PUXADA NATIVA</h3>
          </div>
          <Flame className="text-primary animate-pulse" size={20} />
        </div>

        {/* 4 Essential FF Metrics */}
        <div className="aim-metrics">
          <MetricBlock
            label="VELOCIDADE FLICK"
            value={metrics ? `${metrics.speed}` : "0.00"}
            unit="PX/MS"
          />
          <MetricBlock
            label="ACELERAÇÃO INICIAL"
            value={metrics ? `${metrics.accel}` : "0.00"}
            unit="FORÇA"
          />
          <MetricBlock
            label="PADRÃO DETECTADO"
            value={metrics ? metrics.pullPattern : "--"}
            unit="GESTO"
          />
          <MetricBlock
            label="HEAD DWELL (TEMPO NA CABEÇA)"
            value={metrics ? `${metrics.headDwell}` : "0"}
            unit="MS"
          />
        </div>

        {/* Hitbox Scenario Result */}
        <div className="scenario-card">
          <small>CENÁRIO DA PUXADA:</small>
          <strong>
            {metrics ? metrics.scenario : "SEGURE O BOTÃO E ARRASTE"}
          </strong>
          <p>
            {metrics?.scenario === "Preso no Peito" &&
              "⚠️ Força de aceleração insuficiente para quebrar a gravidade magnética da Garena no peito. Puxe com flick mais rápido ou use botão menor."}
            {metrics?.scenario === "Capa Cravado" &&
              "⚡ Arrasto cirúrgico perfeito! Aceleração ideal rompeu o imã e cravou na cabeça com dano vermelho limpo."}
            {metrics?.scenario === "Puxada Pé-Cabeça" &&
              "🎯 Varredura completa: iniciou nos membros e finalizou na cabeça. Excelente controle de recoil progressivo."}
            {metrics?.scenario === "Overshoot" &&
              "⚠️ Arrasto explosivo em excesso: a mira ultrapassou o topo da cabeça e espalhou tiros no ar. Aumente o botão ou reduza a Geral."}
            {!metrics &&
              "A mira é travada no botão flutuante. Pressione e arraste com aceleração para vencer o imã do peito."}
          </p>
        </div>

        {/* Heatmap Wireframe & Stats */}
        <div className="heatmap-section">
          <div className="heatmap-display">
            <svg viewBox="-80 -120 160 220" className="heatmap-svg" aria-label="Mapa de calor">
              {/* Head */}
              <circle cx="0" cy="-84" r="22" className="heat-body-part" />
              {/* Torso */}
              <rect x="-34" y="-54" width="68" height="74" rx="8" className="heat-body-part" />
              {/* Legs */}
              <rect x="-28" y="24" width="24" height="60" rx="4" className="heat-body-part" />
              <rect x="4" y="24" width="24" height="60" rx="4" className="heat-body-part" />
              {/* Overshoot zone */}
              <line x1="-50" y1="-112" x2="50" y2="-112" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
              <text x="0" y="-115" fill="#888" fontSize="8" textAnchor="middle">ZONA OVERSHOOT</text>

              {/* Render hits */}
              {heatHits.map((h, i) => (
                <circle
                  key={i}
                  cx={h.x}
                  cy={h.y}
                  r={h.type === "head" ? 4.5 : 3.5}
                  className={`heat-dot ${
                    h.type === "head"
                      ? "heat-head"
                      : h.type === "chest"
                        ? "heat-chest"
                        : h.type === "overshoot"
                          ? "heat-overshoot"
                          : "heat-limb"
                  }`}
                />
              ))}
            </svg>

            <div className="heatmap-legend">
              <span className="legend-head">
                <i /> CAPA ({metrics?.headshots ?? 0})
              </span>
              <span className="legend-chest">
                <i /> PEITO ({metrics?.bodyshots ?? 0})
              </span>
              <span className="legend-overshoot">
                <i /> OVERSHOOT ({metrics?.overshoots ?? 0})
              </span>
              <span className="legend-hs-rate">
                HS RATE: <b>{metrics?.hsRate ?? 0}%</b>
              </span>
            </div>
          </div>
        </div>

        {/* Stability Meter */}
        <div className="stability-meter">
          <span>
            ESTABILIDADE CONTRA TREMOR / JITTER <b>{metrics?.stability ?? 0}%</b>
          </span>
          <div>
            <i style={{ width: `${metrics?.stability ?? 0}%` }} />
          </div>
        </div>

        {/* Recommendation & Reset */}
        <button
          type="button"
          className="ui-button ui-button-outline w-full"
          onClick={handleReset}
        >
          <RotateCcw size={15} /> RESETAR TELEMETRIA
        </button>
      </aside>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="metric-block">
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{unit}</span>
    </div>
  );
}

// Function to draw Free Fire character dummy with cyber anatomical styling
function drawFreeFireDummy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  preference: Preference
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const primaryStroke =
    preference === "high"
      ? "rgba(255, 45, 65, 0.75)"
      : preference === "low"
        ? "rgba(0, 240, 255, 0.75)"
        : "rgba(255, 204, 0, 0.75)";

  const chestFill = "rgba(18, 24, 32, 0.88)";
  const headFill = "rgba(26, 12, 16, 0.85)";

  // 1. Head (Cabeça - 22px radius)
  ctx.fillStyle = headFill;
  ctx.strokeStyle = "rgba(255, 50, 65, 0.85)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, -84, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head target cross
  ctx.strokeStyle = "rgba(255, 50, 65, 0.4)";
  ctx.beginPath();
  ctx.moveTo(0, -100);
  ctx.lineTo(0, -68);
  ctx.moveTo(-16, -84);
  ctx.lineTo(16, -84);
  ctx.stroke();

  // 2. Torso (Peito - Magnet Target)
  ctx.fillStyle = chestFill;
  ctx.strokeStyle = primaryStroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-34, -54, 68, 74, 8);
  ctx.fill();
  ctx.stroke();

  // Magnet core icon inside chest
  ctx.fillStyle = "rgba(255, 204, 0, 0.18)";
  ctx.beginPath();
  ctx.arc(0, -18, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 204, 0, 0.6)";
  ctx.stroke();

  // 3. Legs
  ctx.fillStyle = chestFill;
  ctx.strokeStyle = "rgba(143, 222, 230, 0.35)";
  ctx.beginPath();
  ctx.roundRect(-28, 24, 24, 60, 4);
  ctx.roundRect(4, 24, 24, 60, 4);
  ctx.fill();
  ctx.stroke();

  // 4. Arms
  ctx.beginPath();
  ctx.roundRect(-48, -48, 11, 62, 3);
  ctx.roundRect(37, -48, 11, 62, 3);
  ctx.fill();
  ctx.stroke();

  // Hitbox text label
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = "600 9px Orbitron";
  ctx.textAlign = "center";
  ctx.fillText("TARGET DUMMY", 0, 102);

  ctx.restore();
}