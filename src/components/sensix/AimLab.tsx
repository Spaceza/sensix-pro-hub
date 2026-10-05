import { useEffect, useRef, useState } from "react";
import { Crosshair, RotateCcw, Volume2 } from "lucide-react";

export type TrainingResult = {
  speed: number;
  angle: number;
  headDwell: number;
  stability: number;
  accuracy: number;
  headshots: number;
  bodyshots: number;
  factor: number;
  fireButton: number;
};

type Point = { x: number; y: number; t: number };
type Damage = { x: number; y: number; value: number; head: boolean; born: number };
type Tracer = { x1: number; y1: number; x2: number; y2: number; born: number };

const TARGETS = [{ x: .28, y: .42, s: 1 }, { x: .69, y: .39, s: .88 }, { x: .5, y: .55, s: .72 }];

export function AimLab({ sound, baseFire, onResult }: { sound: boolean; baseFire: number; onResult: (result: TrainingResult | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<Point>({ x: 0, y: 0, t: 0 });
  const path = useRef<Point[]>([]);
  const shooting = useRef(false);
  const lastShot = useRef(0);
  const damages = useRef<Damage[]>([]);
  const tracers = useRef<Tracer[]>([]);
  const headStart = useRef<number | null>(null);
  const dwell = useRef(0);
  const audio = useRef<AudioContext | null>(null);
  const [metrics, setMetrics] = useState<TrainingResult | null>(null);
  const [locked, setLocked] = useState(false);

  const playShot = () => {
    if (!sound) return;
    const Audio = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio) return;
    const ctx = audio.current ?? new Audio();
    audio.current = ctx;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .07), ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * .18));
    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    noise.buffer = noiseBuffer; filter.type = "bandpass"; filter.frequency.value = 1250; filter.Q.value = .8;
    gain.gain.setValueAtTime(.12, now); gain.gain.exponentialRampToValueAtTime(.001, now + .075);
    noise.connect(filter).connect(gain).connect(ctx.destination); noise.start(now);
    const osc = ctx.createOscillator(); const kick = ctx.createGain();
    osc.type = "square"; osc.frequency.setValueAtTime(118, now); osc.frequency.exponentialRampToValueAtTime(52, now + .055);
    kick.gain.setValueAtTime(.055, now); kick.gain.exponentialRampToValueAtTime(.001, now + .06);
    osc.connect(kick).connect(ctx.destination); osc.start(now); osc.stop(now + .065);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const arena = arenaRef.current;
    if (!canvas || !arena) return;
    let frame = 0;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      const rect = arena.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr)); canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (pointer.current.x === 0) pointer.current = { x: rect.width / 2, y: rect.height * .72, t: performance.now() };
    };
    const observer = new ResizeObserver(resize); observer.observe(arena); resize();
    const drawTarget = (x: number, y: number, s: number) => {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.fillStyle = "rgba(10,14,18,.92)"; ctx.strokeStyle = "rgba(143,222,230,.48)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, -69, 21, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(-35, -45, 70, 94, 10); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(143,222,230,.2)"; ctx.beginPath(); ctx.moveTo(-20, 49); ctx.lineTo(-24, 105); ctx.moveTo(20, 49); ctx.lineTo(24, 105); ctx.stroke();
      ctx.strokeStyle = "rgba(255,65,44,.66)"; ctx.beginPath(); ctx.arc(0, -69, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    };
    const hitTest = (x: number, y: number, w: number, h: number) => {
      let best: { head: boolean; x: number; y: number; d: number } | null = null;
      for (const target of TARGETS) {
        const tx = target.x * w, ty = target.y * h;
        const hd = Math.hypot(x - tx, y - (ty - 69 * target.s));
        const bodyDx = Math.abs(x - tx), bodyDy = Math.abs(y - ty);
        const candidate = hd < 23 * target.s ? { head: true, x: tx, y: ty - 69 * target.s, d: hd } : bodyDx < 40 * target.s && bodyDy < 55 * target.s ? { head: false, x: tx, y: ty, d: Math.hypot(bodyDx, bodyDy) } : null;
        if (candidate && (!best || candidate.d < best.d)) best = candidate;
      }
      return best;
    };
    const loop = (now: number) => {
      const rect = arena.getBoundingClientRect(); const w = rect.width, h = rect.height;
      ctx.clearRect(0, 0, w, h);
      const grd = ctx.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, "rgba(22,30,35,.92)"); grd.addColorStop(1, "rgba(5,7,9,.98)"); ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(143,222,230,.07)"; ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 36) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      TARGETS.forEach(t => drawTarget(t.x * w, t.y * h, t.s));
      const hit = hitTest(pointer.current.x, pointer.current.y, w, h);
      setLocked(Boolean(hit && !hit.head));
      if (shooting.current && now - lastShot.current > 92) {
        lastShot.current = now; playShot();
        const jitter = (Math.random() - .5) * 7; const impactX = pointer.current.x + jitter; const impactY = pointer.current.y + Math.random() * 5;
        const impact = hitTest(impactX, impactY, w, h);
        tracers.current.push({ x1: w * .82, y1: h * .94, x2: impactX, y2: impactY, born: now });
        if (impact) damages.current.push({ x: impact.x, y: impact.y, value: impact.head ? 137 : 24, head: impact.head, born: now });
      }
      tracers.current = tracers.current.filter(t => now - t.born < 130);
      for (const t of tracers.current) { const a = 1 - (now - t.born) / 130; ctx.strokeStyle = `rgba(255,194,77,${a})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke(); }
      damages.current = damages.current.filter(d => now - d.born < 650);
      for (const d of damages.current) { const age = (now - d.born) / 650; ctx.fillStyle = d.head ? `rgba(255,60,38,${1-age})` : `rgba(255,211,78,${1-age})`; ctx.font = `700 ${d.head ? 25 : 18}px Orbitron`; ctx.textAlign = "center"; ctx.fillText(String(d.value), d.x, d.y - age * 34); }
      const p = pointer.current; const reticleColor = hit && !hit.head ? "#ff4638" : "#eefcff";
      ctx.strokeStyle = reticleColor; ctx.lineWidth = 1.5; ctx.shadowColor = reticleColor; ctx.shadowBlur = 9;
      ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, Math.PI * 2); ctx.moveTo(p.x - 24, p.y); ctx.lineTo(p.x - 8, p.y); ctx.moveTo(p.x + 8, p.y); ctx.lineTo(p.x + 24, p.y); ctx.moveTo(p.x, p.y - 24); ctx.lineTo(p.x, p.y - 8); ctx.moveTo(p.x, p.y + 8); ctx.lineTo(p.x, p.y + 24); ctx.stroke(); ctx.shadowBlur = 0;
      if (shooting.current && hit?.head) { if (headStart.current === null) headStart.current = now; dwell.current += 16; } else headStart.current = null;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [sound]);

  const local = (e: React.PointerEvent) => {
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: Math.max(0, Math.min(rect.width, e.clientX - rect.left)), y: Math.max(0, Math.min(rect.height, e.clientY - rect.top)), t: performance.now() };
  };
  const move = (e: React.PointerEvent) => {
    const next = local(e); if (!next) return;
    if (shooting.current) {
      const prev = pointer.current; const dy = next.y - prev.y;
      const rect = arenaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const torso = TARGETS.map(t => ({ x: t.x * rect.width, y: t.y * rect.height })).sort((a,b) => Math.hypot(next.x-a.x,next.y-a.y)-Math.hypot(next.x-b.x,next.y-b.y))[0];
      const magnet = torso && Math.hypot(next.x - torso.x, next.y - torso.y) < 90 ? .16 : 0;
      pointer.current = { x: next.x * (1-magnet) + (torso?.x ?? next.x) * magnet, y: Math.max(0, prev.y + dy * .82), t: next.t };
      path.current.push(pointer.current);
    } else pointer.current = next;
  };
  const start = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId); shooting.current = true; path.current = []; dwell.current = 0; damages.current = []; tracers.current = []; const p = local(e); if (p) { pointer.current = p; path.current.push(p); } lastShot.current = 0;
  };
  const stop = () => {
    if (!shooting.current) return; shooting.current = false;
    const points = path.current; if (points.length < 2) return;
    const first = points[0], last = points.at(-1); if (!first || !last) return;
    const dt = Math.max(1, last.t - first.t), dist = Math.hypot(last.x-first.x,last.y-first.y);
    const speed = dist / dt; const angle = Math.abs(90 - Math.abs(Math.atan2(first.y-last.y,last.x-first.x) * 180 / Math.PI));
    const lineDx = last.x-first.x, lineDy = last.y-first.y, lineLen = Math.max(1, Math.hypot(lineDx,lineDy));
    const jitter = points.reduce((sum,p)=>sum+Math.abs(lineDy*p.x-lineDx*p.y+last.x*first.y-last.y*first.x)/lineLen,0)/points.length;
    const headshots = damages.current.filter(d=>d.head).length, bodyshots = damages.current.filter(d=>!d.head).length, shots = Math.max(1, tracers.current.length + damages.current.length);
    const stability = Math.max(0, Math.min(100, Math.round(100-jitter*5-angle*1.4)));
    const factor = speed > 1.6 || angle > 18 ? .88 : speed < .32 ? 1.08 : stability < 55 ? .95 : 1;
    const fireButton = Math.max(10, Math.min(100, Math.round(baseFire + (speed > 1.6 ? 8 : speed < .32 ? -8 : stability < 55 ? 5 : 0))));
    const result = { speed:+speed.toFixed(2), angle:+angle.toFixed(1), headDwell:Math.round(dwell.current), stability, accuracy:Math.min(100,Math.round((headshots+bodyshots)/shots*100)), headshots, bodyshots, factor, fireButton };
    setMetrics(result); onResult(result);
  };
  const reset = () => { setMetrics(null); onResult(null); path.current=[]; damages.current=[]; tracers.current=[]; };

  return <div className="aimlab-shell">
    <div ref={arenaRef} className="aimlab-arena" onPointerMove={move} onPointerDown={start} onPointerUp={stop} onPointerCancel={stop}>
      <canvas ref={canvasRef} aria-label="Arena de treino com alvos e retícula" />
      <div className="arena-top"><span><i /> UMP // AUTO</span><span>{locked ? "AIM ASSIST // LOCK" : "AIM ASSIST // SEARCH"}</span></div>
      <button type="button" className="aim-fire" aria-label="Segure e arraste para disparar"><Crosshair /><small>FIRE</small></button>
    </div>
    <aside className="aim-telemetry">
      <div className="telemetry-head"><div><small>LIVE ANALYSIS</small><h3>TELEMETRIA DE PUXADA</h3></div><Volume2 /></div>
      <div className="aim-metrics">
        <Metric label="VELOCIDADE" value={metrics ? `${metrics.speed}` : "0.00"} unit="PX/MS" />
        <Metric label="DESVIO" value={metrics ? `${metrics.angle}°` : "0.0°"} unit="ÂNGULO" />
        <Metric label="HEAD DWELL" value={metrics ? `${metrics.headDwell}` : "0"} unit="MS" />
        <Metric label="PRECISÃO" value={metrics ? `${metrics.accuracy}` : "0"} unit="%" />
      </div>
      <div className="stability-meter"><span>ESTABILIDADE CONTRA TREMOR <b>{metrics?.stability ?? 0}%</b></span><div><i style={{ width:`${metrics?.stability ?? 0}%` }} /></div></div>
      <div className="hit-summary"><span>CORPO <b>{metrics?.bodyshots ?? 0}</b></span><span>CAPA <b>{metrics?.headshots ?? 0}</b></span><span>BOTÃO <b>{metrics?.fireButton ?? baseFire}%</b></span></div>
      <p className="aim-diagnostic">{!metrics ? "Mova a retícula, segure na arena e arraste para cima. A assistência segura o peito; vença a resistência e mantenha na cabeça." : metrics.factor < .9 ? "OVERFLICK DETECTADO — sensibilidade reduzida em 12% e botão ampliado para ganhar controle." : metrics.factor > 1 ? "PUXADA LENTA — Red Dot elevada e botão reduzido para acelerar o deslocamento." : metrics.stability < 55 ? "JITTER DETECTADO — estabilização recomendada e ponteiro em 7/10." : "CAPA CONSISTENTE — perfil de puxada equilibrado e pronto para salvar."}</p>
      <button className="ui-button ui-button-outline" onClick={reset}><RotateCcw /> RECALIBRAR ARENA</button>
    </aside>
  </div>;
}

function Metric({ label, value, unit }: { label:string; value:string; unit:string }) { return <div><small>{label}</small><strong>{value}</strong><span>{unit}</span></div>; }