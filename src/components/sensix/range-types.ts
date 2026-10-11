import type { RefObject } from 'react';
import type { AimConfig, DragSample, Trial } from '@/lib/aim-physics';
export interface RangeRuntime {
  held: boolean; pointerId: number | null; origin: DragSample | null;
  queue: { dx: number; dy: number; speed: number; at: number }[];
  yaw: number; pitch: number; bloom: number; speed: number; reset: number;
  trial: Trial; hits: { x: number; y: number; head: boolean }[];
}
export interface RangeSnapshot { shots: number; head: number; body: number; lock: boolean; bloom: number; speed: number; damage: number }
export interface RangePalette { floor: string; wall: string; ceiling: string; metal: string; accent: string; critical: string; light: string; ink: string }
export interface SceneProps {
  runtime: RefObject<RangeRuntime>; config: RefObject<AimConfig>; palette: RangePalette;
  onSnapshot: (value: RangeSnapshot) => void; onShot: (head: boolean) => void;
}
export function freshRuntime(): RangeRuntime {
  return { held: false, pointerId: null, origin: null, queue: [], yaw: 0.0555, pitch: -0.047,
    bloom: 0, speed: 0, reset: 0, trial: { samples: [], head: 0, body: 0, miss: 0, overshoot: 0, dwell: 0 }, hits: [] };
}