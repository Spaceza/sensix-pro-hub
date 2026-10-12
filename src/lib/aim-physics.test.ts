/// <reference types="bun" />
import { describe, it, expect } from 'bun:test';
import { rotationGain, responseDelay, analyzeTrial, recalibrate, type AimConfig } from './aim-physics';
import type { EngineInput } from './sensi-engine';
const config: AimConfig = { dpi: 411, sensitivity: 100, fps: 120, sampling: 240, pointer: 5, fire: 50, fireY: 25, resW: 1080, resH: 2400, brandTouch: 1, stretched: false, lag: 0, stock: true, strafe: false };
const input: EngineInput = { mode: 'br', preference: 'mid', brandId: 'samsung_s', dpi: 411, resW: 1080, resH: 2400, fireButton: 50, fireButtonY: 25, pull: 'linear', inputLag: 0, touchDelay: 0, fps: 120, touchSampling: 240, pointerSpeed: 5, stretchedScreen: false, stockLvl3: true };
describe('physical hardware coupling', () => {
 it('increases rotation for high DPI and sensitivity and decreases it for large buttons', () => {
  expect(rotationGain({ ...config, dpi: 800 })).toBeGreaterThan(rotationGain(config));
  expect(rotationGain({ ...config, sensitivity: 200 })).toBeGreaterThan(rotationGain(config));
  expect(rotationGain({ ...config, sensitivity: 0 })).toBe(0);
  expect(rotationGain({ ...config, fire: 65 })).toBeLessThan(rotationGain(config));
 });
 it('adds delayed input at low FPS but remains raw at high FPS', () => {
  expect(responseDelay({ ...config, fps: 30 })).toBeCloseTo(33.333, 2);
  expect(responseDelay(config)).toBe(0);
 });
 it('collects body-to-head telemetry and linear pulls', () => {
  const result = analyzeTrial({ samples: [{ x: 0, y: 100, t: 0 }, { x: 0, y: 0, t: 100 }], head: 2, body: 1, miss: 0, overshoot: 0, dwell: 100 }, config);
  expect(result.speed).toBe(1); expect(result.scenario).toBe('Puxada Pé-Cabeça'); expect(result.pullPattern).toBe('Linear'); expect(result.stability).toBe(100);
 });
 it('recalibrates actual values without mutating input and keeps bounds', () => {
  const next = recalibrate(input, 190, ['over', 'jitter']);
  expect(next.input.dpi).toBeLessThan(input.dpi); expect(next.sensitivity).toBeLessThan(190); expect(next.input.pointerSpeed).toBe(4); expect(input.dpi).toBe(411);
  expect(recalibrate({ ...input, fireButton: 64 }, 0, ['over']).input.fireButton).toBe(65);
  expect(recalibrate(input, 195, ['chest']).sensitivity).toBe(200);
 });
});
