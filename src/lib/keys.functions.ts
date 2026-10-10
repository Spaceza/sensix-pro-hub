import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LONG = 1000 * 60 * 60 * 24 * 365 * 50;

async function requireUser(token: string) {
  const { verifyToken, admin } = await import("./keys.server");
  const p = verifyToken(token);
  if (!p || p.role !== "user") throw new Error("Sessão inválida");
  const db = await admin();
  const { data: row } = await db.from("access_keys").select("*").eq("id", p.sub).maybeSingle();
  if (!row || row.revoked || (row.expires_at && new Date(row.expires_at).getTime() < Date.now())) throw new Error("Acesso expirado");
  return { row, db };
}

async function requireAdmin(token: string) {
  const { verifyToken, admin } = await import("./keys.server");
  const p = verifyToken(token);
  if (!p || p.role !== "admin") throw new Error("Não autorizado");
  return admin();
}

const tokenSchema = z.object({ token: z.string().min(10).max(2000) });
const scalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const profileDataSchema = z.record(z.string(), scalarSchema);

/** Login with a key. The admin key (stored as secret ADMIN_KEY) returns an admin session. */
export const loginWithKey = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().trim().min(4).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { activateCode, signToken, safeEqual } = await import("./keys.server");
    const adminKey = process.env["ADMIN_KEY"];
    if (adminKey && safeEqual(data.code, adminKey)) {
      return { ok: true as const, role: "admin" as const, token: signToken({ sub: "admin", role: "admin", exp: Date.now() + 12 * 3600_000 }), expiresAt: null, duration: "admin" };
    }
    const res = await activateCode(data.code.toUpperCase());
    if ("error" in res) return { ok: false as const, error: res.error };
    const row = res.row;
    const exp = row.expires_at ? new Date(row.expires_at).getTime() : Date.now() + LONG;
    return { ok: true as const, role: "user" as const, token: signToken({ sub: row.id, role: "user", exp }), expiresAt: row.expires_at, duration: row.duration };
  });

export const checkSession = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const { verifyToken, admin } = await import("./keys.server");
    const p = verifyToken(data.token);
    if (!p) return { ok: false as const };
    if (p.role === "admin") return { ok: true as const, role: "admin" as const, expiresAt: null, duration: "admin" };
    const db = await admin();
    const { data: row } = await db.from("access_keys").select("revoked, expires_at, duration").eq("id", p.sub).maybeSingle();
    if (!row || row.revoked || (row.expires_at && new Date(row.expires_at).getTime() < Date.now())) return { ok: false as const };
    return { ok: true as const, role: "user" as const, expiresAt: row.expires_at, duration: row.duration };
  });

// ---------- Profiles ----------
export const listProfiles = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const { row, db } = await requireUser(data.token);
    const { data: rows } = await db.from("saved_profiles").select("id, name, data, created_at").eq("key_id", row.id).order("created_at", { ascending: false }).limit(50);
    return (rows ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      data: profileDataSchema.parse(item.data),
      created_at: item.created_at,
    }));
  });

export const saveProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenSchema.extend({ name: z.string().trim().min(1).max(60), data: profileDataSchema }).parse(d))
  .handler(async ({ data }) => {
    const { row, db } = await requireUser(data.token);
    const { count } = await db.from("saved_profiles").select("id", { count: "exact", head: true }).eq("key_id", row.id);
    if ((count ?? 0) >= 50) throw new Error("Limite de 50 perfis");
    const payload = JSON.stringify(data.data);
    if (payload.length > 10000) throw new Error("Perfil muito grande");
    const { error } = await db.from("saved_profiles").insert({ key_id: row.id, name: data.name, data: data.data });
    if (error) throw new Error("Não foi possível salvar a calibração");
    return { ok: true };
  });

export const deleteProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenSchema.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { row, db } = await requireUser(data.token);
    await db.from("saved_profiles").delete().eq("id", data.id).eq("key_id", row.id);
    return { ok: true };
  });

// ---------- Admin ----------
const durationEnum = z.enum(["24h", "7d", "1m", "3m", "6m", "9m", "1y", "perm"]);

export const adminGenerateKeys = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenSchema.extend({ duration: durationEnum, count: z.number().int().min(1).max(100), note: z.string().max(80).optional() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { createKeys } = await import("./keys.server");
    return createKeys(data.duration, data.count, data.note);
  });

export const adminListKeys = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const db = await requireAdmin(data.token);
    const { data: rows } = await db.from("access_keys").select("id, code, duration, note, created_at, activated_at, expires_at, revoked").order("created_at", { ascending: false }).limit(500);
    return rows ?? [];
  });

export const adminRevokeKey = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenSchema.extend({ id: z.string().uuid(), revoked: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const db = await requireAdmin(data.token);
    await db.from("access_keys").update({ revoked: data.revoked }).eq("id", data.id);
    return { ok: true };
  });
