// SensiX Pro — Free Fire Aim Lab & Hyper-Sensitivity Biomechanical Engine
// Pure TypeScript engine calculating non-linear FF ballistics, hardware latency, and biomechanics

export type Mode = "br" | "cs" | "x1";
export type Preference = "low" | "mid" | "high";
export type PullStyle = "linear" | "short" | "explosive" | "j_pull" | "half_moon";
export type TouchSampling = 120 | 180 | 240 | 360 | 480 | 720;

export interface Brand {
  id: string;
  label: string;
  touch: number;
  tier: "flagship" | "mid" | "budget";
  nativeSampling: TouchSampling;
}

export const BRANDS: Brand[] = [
  { id: "apple_pro", label: "Apple iPhone Pro (ProMotion 120Hz/240Hz)", touch: 0.86, tier: "flagship", nativeSampling: 240 },
  { id: "samsung_s", label: "Samsung Galaxy Linha S (S22/S23/S24 Ultra)", touch: 0.98, tier: "flagship", nativeSampling: 240 },
  { id: "samsung_a", label: "Samsung Galaxy Linha A (A54/A55/A34)", touch: 1.05, tier: "mid", nativeSampling: 240 },
  { id: "poco_f", label: "Xiaomi Poco Linha F (F4/F5/F6 Pro - 480Hz)", touch: 0.92, tier: "flagship", nativeSampling: 480 },
  { id: "poco_x", label: "Xiaomi Poco Linha X (X5/X6 Pro - 360Hz)", touch: 1.04, tier: "mid", nativeSampling: 360 },
  { id: "motorola_edge", label: "Motorola Edge Series (144Hz)", touch: 1.02, tier: "mid", nativeSampling: 240 },
  { id: "asus_rog", label: "ASUS ROG Phone (Hyper-Response 720Hz)", touch: 0.85, tier: "flagship", nativeSampling: 720 },
  { id: "pc_emulator", label: "Emulador PC (Bluestacks / MSI - 1000Hz)", touch: 0.80, tier: "flagship", nativeSampling: 720 },
];

export const RESOLUTIONS = [
  { id: "fhd_std", label: "FHD+ (1080 × 2400) — Padrão Mobile", w: 1080, h: 2400 },
  { id: "hd_std", label: "HD+ (720 × 1600) — Alto FPS", w: 720, h: 1600 },
  { id: "qhd_std", label: "QHD+ (1440 × 3200) — Máxima Resolução", w: 1440, h: 3200 },
  { id: "stretched_ipad", label: "Resolução Esticada (4:3 / 1440 × 1080)", w: 1440, h: 1080 },
  { id: "stretched_ultra", label: "Tela Esticada Extrema (16:10 / 1920 × 1200)", w: 1920, h: 1200 },
] as const;

export interface BiomechanicFeedback {
  hsRate?: number;
  chestLockRate?: number;
  overshootRate?: number;
  stability?: number;
  avgSpeed?: number;
  samples?: number;
}

export interface EngineInput {
  mode: Mode;
  preference: Preference;
  brandId: string;
  dpi: number;
  resW: number;
  resH: number;
  fireButton: number; // 10-100 %
  fireButtonY: number; // 10-70 % (HUD vertical position from bottom)
  pull: PullStyle;
  inputLag: number; // 0-10 perceived
  touchDelay: number; // ms 0-200
  fps: 30 | 45 | 60 | 90 | 120 | 144 | 240;
  touchSampling: TouchSampling;
  pointerSpeed: number; // 1-10
  stretchedScreen: boolean; // Stretched display vs Black Bars
  stockLvl3: boolean; // Coronha Nível 3 (spread reduction)
  /** optional multiplier from the drag simulator (0.8-1.2) */
  dragFactor?: number;
  biomechanicFeedback?: BiomechanicFeedback;
}

export interface EngineOutput {
  geral: number;
  redDot: number;
  acog: number; // 2x
  x4: number; // 4x
  awm: number; // AWM
  camera: number; // Olhadinha
  fireButton: number;
  fireButtonY: number;
  axisX: number;
  axisY: number;
  factors: { label: string; value: string }[];
  hardwareScore: number;
  recoilReductionPct: number;
  bloomCapMultiplier: number;
  stretchModifier: { x: number; y: number };
}

const clamp = (v: number, a = 0, b = 200) => Math.min(b, Math.max(a, Math.round(v)));

export function compute(i: EngineInput): EngineOutput {
  const brand = BRANDS.find((b) => b.id === i.brandId) ?? BRANDS[1];
  const dpi = Math.min(1400, Math.max(320, i.dpi || 411));
  const resRatio = Math.max(0.5, Math.min(1.8, (i.resW || 1080) / 1080));
  const aspect = (i.resH || 2400) / (i.resW || 1080);

  // DPI inverse curve: standard Free Fire baseline is 411 DPI
  const dpiF = Math.pow(411 / dpi, 0.55);
  const resF = 1 + (1 - resRatio) * 0.12;

  // Stretched Screen mathematics:
  // In stretched screen mode (resolução esticada), pixels are squashed horizontally.
  // The player's physical swipe yields faster horizontal crosshair angular movement (vector X * 1.28).
  // Consequently, vertical travel feels proportionally heavier and drag friction increases.
  const stretchMultiplierX = i.stretchedScreen ? 1.28 : 1.0;
  const stretchMultiplierY = i.stretchedScreen ? 1.14 : 1.0; // requires more vertical push to capa

  // Touch Sampling Rate latency factor:
  // 720Hz = 1.38ms; 240Hz = 4.16ms; 120Hz = 8.33ms polling intervals.
  const touchHz = i.touchSampling || brand.nativeSampling || 240;
  const samplingFactor = Math.pow(240 / touchHz, 0.28);

  const axisX = +(dpiF * brand.touch * (aspect > 2.1 ? 1.03 : 1) * stretchMultiplierX).toFixed(3);
  const axisY = +(dpiF * brand.touch * resF * stretchMultiplierY).toFixed(3);

  // Mode & style presets:
  const prefF = { low: 0.86, mid: 1.0, high: 1.15 }[i.preference];
  const pullF = {
    linear: 1.0,
    short: 1.07,
    explosive: 0.92,
    j_pull: 1.04,
    half_moon: 1.08,
  }[i.pull];

  // Fire button size factor: smaller button requires faster travel distance
  const fireF = 1 + (50 - i.fireButton) * 0.007;

  // Latency & frame rate modifiers:
  const latF = 1 + i.inputLag * 0.012 + i.touchDelay * 0.0006 + (samplingFactor - 1) * 0.08;
  const fpsF = Math.max(0.92, Math.min(1.10, 1 + (60 - i.fps) * 0.0013));
  const pointerF = Math.max(0.90, Math.min(1.10, 1 + (5 - i.pointerSpeed) * 0.019));

  // Biomechanical feedback adaptation (Self-learning loop):
  let bioMultiplier = 1.0;
  let recommendedButton = i.fireButton;
  let recommendedButtonY = i.fireButtonY || 24;

  const bio = i.biomechanicFeedback;
  if (bio && bio.samples && bio.samples > 3) {
    if ((bio.overshootRate ?? 0) > 28) {
      // Overshoot: bullets flying above head! Reduce sensitivity, increase fire button size for resistance
      bioMultiplier *= 0.89;
      recommendedButton = Math.min(85, recommendedButton + 8);
    } else if ((bio.chestLockRate ?? 0) > 42) {
      // Chest lock: unable to break torso aim assist! Boost Red Dot and lower button for longer drag travel
      bioMultiplier *= 1.12;
      recommendedButton = Math.max(32, recommendedButton - 6);
      recommendedButtonY = Math.max(12, recommendedButtonY - 4);
    }

    if ((bio.stability ?? 100) < 55) {
      // High jitter: stabilize
      bioMultiplier *= 0.95;
    }
  }

  const drag = (i.dragFactor ?? 1) * bioMultiplier;

  // Game mode rotation balance
  const modeModifier = {
    br: { rot: 0.96, scope: 1.05 },
    cs: { rot: 1.06, scope: 0.96 },
    x1: { rot: 1.12, scope: 0.90 },
  }[i.mode];

  // Stock lvl 3 (Coronha 3) reduces bloom dispersion and late spray recoil
  const recoilReductionPct = i.stockLvl3 ? 48 : 0;
  const bloomCapMultiplier = i.stockLvl3 ? 0.55 : 1.0;

  const base = 170 * prefF * pullF * latF * fpsF * pointerF * drag;

  const geral = clamp(base * axisX * modeModifier.rot * fireF);
  const redDot = clamp(base * 0.98 * axisY * resF * fireF * (i.stretchedScreen ? 1.08 : 1.0));
  const acog = clamp(base * 0.91 * axisY * resF * modeModifier.scope);
  const x4 = clamp(base * 0.83 * axisY * modeModifier.scope);
  const awm = clamp(base * 0.43 * axisY * (modeModifier.scope > 1 ? 1.05 : 0.94));
  const camera = clamp(base * 0.88 * axisX * modeModifier.rot);

  // Dynamic fire button recommendation based on DPI and screen physics (Strict 10% to 65%)
  const dpiResRatio = dpi / (411 * resRatio);
  const baseFire = clamp(
    50 +
      (1 - dpiResRatio) * 12 +
      (i.pull === "explosive" ? 5 : i.pull === "short" ? -4 : 0) +
      (i.mode === "x1" ? -3 : 0),
    10,
    65
  );

  const finalFireButton = clamp(bio?.samples && bio.samples > 3 ? recommendedButton : baseFire, 10, 65);
  const finalButtonY = clamp(recommendedButtonY, 10, 65);

  // Hardware responsiveness score (0-100)
  const hardwareScore = Math.min(
    100,
    Math.round(
      (i.fps / 240) * 35 +
      (touchHz / 720) * 35 +
      (1 - Math.min(1, i.touchDelay / 100)) * 15 +
      (brand.tier === "flagship" ? 15 : brand.tier === "mid" ? 10 : 5)
    )
  );

  return {
    geral,
    redDot,
    acog,
    x4,
    awm,
    camera,
    fireButton: finalFireButton,
    fireButtonY: finalButtonY,
    axisX,
    axisY,
    hardwareScore,
    recoilReductionPct,
    bloomCapMultiplier,
    stretchModifier: { x: stretchMultiplierX, y: stretchMultiplierY },
    factors: [
      { label: "DPI Balístico", value: `×${dpiF.toFixed(2)}` },
      { label: "Toque Painel", value: `×${brand.touch.toFixed(2)}` },
      { label: "Sampling Rate", value: `${touchHz}Hz` },
      { label: "Resolução Esticada", value: i.stretchedScreen ? "ATIVO (+28% X)" : "DESATIVO (1:1)" },
      { label: "Coronha Nvl 3", value: i.stockLvl3 ? "-48% Bloom" : "Original" },
      { label: "Preferência", value: `×${prefF.toFixed(2)}` },
      { label: "Padrão Puxada", value: `×${pullF.toFixed(2)}` },
      { label: "Botão HUD", value: `×${fireF.toFixed(2)}` },
      { label: "Latência/FPS", value: `${i.fps} FPS · ${Math.round(1000 / i.fps + i.touchDelay)}ms` },
      { label: "Biofeedback", value: `×${drag.toFixed(2)}` },
    ],
  };
}

export const CPU_TIERS = [
  { id: "sd8", label: "Snapdragon 8 Gen 2/3 / Dimensity 9300+ / Apple A17 Pro", min: 420, max: 600, hz: "360Hz - 720Hz" },
  { id: "sd7", label: "Snapdragon 7+ Gen 2 / Dimensity 8200 / Apple A15", min: 380, max: 500, hz: "240Hz - 360Hz" },
  { id: "helio", label: "Helio G99 / Dimensity 7050", min: 340, max: 440, hz: "180Hz - 240Hz" },
  { id: "unisoc", label: "Unisoc T616 / Exynos Entrada", min: 300, max: 390, hz: "120Hz" },
  { id: "emulator_pc", label: "PC Gamer (Intel Core i5/i7/i9 / AMD Ryzen)", min: 400, max: 1000, hz: "1000Hz (Polling Mouse)" },
];

export function idealDpi(tierId: string, resW: number) {
  const t = CPU_TIERS.find((c) => c.id === tierId) ?? CPU_TIERS[1];
  if (tierId === "apple") return { text: "iOS nativo (gerenciado por toque e DPI virtual)", hz: t.hz };
  const k = resW / 1080;
  return { text: `${Math.round(t.min * k)} – ${Math.round(t.max * k)} DPI`, hz: t.hz };
}

export function idealResolution(tierId: string, fps: EngineInput["fps"]) {
  if (tierId === "sd8" || tierId === "emulator_pc") {
    return fps >= 120 ? "FHD+ (1080p) — Equilíbrio ideal entre precisão e fluidez" : "QHD+ (1440p) — Máxima densidade de píxel";
  }
  if (tierId === "sd7") return fps >= 90 ? "FHD+ (1080p) — Padrão competitivo nacional" : "HD+ (720p) — Estabilidade de frame-pacing";
  return "HD+ (720p) — Menor carga GPU, resposta de toque mais imediata";
}
