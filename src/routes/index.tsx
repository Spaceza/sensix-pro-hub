import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Check,
  Copy,
  Crosshair,
  Download,
  Gauge,
  Languages,
  LogOut,
  MonitorCog,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Target,
  Trash2,
  Volume2,
  VolumeX,
  Zap,
  Flame,
  Shield,
  MoveHorizontal,
  Cpu,
  Tv,
} from "lucide-react";
import { AdminPanel } from "@/components/sensix/AdminPanel";
import { recalibrate, type FeedbackIssue, type TrainingResult } from '@/lib/aim-physics';
import { useKineticInterface } from '@/components/sensix/useKineticInterface';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
const PullSimulator = lazy(() => import('@/components/sensix/PullSimulator'));
import { CyberGridCanvas } from "@/components/sensix/CyberGridCanvas";
import { KeyGate } from "@/components/sensix/KeyGate";
import { checkSession, deleteProfile, listProfiles, saveProfile } from "@/lib/keys.functions";
import {
  BRANDS,
  CPU_TIERS,
  RESOLUTIONS,
  compute,
  idealDpi,
  idealResolution,
  type EngineInput,
  type Mode,
  type Preference,
  type PullStyle,
  type TouchSampling,
} from "@/lib/sensi-engine";
import { loadSession, storeSession, timeLeft, type Session } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Free Fire Aim Lab & Hyper-Sensitivity Engine" },
      {
        name: "description",
        content:
          "Plataforma biomecânica de sensibilidade para Free Fire. Simulador balístico UMP-45 3D com câmera sobre o ombro, telemetria de puxada e calibrador de hardware.",
      },
      { property: "og:title", content: "Free Fire Aim Lab & Hyper-Sensitivity Engine" },
      {
        property: "og:description",
        content:
          "Treine a puxada de capa no botão de tiro nativo e calibre sensibilidade, DPI, FPS, tela esticada e sampling de toque.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Profile = {
  id: string;
  name: string;
  data: Record<string, string | number | boolean | null>;
  created_at: string;
};

const initial: EngineInput = {
  mode: "br",
  preference: "mid",
  brandId: "samsung_s",
  dpi: 411,
  resW: 1080,
  resH: 2400,
  fireButton: 50,
  fireButtonY: 22,
  pull: "linear",
  inputLag: 2,
  touchDelay: 0,
  fps: 60,
  touchSampling: 240,
  pointerSpeed: 5,
  stretchedScreen: false,
  stockLvl3: true,
  dragFactor: 1,
};

const FPS_OPTIONS = [30, 45, 60, 90, 120, 144, 240] as const;
const TOUCH_SAMPLING_OPTIONS: TouchSampling[] = [120, 180, 240, 360, 480, 720];

function Index() {
  const check = useServerFn(checkSession);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [preference, setPreference] = useState<Preference>("mid");

  useEffect(() => {
    const saved = loadSession();
    if (!saved) {
      setReady(true);
      return;
    }
    void check({ data: { token: saved.token } })
      .then((r) => {
        if (r.ok) {
          const next = {
            ...saved,
            role: r.role,
            expiresAt: r.expiresAt,
            duration: r.duration,
          };
          storeSession(next);
          setSession(next);
        } else {
          storeSession(null);
        }
      })
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="app-shell boot">
        <Activity className="spin" size={28} />
        <b>BOOTING AIM LAB CORE // BIOMECHANICS V4.7</b>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-shell">
        <CyberGridCanvas preference="mid" />
        <KeyGate
          onLogin={(s) => {
            storeSession(s);
            setSession(s);
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <CyberGridCanvas preference={preference} />
      <div className="hud-grid" />
      <Header
        session={session}
        logout={() => {
          storeSession(null);
          setSession(null);
        }}
      />
      {session.role === "admin" ? (
        <AdminPanel token={session.token} />
      ) : (
        <Dashboard session={session} onPreferenceChange={setPreference} />
      )}
    </div>
  );
}

function Header({ session, logout }: { session: Session; logout: () => void }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">
          <Crosshair />
        </span>
        <div>
          <strong>
            AIM LAB <span>// HX</span>
          </strong>
          <small>HYPER-SENSITIVITY BIOMECHANICAL ENGINE</small>
        </div>
      </div>
      <div className="system-status">
        <span className="status-dot" />
        <div>
          <b>ENGINE ONLINE</b>
          <small>UMP-45 TRAINING BALLISTICS // READY</small>
        </div>
      </div>
      <div className="header-actions">
        <span className="access-time">
          {session.role === "admin" ? "ADMIN" : timeLeft(session.expiresAt)}
        </span>
        <Button className="icon-action" onClick={logout} aria-label="Sair">
          <LogOut />
        </Button>
      </div>
    </header>
  );
}

function Dashboard({
  session,
  onPreferenceChange,
}: {
  session: Session;
  onPreferenceChange: (pref: Preference) => void;
}) {
  const saveFn = useServerFn(saveProfile);
  const listFn = useServerFn(listProfiles);
  const deleteFn = useServerFn(deleteProfile);

  const [lang, setLang] = useState<"pt" | "en">("pt");
  const [sound, setSound] = useState(true);
  const [input, setInput] = useState<EngineInput>(initial);
  const [training, setTraining] = useState<TrainingResult | null>(null);
  const [gameSensi, setGameSensi] = useState<number | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [issues, setIssues] = useState<FeedbackIssue[]>([]);
  const [savingCalibration, setSavingCalibration] = useState(false);
  const [calibrationError, setCalibrationError] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileName, setProfileName] = useState("Build UMP Pro Athlete");
  const [toast, setToast] = useState("");
  const [cpu, setCpu] = useState("sd8");

  // Evolutionary Feedback & Local ML Recalibration State
  const [feedbackGeral, setFeedbackGeral] = useState<"fast" | "slow" | "perfect">("perfect");
  const [feedbackCapa, setFeedbackCapa] = useState<"chest" | "over" | "jitter" | "head">("chest");
  const [feedbackButton, setFeedbackButton] = useState<"hit" | "miss">("hit");
  const [feedbackScope, setFeedbackScope] = useState<"reddot" | "scope2x" | "ok">("ok");
  const [mlDiagnostic, setMlDiagnostic] = useState<string>("");

  const pageRef = useRef<HTMLElement>(null);
  useKineticInterface(pageRef);

  // Sync preference with background canvas
  useEffect(() => {
    onPreferenceChange(input.preference);
  }, [input.preference, onPreferenceChange]);

  // Compute live sensitivity output combining inputs and training results
  const output = useMemo(() => {
    const feedback = training
      ? {
          hsRate: training.hsRate,
          chestLockRate: training.chestLockRate,
          overshootRate: training.overshootRate,
          stability: training.stability,
          avgSpeed: training.speed,
          samples: training.headshots + training.bodyshots + training.overshoots,
        }
      : undefined;

    const calculated = compute({
      ...input,
      dragFactor: training?.factor ?? 1,
      fireButton: training?.fireButton ?? input.fireButton,
      fireButtonY: training?.fireButtonY ?? input.fireButtonY,
      ...(feedback ? { biomechanicFeedback: feedback } : {}),
    });
    return gameSensi === null ? calculated : { ...calculated, geral: gameSensi };
  }, [input, training, gameSensi]);

  const dpiRec = idealDpi(cpu, input.resW);
  const resolutionRec = idealResolution(cpu, input.fps);

  const receiveTrial = (result: TrainingResult | null) => {
    setTraining(result);
    if (!result) return;
    setIssues([]); setCalibrationError(''); setFeedbackOpen(true);
  };
  const applyCalibration = async () => {
    if (savingCalibration) return;
    setSavingCalibration(true); setCalibrationError('');
    const next = recalibrate(input, gameSensi ?? output.geral, issues);
    const adjusted = compute(next.input);
    const name = `Treino 3D · ${new Date().toLocaleString('pt-BR')}`;
    try {
      await saveFn({ data: { token: session.token, name, data: {
        ...next.input, geral: next.sensitivity, redDot: adjusted.redDot, acog: adjusted.acog,
        x4: adjusted.x4, awm: adjusted.awm, camera: adjusted.camera,
        scenario: training?.scenario ?? '', hsRate: training?.hsRate ?? 0, feedback: issues.join(','),
      } } });
      setInput(next.input); setGameSensi(next.sensitivity); setTraining(null);
      setMlDiagnostic(`${next.input.dpi} DPI · Ponteiro ${next.input.pointerSpeed}/10 · Geral ${next.sensitivity} · Botão ${next.input.fireButton}%`);
      await loadProfiles(); setFeedbackOpen(false); note('Calibração aplicada e salva na nuvem');
    } catch { setCalibrationError('Não foi possível salvar. Sua configuração anterior foi mantida. Tente novamente.'); }
    finally { setSavingCalibration(false); }
  };
  const handleRecalibrateML = () => { setIssues([]); setCalibrationError(''); setFeedbackOpen(true); };

  const set = <K extends keyof EngineInput>(key: K, value: EngineInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }));

  const note = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 2600);
  };

  const loadProfiles = async () => {
    try {
      setProfiles((await listFn({ data: { token: session.token } })) as Profile[]);
    } catch {
      note("Falha ao carregar perfis");
    }
  };

  useEffect(() => {
    void loadProfiles();
  }, []);

  // 3D Parallax and Tilt Effect
  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;

    const reveal = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => entry.target.classList.toggle("is-visible", entry.isIntersecting)),
      { threshold: 0.1 }
    );
    root.querySelectorAll(".reveal").forEach((el) => reveal.observe(el));

    const handleTilt = (event: PointerEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(".reactive-panel");
      if (!target) return;
      const r = target.getBoundingClientRect();
      const x = (event.clientX - r.left) / r.width;
      const y = (event.clientY - r.top) / r.height;
      target.style.setProperty("--mx", `${x * 100}%`);
      target.style.setProperty("--my", `${y * 100}%`);
      target.style.setProperty("--rx", `${(0.5 - y) * 3.5}deg`);
      target.style.setProperty("--ry", `${(x - 0.5) * 3.5}deg`);
    };

    root.addEventListener("pointermove", handleTilt);
    return () => {
      reveal.disconnect();
      root.removeEventListener("pointermove", handleTilt);
    };
  }, []);

  const copyConfig = async () => {
    const text = `FREE FIRE HYPER-SENSITIVITY // BUILD
Modo: ${input.mode.toUpperCase()} | Preferência: ${input.preference.toUpperCase()}
Geral: ${output.geral}
Red Dot: ${output.redDot}
Mira 2X: ${output.acog}
Mira 4X: ${output.x4}
Mira AWM: ${output.awm}
Olhadinha: ${output.camera}
Tamanho do Botão: ${output.fireButton}%
Posição Y do Botão: ${output.fireButtonY}%
DPI: ${input.dpi} | FPS: ${input.fps} | Sampling: ${input.touchSampling}Hz
Tela Esticada: ${input.stretchedScreen ? "Sim (+28% X)" : "Não"}`;
    await navigator.clipboard.writeText(text);
    note("Configuração copiada para a área de transferência");
  };

  const saveBuild = async () => {
    try {
      await saveFn({
        data: {
          token: session.token,
          name: profileName,
          data: {
            ...input,
            trainingFactor: training?.factor ?? 1,
            hsRate: training?.hsRate ?? null,
            scenario: training?.scenario ?? null,
            ...output,
          },
        },
      });
      await loadProfiles();
      note("Build salva com sucesso na nuvem");
    } catch {
      note("Não foi possível salvar a build");
    }
  };

  const applyProfile = (p: Profile) => {
    setInput({
      ...initial,
      mode: (String(p.data["mode"] ?? "br") as Mode) || "br",
      preference: (String(p.data["preference"] ?? "mid") as Preference) || "mid",
      brandId: String(p.data["brandId"] ?? "samsung"),
      dpi: Number(p.data["dpi"] ?? 411),
      resW: Number(p.data["resW"] ?? 1080),
      resH: Number(p.data["resH"] ?? 2400),
      fireButton: Number(p.data["fireButton"] ?? 50),
      fireButtonY: Number(p.data["fireButtonY"] ?? 22),
      pull: (String(p.data["pull"] ?? "linear") as PullStyle) || "linear",
      inputLag: Number(p.data["inputLag"] ?? 2),
      touchDelay: Number(p.data["touchDelay"] ?? 80),
      fps: (Number(p.data["fps"] ?? 60) as EngineInput["fps"]) || 60,
      touchSampling: (Number(p.data["touchSampling"] ?? 240) as TouchSampling) || 240,
      pointerSpeed: Number(p.data["pointerSpeed"] ?? 5),
      stretchedScreen: Boolean(p.data["stretchedScreen"] ?? false),
      stockLvl3: Boolean(p.data["stockLvl3"] ?? true),
      dragFactor: Number(p.data["dragFactor"] ?? 1),
    });
    setGameSensi(Number(p.data["geral"] ?? 170));
    setTraining(null);
    note("Build aplicada ao simulador e à engine");
  };

  const exportSvgCard = () => {
    const safe = profileName.replace(/[<>&]/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#070a0e"/>
          <stop offset="100%" stop-color="#0f1620"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="675" fill="url(#bg)"/>
      <rect x="30" y="30" width="1140" height="615" fill="none" stroke="#253545" stroke-width="1"/>
      <text x="65" y="80" fill="#ffcc00" font-size="20" font-family="monospace" letter-spacing="2">FREE FIRE AIM LAB // ATHLETE BIOMECHANICAL BUILD</text>
      <text x="65" y="132" fill="#ffffff" font-size="36" font-family="sans-serif" font-weight="800">${safe}</text>
      ${[
        ["GERAL", output.geral],
        ["RED DOT", output.redDot],
        ["MIRA 2X", output.acog],
        ["MIRA 4X", output.x4],
        ["MIRA AWM", output.awm],
        ["OLHADINHA", output.camera],
        ["BOTÃO TIRO", output.fireButton + "%"],
        ["ALTURA Y", output.fireButtonY + "%"],
        ["HS RATE", (training?.hsRate ?? "--") + "%"],
      ]
        .map(
          ([k, v], i) => `
        <g transform="translate(${65 + (i % 3) * 370}, ${210 + Math.floor(i / 3) * 125})">
          <rect width="330" height="95" fill="#131c26" stroke="#2a3f55" rx="3"/>
          <text x="20" y="32" fill="#758ea0" font-size="14" font-family="sans-serif">${k}</text>
          <text x="20" y="75" fill="#00f0ff" font-size="44" font-family="sans-serif" font-weight="800">${v}</text>
        </g>`
        )
        .join("")}
      <text x="65" y="610" fill="#758ea0" font-size="16" font-family="sans-serif">
        ${input.dpi} DPI · ${input.fps} FPS · ${input.touchSampling}Hz · ${input.resW}×${input.resH} ${
          input.stretchedScreen ? "· TELA ESTICADA ATIVA" : ""
        }
      </text>
    </svg>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    a.download = "ff-aim-lab-athlete-build.svg";
    a.click();
    URL.revokeObjectURL(a.href);
    note("Card de combate exportado!");
  };

  return (
    <main
      ref={pageRef}
      className={`sx-page aim-page theme-${input.preference}`}
      data-motion={input.preference}
    >
      {/* 1. Hero Section & Cyber Tactical Telemetry */}
      <section className="aim-hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> FREE FIRE BIOMECHANICAL AIM LAB // 04.7
          </p>
          <h1 className="kinetic-title">FREE FIRE <em>AIM LAB.</em></h1>
          <p>
            HYPER-SENSITIVITY ENGINE / TRAINING DIVISION
          </p>

          {/* Floating Weapon Card with Sine Floating Animation */}
          <div className="floating-weapon-card">
            <Flame size={26} />
            <div>
              <strong>UMP / TRAINING LOADOUT</strong>
              <span>
                Ciclo: 98ms · Dano Base: 25 · Crítico Cabeça: 137+ · Coronha Nvl 3 (-48% Dispersão)
              </span>
            </div>
          </div>

          <div className="hero-actions">
            <Button
              className="ui-button"
              onClick={() => document.getElementById("lab")?.scrollIntoView()}
            >
              <Target size={16} /> ENTRAR NA ARENA NATIVA
            </Button>
            <Button
              className="ui-button ui-button-outline"
              onClick={() => document.getElementById("engine")?.scrollIntoView()}
            >
              <SlidersHorizontal size={16} /> MATRIZ DE HARDWARE
            </Button>
          </div>
        </div>

        <div className="hero-telemetry reactive-panel">
          <div className="scope-orbit">
            <Crosshair />
            <strong>{output.geral}</strong>
            <small>GERAL // 200</small>
          </div>
          <div>
            <span>
              EIXO X <b>{output.axisX}</b>
            </span>
            <span>
              EIXO Y <b>{output.axisY}</b>
            </span>
            <span>
              LATÊNCIA TOTAL{" "}
              <b>
                {Math.round(
                  1000 / input.fps + input.touchDelay + (240 / input.touchSampling) * 4.16
                )}
                ms
              </b>
            </span>
            <span>
              HARDWARE SCORE <b>{output.hardwareScore}/100</b>
            </span>
          </div>
        </div>
      </section>

      {/* Navigation Bar */}
      <nav className="command-nav">
        <Button onClick={() => document.getElementById("lab")?.scrollIntoView()}>
          <b>01</b>
          <span>ARENA NATIVA</span>
        </Button>
        <Button onClick={() => document.getElementById("engine")?.scrollIntoView()}>
          <b>02</b>
          <span>HYPER ENGINE</span>
        </Button>
        <Button onClick={() => document.getElementById("analysis")?.scrollIntoView()}>
          <b>03</b>
          <span>CALIBRAÇÃO</span>
        </Button>
        <Button onClick={() => document.getElementById("mlSection")?.scrollIntoView()}>
          <b>04</b>
          <span>RECALIBRAGEM</span>
        </Button>
        <Button onClick={() => document.getElementById("profiles")?.scrollIntoView()}>
          <b>05</b>
          <span>BUILDS</span>
        </Button>
        <div className="nav-tools">
          <Button
            onClick={() => setLang(lang === "pt" ? "en" : "pt")}
            aria-label="Idioma"
            title="Alterar Idioma"
          >
            <Languages />
          </Button>
          <Button
            onClick={() => setSound(!sound)}
            aria-label="Som"
            title={sound ? "Silenciar áudio" : "Ativar áudio balístico"}
          >
            {sound ? <Volume2 /> : <VolumeX />}
          </Button>
        </div>
      </nav>

      {/* 2. Playable Range // Free Fire Authentic Aim Lab */}
      <section id="lab" className="lab-panel spatial-band">
        <SectionTitle
          icon={<Target />}
          kicker="01 / THIRD-PERSON TRAINING RANGE"
          title="SUA MIRA. NO ESPAÇO 3D."
          
        />
        <ClientOnly fallback={<div className="range-loading"><Activity /> PREPARANDO TREINO 3D</div>}>
          <Suspense fallback={<div className="range-loading"><Activity /> CARREGANDO ARENA 3D</div>}>
            <PullSimulator sound={sound} preference={input.preference} onResult={receiveTrial} configuration={{
              dpi: input.dpi, sensitivity: gameSensi ?? output.geral, fps: input.fps, sampling: input.touchSampling,
              pointer: input.pointerSpeed, fire: input.fireButton, fireY: input.fireButtonY,
              resW: input.resW, resH: input.resH, brandTouch: BRANDS.find(b => b.id === input.brandId)?.touch ?? 1,
              stretched: input.stretchedScreen, lag: input.touchDelay + input.inputLag * 2,
              stock: input.stockLvl3, strafe: false,
            }} />
          </Suspense>
        </ClientOnly>
      </section>

      {/* 3. The Sensitivity Ecosystem & Hardware Matrix */}
      <section id="engine" className="panel spatial-band">
        <SectionTitle
          icon={<MonitorCog />}
          kicker="HARDWARE MATRIX & BALÍSTICA"
          title="HYPER-SENSITIVITY ENGINE"
          text="Ajuste fino de hardware, tela esticada, taxa de amostragem de toque e biomecânica de arrasto."
        />

        {/* Dynamic Sensitivity Presets */}
        <div className="preference-switch">
          <Button
            className={input.preference === "low" ? "active" : ""}
            onClick={() => set("preference", "low")}
          >
            <i />
            BAIXA <small>CIRÚRGICA / SNIPER</small>
          </Button>
          <Button
            className={input.preference === "mid" ? "active" : ""}
            onClick={() => set("preference", "mid")}
          >
            <i />
            MÉDIA <small>VERSÁTIL / BOOYAH</small>
          </Button>
          <Button
            className={input.preference === "high" ? "active" : ""}
            onClick={() => set("preference", "high")}
          >
            <i />
            ALTA <small>BRUTAL / RUSH</small>
          </Button>
        </div>

        {/* Stretched Screen Feature Toggle Bar */}
        <div className="stretched-toggle-bar">
          <div>
            <p className="flex items-center gap-2">
              <Tv size={16} /> RESOLUÇÃO ESTICADA (TELA ESTICADA 4:3 / 16:10)
            </p>
            <small>
              Multiplica a velocidade vetorial no eixo X (+28%), tornando o capa vertical
              matematicamente mais pesado e aumentando a compensação na Red Dot e Geral.
            </small>
          </div>
          <Button
            type="button"
            className={`toggle-chip ${input.stretchedScreen ? "chip-active" : ""}`}
            onClick={() => set("stretchedScreen", !input.stretchedScreen)}
          >
            <span className="stretched-badge">
              {input.stretchedScreen ? "ATIVADO (+28% X)" : "DESATIVADO (1:1)"}
            </span>
          </Button>
        </div>

        {/* Hardware Control Matrix Form */}
        <div className="sx-form-grid">
          <Field label="MODO COMPETITIVO">
            <select value={input.mode} onChange={(e) => set("mode", e.target.value as Mode)}>
              <option value="br">BR Rankeado (Equilíbrio Mira & Escopo)</option>
              <option value="cs">Contra Squad / Apostado 4v4 (Giro Rápido)</option>
              <option value="x1">X1 dos Crias / 1v1 (Rotação Máxima)</option>
            </select>
          </Field>

          <Field label="FABRICANTE / MODELO">
            <select value={input.brandId} onChange={(e) => set("brandId", e.target.value)}>
              {BRANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="MECÂNICA DE PUXADA">
            <select value={input.pull} onChange={(e) => set("pull", e.target.value as PullStyle)}>
              <option value="linear">Linear (Arrasto Reto)</option>
              <option value="short">Curta (Toque Rápido / Meio da Tela)</option>
              <option value="explosive">Explosiva (Flick Brusco)</option>
              <option value="j_pull">Puxada em J (Gancho Lateral)</option>
              <option value="half_moon">Meia-Lua (Varredura Lateral)</option>
            </select>
          </Field>

          <Field label="RESOLUÇÃO DO DISPOSITIVO">
            <select
              value={`${input.resW}x${input.resH}`}
              onChange={(e) => {
                const [w, h] = e.target.value.split("x").map(Number);
                setInput((x) => ({ ...x, resW: w || 1080, resH: h || 2400 }));
              }}
            >
              {RESOLUTIONS.map((r) => (
                <option key={r.id} value={`${r.w}x${r.h}`}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="DPI ATUAL (LARGURA MÍNIMA 320 - 1400)">
            <input
              className="sx-input"
              type="number"
              min="320"
              max="1400"
              value={input.dpi}
              onChange={(e) =>
                set("dpi", Math.max(320, Math.min(1400, +e.target.value || 320)))
              }
            />
          </Field>

          <Range label="SENSIBILIDADE DO JOGO / GERAL" value={gameSensi ?? output.geral} min={0} max={200} unit="/200" onChange={v => { setGameSensi(v); setTraining(null); }} />
          <Field label="LARGURA PERSONALIZADA"><input className="sx-input" type="number" min={320} max={7680} value={input.resW} onChange={e => set('resW', Math.max(320, Math.min(7680, +e.target.value || 320)))} /></Field>
          <Field label="ALTURA PERSONALIZADA"><input className="sx-input" type="number" min={320} max={7680} value={input.resH} onChange={e => set('resH', Math.max(320, Math.min(7680, +e.target.value || 320)))} /></Field>
          <Field label="TAXA DE TOQUE (TOUCH SAMPLING)">
            <select
              value={input.touchSampling}
              onChange={(e) =>
                set("touchSampling", Number(e.target.value) as TouchSampling)
              }
            >
              {TOUCH_SAMPLING_OPTIONS.map((hz) => (
                <option key={hz} value={hz}>
                  {hz}Hz {hz >= 360 ? "(Ultra-Responsivo)" : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="FPS (TAXA DE QUADROS)">
            <select
              value={input.fps}
              onChange={(e) => set("fps", Number(e.target.value) as EngineInput["fps"])}
            >
              {FPS_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f} FPS {f >= 120 ? "(Suave Competitivo)" : ""}
                </option>
              ))}
            </select>
          </Field>

          <Range
            label="TAMANHO DO BOTÃO DE ATIRAR (10% - 65%)"
            value={input.fireButton}
            min={10}
            max={65}
            unit="%"
            onChange={(v) => {
              set("fireButton", v);
              setTraining(null);
            }}
          />

          <Range
            label="ALTURA Y DO BOTÃO NO HUD"
            value={input.fireButtonY}
            min={10}
            max={65}
            unit="%"
            onChange={(v) => {
              set("fireButtonY", v);
              setTraining(null);
            }}
          />

          <Range
            label="VELOCIDADE DO PONTEIRO"
            value={input.pointerSpeed}
            min={1}
            max={10}
            unit="/10"
            onChange={(v) => set("pointerSpeed", v)}
          />

          <Range
            label="INPUT LAG PERCEBIDO"
            value={input.inputLag}
            min={0}
            max={10}
            unit="/10"
            onChange={(v) => set("inputLag", v)}
          />

          <Range
            label="ATRASO ADICIONAL DE TOQUE"
            value={input.touchDelay}
            min={0}
            max={200}
            step={5}
            unit="ms"
            onChange={(v) => set("touchDelay", v)}
          />
        </div>
      </section>

      {/* 4. Real-Time Sensitivity Output & Biomechanical Feedback */}
      <section id="analysis" className="result-panel spatial-band">
        <div className="result-head">
          <div>
            <p>OUTPUT // BALÍSTICA SINCRONIZADA</p>
            <h2>CONFIGURAÇÃO FINAL DE COMBATE</h2>
          </div>
          <div className="result-actions">
            <Button className="ui-button ui-button-outline" onClick={copyConfig}>
              <Copy size={15} /> COPIAR TUDO
            </Button>
            <Button className="ui-button" onClick={saveBuild}>
              <Save size={15} /> SALVAR BUILD
            </Button>
          </div>
        </div>

        {/* 6 Real In-Game FF Sensitivity Sliders */}
        <div className="sensi-output">
          {[
            ["GERAL", output.geral],
            ["RED DOT", output.redDot],
            ["MIRA 2X", output.acog],
            ["MIRA 4X", output.x4],
            ["MIRA AWM", output.awm],
            ["OLHADINHA", output.camera],
          ].map(([key, value]) => (
            <div className="sensi-stat" key={key}>
              <span>{key}</span>
              <strong>{value}</strong>
              <div>
                <i style={{ width: `${(Number(value) / 200) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Tactical Recommendation Badges */}
        <div className="analysis-grid">
          <article>
            <Smartphone size={28} />
            <div>
              <small>DPI RECOMENDADA</small>
              <strong>{dpiRec.text}</strong>
              <span>Sampling alvo: {dpiRec.hz}</span>
            </div>
          </article>
          <article>
            <MonitorCog size={28} />
            <div>
              <small>RESOLUÇÃO RECOMENDADA</small>
              <strong>{resolutionRec}</strong>
              <span>
                Baseada em {input.fps} FPS e classe do chipset {cpu.toUpperCase()}
              </span>
            </div>
          </article>
          <article>
            <Gauge size={28} />
            <div>
              <small>BOTÃO & HUD RECOMENDADO</small>
              <strong>
                {output.fireButton}% · Y {output.fireButtonY}%
              </strong>
              <span>
                {training
                  ? `Calibrado pela arena (${training.scenario})`
                  : "Estimativa inicial de hardware"}
              </span>
            </div>
          </article>
        </div>

        {/* Hardware Chipset Selector & Factors Matrix */}
        <div className="processor-row">
          <label>
            CLASSE DO PROCESSADOR
            <select value={cpu} onChange={(e) => setCpu(e.target.value)}>
              {CPU_TIERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          {output.factors.map((f) => (
            <span key={f.label}>
              {f.label}
              <b>{f.value}</b>
            </span>
          ))}
        </div>
      </section>

      {/* 5. Evolutionary Feedback & Local ML Recalibration */}
      <section id="mlSection" className="panel spatial-band">
        <SectionTitle
          icon={<Zap />}
          kicker="ADAPTIVE RULES // RECALIBRAÇÃO"
          title="FEEDBACK PÓS-TREINO & AUTO-AJUSTE"
          text="Cruze os sintomas reais da sua puxada para reescrever dinamicamente o tamanho do botão, DPI e sensibilidade."
        />

        <div className="sx-form-grid" style={{ marginBottom: "1.25rem" }}>
          <Field label="1. SENSIBILIDADE GERAL">
            <select
              value={feedbackGeral}
              onChange={(e) => setFeedbackGeral(e.target.value as typeof feedbackGeral)}
            >
              <option value="perfect">Perfeita / Equilibrada</option>
              <option value="fast">Alta demais (Passando da cabeça)</option>
              <option value="slow">Baixa demais (Pesada)</option>
            </select>
          </Field>

          <Field label="2. COMPORTAMENTO DO CAPA">
            <select
              value={feedbackCapa}
              onChange={(e) => setFeedbackCapa(e.target.value as typeof feedbackCapa)}
            >
              <option value="chest">Travou no peito (Não rompe G=10)</option>
              <option value="over">Passou da cabeça (Overshoot)</option>
              <option value="jitter">Tremendo muito (Pixel Skipping)</option>
              <option value="head">Só capa cravado (Perfeito)</option>
            </select>
          </Field>

          <Field label="3. ERGONOMIA DO BOTÃO">
            <select
              value={feedbackButton}
              onChange={(e) => setFeedbackButton(e.target.value as typeof feedbackButton)}
            >
              <option value="hit">Acertei perfeitamente o botão</option>
              <option value="miss">Errei o botão / Deslize acidental</option>
            </select>
          </Field>

          <Field label="4. MIRAS ESPECÍFICAS">
            <select
              value={feedbackScope}
              onChange={(e) => setFeedbackScope(e.target.value as typeof feedbackScope)}
            >
              <option value="ok">Todas calibradas</option>
              <option value="reddot">Red Dot precisa de ajuste</option>
              <option value="scope2x">Mira 2X precisa de ajuste</option>
            </select>
          </Field>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem" }}>
          <Button className="ui-button" type="button" onClick={handleRecalibrateML}>
            <Zap size={15} /> EXECUTAR RECALIBRAGEM
          </Button>
          {mlDiagnostic && (
            <div style={{ fontSize: "0.85rem", color: "var(--theme-primary, #ffcc00)", maxWidth: "48rem", fontFamily: "var(--font-mono, monospace)" }}>
              {mlDiagnostic}
            </div>
          )}
        </div>
      </section>

      {/* 6. Cloud Loadouts / Saved Athlete Builds */}
      <section id="profiles" className="panel spatial-band">
        <SectionTitle
          icon={<BarChart3 />}
          kicker="CLOUD PROFILES // LIVE STORAGE"
          title="BUILDS DE ATLETA COMPETITIVO"
          text="Salve suas calibrações, exporte cards SVG em alta definição e alterne instantaneamente."
        />
        <div className="profile-create">
          <input
            className="sx-input"
            maxLength={60}
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            aria-label="Nome da build"
            placeholder="Nome da build de atleta..."
          />
          <Button className="ui-button" onClick={saveBuild}>
            <Save size={15} /> SALVAR
          </Button>
          <Button className="ui-button ui-button-outline" onClick={exportSvgCard}>
            <Download size={15} /> EXPORTAR CARD
          </Button>
        </div>

        <div className="profile-grid">
          {profiles.length === 0 ? (
            <p className="empty-state">
              Nenhuma build salva. Treine na arena e salve sua primeira configuração.
            </p>
          ) : (
            profiles.map((p) => (
              <article className="profile-card" key={p.id}>
                <small>{new Date(p.created_at).toLocaleDateString("pt-BR")}</small>
                <h3>{p.name}</h3>
                <div className="profile-numbers">
                  <span>
                    GERAL <b>{p.data["geral"] ?? "—"}</b>
                  </span>
                  <span>
                    RED DOT <b>{p.data["redDot"] ?? "—"}</b>
                  </span>
                  <span>
                    BOTÃO <b>{p.data["fireButton"] ?? "—"}%</b>
                  </span>
                </div>
                <div className="profile-actions">
                  <Button onClick={() => applyProfile(p)}>APLICAR BUILD</Button>
                  <Button
                    aria-label="Excluir build"
                    onClick={async () => {
                      await deleteFn({ data: { token: session.token, id: p.id } });
                      await loadProfiles();
                    }}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* 6. Biomechanical Coaching Protocol */}
      <section className="training-protocol reveal">
        <div>
          <p>ADAPTIVE COACHING</p>
          <h2>PROTOCOLO BIOMECÂNICO DE COMBATE</h2>
        </div>
        <article>
          <Zap />
          <b>CORREÇÃO DE OVERFLICK</b>
          <span>
            {training && training.factor < 0.9
              ? "Overflick severo na arena: reduza a Geral em 8% e aumente o botão para 62% para ganhar atrito de partida."
              : "Execute 3 séries de 10 puxadas controladas até a linha dos olhos."}
          </span>
        </article>
        <article>
          <Crosshair />
          <b>CONTROLE DE DISPERSÃO (BLOOM)</b>
          <span>
            Mantenha a coronha nível 3 equipada para mitigar o jitter de recuo em 48% e possibilitar o
            capa tardio.
          </span>
        </article>
        <article>
          <ShieldCheck />
          <b>ESTABILIDADE DE FRAMES</b>
          <span>
            Priorize framerate constante. Oscilações de FPS alteram a resposta do magnetismo do
            peito mais do que a resolução física.
          </span>
        </article>
      </section>

      {/* Footer */}
      <footer>
        <div className="brand-mini">
          <Crosshair /> AIM LAB // HX · GARENA FREE FIRE BIOMECHANICAL SUITE
        </div>
        <p>CALIBRAÇÃO COMPETITIVA DE ALTA PERFORMANCE</p>
        <ShieldCheck />
      </footer>

      <Dialog open={feedbackOpen} onOpenChange={open => { if (!savingCalibration) setFeedbackOpen(open); }}>
        <DialogContent className={`aim-page theme-${input.preference} calibration-terminal`}>
          <small>POST-TRIAL / ADAPTIVE CALIBRATION</small>
          <DialogTitle>COMO FOI A PUXADA?</DialogTitle>
          <DialogDescription>Selecione o que sentiu no treino.</DialogDescription>
          <div className="feedback-choices">
            {([['jitter', 'A mira tremeu'], ['chest', 'Travou no peito'], ['over', 'Passou da cabeça'], ['perfect', 'Puxada perfeita']] as const).map(([value, label]) => (
              <label key={value}><input type="checkbox" checked={issues.includes(value)} onChange={() => setIssues(current => current.includes(value) ? current.filter(v => v !== value) : value === 'perfect' ? ['perfect'] : [...current.filter(v => v !== 'perfect'), value])} />{label}</label>
            ))}
          </div>
          {training && <p className="calibration-summary">{training.headshots} capas · {training.bodyshots} peito · {training.stability}% estabilidade</p>}
          {calibrationError && <p role="alert" className="text-destructive">{calibrationError}</p>}
          <Button variant="hud" disabled={issues.length === 0 || savingCalibration} onClick={() => void applyCalibration()}><Zap />{savingCalibration ? 'SALVANDO CALIBRAÇÃO…' : 'RECALIBRAR E CONTINUAR'}</Button>
        </DialogContent>
      </Dialog>
      {toast && (
        <div className="toast">
          <Check size={16} />
          <span>{toast}</span>
        </div>
      )}
    </main>
  );
}

function SectionTitle({
  icon,
  kicker,
  title,
  text,
}: {
  icon: React.ReactNode;
  kicker: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="section-title">
      <span className="section-icon">{icon}</span>
      <div>
        <p className="section-tag">{kicker}</p>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label>
      {label}
      <b>
        {value}
        {unit}
      </b>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
    </label>
  );
}
