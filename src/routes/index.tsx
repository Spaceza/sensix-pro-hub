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
import { useMemo, useRef, useState } from "react";

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
const labels: Record<Lang, Record<string, string>> = {
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
};

function Button({ children, variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" }) {
  return <button className={`ui-button ui-button-${variant} ${className}`} {...props}>{children}</button>;
}

function SectionTitle({ icon: Icon, title, subtitle, tag }: { icon: React.ElementType; title: string; subtitle: string; tag: string }) {
  return <div className="section-title"><div className="section-icon"><Icon size={18} /></div><div className="min-w-0"><p className="section-tag">{tag}</p><h2>{title}</h2><p>{subtitle}</p></div></div>;
}

function Index() {
  const [lang, setLang] = useState<Lang>("pt");
  const [sound, setSound] = useState(true);
  const [device, setDevice] = useState(devices[0]);
  const [dpi, setDpi] = useState("FHD+ · 411 DPI");
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

  const buttonSize = 43 + hand * 5 + (swipe === 0 ? 3 : swipe === 1 ? 1 : -1);
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
    buzz("generate"); setScanning(true);
    const seed = device.length + dpi.length + Date.now();
    const value = (base: number, spread: number) => Math.min(200, Math.max(0, base + ((seed * spread) % 19) - 9));
    window.setTimeout(() => { setSensi({ geral: value(190, 3), red: value(186, 5), x2: value(174, 7), x4: value(162, 11), awm: value(94, 13), free: value(150, 17) }); setScanning(false); }, 650);
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
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="1200" height="675" fill="#0a0a0c"/><path d="M0 580L1200 250" stroke="#192126"/><text x="70" y="100" fill="#ff5a12" font-family="Arial" font-weight="700" font-size="32">SENSIX PRO // CONFIG PROFILE</text><text x="70" y="155" fill="#9aa4aa" font-family="Arial" font-size="20">${device} · ${dpi} · ${os}</text><text x="70" y="250" fill="#f5f7f8" font-family="Arial" font-size="30">GERAL ${sensi.geral}   RED DOT ${sensi.red}   2X ${sensi.x2}</text><text x="70" y="310" fill="#f5f7f8" font-family="Arial" font-size="30">4X ${sensi.x4}   AWM ${sensi.awm}   FREE LOOK ${sensi.free}</text><text x="70" y="410" fill="#38d9e6" font-family="Arial" font-size="26">FIRE BUTTON ${buttonSize}%   ·   POINTER ${pointer}/10   ·   ${convertDpi} DPI</text><rect x="70" y="535" width="270" height="5" fill="#ff5a12"/><text x="70" y="590" fill="#707b82" font-family="Arial" font-size="18">ANTI-LAG MATRIX // VERIFIED PROFILE</text></svg>`;
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
        <div className="control-row"><label>{t.device}<select value={device} onChange={(e) => setDevice(e.target.value)}>{devices.map((d) => <option key={d}>{d}</option>)}</select></label><label>{t.resolution}<select value={dpi} onChange={(e) => setDpi(e.target.value)}><option>HD+ · 360 DPI</option><option>FHD+ · 411 DPI</option><option>QHD+ · 600 DPI</option><option>Custom · 800 DPI</option></select></label></div>
        <div className={`sensi-output ${scanning ? "is-scanning" : ""}`}><div className="scan-line" />{sensiItems.map(([name, value], i) => <div className="sensi-stat" key={name} style={{ animationDelay: `${i * 45}ms` }}><span>{String(i + 1).padStart(2, "0")} // {name}</span><strong>{value}</strong><div><i style={{ width: `${value / 2}%` }} /></div></div>)}</div>
        <div className="panel-actions"><Button onClick={generate} disabled={scanning}><RefreshCw className={scanning ? "spin" : ""} size={17} />{t.newCombo}</Button><Button variant="outline" onClick={copyValues}><Copy size={17} />{t.copy}</Button></div>
      </section>

      <div className="two-column">
        <section id="fire" className="panel">
          <SectionTitle icon={LocateFixed} tag="02 // HUD" title={t.fire} subtitle={t.fireSub} />
          <div className="seg-group"><span>{t.hand}</span><div>{[t.small, t.medium, t.large].map((x, i) => <button className={hand === i ? "active" : ""} onClick={() => { setHand(i); buzz(); }} key={x}>{x}</button>)}</div></div>
          <div className="seg-group"><span>{t.swipe}</span><div>{[t.fast, t.curved, t.straight].map((x, i) => <button className={swipe === i ? "active" : ""} onClick={() => { setSwipe(i); buzz(); }} key={x}>{x}</button>)}</div></div>
          <div className="fire-result"><div className="phone-hud"><div className="drag-path" /><span className="fire-button" style={{ width: `${buttonSize * .85}px`, height: `${buttonSize * .85}px` }}><Target /></span><small>{t.zone}</small></div><div className="size-readout"><small>{t.recommended}</small><strong>{buttonSize}<sup>%</sup></strong><span><ShieldCheck size={15} /> {t.fireReady}</span></div></div>
        </section>

        <section id="calibration" className="panel">
          <SectionTitle icon={Radar} tag="03 // TOUCH" title={t.touch} subtitle={t.touchSub} />
          <div className="calibration-field">
            <div className="field-grid" />
            {calStep > 0 && calStep < 4 && <button className="target-node" style={targetPositions[calStep - 1]} onClick={hitTarget} aria-label={t.tap}><span>{calStep}</span></button>}
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
      </section>

      <section className="panel tips-panel">
        <SectionTitle icon={BellRing} tag="06 // INTEL" title={t.tips} subtitle="TACTICAL DATABASE" />
        <div className="tip-tabs">{[t.tricks, t.physics, t.graphics].map((x, i) => <button className={tip === i ? "active" : ""} onClick={() => setTip(i)} key={x}>{String(i + 1).padStart(2, "0")} {x}</button>)}</div>
        <div className="tip-content"><div className="tip-number">0{tip + 1}</div><div><small>PROTOCOL_{["DRAG", "SURFACE", "RENDER"][tip]}</small><p>{[t.tip1, t.tip2, t.tip3][tip]}</p></div><Target size={25} /></div>
      </section>

      <section className="export-band"><div><p>CONFIGURATION // READY</p><h2>{device}</h2><span>{dpi} · {buttonSize}% FIRE · {os}</span></div><Button onClick={downloadProfile}><Download size={18} />{t.profile}</Button></section>
      <footer><div className="brand-mini"><Crosshair size={18} /> SENSIX PRO</div><p>INDEPENDENT COMPETITIVE CALIBRATION TOOL</p><span>BUILD 4.8.2 // ONLINE</span></footer>
    </div>
    {toast && <div className="toast" key={toast.id}><ShieldCheck size={18} />{toast.text}</div>}
  </main>;
}
