import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BellRing,
  ChevronRight,
  Copy,
  Crosshair,
  Download,
  Gauge,
  Hand,
  Languages,
  LocateFixed,
  MousePointer2,
  Radar,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Target,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import React, { useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SensiX Pro — Gerador de Sensibilidade Free Fire" },
      { name: "description", content: "Calibre sensibilidade, botão de tiro, toque, mira e DPI para seu dispositivo." },
      { property: "og:title", content: "SensiX Pro — Configuração competitiva Free Fire" },
      { property: "og:description", content: "Um painel avançado para gerar e calibrar sua configuração de Free Fire." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Lang = "pt" | "en";
type Sensitivity = { geral: number; red: number; x2: number; x4: number; awm: number; free: number };
type Toast = { id: number; text: string } | null;

const devices = ["Xiaomi Redmi Note 13", "Samsung Galaxy S24", "Apple iPhone 15", "Motorola Edge 50", "Realme GT 6", "ASUS ROG Phone 8"];
const labels = {
  pt: {
    online: "SISTEMA OPERACIONAL", tagline: "PRECISÃO SEM LIMITES", intro: "Seu centro de calibração competitiva para domínio total de mira, arraste e resposta.",
    generate: "GERAR CONFIGURAÇÃO", calibrate: "CALIBRAR TOQUE", profile: "BAIXAR PERFIL", sensi: "GERADOR DE SENSIBILIDADE", sensiSub: "Matriz adaptativa 0—200",
    device: "Dispositivo", resolution: "Resolução / DPI", newCombo: "NOVA COMBINAÇÃO", copy: "COPIAR VALORES", copied: "Valores copiados para a área de transferência",
    fire: "BOTÃO DE TIRO", fireSub: "Geometria de arraste", hand: "Tamanho da mão", swipe: "Estilo de puxada", small: "Pequena", medium: "Média", large: "Grande",
    fast: "Arraste rápido", curved: "Arraste curvo", straight: "Arraste reto", recommended: "Tamanho recomendado", zone: "ZONA DE ARRASTE IDEAL",
    touch: "CALIBRAÇÃO DE TOQUE", touchSub: "Teste de resposta em 3 pontos", begin: "INICIAR CALIBRAÇÃO", tap: "TOQUE NO ALVO", done: "MATRIZ OTIMIZADA", latency: "Latência média",
    stability: "ESTABILIZAÇÃO DE MIRA", stabilitySub: "Simulação de padrão de recuo", gyro: "Compensação giroscópica", friction: "Atrito de tela", jitter: "Filtro de tremor",
    system: "AJUSTE FINO DO SISTEMA", systemSub: "Sincronização de ponteiro e DPI", pointer: "Velocidade do ponteiro", delay: "Atraso de toque", converter: "Conversor DPI", ios: "iOS", android: "Android", optimal: "Faixa ideal detectada",
    tips: "BIBLIOTECA PRO", tricks: "Trick shots", physics: "Física da tela", graphics: "Gráficos", soundOn: "Som ligado", soundOff: "Som desligado", configReady: "Perfil visual baixado",
    tip1: "Comece o arraste antes do disparo e finalize no centro da zona ciano.", tip2: "Mantenha a tela seca; uma dedeira uniforme reduz variações de atrito.", tip3: "Use FPS alto e sombras desligadas para priorizar leitura e resposta.",
    fireReady: "Botão calibrado", precision: "Precisão estimada", response: "Resposta de toque", status: "ANTI-LAG PRONTO", general: "Geral", redDot: "Ponto Vermelho", peek: "Olhadinha",
  },
  en: {
    online: "SYSTEM OPERATIONAL", tagline: "PRECISION WITHOUT LIMITS", intro: "Your competitive calibration center for total aim, drag and response control.",
    generate: "GENERATE CONFIG", calibrate: "CALIBRATE TOUCH", profile: "DOWNLOAD PROFILE", sensi: "SENSITIVITY GENERATOR", sensiSub: "Adaptive 0—200 matrix",
    device: "Device", resolution: "Resolution / DPI", newCombo: "NEW COMBINATION", copy: "COPY VALUES", copied: "Values copied to clipboard",
    fire: "FIRE BUTTON", fireSub: "Drag geometry", hand: "Hand size", swipe: "Swipe style", small: "Small", medium: "Medium", large: "Large",
    fast: "Fast drag", curved: "Curved drag", straight: "Straight drag", recommended: "Recommended size", zone: "OPTIMAL DRAG ZONE",
    touch: "TOUCH CALIBRATION", touchSub: "3-point response test", begin: "START CALIBRATION", tap: "TAP THE TARGET", done: "MATRIX OPTIMIZED", latency: "Average latency",
    stability: "AIM STABILIZATION", stabilitySub: "Recoil pattern simulator", gyro: "Gyroscope compensation", friction: "Screen friction", jitter: "Jitter removal",
    system: "SYSTEM FINE-TUNER", systemSub: "Pointer and DPI sync", pointer: "Pointer speed", delay: "Touch & hold delay", converter: "DPI converter", ios: "iOS", android: "Android", optimal: "Optimal range detected",
    tips: "PRO LIBRARY", tricks: "Trick shots", physics: "Screen physics", graphics: "Graphics", soundOn: "Sound on", soundOff: "Sound off", configReady: "Visual profile downloaded",
    tip1: "Start the drag before firing and finish inside the cyan target zone.", tip2: "Keep the screen dry; a consistent sleeve reduces friction variance.", tip3: "Use high FPS and disable shadows to prioritize visibility and response.",
    fireReady: "Button calibrated", precision: "Estimated precision", response: "Touch response", status: "ANTI-LAG READY", general: "General", redDot: "Red Dot", peek: "Free Look",
  },
} as const;

function Button({ children, variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" }) {
  return <button className={`ui-button ui-button-${variant} ${className}`} {...props}>{children}</button>;
}

function SectionTitle({ icon: Icon, title, subtitle, tag }: { icon: React.ElementType; title: string; subtitle: string; tag: string }) {
  return <div className="section-title"><div className="section-icon"><Icon size={18} /></div><div className="min-w-0"><p className="section-tag">{tag}</p><h2>{title}</h2><p>{subtitle}</p></div></div>;
}

interface PlayerSetup {
  brand: string;
  resX: number;
  resY: number;
  dpi: number;
  buttonSize: number;
}

function calculateSensi(setup: PlayerSetup) {
  let baseSensi = 100;
  
  const brandModifiers: Record<string, number> = {
    'Apple iPhone 15': 0.85, 'ASUS ROG Phone 8': 0.90, 'Samsung Galaxy S24': 1.0, 
    'Motorola Edge 50': 1.05, 'Xiaomi Redmi Note 13': 1.10, 'Realme GT 6': 1.15,
  };
  baseSensi *= brandModifiers[setup.brand] || 1.0;

  const totalPixels = setup.resX * setup.resY;
  if (totalPixels > 3000000) baseSensi *= 0.92;
  else if (totalPixels < 2000000) baseSensi *= 1.08;

  const dpiRatio = 411 / (setup.dpi || 411);
  let finalGeral = baseSensi * dpiRatio;

  if (setup.buttonSize < 45) finalGeral *= 1.05;
  if (setup.buttonSize > 60) finalGeral *= 0.95;

  finalGeral = Math.min(200, Math.max(0, Math.round(finalGeral)));

  return {
    geral: finalGeral,
    redDot: Math.min(200, Math.round(finalGeral * 1.05)),
    scope2x: Math.min(200, Math.round(finalGeral * 0.95)),
    scope4x: Math.min(200, Math.round(finalGeral * 0.88)),
    awm: Math.min(200, Math.round(finalGeral * 0.40)),
  };
}

function PullUpSimulator({ onFeedback, onComplete, jitterLevel }: { onFeedback: (msg: string) => void, onComplete: (btnSize: number) => void, jitterLevel: number }) {
  const [attempts, setAttempts] = useState(0);
  const [speeds, setSpeeds] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [crosshairY, setCrosshairY] = useState(0);
  const [crosshairX, setCrosshairX] = useState(0);
  const buttonRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (attempts >= 3) return;
    buttonRef.current?.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setStartY(e.clientY);
    setStartTime(Date.now());
    onFeedback(`Teste ${attempts + 1}/3: Puxando mira...`);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const distance = Math.max(0, startY - e.clientY);
    setCrosshairY(distance * 1.5);
    const shake = (Math.random() - 0.5) * (jitterLevel / 2);
    setCrosshairX(shake);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    setCrosshairY(0);
    setCrosshairX(0);
    buttonRef.current?.releasePointerCapture(e.pointerId);

    const distance = startY - e.clientY;
    const timeTaken = Date.now() - startTime;
    
    if (distance < 50) {
      onFeedback("⚠️ Puxada muito curta. Tente com mais força.");
      return;
    }

    const speed = distance / timeTaken;
    const newSpeeds = [...speeds, speed];
    setSpeeds(newSpeeds);
    setAttempts(a => a + 1);

    if (newSpeeds.length === 3) {
      const avgSpeed = newSpeeds.reduce((a, b) => a + b, 0) / 3;
      let idealBtn = 50;
      if (avgSpeed > 2.0) idealBtn = 62; 
      else if (avgSpeed < 1.0) idealBtn = 42; 
      
      onComplete(idealBtn);
      onFeedback(`💀 CALIBRADO! Botão ideal: ${idealBtn}%. Ajuste salvo.`);
    } else {
      if (speed > 2.5) onFeedback(`Passou da cabeça! Faltam ${3 - newSpeeds.length} testes.`);
      else onFeedback(`Bom capa! Faltam ${3 - newSpeeds.length} testes.`);
    }
  };

  const reset = () => { setAttempts(0); setSpeeds([]); onComplete(50); onFeedback("Reiniciado. Puxe o botão novamente."); };

  return (
    <div className="relative w-full h-72 bg-[#0a0a0c] border border-[#ff5a12]/30 rounded-lg overflow-hidden touch-none mt-4 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-red-500/10 rounded-full border border-dashed border-red-500/50 flex items-center justify-center">
        <span className="text-xs text-red-500 opacity-50">HEAD</span>
      </div>
      
      <div 
        className="absolute bottom-20 left-1/2 -translate-x-1/2 text-[#ff5a12] transition-transform duration-75"
        style={{ transform: `translate(${crosshairX}px, -${crosshairY}px)` }}
      >
        <Crosshair size={32} />
      </div>

      <div 
        ref={buttonRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(255,90,18,0.5)] select-none touch-none transition-all ${attempts >= 3 ? 'bg-green-600' : 'bg-[#ff5a12] cursor-grab active:cursor-grabbing active:scale-95'}`}
      >
        {attempts >= 3 ? <ShieldCheck size={24} color="white" /> : <Target size={24} color="white" />}
      </div>
      
      {attempts >= 3 && (
        <Button onClick={reset} variant="outline" className="absolute top-2 right-2 text-xs py-1 px-3 h-auto">Refazer</Button>
      )}
    </div>
  );
}

function Index() {
  const [lang, setLang] = useState<Lang>("pt");
  const [sound, setSound] = useState(true);
  const [device, setDevice] = useState(devices[0] ?? "Xiaomi Redmi Note 13");
  
  // Novos estados integrados
  const [resX, setResX] = useState(1080);
  const [resY, setResY] = useState(2400);
  const [dpiNumber, setDpiNumber] = useState(411);
  const [calibratedBtn, setCalibratedBtn] = useState(50);
  const [isApplying, setIsApplying] = useState(false);

  const [sensi, setSensi] = useState<Sensitivity>({ geral: 192, red: 188, x2: 176, x4: 164, awm: 92, free: 148 });
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [hand, setHand] = useState(1);
  const [swipe, setSwipe] = useState(0);
  const [calStep, setCalStep] = useState(0);
  const [calStart, setCalStart] = useState(0);
  const [latencies, setLatencies] = useState<number[]>([]);
  const [gyro, setGyro] = useState(68);
  const [friction, setFriction] = useState(42);
  const [jitter, setJitter] = useState(76);
  const [os, setOs] = useState<"Android" | "iOS">("Android");
  const [pointer, setPointer] = useState(7);
  const [delay, setDelay] = useState(180);
  const [convertDpi, setConvertDpi] = useState(411);
  const [tip, setTip] = useState(0);
  const audioRef = useRef<AudioContext | null>(null);
  const t = labels[lang];

  const buttonSize = calibratedBtn !== 50 ? calibratedBtn : 43 + hand * 5 + (swipe === 0 ? 3 : swipe === 1 ? 1 : -1);
  const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const recoilTightness = 52 - gyro * .2 - jitter * .16 + friction * .08;
  const targetPositions = [{ left: "20%", top: "62%" }, { left: "70%", top: "24%" }, { left: "55%", top: "68%" }];

  const buzz = (kind: "tap" | "generate" = "tap") => {
    if (navigator.vibrate) navigator.vibrate(kind === "generate" ? [25, 20, 45] : 18);
    if (!sound) return;
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = audioRef.current ?? new AudioCtx(); audioRef.current = ctx;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = kind === "generate" ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(kind === "generate" ? 180 : 540, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(kind === "generate" ? 620 : 360, ctx.currentTime + .09);
    gain.gain.setValueAtTime(.045, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .1);
    osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .11);
  };
  const notify = (text: string) => { setToast({ id: Date.now(), text }); window.setTimeout(() => setToast(null), 2400); };
  
  const generate = () => {
    buzz("generate"); 
    setScanning(true);
    
    window.setTimeout(() => { 
      const novaSensi = calculateSensi({
        brand: device,
        resX: resX,
        resY: resY,
        dpi: dpiNumber,
        buttonSize: calibratedBtn
      });

      setSensi({ 
        geral: novaSensi.geral, 
        red: novaSensi.redDot, 
        x2: novaSensi.scope2x, 
        x4: novaSensi.scope4x, 
        awm: novaSensi.awm, 
        free: Math.round(novaSensi.geral * 0.75) 
      }); 
      setScanning(false); 
      notify("Matriz atualizada com seus dados exatos!");
    }, 800);
  };

  const copyValues = async () => {
    const text = `${t.general}: ${sensi.geral}\n${t.redDot}: ${sensi.red}\n2x: ${sensi.x2}\n4x: ${sensi.x4}\nAWM: ${sensi.awm}\n${t.peek}: ${sensi.free}`;
    await navigator.clipboard.writeText(text); buzz(); notify(t.copied);
  };
  const startCalibration = () => { buzz("generate"); setLatencies([]); setCalStep(1); setCalStart(performance.now()); };
  const hitTarget = () => {
    buzz(); const now = performance.now(); setLatencies((p) => [...p, Math.round(now - calStart)]);
    if (calStep >= 3) setCalStep(4); else { setCalStep((p) => p + 1); setCalStart(now); }
  };
  const downloadProfile = () => {
    buzz("generate");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="1200" height="675" fill="#0a0a0c"/><path d="M0 580L1200 250" stroke="#192126"/><text x="70" y="100" fill="#ff5a12" font-family="Arial" font-weight="700" font-size="32">SENSIX PRO // CONFIG PROFILE</text><text x="70" y="155" fill="#9aa4aa" font-family="Arial" font-size="20">${device} · ${resX}x${resY} · ${dpiNumber} DPI · ${os}</text><text x="70" y="250" fill="#f5f7f8" font-family="Arial" font-size="30">GERAL ${sensi.geral}   RED DOT ${sensi.red}   2X ${sensi.x2}</text><text x="70" y="310" fill="#f5f7f8" font-family="Arial" font-size="30">4X ${sensi.x4}   AWM ${sensi.awm}   FREE LOOK ${sensi.free}</text><text x="70" y="410" fill="#38d9e6" font-family="Arial" font-size="26">FIRE BUTTON ${buttonSize}%   ·   POINTER ${pointer}/10   ·   ${convertDpi} DPI</text><rect x="70" y="535" width="270" height="5" fill="#ff5a12"/><text x="70" y="590" fill="#707b82" font-family="Arial" font-size="18">ANTI-LAG MATRIX // VERIFIED PROFILE</text></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })); const a = document.createElement("a"); a.href = url; a.download = "sensix-pro-profile.svg"; a.click(); URL.revokeObjectURL(url); notify(t.configReady);
  };

  const sensiItems = useMemo(() => [[t.general, sensi.geral], [t.redDot, sensi.red], ["2x", sensi.x2], ["4x", sensi.x4], ["AWM", sensi.awm], [t.peek, sensi.free]] as const, [sensi, t]);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return <main className="app-shell">
    <div className="hud-grid" aria-hidden="true" />
    <header className="topbar">
      <button className="brand" onClick={() => scrollTo("top")} aria-label="SensiX Pro home"><span className="brand-mark"><Crosshair /></span><span><strong>SENSI<span>X</span></strong><small>PRO CALIBRATION SYSTEM</small></span></button>
      <div className="system-status"><span className="status-dot" /><span><b>{t.online}</b><small>{t.status}</small></span></div>
      <div className="header-actions">
        <Button variant="ghost" onClick={() => { setLang(lang === "pt" ? "en" : "pt"); buzz(); }} aria-label="Change language"><Languages size={17} /><span>{lang.toUpperCase()}</span></Button>
        <Button variant="ghost" onClick={() => { setSound(!sound); buzz(); }} aria-label={sound ? t.soundOn : t.soundOff}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</Button>
      </div>
    </header>

    <div className="page" id="top">
      <section className="hero-band">
        <div className="hero-copy animate-fade-in"><p className="eyebrow"><span /> PERFORMANCE LAB // 04</p><h1>SENSI<span>X</span> PRO</h1><p className="hero-tagline">{t.tagline}</p><p className="hero-intro">{t.intro}</p><div className="hero-actions"><Button onClick={() => scrollTo("sensitivity")}><Zap size={17} />{t.generate}</Button><Button variant="outline" onClick={() => scrollTo("calibration")}><Radar size={17} />{t.calibrate}</Button></div></div>
        <div className="telemetry" aria-label="Live performance telemetry"><div className="radar-disc"><div className="radar-sweep" /><Crosshair size={42} /><span className="ping ping-1" /><span className="ping ping-2" /></div><div className="metric-stack"><div><span>98.7%</span><small>{t.precision}</small></div><div><span>12ms</span><small>{t.response}</small></div></div></div>
      </section>

      <nav className="quick-nav" aria-label="Quick tools">
        {[{ icon: SlidersHorizontal, label: t.sensi, id: "sensitivity" }, { icon: Hand, label: t.fire, id: "fire" }, { icon: Radar, label: t.touch, id: "calibration" }, { icon: Gauge, label: t.system, id: "system" }].map((item, i) => <button key={item.id} onClick={() => scrollTo(item.id)}><span>0{i + 1}</span><item.icon size={19} /><b>{item.label}</b><ChevronRight size={16} /></button>)}
      </nav>

      <section id="sensitivity" className="panel sensitivity-panel">
        <SectionTitle icon={Crosshair} tag="01 // CORE" title={t.sensi} subtitle={t.sensiSub} />
        
        {/* NOVOS INPUTS MANUAIS */}
        <div className="grid grid-cols-2 gap-4 mb-6" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem'}}>
          <label style={{gridColumn: 'span 2', display: 'block', fontSize: '0.75rem', color: '#9aa4aa', textTransform: 'uppercase', letterSpacing: '0.1em'}}>{t.device}
            <select style={{width: '100%', marginTop: '0.25rem', backgroundColor: '#111518', border: '1px solid #232c32', padding: '0.5rem', borderRadius: '4px', color: '#fff'}} value={device} onChange={(e) => setDevice(e.target.value)}>
              {devices.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label style={{display: 'block', fontSize: '0.75rem', color: '#9aa4aa', textTransform: 'uppercase', letterSpacing: '0.1em'}}>Resolução (X e Y)
            <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.25rem'}}>
              <input type="number" style={{width: '100%', backgroundColor: '#111518', border: '1px solid #232c32', padding: '0.5rem', borderRadius: '4px', color: '#fff'}} value={resX} onChange={e => setResX(Number(e.target.value))} />
              <input type="number" style={{width: '100%', backgroundColor: '#111518', border: '1px solid #232c32', padding: '0.5rem', borderRadius: '4px', color: '#fff'}} value={resY} onChange={e => setResY(Number(e.target.value))} />
            </div>
          </label>
          <label style={{display: 'block', fontSize: '0.75rem', color: '#9aa4aa', textTransform: 'uppercase', letterSpacing: '0.1em'}}>DPI Exata
            <input type="number" style={{width: '100%', marginTop: '0.25rem', backgroundColor: '#111518', border: '1px solid #232c32', padding: '0.5rem', borderRadius: '4px', color: '#38d9e6', fontWeight: 'bold'}} value={dpiNumber} onChange={e => setDpiNumber(Number(e.target.value))} />
          </label>
          
          <div style={{gridColumn: 'span 2', backgroundColor: 'rgba(17,21,24,0.5)', padding: '0.75rem', borderRadius: '4px', border: '1px solid rgba(56,217,230,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{fontSize: '0.75rem', color: '#9aa4aa', textTransform: 'uppercase'}}>Botão de Tiro Motor:</span>
            <span style={{color: '#38d9e6', fontFamily: 'monospace', fontWeight: 'bold'}}>{calibratedBtn}%</span>
          </div>
        </div>

        <div className={`sensi-output ${scanning ? "is-scanning" : ""}`}><div className="scan-line" />{sensiItems.map(([name, value], i) => <div className="sensi-stat" key={name} style={{ animationDelay: `${i * 45}ms` }}><span>{String(i + 1).padStart(2, "0")} // {name}</span><strong>{value}</strong><div><i style={{ width: `${value / 2}%` }} /></div></div>)}</div>
        <div className="panel-actions"><Button onClick={generate} disabled={scanning}><RefreshCw className={scanning ? "spin" : ""} size={17} />{t.newCombo}</Button><Button variant="outline" onClick={copyValues}><Copy size={17} />{t.copy}</Button></div>
      </section>

      <div className="two-column">
        <section id="fire" className="panel">
          <SectionTitle icon={LocateFixed} tag="02 // HUD" title={t.fire} subtitle={t.fireSub} />
          <div className="seg-group"><span>{t.hand}</span><div>{[t.small, t.medium, t.large].map((x, i) => <button className={hand === i ? "active" : ""} onClick={() => { setHand(i); buzz(); }} key={x}>{x}</button>)}</div></div>
          <div className="seg-group"><span>{t.swipe}</span><div>{[t.fast, t.curved, t.straight].map((x, i) => <button className={swipe === i ? "active" : ""} onClick={() => { setSwipe(i); buzz(); }} key={x}>{x}</button>)}</div></div>
          <div className="fire-result"><div className="phone-hud"><div className="drag-path" /><span className="fire-button" style={{ width: `${buttonSize * .85}px`, height: `${buttonSize * .85}px` }}><Target /></span><small>{t.zone}</small></div><div className="size-readout"><small>{t.recommended}</small><strong>{buttonSize}<sup>%</sup></strong><span><ShieldCheck size={15} /> {t.fireReady}</span></div></div>
          
          <div style={{marginTop: '2rem', borderTop: '1px solid #232c32', paddingTop: '1.5rem'}}>
            <h3 style={{color: '#ff5a12', fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: '0.1em'}}><Crosshair size={14} style={{display: 'inline', marginRight: '0.5rem'}}/> Teste Prático de Puxada</h3>
            <PullUpSimulator onFeedback={notify} onComplete={setCalibratedBtn} jitterLevel={jitter} />
          </div>
        </section>

        <section id="calibration" className="panel">
          <SectionTitle icon={Radar} tag="03 // TOUCH" title={t.touch} subtitle={t.touchSub} />
          <div className="calibration-field">
            <div className="field-grid" />
            {calStep > 0 && calStep < 4 && <button className="target-node" style={targetPositions[calStep - 1] ?? targetPositions[0]} onClick={hitTarget} aria-label={t.tap}><span>{calStep}</span></button>}
            {calStep === 0 && <div className="cal-empty"><MousePointer2 size={28} /><span>READY_</span></div>}
            {calStep === 4 && <div className="cal-complete"><ShieldCheck size={34} /><strong>{t.done}</strong><span>{t.latency}: {avgLatency}ms</span></div>}
            {calStep > 0 && calStep < 4 && <p className="target-instruction">{t.tap} // 0{calStep}/03</p>}
          </div>
          <Button className="w-full" onClick={startCalibration}><ScanLine size={18} />{calStep === 0 ? t.begin : calStep === 4 ? t.done : t.begin}</Button>
        </section>
      </div>

      <section className="panel stability-panel">
        <SectionTitle icon={Activity} tag="04 // RECOIL" title={t.stability} subtitle={t.stabilitySub} />
        <div className="stability-grid"><div className="slider-stack">{[[t.gyro, gyro, setGyro], [t.friction, friction, setFriction], [t.jitter, jitter, setJitter]].map(([name, value, setter]) => <label key={String(name)}><span><b>{String(name)}</b><output>{String(value)}%</output></span><input type="range" min="0" max="100" value={Number(value)} onChange={(e) => (setter as React.Dispatch<React.SetStateAction<number>>)(Number(e.target.value))} /></label>)}</div><div className="recoil-sim"><svg viewBox="0 0 300 180" role="img" aria-label="Recoil pattern"><path className="recoil-axis" d="M150 15V165M35 145H265"/><path className="recoil-path" d={`M150 145 C${130-recoilTightness} 120, ${175+recoilTightness} 112, 148 92 S${130-recoilTightness/2} 62, 154 28`} /><circle cx="150" cy="145" r="10" /><circle cx="148" cy="92" r="6" /><circle cx="154" cy="28" r="5" /></svg><span>LIVE_RECOIL_VECTOR</span></div></div>
      </section>

      <section id="system" className="panel system-panel">
        <SectionTitle icon={Gauge} tag="05 // SYSTEM" title={t.system} subtitle={t.systemSub} />
        <div className="os-toggle"><button className={os === "Android" ? "active" : ""} onClick={() => setOs("Android")}>ANDROID</button><button className={os === "iOS" ? "active" : ""} onClick={() => setOs("iOS")}>iOS</button></div>
        <div className="tuner-grid"><label><span>{t.pointer}<output>{pointer}/10</output></span><input type="range" min="1" max="10" value={pointer} onChange={(e) => setPointer(Number(e.target.value))} /></label><label><span>{t.delay}<output>{delay}ms</output></span><input type="range" min="80" max="500" step="10" value={delay} onChange={(e) => setDelay(Number(e.target.value))} /></label><label><span>{t.converter}<output>{convertDpi}</output></span><input type="range" min="300" max="800" step="1" value={convertDpi} onChange={(e) => setConvertDpi(Number(e.target.value))} /></label></div>
        <div className="recommendation"><Sparkles size={18} /><div><b>{t.optimal}</b><span>{os === "Android" ? `DPI ${Math.max(360, convertDpi - 20)}–${convertDpi + 30} · Pointer ${pointer}` : `Touch ${Math.max(100, delay - 40)}–${delay}ms · 120Hz`}</span></div></div>
        
        {/* BOTÃO ANIMADO DE APLICAR AJUSTES */}
        <div style={{marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #232c32'}}>
          <Button 
            className="w-full" 
            style={{backgroundColor: isApplying ? '#232c32' : '#0891b2', transition: 'all 0.3s ease'}}
            onClick={() => {
              setIsApplying(true);
              buzz("generate");
              setTimeout(() => { setIsApplying(false); notify("Ajustes de Kernel e Ponteiro injetados com sucesso!"); }, 2500);
            }}
            disabled={isApplying}
          >
            {isApplying ? (
              <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}><RefreshCw className="spin" size={16}/> Sincronizando Matriz de Toque...</span>
            ) : (
              <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}><Zap size={16}/> Aplicar Ajustes Finos</span>
            )}
          </Button>
        </div>
      </section>

      <section className="panel tips-panel">
        <SectionTitle icon={BellRing} tag="06 // INTEL" title={t.tips} subtitle="TACTICAL DATABASE" />
        <div className="tip-tabs">{[t.tricks, t.physics, t.graphics].map((x, i) => <button className={tip === i ? "active" : ""} onClick={() => setTip(i)} key={x}>{String(i + 1).padStart(2, "0")} {x}</button>)}</div>
        <div className="tip-content"><div className="tip-number">0{tip + 1}</div><div><small>PROTOCOL_{["DRAG", "SURFACE", "RENDER"][tip] ?? "DRAG"}</small><p>{[t.tip1, t.tip2, t.tip3][tip] ?? t.tip1}</p></div><Target size={25} /></div>
      </section>

      <section className="export-band"><div><p>CONFIGURATION // READY</p><h2>{device}</h2><span>{resX}x{resY} · {buttonSize}% FIRE · {os}</span></div><Button onClick={downloadProfile}><Download size={18} />{t.profile}</Button></section>
      <footer><div className="brand-mini"><Crosshair size={18} /> SENSIX PRO</div><p>INDEPENDENT COMPETITIVE CALIBRATION TOOL</p><span>BUILD 4.8.2 // ONLINE</span></footer>
    </div>
    {toast && <div className="toast" key={toast.id}><ShieldCheck size={18} />{toast.text}</div>}
  </main>;
}
