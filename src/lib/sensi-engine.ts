// SensiX Pro — weighted sensitivity engine (pure TypeScript, no side effects)

export type Mode = "br" | "cs" | "x1";
export type Preference = "low" | "mid" | "high";
export type PullStyle = "linear" | "short" | "explosive";

export interface Brand { id: string; label: string; touch: number; tier: "flagship" | "mid" | "budget" }
export const BRANDS: Brand[] = [
  { id: "apple", label: "Apple iPhone", touch: 0.86, tier: "flagship" },
  { id: "samsung", label: "Samsung Galaxy", touch: 1.0, tier: "flagship" },
  { id: "asus", label: "ASUS ROG", touch: 0.9, tier: "flagship" },
  { id: "xiaomi", label: "Xiaomi / POCO", touch: 1.08, tier: "mid" },
  { id: "motorola", label: "Motorola", touch: 1.06, tier: "mid" },
  { id: "realme", label: "Realme", touch: 1.12, tier: "budget" },
  { id: "lg", label: "LG", touch: 1.1, tier: "budget" },
];

export const RESOLUTIONS = [
  { id: "hd", label: "HD+ (720p)", w: 720, h: 1600 },
  { id: "fhd", label: "FHD+ (1080p)", w: 1080, h: 2400 },
  { id: "qhd", label: "QHD+ (1440p)", w: 1440, h: 3200 },
] as const;

export interface EngineInput {
  mode: Mode;
  preference: Preference;
  brandId: string;
  dpi: number;
  resW: number;
  resH: number;
  fireButton: number; // 30-80 %
  pull: PullStyle;
  inputLag: number; // 0-10 perceived
  touchDelay: number; // ms 0-200
  /** optional multiplier from the drag simulator (0.8-1.2) */
  dragFactor?: number;
}

export interface EngineOutput {
  geral: number; redDot: number; acog: number; x4: number; awm: number; camera: number;
  fireButton: number; axisX: number; axisY: number;
  factors: { label: string; value: string }[];
}

const clamp = (v: number, a = 0, b = 200) => Math.min(b, Math.max(a, Math.round(v)));

export function compute(i: EngineInput): EngineOutput {
  const brand = BRANDS.find((b) => b.id === i.brandId) ?? { id: "samsung", label: "Samsung Galaxy", touch: 1, tier: "flagship" as const };
  const dpi = Math.min(1200, Math.max(120, i.dpi || 411));
  const resRatio = Math.max(0.5, Math.min(1.6, (i.resW || 1080) / 1080));
  const aspect = (i.resH || 2400) / (i.resW || 1080);

  // Axis scaling: DPI (inverse), resolution, brand touch sampling
  const dpiF = Math.pow(411 / dpi, 0.55);
  const resF = 1 + (1 - resRatio) * 0.12; // lower resolution → slightly higher
  const axisX = dpiF * brand.touch * (aspect > 2.1 ? 1.03 : 1);
  const axisY = dpiF * brand.touch * resF;

  const prefF = { low: 0.88, mid: 1, high: 1.1 }[i.preference];
  const pullF = { linear: 1, short: 1.06, explosive: 0.93 }[i.pull];
  const fireF = 1 + (50 - i.fireButton) * 0.006; // smaller button → faster travel needed
  const latF = 1 + i.inputLag * 0.012 + i.touchDelay * 0.0006;
  const drag = i.dragFactor ?? 1;

  // Mode balance: BR = precision far, x1/cs = rotation speed
  const mode = {
    br: { rot: 0.95, scope: 1.06 },
    cs: { rot: 1.05, scope: 0.96 },
    x1: { rot: 1.1, scope: 0.9 },
  }[i.mode];

  const base = 172 * prefF * pullF * latF * drag;
  const geral = clamp(base * axisX * mode.rot * fireF);
  const redDot = clamp(base * 0.97 * axisY * resF * fireF);
  const acog = clamp(base * 0.9 * axisY * resF * mode.scope);
  const x4 = clamp(base * 0.82 * axisY * mode.scope);
  const awm = clamp(base * 0.42 * axisY * (mode.scope > 1 ? 1.05 : 0.95));
  const camera = clamp(base * 0.86 * axisX * mode.rot);

  const ratio = dpi / (411 * resRatio);
  const fire = clamp(50 + (1 - ratio) * 14 + (i.pull === "explosive" ? 4 : i.pull === "short" ? -3 : 0) + (i.mode === "x1" ? -2 : 0), 30, 80);

  return {
    geral, redDot, acog, x4, awm, camera, fireButton: fire,
    axisX: +axisX.toFixed(3), axisY: +axisY.toFixed(3),
    factors: [
      { label: "DPI", value: `×${dpiF.toFixed(2)}` },
      { label: "Toque (marca)", value: `×${brand.touch.toFixed(2)}` },
      { label: "Resolução", value: `×${resF.toFixed(2)}` },
      { label: "Preferência", value: `×${prefF.toFixed(2)}` },
      { label: "Puxada", value: `×${pullF.toFixed(2)}` },
      { label: "Botão de tiro", value: `×${fireF.toFixed(2)}` },
      { label: "Latência", value: `×${latF.toFixed(2)}` },
      { label: "Simulador", value: `×${drag.toFixed(2)}` },
    ],
  };
}

export const CPU_TIERS = [
  { id: "sd8", label: "Snapdragon 8 Gen / Dimensity 9000+", min: 400, max: 560, hz: "240Hz+" },
  { id: "sd7", label: "Snapdragon 7 / Dimensity 8000", min: 380, max: 500, hz: "180Hz" },
  { id: "helio", label: "Helio G / Dimensity 700", min: 340, max: 440, hz: "120Hz" },
  { id: "unisoc", label: "Unisoc / Exynos de entrada", min: 300, max: 400, hz: "≤120Hz" },
  { id: "apple", label: "Apple A-series", min: 0, max: 0, hz: "120Hz" },
];

export function idealDpi(tierId: string, resW: number) {
  const t = CPU_TIERS.find((c) => c.id === tierId) ?? { id: "sd7", label: "Snapdragon 7 / Dimensity 8000", min: 380, max: 500, hz: "180Hz" };
  if (t.id === "apple") return { text: "iOS não permite alterar DPI — ajuste a sensi pelo app.", hz: t.hz };
  const k = resW / 1080;
  return { text: `${Math.round(t.min * k)} – ${Math.round(t.max * k)} DPI`, hz: t.hz };
}
