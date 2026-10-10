import type { EngineInput } from './sensi-engine';

export interface TrainingResult {
  speed: number; accel: number; headDwell: number; stability: number; accuracy: number;
  headshots: number; bodyshots: number; overshoots: number; factor: number;
  fireButton: number; fireButtonY: number;
  pullPattern: 'Linear' | 'Puxada em J' | 'Meia-Lua';
  scenario: 'Preso no Peito' | 'Capa Cravado' | 'Puxada Pé-Cabeça' | 'Overshoot';
  hsRate: number; chestLockRate: number; overshootRate: number;
}
export type FeedbackIssue = 'jitter' | 'chest' | 'over' | 'perfect';
export interface AimConfig {
  dpi: number; sensitivity: number; fps: number; sampling: number; pointer: number;
  fire: number; fireY: number; resW: number; resH: number; brandTouch: number;
  stretched: boolean; lag: number; stock: boolean; strafe: boolean;
}
export interface DragSample { x: number; y: number; t: number }
export interface Trial {
  samples: DragSample[]; head: number; body: number; miss: number; overshoot: number; dwell: number;
}
export const bound = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));

/** Direct physical gain: high DPI and high game sensitivity are harder to control. */
export function rotationGain(c: AimConfig) {
  return 0.00165 * (bound(c.dpi, 320, 1400) / 411) * (bound(c.sensitivity, 0, 200) / 100)
    * (bound(c.pointer, 1, 10) / 5) * (50 / bound(c.fire, 10, 65))
    * Math.sqrt(1080 / bound(c.resW, 320, 7680)) * c.brandTouch;
}
export function responseDelay(c: AimConfig) {
  // High-FPS hardware remains raw unless the player explicitly requests extra lag.
  return (c.fps >= 120 ? 0 : 1000 / bound(c.fps, 30, 240))
    + Math.max(0, 1000 / c.sampling - 1000 / 240) + bound(c.lag, 0, 200);
}
export function analyzeTrial(t: Trial, c: AimConfig): TrainingResult {
  const first = t.samples[0]; const last = t.samples.at(-1);
  let distance = 0, sideways = 0, accel = 0, lastSpeed = 0;
  for (let n = 1; n < t.samples.length; n++) {
    const a = t.samples[n - 1], b = t.samples[n];
    if (!a || !b) continue;
    const dt = Math.max(1, b.t - a.t), dx = b.x - a.x, dy = b.y - a.y;
    const speed = Math.hypot(dx, dy) / dt;
    distance += Math.hypot(dx, dy); sideways += Math.abs(dx);
    accel = Math.max(accel, Math.abs(speed - lastSpeed) / dt); lastSpeed = speed;
  }
  const duration = Math.max(1, (last?.t ?? 1) - (first?.t ?? 0));
  const speed = distance / duration;
  const stability = Math.round(bound(100 - 110 * sideways / Math.max(1, distance), 0, 100));
  const total = Math.max(1, t.head + t.body + t.miss);
  const hsRate = Math.round(t.head / total * 100), chestLockRate = Math.round(t.body / total * 100);
  const overshootRate = Math.round(t.overshoot / total * 100);
  const scenario = overshootRate > 30 ? 'Overshoot' : t.head > 0
    ? (t.body > 0 ? 'Puxada Pé-Cabeça' : 'Capa Cravado') : 'Preso no Peito';
  const factor = scenario === 'Overshoot' ? 0.88 : scenario === 'Preso no Peito' ? 1.12 : stability < 55 ? 0.95 : 1;
  const dx = Math.abs((last?.x ?? 0) - (first?.x ?? 0));
  const pattern = sideways < distance * 0.12 ? 'Linear' : dx < sideways * 0.45 ? 'Meia-Lua' : 'Puxada em J';
  return { speed: +speed.toFixed(2), accel: +accel.toFixed(3), headDwell: Math.round(t.dwell), stability,
    accuracy: Math.round((t.head + t.body) / total * 100), headshots: t.head, bodyshots: t.body,
    overshoots: t.overshoot, factor, fireButton: Math.round(bound(c.fire + (factor < 0.9 ? 5 : factor > 1 ? -4 : 0), 10, 65)),
    fireButtonY: c.fireY, pullPattern: pattern, scenario, hsRate, chestLockRate, overshootRate };
}
export function recalibrate(input: EngineInput, sensitivity: number, issues: FeedbackIssue[]) {
  const next = { ...input }; let sensi = sensitivity;
  if (issues.includes('over')) {
    next.dpi = Math.round(bound(next.dpi * 0.88, 320, 1400));
    sensi *= 0.9; next.fireButton = bound(next.fireButton + 5, 10, 65);
  }
  if (issues.includes('jitter')) {
    next.dpi = Math.round(bound(next.dpi * 0.94, 320, 1400));
    next.pointerSpeed = bound(next.pointerSpeed - 1, 1, 10); sensi *= 0.96;
  }
  if (issues.includes('chest') && !issues.includes('over')) {
    sensi *= 1.1; next.fireButton = bound(next.fireButton - 4, 10, 65);
    next.fireButtonY = bound(next.fireButtonY - 3, 10, 65);
  }
  return { input: next, sensitivity: Math.round(bound(sensi, 0, 200)) };
}