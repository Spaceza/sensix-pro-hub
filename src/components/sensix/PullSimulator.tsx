import { useRef, useState } from "react";
import { RotateCcw, Target } from "lucide-react";

type Pt = { x: number; y: number; t: number };
export type SimResult = { factor: number; fire: number | null; message: string; speed: number; jitter: number; reach: number; grade: "ok" | "fast" | "slow" | "jitter" };

export function PullSimulator({ baseFire, onResult, buzz }: { baseFire: number; onResult: (r: SimResult | null) => void; buzz: (k?: "tap" | "generate") => void }) {
  const box = useRef<HTMLDivElement>(null);
  const pts = useRef<Pt[]>([]);
  const [path, setPath] = useState<Pt[]>([]);
  const [aim, setAim] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [res, setRes] = useState<SimResult | null>(null);

  const local = (e: React.PointerEvent) => {
    const el = box.current;
    if (!el) return { x: 50, y: 88 };
    const r = el.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = local(e);
    pts.current = [{ ...p, t: performance.now() }];
    setPath([]); setRes(null); setDragging(true); setAim({ x: 50, y: 88 }); buzz();
  };

  const move = (e: React.PointerEvent) => {
    if (!dragging) return;
    const p = local(e);
    const start = pts.current[0];
    if (!start) return;
    const n = pts.current.length;
    // recoil: random sideways kick grows with time; resistance damps vertical travel
    const kick = (Math.random() - 0.5) * Math.min(3, n * 0.05);
    const dy = (start.y - p.y) * 0.88;
    const x = 50 + (p.x - start.x) + kick;
    const y = 88 - dy;
    pts.current.push({ x, y, t: performance.now() });
    setAim({ x, y });
    if (n % 2 === 0) setPath([...pts.current.slice(1)]);
  };

  const up = () => {
    if (!dragging) return;
    setDragging(false);
    const p = pts.current.slice(1);
    if (p.length < 4) { setAim(null); return; }
    const el = box.current;
    if (!el) return;
    const box_ = el.getBoundingClientRect();
    const first = p[0], last = p[p.length - 1];
    if (!first || !last) return;
    const minY = Math.min(...p.map((q) => q.y));
    const dt = Math.max(1, last.t - first.t);
    const distPx = ((first.y - minY) / 100) * box_.height;
    const speed = +(distPx / dt).toFixed(2);
    const meanX = p.reduce((a, q) => a + q.x, 0) / p.length;
    const jitter = +Math.sqrt(p.reduce((a, q) => a + (q.x - meanX) ** 2, 0) / p.length).toFixed(1);
    const reach = Math.round(88 - minY);
    let r: SimResult;
    if (minY < 10 || speed > 2.2) r = { grade: "fast", factor: 0.88, fire: Math.min(80, baseFire + 8), speed, jitter, reach, message: `⚠️ Puxada agressiva/rápida demais! Sensibilidade reduzida em 12%. Use um botão de tiro maior (ex.: ${Math.min(80, baseFire + 8)}%) para ganhar estabilidade.` };
    else if (minY > 26 || speed < 0.35) r = { grade: "slow", factor: 1.08, fire: Math.max(30, baseFire - 8), speed, jitter, reach, message: `⚠️ Força de puxada baixa! Red Dot aumentada. Reduza o botão de tiro (ex.: ${Math.max(30, baseFire - 8)}%) para um deslocamento mais rápido.` };
    else if (jitter > 7) r = { grade: "jitter", factor: 0.96, fire: null, speed, jitter, reach, message: "⚠️ Arraste vertical instável. Ative a estabilização de toque e use velocidade do ponteiro 7/10." };
    else r = { grade: "ok", factor: 1, fire: null, speed, jitter, reach, message: "✅ Capa! Puxada limpa na altura da cabeça. Sua configuração atual está calibrada." };
    setRes(r); onResult(r); buzz("generate");
  };

  const reset = () => { setRes(null); setPath([]); setAim(null); onResult(null); buzz(); };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div ref={box} className="sim-screen" style={{ touchAction: "none" }} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className="field-grid" />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {/* dummy */}
          <rect x="44" y="22" width="12" height="26" rx="3" className="sim-dummy" />
          <rect x="45" y="48" width="4" height="18" className="sim-dummy" /><rect x="51" y="48" width="4" height="18" className="sim-dummy" />
          <ellipse cx="50" cy="16" rx="4.5" ry="5" className="sim-head" />
          <line x1="0" y1="16" x2="100" y2="16" className="sim-headline" />
          {path.length > 1 && <polyline points={path.map((q) => `${q.x},${q.y}`).join(" ")} className="sim-path" />}
        </svg>
        {aim && <span className="sim-reticle" style={{ left: `${aim.x}%`, top: `${aim.y}%` }} />}
        <button type="button" className={`sim-fire ${dragging ? "is-held" : ""}`} onPointerDown={down} aria-label="Segure e arraste para cima">
          <Target size={26} />
        </button>
        <p className="sim-hint">{dragging ? "PUXANDO…" : "SEGURE O BOTÃO E ARRASTE ATÉ A CABEÇA"}</p>
      </div>
      <aside className="grid content-start gap-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["VEL.", res ? `${res.speed}` : "--", "px/ms"], ["TREMOR", res ? `${res.jitter}` : "--", "desvio"], ["ALCANCE", res ? `${res.reach}%` : "--", "altura"]].map(([a, b, c]) => (
            <div key={a} className="sx-cell"><small>{a}</small><strong>{b}</strong><span>{c}</span></div>
          ))}
        </div>
        <p className={`sx-diag ${res ? `is-${res.grade}` : ""}`}>{res ? res.message : "Faça uma puxada para receber o diagnóstico. O resultado ajusta automaticamente sua sensibilidade e botão."}</p>
        <button className="ui-button ui-button-outline" onClick={reset}><RotateCcw size={16} /> RECALIBRAR</button>
      </aside>
    </div>
  );
}
