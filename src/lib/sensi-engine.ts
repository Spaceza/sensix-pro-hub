type Brand = 'Apple' | 'Samsung' | 'Xiaomi' | 'Motorola' | 'Realme' | 'ASUS';
type Resolution = 'HD+' | 'FHD+' | 'QHD+';

interface PlayerSetup {
  brand: Brand;
  resolution: Resolution;
  dpi: number;
}

export function calculateSensi(setup: PlayerSetup) {
  let baseSensi = 100;

  // 1. Modificador de Marca (Taxa de amostragem de toque)
  const brandModifiers: Record<Brand, number> = {
    'Apple': 0.85, // Telas mais responsivas, exigem menos sensi
    'ASUS': 0.90,
    'Samsung': 1.0,
    'Motorola': 1.05,
    'Xiaomi': 1.10, // Geralmente exigem uma puxada mais forte
    'Realme': 1.15,
  };
  baseSensi *= brandModifiers[setup.brand];

  // 2. Modificador de Resolução (Densidade de pixels)
  if (setup.resolution === 'QHD+') baseSensi *= 0.95;
  if (setup.resolution === 'HD+') baseSensi *= 1.08;

  // 3. Modificador de DPI (Inversamente proporcional)
  // Assumindo 411 como DPI padrão do Android
  const dpiRatio = 411 / setup.dpi; 
  const finalGeral = Math.min(200, Math.max(0, Math.round(baseSensi * dpiRatio)));

  return {
    geral: finalGeral,
    redDot: Math.min(200, Math.round(finalGeral * 1.05)), // Red dot levemente mais solta
    scope2x: Math.min(200, Math.round(finalGeral * 0.95)),
    scope4x: Math.min(200, Math.round(finalGeral * 0.88)),
    awm: Math.min(200, Math.round(finalGeral * 0.40)), // AWM sempre requer precisão
    buttonSize: setup.dpi > 600 ? 45 : 58 // DPI alta = botão menor para mais espaço de drag
  };
}
