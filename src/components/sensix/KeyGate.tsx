import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crosshair, KeyRound, Loader2 } from "lucide-react";
import { loginWithKey } from "@/lib/keys.functions";
import type { Session } from "@/lib/session";

export function KeyGate({ onLogin }: { onLogin: (s: Session) => void }) {
  const login = useServerFn(loginWithKey);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const r = await login({ data: { code } });
      if (!r.ok) setErr(r.error);
      else onLogin({ token: r.token, role: r.role, expiresAt: r.expiresAt, duration: r.duration });
    } catch { setErr("Não foi possível validar agora. Tente novamente."); }
    finally { setBusy(false); }
  };

  return (
    <main className="app-shell grid min-h-screen place-items-center px-4">
      <div className="hud-grid" aria-hidden="true" />
      <section className="panel relative z-10 w-full max-w-md animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <span className="brand-mark"><Crosshair /></span>
          <div>
            <h1 className="font-display text-2xl font-black">SENSI<span className="text-primary">X</span> PRO</h1>
            <p className="text-xs text-muted-foreground">PLATAFORMA DE MIRA FREE FIRE</p>
          </div>
        </div>
        <h2 className="font-display text-sm text-primary">ACESSO RESTRITO</h2>
        <p className="mt-2 text-sm text-muted-foreground">Insira sua Key de acesso. O tempo começa a contar na primeira ativação.</p>
        <form onSubmit={submit} className="mt-5 grid gap-3">
          <label className="grid gap-2">Key
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SX-XXXX-XXXX-XXXX-XXXX" autoComplete="off" className="sx-input font-display tracking-widest" maxLength={200} />
          </label>
          {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
          <button className="ui-button ui-button-primary w-full" disabled={busy || code.trim().length < 4}>
            {busy ? <Loader2 className="spin" size={17} /> : <KeyRound size={17} />} DESBLOQUEAR
          </button>
        </form>
        <p className="mt-5 text-xs text-dim">Planos: 24h · 7 dias · 1, 3, 6 e 9 meses · 1 ano · Permanente</p>
      </section>
    </main>
  );
}
