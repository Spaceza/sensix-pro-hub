const KEY = "sensix.session";
export type Session = { token: string; role: "user" | "admin"; expiresAt: string | null; duration: string };
export function loadSession(): Session | null {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
export function storeSession(s: Session | null) {
  if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY);
}
export function timeLeft(expiresAt: string | null) {
  if (!expiresAt) return "PERMANENTE";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "EXPIRADO";
  const d = Math.floor(ms / 86_400_000), h = Math.floor((ms % 86_400_000) / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
}
export const DURATION_LABEL: Record<string, string> = { "24h": "24 horas", "7d": "7 dias", "1m": "1 mês", "3m": "3 meses", "6m": "6 meses", "9m": "9 meses", "1y": "1 ano", perm: "Permanente", admin: "Admin" };
