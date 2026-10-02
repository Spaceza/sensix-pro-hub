import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const DURATIONS = ["24h", "7d", "1m", "3m", "6m", "9m", "1y", "perm"] as const;
export type Duration = (typeof DURATIONS)[number];

const MS_DAY = 86_400_000;
export function durationMs(d: Duration): number | null {
  switch (d) {
    case "24h": return MS_DAY;
    case "7d": return 7 * MS_DAY;
    case "1m": return 30 * MS_DAY;
    case "3m": return 90 * MS_DAY;
    case "6m": return 180 * MS_DAY;
    case "9m": return 270 * MS_DAY;
    case "1y": return 365 * MS_DAY;
    case "perm": return null;
  }
}

export function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) out += alphabet[bytes[i]! % alphabet.length];
  return `SX-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}`;
}

function secret() {
  const s = process.env["SESSION_SECRET"];
  if (!s) throw new Error("Server misconfigured");
  return s;
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Signed token: base64url(payload).hmac */
export function signToken(payload: { sub: string; role: "user" | "admin"; exp: number }) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string | undefined | null): { sub: string; role: "user" | "admin"; exp: number } | null {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  if (!safeEqual(sig, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof p.exp !== "number" || p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Activates (first use) or validates a key. Returns key row or error. */
export async function activateCode(code: string) {
  const db = await admin();
  const { data: row } = await db.from("access_keys").select("*").eq("code", code).maybeSingle();
  if (!row) return { error: "Key inválida." as const };
  if (row.revoked) return { error: "Key revogada." as const };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return { error: "Key expirada." as const };
  if (!row.activated_at) {
    const ms = durationMs(row.duration as Duration);
    const now = new Date();
    const expires_at = ms ? new Date(now.getTime() + ms).toISOString() : null;
    const { data: upd } = await db.from("access_keys").update({ activated_at: now.toISOString(), expires_at }).eq("id", row.id).select("*").single();
    return { row: upd ?? row };
  }
  return { row };
}

export async function createKeys(duration: Duration, count: number, note?: string) {
  const db = await admin();
  const rows = Array.from({ length: count }, () => ({ code: generateCode(), duration, note: note ?? null }));
  const { data, error } = await db.from("access_keys").insert(rows).select("code, duration, created_at");
  if (error) throw new Error("Falha ao gerar keys");
  return data;
}
