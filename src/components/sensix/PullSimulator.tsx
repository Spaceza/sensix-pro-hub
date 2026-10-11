import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Crosshair, RotateCcw, Shield, MoveHorizontal, Maximize, Minimize, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { analyzeTrial, type AimConfig, type TrainingResult } from '@/lib/aim-physics';
import { freshRuntime, type RangePalette, type RangeSnapshot } from './range-types';
import { RangeScene } from './RangeScene';

export interface PullSimulatorProps {
  configuration: AimConfig;
  sound: boolean;
  preference: string;
  onResult: (result: TrainingResult | null) => void;
}
const emptySnapshot: RangeSnapshot = { shots: 0, head: 0, body: 0, lock: false, bloom: 0, speed: 0, damage: 0 };

export default function PullSimulator({ configuration, sound, preference, onResult }: PullSimulatorProps) {
  const root = useRef<HTMLDivElement>(null), runtime = useRef(freshRuntime()), config = useRef(configuration);
  const audio = useRef<AudioContext | null>(null), soundRef = useRef(sound);
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [result, setResult] = useState<TrainingResult | null>(null);
  const [stock, setStock] = useState(configuration.stock), [strafe, setStrafe] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [palette, setPalette] = useState<RangePalette | null>(null);
  useEffect(() => { config.current = { ...configuration, stock, strafe }; soundRef.current = sound; }, [configuration, stock, strafe, sound]);
  useEffect(() => { setStock(configuration.stock); }, [configuration.stock]);
  useEffect(() => {
    const el = root.current; if (!el) return;
    const css = getComputedStyle(el);
    const token = (name: string) => css.getPropertyValue(`--range-${name}`).trim();
    setPalette({ floor: token('floor'), wall: token('wall'), ceiling: token('ceiling'), metal: token('metal'),
      accent: token('accent'), critical: token('critical'), light: token('light'), ink: token('ink') });
  }, [preference]);
  useEffect(() => {
    const stop = () => { runtime.current.held = false; runtime.current.queue = []; runtime.current.pointerId = null; };
    const visibility = () => { if (document.hidden) stop(); };
    const changed = () => setFullscreen(document.fullscreenElement === root.current);
    window.addEventListener('blur', stop); document.addEventListener('visibilitychange', visibility); document.addEventListener('fullscreenchange', changed);
    return () => { stop(); window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('fullscreenchange', changed); void audio.current?.close(); };
  }, []);
  const shot = (head: boolean) => {
    const ctx = audio.current; if (!ctx || !soundRef.current) return;
    const t = ctx.currentTime, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(head ? 900 : 150, t); osc.frequency.exponentialRampToValueAtTime(40, t + 0.075);
    gain.gain.setValueAtTime(0.07, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain).connect(ctx.destination); osc.start(t); osc.stop(t + 0.09);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  };
  const start = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (runtime.current.held || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);
    const previousReset = runtime.current.reset;
    runtime.current = freshRuntime(); runtime.current.reset = previousReset + 1;
    runtime.current.held = true; runtime.current.pointerId = e.pointerId;
    const sample = { x: e.clientX, y: e.clientY, t: performance.now() };
    runtime.current.origin = sample; runtime.current.trial.samples.push(sample);
    setResult(null); setSnapshot(emptySnapshot);
    if (sound && !audio.current && window.AudioContext) audio.current = new AudioContext();
    if (audio.current?.state === 'suspended') void audio.current.resume();
  };
  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = runtime.current, prev = r.origin;
    if (!r.held || !prev || r.pointerId !== e.pointerId) return;
    e.preventDefault();
    const sample = { x: e.clientX, y: e.clientY, t: performance.now() };
    const dx = sample.x - prev.x, dy = sample.y - prev.y;
    r.queue.push({ dx, dy, speed: Math.hypot(dx, dy) / Math.max(1, sample.t - prev.t), at: sample.t });
    if (r.queue.length > 256) r.queue.shift();
    r.trial.samples.push(sample); if (r.trial.samples.length > 2000) r.trial.samples.splice(1, 1);
    r.origin = sample;
  };
  const end = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = runtime.current; if (!r.held || r.pointerId !== e.pointerId) return;
    r.held = false; r.pointerId = null; r.queue = [];
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (e.type === 'pointercancel') return;
    const metrics = analyzeTrial(r.trial, config.current);
    setResult(metrics); onResult(metrics);
  };
  const reset = () => {
    const version = runtime.current.reset + 1;
    runtime.current = freshRuntime(); runtime.current.reset = version;
    setSnapshot(emptySnapshot); setResult(null); onResult(null);
  };
  return <div ref={root} className={`range-experience ${fullscreen ? 'is-fullscreen' : ''}`} data-lenis-prevent>
    <div className="range-viewport">
      {palette ? <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0.65, 1.65, 3.7], fov: 52, near: 0.1, far: 55 }} gl={{ antialias: true }}>
        <RangeScene runtime={runtime} config={config} palette={palette} onSnapshot={setSnapshot} onShot={shot} />
      </Canvas> : <div className="range-loading"><Activity /> CARREGANDO ARENA</div>}
      <div className="range-topline"><span><i /> RANGE 01 <b>// LIVE</b></span><span>UMP · TREINO 3D</span></div>
      <div className="range-side-label">BIOMECHANICAL / THIRD PERSON</div>
      <div className={`range-crosshair ${snapshot.lock ? 'is-locked' : ''}`} style={{ '--bloom': `${snapshot.bloom * 1600}px` } as React.CSSProperties}><i /><b /><span /></div>
      {snapshot.damage > 0 && <strong className={`range-damage ${snapshot.damage > 100 ? 'critical' : ''}`}>{snapshot.damage}</strong>}
      <div className="range-lock-readout">{snapshot.lock ? 'TORso // MAGNETISMO'.toUpperCase() : 'MIRA LIVRE'}<small>{configuration.fps} FPS · {configuration.dpi} DPI · {configuration.sensitivity} GERAL</small></div>
      <div className="range-fire-position" style={{ bottom: `${Math.min(65, configuration.fireY)}%` }}>
        <Button variant="fire" aria-label="Pressione e arraste para puxar o capa" style={{ width: `${48 + configuration.fire * 0.7}px`, height: `${48 + configuration.fire * 0.7}px` }}
          onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={e => { if (runtime.current.held) end(e); }}>
          <Crosshair /><span>FIRE</span>
        </Button><small>{configuration.fire}% / Y {configuration.fireY}%</small>
      </div>
      <div className="range-controls">
        <Button variant="outline" size="icon" aria-label="Coronha nível 3" title="Coronha nível 3" aria-pressed={stock} onClick={() => setStock(!stock)}><Shield /></Button>
        <Button variant="outline" size="icon" aria-label="Alvo em movimento" title="Alvo em movimento" aria-pressed={strafe} onClick={() => setStrafe(!strafe)}><MoveHorizontal /></Button>
        <Button variant="outline" size="icon" aria-label="Reiniciar treino" title="Reiniciar treino" onClick={reset}><RotateCcw /></Button>
        <Button variant="outline" size="icon" aria-label="Tela cheia" title="Tela cheia" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void root.current?.requestFullscreen?.(); }}>{fullscreen ? <Minimize /> : <Maximize />}</Button>
      </div>
      <div className="range-ammo"><strong>{snapshot.shots.toString().padStart(2, '0')}</strong><span>DISPAROS <b>98 MS / CYCLE</b></span></div>
    </div>
    <aside className="range-telemetry">
      <header><small>SESSION / TELEMETRY</small><h3>LEITURA BIOMECÂNICA</h3><i /></header>
      <div className="range-stat-grid">
        {[
          ['VELOCIDADE', result?.speed ?? snapshot.speed.toFixed(2), 'PX/MS'],
          ['ESTABILIDADE', result?.stability ?? '—', '%'],
          ['HEAD DWELL', result?.headDwell ?? '—', 'MS'],
          ['ACELERAÇÃO', result?.accel ?? '—', 'PX/MS²'],
        ].map(([label, value, unit]) => <div key={label}><small>{label}</small><strong>{value}<sup>{unit}</sup></strong></div>)}
      </div>
      <div className="range-hit-analysis">
        <svg viewBox="0 0 110 170" aria-label="Mapa de calor dos acertos"><circle cx="55" cy="30" r="19" className="heat-body-part" /><path d="M35 54 H75 L85 106 H66 L65 153 H49 L46 106 H26Z" className="heat-body-part" />
          {runtime.current.hits.map((hit, i) => <circle key={i} cx={55 + hit.x * 45} cy={hit.head ? 30 + (hit.y - 1.67) * -45 : 81 + (hit.y - 0.97) * -45} r="3" className={hit.head ? 'heat-head' : 'heat-chest'} />)}
        </svg>
        <div><small>DISTRIBUIÇÃO DE IMPACTO</small><span>CAPA <b>{snapshot.head}</b></span><span>PEITO <b>{snapshot.body}</b></span><span>PRECISÃO <b>{result?.accuracy ?? 0}%</b></span></div>
      </div>
      <div className="range-verdict"><small>RESULTADO DA SESSÃO</small><strong>{result?.scenario ?? 'AGUARDANDO PUXADA'}</strong><span>{result?.pullPattern ?? '—'}</span></div>
      <Button variant="hud" onClick={reset}><RotateCcw /> NOVA PUXADA</Button>
    </aside>
  </div>;
}
