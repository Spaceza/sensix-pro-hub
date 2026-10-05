import { createFileRoute } from "@tanstack/react-router";
import {
  Activity, BellRing, ChevronRight, Copy, Crosshair, Download,
  Gauge, Hand, Languages, LocateFixed, MousePointer2, Radar,
  RefreshCw, ScanLine, ShieldCheck, SlidersHorizontal, Sparkles,
  Target, Volume2, VolumeX, Zap, BarChart3, Fingerprint, BrainCircuit
} from "lucide-react";
import React, { useMemo, useRef, useState, useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SensiX Pro — Laboratório de Performance Free Fire" },
      { name: "description", content: "Calibração de reflexos, arraste e física de mira." },
    ],
  }),
  component: Index,
});

const devices = ["Xiaomi / POCO", "Samsung Galaxy", "Apple iPhone", "Motorola Edge", "Realme", "ASUS ROG"];

// --- MOTOR MATEMÁTICO INTEGRADO (V2.0) ---
interface PlayerSetup {
  brand: string;
  resX: number;
  resY: number;
  dpi: number;
  dragCoefficient: number;
  reactionMs: number;
  usesSleeve: boolean;
}

function calculateSensi(setup: PlayerSetup) {
  let baseSensi = 100;
  
  const brandModifiers: Record<string, number> = {
    'Apple iPhone': 0.82, 'ASUS ROG': 0.88, 'Samsung Galaxy': 1.0, 
    'Motorola Edge': 1.05, 'Xiaomi / POCO': 1.12, 'Realme': 1.15,
  };
  baseSensi *= brandModifiers[setup.brand] || 1.0;

  // Ajuste por densidade e Dedeira (Dedeira deixa liso, exige menos sensi pra não pinar)
  const totalPixels = setup.resX * setup.resY;
  if (totalPixels > 3000000) baseSensi *= 0.90;
  if (setup.usesSleeve) baseSensi *= 0.88;

  const dpiRatio = 411 / (setup.dpi || 411);
  let finalGeral = baseSensi * dpiRatio;

  // Impacto do Reflexo (Reaction Time) e Arraste
  // Reflexo rápido (< 250ms) = Consegue domar sensi alta. Reflexo lento = Sensi menor pra focar precisão.
  const reflexBonus = setup.reactionMs < 250 ? 1.15 : (setup.reactionMs > 350 ? 0.90 : 1.0);
  
  finalGeral *= setup.dragCoefficient * reflexBonus;

  // Definição de Arquétipo
  let archetype = "VERSÁTIL";
  if (setup.reactionMs < 260 && setup.dragCoefficient < 0.95) archetype = "RUSHADOR FRENÉTICO";
  else if (setup.reactionMs > 320 && setup.dragCoefficient > 1.05) archetype = "SNIPER / SUPORTE";
  else if (setup.usesSleeve && setup.dragCoefficient < 1.0) archetype = "FRAGGER MECÂNICO";

  let idealBtn = 50;
  if (setup.dragCoefficient < 0.9) idealBtn = 64; 
  else if (setup.dragCoefficient > 1.1) idealBtn = 40; 
  else idealBtn = 52; 

  return {
    geral: Math.min(200, Math.max(0, Math.round(finalGeral))),
    redDot: Math.min(200, Math.round(finalGeral * 1.08)), // Um pouco mais solta no novo meta
    scope2x: Math.min(200, Math.round(finalGeral * (archetype.includes("RUSH") ? 0.90 : 0.98))),
    scope4x: Math.min(200, Math.round(finalGeral * (archetype.includes("SNIPER") ? 0.95 : 0.85))),
    awm: Math.min(200, Math.round(finalGeral * 0.45)),
    buttonSize: idealBtn,
    archetype
  };
}

// --- MINIGAME 1: TESTE DE REFLEXO NEURAL (NOVO) ---
function ReflexTest({ onComplete, buzz }: { onComplete: (ms: number) => void, buzz: (t: string) => void }) {
  const [state, setState] = useState<"idle" | "waiting" | "ready" | "done">("idle");
  const [startTime, setStartTime] = useState(0);
  const [result, setResult] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  const startTest = () => {
    buzz("tap");
    setState("waiting");
    const delay = 1500 + Math.random() * 3000; // Tempo aleatório
    timeoutRef.current = window.setTimeout(() => {
      setState("ready");
      setStartTime(Date.now());
      buzz("generate"); // Som agudo pra atirar
    }, delay);
  };

  const handleTap = () => {
    if (state === "waiting") {
      clearTimeout(timeoutRef.current!);
      setState("idle");
      alert("Apressado! Você atirou antes da hora. Tente de novo.");
    } else if (state === "ready") {
      const ms = Date.now() - startTime;
      setResult(ms);
      setState("done");
      onComplete(ms);
      buzz("tap");
    }
  };

  return (
    <div className="relative w-full h-32 bg-black border-2 border-slate-800 rounded-lg overflow-hidden flex flex-col items-center justify-center cursor-pointer select-none transition-colors duration-200"
         onClick={state === "idle" || state === "done" ? startTest : handleTap}
         style={{
           backgroundColor: state === "ready" ? "#16a34a" : state === "waiting" ? "#b91c1c" : "#0f172a",
           borderColor: state === "ready" ? "#4ade80" : "#1e293b"
         }}>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
      
      {state === "idle" && <><BrainCircuit size={32} className="text-cyan-500 mb-2 animate-pulse" /><span className="text-cyan-400 font-bold tracking-widest text-sm">INICIAR TESTE NEURAL</span><span className="text-[10px] text-slate-500 mt-1">Toque quando ficar verde</span></>}
      {state === "waiting" && <span className="text-red-300 font-black tracking-widest text-xl animate-pulse">AGUARDE...</span>}
      {state === "ready" && <span className="text-white font-black tracking-widest text-3xl drop-shadow-md">ATIRE!</span>}
      {state === "done" && (
        <div className="text-center z-10">
          <span className="block text-[10px] text-slate-400">TEMPO DE REAÇÃO</span>
          <strong className="text-3xl text-cyan-400 font-black">{result} <span className="text-sm">ms</span></strong>
          <span className="block text-[10px] text-slate-500 mt-2">Toque para refazer</span>
        </div>
      )}
    </div>
  );
}

// --- MINIGAME 2: SIMULADOR FÍSICO COM AIM ASSIST (REMASTERIZADO) ---
function PullUpSimulator({ onFeedback, onComplete, usesSleeve }: { onFeedback: (msg: string) => void, onComplete: (coeff: number, btn: number) => void, usesSleeve: boolean }) {
  // ... (Mesma lógica robusta do minigame anterior, com ajustes visuais)
  const [attempts, setAttempts] = useState(0);
  const [metrics, setMetrics] = useState<{speed: number, deviation: number}[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startX, setStartX] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [crosshairY, setCrosshairY] = useState(0);
  const [crosshairX, setCrosshairX] = useState(0);
  const [liveStatus, setLiveStatus] = useState<{msg: string, color: string}>({msg: "SCANNING", color: "text-cyan-700"});
  const buttonRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (attempts >= 3) return;
    buttonRef.current?.setPointerCapture(e.pointerId);
    setIsDragging(true); setStartY(e.clientY); setStartX(e.clientX); setStartTime(Date.now());
    setLiveStatus({msg: "TRACKING...", color: "text-orange-500"});
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const rawY = startY - e.clientY; 
    const rawX = e.clientX - startX;
    const timeElapsed = Date.now() - startTime;
    const currentSpeed = rawY / Math.max(1, timeElapsed); 
    
    let renderY = 0; let renderX = rawX; 
    const frictionBase = usesSleeve ? 0.6 : 0.35; // Dedeira escorrega mais fácil no peito

    if (rawY < 140) {
      renderY = Math.max(0, rawY * frictionBase); 
      setLiveStatus({msg: "MAGNETISMO: PEITO", color: "text-cyan-500"});
    } else if (rawY >= 140 && rawY <= 240) {
      if (currentSpeed > 3.2) {
        renderY = rawY * 1.15; setLiveStatus({msg: "ALERTA: OVERFLICK", color: "text-red-500"});
      } else {
        renderY = 160 + ((rawY - 180) * 0.15); 
        renderX = rawX * 0.3; 
        setLiveStatus({msg: "LOCK-ON: HEADSHOT", color: "text-red-500 font-black drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]"});
      }
    } else {
      renderY = rawY * 1.2; setLiveStatus({msg: "ALERTA: RECOIL LOSS", color: "text-red-500"});
    }
    setCrosshairY(renderY); setCrosshairX(renderX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const finalRenderX = crosshairX;
    setCrosshairY(0); setCrosshairX(0);
    buttonRef.current?.releasePointerCapture(e.pointerId);

    const rawY = startY - e.clientY;
    const timeTaken = Date.now() - startTime;
    if (rawY < 30) { setLiveStatus({msg: "ABORTADO", color: "text-slate-500"}); return; }

    const speed = rawY / timeTaken;
    const deviation = Math.abs(finalRenderX);
    const newMetrics = [...metrics, { speed, deviation }];
    setMetrics(newMetrics);
    
    const currentAttempt = attempts + 1;
    setAttempts(currentAttempt);

    if (currentAttempt >= 3) {
      const avgSpeed = newMetrics.reduce((a, b) => a + b.speed, 0) / 3;
      const avgDev = newMetrics.reduce((a, b) => a + b.deviation, 0) / 3;
      
      let coeff = 1.0;
      if (avgSpeed > 2.5) coeff = 0.85; else if (avgSpeed < 1.2) coeff = 1.20;
      let btn = 52;
      if (avgDev > 35) btn = 64; else if (avgSpeed > 2.5) btn = 58; else if (avgSpeed < 1.2) btn = 44;
      
      onComplete(coeff, btn);
      setLiveStatus({msg: "ANÁLISE COMPLETA", color: "text-green-400 font-bold"});
    } else {
      setLiveStatus({msg: `DADOS COLETADOS [${currentAttempt}/3]`, color: "text-slate-400"});
    }
  };

  return (
    <div className="relative w-full h-[350px] bg-black border border-slate-800/80 rounded-lg overflow-hidden touch-none mt-4 shadow-[inset_0_0_60px_rgba(8,145,178,0.15)] flex flex-col justify-end">
      {/* Grid Background Cyberpunk */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
      
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
        <span className={`text-[10px] font-mono tracking-widest transition-colors duration-200 ${liveStatus.color} bg-black/80 border border-slate-800 px-3 py-1 rounded backdrop-blur-sm shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>
          {liveStatus.msg}
        </span>
      </div>

      <div className="absolute bottom-[90px] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none opacity-60">
        <div className="w-12 h-14 bg-red-500/10 border border-red-500/80 rounded-[45%] flex items-center justify-center mb-1 shadow-[0_0_20px_rgba(255,0,0,0.4)]">
          <Crosshair size={14} className="text-red-500 opacity-50" />
        </div>
        <div className="w-5 h-4 bg-slate-800 rounded-sm"></div>
        <div className="w-28 h-32 bg-gradient-to-b from-cyan-900/30 to-transparent border-t border-cyan-700/50 rounded-t-[2.5rem] flex items-center justify-center">
          <div className="w-16 h-16 border border-cyan-800/30 rounded-full flex items-center justify-center">
            <span className="text-[8px] text-cyan-500 font-mono opacity-40">GRAVITY WELL</span>
          </div>
        </div>
      </div>
      
      <div 
        className="absolute bottom-[130px] left-1/2 -translate-x-1/2 text-cyan-400 transition-transform duration-75 pointer-events-none z-30 mix-blend-screen"
        style={{ transform: `translate(${crosshairX}px, -${crosshairY}px)` }}
      >
        <LocateFixed size={40} strokeWidth={1} className="drop-shadow-[0_0_10px_rgba(34,211,238,1)]" />
      </div>

      <div 
        ref={buttonRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative z-40 mb-8 mx-auto w-16 h-16 rounded-full flex items-center justify-center select-none touch-none transition-colors border-2 ${attempts >= 3 ? 'bg-cyan-900 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.4)]' : 'bg-[#ff5a12] border-orange-400 shadow-[0_0_30px_rgba(255,90,18,0.5)] active:scale-90 cursor-grab active:cursor-grabbing'}`}
      >
        {attempts >= 3 ? <Activity size={26} color="#22d3ee" /> : <Fingerprint size={28} color="white" />}
      </div>
      
      {attempts >= 3 && (
        <Button onClick={() => { setAttempts(0); setMetrics([]); onComplete(1.0, 50); }} variant="outline" className="absolute top-4 right-4 text-[10px] py-1 px-3 h-auto bg-black/80 border-slate-700 text-slate-400 z-50">REBOOT</Button>
      )}
    </div>
  );
}

// --- COMPONENTE PRINCIPAL (INDEX) ---
export default function Index() {
  const [lang, setLang] = useState<Lang>("pt");
  const [sound, setSound] = useState(true);
  
  // States Unificados da Central Neural
  const [device, setDevice] = useState(devices[0]);
  const [resX, setResX] = useState(1080);
  const [resY, setResY] = useState(2400);
  const [dpiNumber, setDpiNumber] = useState(411);
  const [usesSleeve, setUsesSleeve] = useState(false); // Dedeira Gamer
  
  const [reactionMs, setReactionMs] = useState(300); // Reflexo default
  const [dragCoeff, setDragCoeff] = useState(1.0);
  const [computedBtn, setComputedBtn] = useState(50);
  
  const [sensi, setSensi] = useState<Sensitivity & { archetype?: string }>({ geral: 192, red: 188, x2: 176, x4: 164, awm: 92, free: 148, archetype: "NÃO CALIBRADO" });
  const [isBooting, setIsBooting] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const audioRef = useRef<AudioContext | null>(null);

  // Efeito de Boot inicial Cyberpunk
  useEffect(() => {
    setTimeout(() => setIsBooting(false), 2000);
  }, []);

  const buzz = (kind: "tap" | "generate" = "tap") => {
    if (navigator.vibrate) navigator.vibrate(kind === "generate" ? [30, 40, 50] : 15);
    if (!sound) return;
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = audioRef.current ?? new AudioCtx(); audioRef.current = ctx;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = kind === "generate" ? "square" : "sine";
    osc.frequency.setValueAtTime(kind === "generate" ? 120 : 600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(kind === "generate" ? 800 : 300, ctx.currentTime + .1);
    gain.gain.setValueAtTime(.05, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .1);
    osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .15);
  };
  
  const notify = (text: string) => { setToast({ id: Date.now(), text }); window.setTimeout(() => setToast(null), 3000); };
  
  const generate = () => {
    buzz("generate"); 
    setScanning(true);
    
    window.setTimeout(() => { 
      const nova = calculateSensi({
        brand: device, resX, resY, dpi: dpiNumber, 
        dragCoefficient: dragCoeff, reactionMs, usesSleeve
      });
      setSensi(nova); 
      setComputedBtn(nova.buttonSize);
      setScanning(false); 
      notify("Matriz SensiX processada com sucesso.");
    }, 1200);
  };

  const copyValues = async () => {
    const text = `ARQUÉTIPO: ${sensi.archetype}\nGeral: ${sensi.geral}\nRed Dot: ${sensi.red}\n2x: ${sensi.x2}\n4x: ${sensi.x4}\nAWM: ${sensi.awm}\nOlhadinha: ${sensi.free}\nBotão: ${computedBtn}%`;
    await navigator.clipboard.writeText(text); buzz(); notify("Copiado para área de transferência.");
  };

  if (isBooting) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono text-cyan-500">
        <Activity size={48} className="animate-pulse mb-4" />
        <h1 className="text-2xl font-black tracking-[0.3em] glitch" data-text="SENSIX PRO">SENSIX PRO</h1>
        <p className="mt-2 text-xs opacity-50">INITIALIZING NEURAL LINK...</p>
        <div className="w-48 h-1 bg-slate-800 mt-4 overflow-hidden rounded"><div className="h-full bg-cyan-500 animate-[pulse_1s_infinite] w-full origin-left scale-x-0 transition-transform duration-1000" style={{transform: 'scaleX(1)'}}></div></div>
      </div>
    );
  }

  return <main className="min-h-screen bg-[#050508] text-slate-300 font-sans selection:bg-cyan-900 selection:text-cyan-100 pb-20">
    <style>{`
      .glitch { position: relative; }
      .glitch::before, .glitch::after { content: attr(data-text); position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
      .glitch::before { left: 2px; text-shadow: -1px 0 red; clip: rect(24px, 550px, 90px, 0); animation: glitch-anim 3s infinite linear alternate-reverse; }
      .glitch::after { left: -2px; text-shadow: -1px 0 blue; clip: rect(85px, 550px, 140px, 0); animation: glitch-anim 2.5s infinite linear alternate-reverse; }
      @keyframes glitch-anim { 0% { clip: rect(20px, 9999px, 86px, 0); } 100% { clip: rect(67px, 9999px, 14px, 0); } }
      .scanlines { background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1)); background-size: 100% 4px; position: absolute; inset: 0; pointer-events: none; z-index: 50; opacity: 0.3; }
      .cyber-panel { background: rgba(10, 12, 16, 0.8); border: 1px solid rgba(8, 145, 178, 0.3); box-shadow: inset 0 0 20px rgba(0,0,0,0.8); backdrop-filter: blur(8px); }
    `}</style>
    
    <div className="scanlines" />

    {/* Header Cyber */}
    <header className="sticky top-0 z-40 bg-black/90 border-b border-cyan-900/50 backdrop-blur-md px-4 py-3 flex justify-between items-center shadow-[0_4px_30px_rgba(8,145,178,0.1)]">
      <div className="flex items-center gap-2">
        <BrainCircuit className="text-cyan-500" size={24} />
        <span className="font-black tracking-widest text-white text-lg">SENSI<span className="text-cyan-500">X</span></span>
      </div>
      <div className="flex items-center gap-4 text-xs font-mono">
        <span className="flex items-center gap-1 text-green-400"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> ONLINE</span>
        <button onClick={() => setSound(!sound)} className="text-slate-400 hover:text-white transition-colors">{sound ? <Volume2 size={16}/> : <VolumeX size={16}/>}</button>
      </div>
    </header>

    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 mt-4">
      
      {/* Hero Section */}
      <div className="text-center mb-8 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-cyan-600/20 blur-[50px] pointer-events-none rounded-full" />
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2 uppercase">Laboratório de <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Performance</span></h1>
        <p className="text-slate-400 text-sm md:text-base font-mono">CALIBRAÇÃO MECÂNICA E NEURAL PARA FPS MOBILE</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* COLUNA 1: COLETA DE DADOS */}
        <div className="space-y-6">
          <section className="cyber-panel p-5 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
            <h2 className="text-cyan-400 font-black tracking-widest text-sm mb-4 flex items-center gap-2"><Smartphone size={16}/> ESPECIFICAÇÕES DO HARDWARE</h2>
            
            <div className="space-y-4">
              <label className="block">
                <span className="text-[10px] text-slate-500 font-mono">MARCA DO SISTEMA</span>
                <select className="w-full mt-1 bg-black border border-slate-800 p-2.5 rounded text-white text-sm outline-none focus:border-cyan-500 transition-colors" value={device} onChange={(e) => setDevice(e.target.value)}>
                  {devices.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] text-slate-500 font-mono">RESOLUÇÃO (X/Y)</span>
                  <div className="flex gap-2 mt-1">
                    <input type="number" className="w-full bg-black border border-slate-800 p-2.5 rounded text-white text-sm text-center outline-none focus:border-cyan-500" value={resX} onChange={e => setResX(Number(e.target.value))} />
                    <input type="number" className="w-full bg-black border border-slate-800 p-2.5 rounded text-white text-sm text-center outline-none focus:border-cyan-500" value={resY} onChange={e => setResY(Number(e.target.value))} />
                  </div>
                </label>
                <label className="block">
                  <span className="text-[10px] text-slate-500 font-mono">DPI DO KERNEL</span>
                  <input type="number" className="w-full mt-1 bg-black border border-cyan-900/50 p-2.5 rounded text-cyan-300 font-bold text-center outline-none focus:border-cyan-400" value={dpiNumber} onChange={e => setDpiNumber(Number(e.target.value))} />
                </label>
              </div>

              {/* Toggla da Dedeira (Novidade de hardware externo) */}
              <div className="flex items-center justify-between bg-black/50 p-3 rounded border border-slate-800 mt-2">
                <span className="text-xs font-mono text-slate-300 flex items-center gap-2"><Hand size={14} className="text-slate-500"/> USA DEDEIRA GAMER?</span>
                <button onClick={() => {setUsesSleeve(!usesSleeve); buzz();}} className={`w-12 h-6 rounded-full transition-colors relative ${usesSleeve ? 'bg-cyan-600' : 'bg-slate-700'}`}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${usesSleeve ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </section>

          <section className="cyber-panel p-5 rounded-xl relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
            <h2 className="text-orange-400 font-black tracking-widest text-sm mb-4 flex items-center gap-2"><Zap size={16}/> TESTE DE REFLEXO (NEURAL)</h2>
            <p className="text-[10px] text-slate-400 mb-3 font-mono leading-relaxed">Sua velocidade de reação impacta diretamente o limite de sensibilidade que seu cérebro consegue controlar sem pinar.</p>
            <ReflexTest onComplete={setReactionMs} buzz={buzz} />
          </section>
        </div>

        {/* COLUNA 2: FÍSICA E RESULTADO */}
        <div className="space-y-6">
          <section className="cyber-panel p-5 rounded-xl relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
            <h2 className="text-red-400 font-black tracking-widest text-sm mb-4 flex items-center gap-2"><Target size={16}/> FÍSICA DE ARRASTE (AIM ASSIST)</h2>
            <p className="text-[10px] text-slate-400 font-mono mb-2">Simule 3 puxadas. O algoritmo medirá sua força motriz contra a gravidade do peito.</p>
            <PullUpSimulator onFeedback={notify} onComplete={(c, b) => {setDragCoeff(c); setComputedBtn(b);}} usesSleeve={usesSleeve} />
          </section>
        </div>
      </div>

      {/* PAINEL CENTRAL DE RESULTADOS (GERADOR) */}
      <section className="cyber-panel p-1 rounded-xl mt-8 relative overflow-hidden bg-gradient-to-b from-cyan-900/40 to-black">
        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-slate-800 pb-6">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2"><Activity className="text-cyan-500"/> MATRIZ DE SENSIBILIDADE</h2>
              <p className="text-xs text-cyan-500/70 font-mono mt-1">DADOS PROCESSADOS DA COLETA NEURAL E FÍSICA</p>
            </div>
            <Button onClick={generate} disabled={scanning} className="w-full md:w-auto bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-12 px-8 shadow-[0_0_20px_rgba(8,145,178,0.4)]">
              {scanning ? <RefreshCw className="animate-spin" size={20} /> : <span className="flex items-center gap-2"><BrainCircuit size={18} /> PROCESSAR MATRIZ</span>}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ARQUÉTIPO E BOTÃO */}
            <div className="md:col-span-1 space-y-4">
              <div className="bg-black/60 border border-slate-800 p-4 rounded-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10"><Target size={80}/></div>
                <span className="block text-[10px] text-slate-500 font-mono mb-1">ARQUÉTIPO DE JOGADOR</span>
                <strong className="text-lg text-orange-400 font-black tracking-wide">{sensi.archetype}</strong>
              </div>
              <div className="bg-black/60 border border-slate-800 p-4 rounded-lg relative overflow-hidden flex justify-between items-center">
                <div>
                  <span className="block text-[10px] text-slate-500 font-mono mb-1">BOTÃO DE TIRO (HUD)</span>
                  <strong className="text-2xl text-cyan-400 font-black">{computedBtn}<span className="text-sm">%</span></strong>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-cyan-500 flex items-center justify-center bg-cyan-900/20 shadow-[0_0_15px_rgba(8,145,178,0.3)]">
                  <Fingerprint size={20} className="text-cyan-400" />
                </div>
              </div>
            </div>

            {/* SENSIBILIDADES */}
            <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { name: "GERAL", val: sensi.geral, color: "text-white" },
                { name: "RED DOT", val: sensi.red, color: "text-red-400" },
                { name: "MIRA 2X", val: sensi.x2, color: "text-slate-300" },
                { name: "MIRA 4X", val: sensi.x4, color: "text-slate-300" },
                { name: "AWM", val: sensi.awm, color: "text-orange-400" },
                { name: "OLHADINHA", val: sensi.free, color: "text-slate-500" }
              ].map((s, i) => (
                <div key={s.name} className={`bg-black/40 border border-slate-800/80 p-4 rounded-lg text-center transition-all ${scanning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'} delay-[${i * 50}ms]`}>
                  <span className="block text-[10px] text-slate-500 font-mono mb-2 tracking-widest">{s.name}</span>
                  <strong className={`text-3xl font-black ${s.color}`}>{s.val}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button onClick={copyValues} className="text-xs text-slate-400 hover:text-cyan-400 font-mono flex items-center gap-2 transition-colors">
              <Copy size={14} /> EXPORTAR PERFIL PARA CLIPBOARD
            </button>
          </div>
        </div>
      </section>

      <footer className="text-center pt-10 pb-4 border-t border-slate-800/50 mt-12 opacity-50 hover:opacity-100 transition-opacity">
        <div className="flex justify-center items-center gap-2 mb-2">
          <Crosshair size={14} className="text-cyan-500" /> <span className="font-black text-sm text-white tracking-widest">SENSIX PRO</span>
        </div>
        <p className="text-[10px] font-mono text-slate-500">LABORATÓRIO INDEPENDENTE DE PERFORMANCE E-SPORTS V2.0</p>
      </footer>
    </div>
    
    {toast && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-cyan-900 border border-cyan-500 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_10px_40px_rgba(8,145,178,0.4)] z-50 animate-fade-in font-mono text-xs">
        <ShieldCheck size={16} /> {toast.text}
      </div>
    )}
  </main>;
}
