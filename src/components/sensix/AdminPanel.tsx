import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, KeyRound, RefreshCw, ShieldBan } from "lucide-react";
import { adminGenerateKeys, adminListKeys, adminRevokeKey } from "@/lib/keys.functions";
import { DURATION_LABEL } from "@/lib/session";

interface KeyRow { id: string; code: string; duration: string; note: string | null; created_at: string; activated_at: string | null; expires_at: string | null; revoked: boolean }

export function AdminPanel({ token }: { token: string }) {
  const listFn = useServerFn(adminListKeys), generateFn = useServerFn(adminGenerateKeys), revokeFn = useServerFn(adminRevokeKey);
  const [rows, setRows] = useState<KeyRow[]>([]), [duration, setDuration] = useState("7d"), [count, setCount] = useState(1), [note, setNote] = useState(""), [busy, setBusy] = useState(false), [copied, setCopied] = useState("");
  const load = async () => { try { setRows(await listFn({ data: { token } }) as KeyRow[]); } catch { setRows([]); } };
  useEffect(() => { void load(); }, []);
  const generate = async () => { setBusy(true); try { const made = await generateFn({ data: { token, duration: duration as "24h"|"7d"|"1m"|"3m"|"6m"|"9m"|"1y"|"perm", count, note: note || undefined } }); await navigator.clipboard.writeText(made.map((k) => k.code).join("\n")); setCopied(`${made.length} key(s) copiadas`); await load(); } finally { setBusy(false); } };
  const revoke = async (row: KeyRow) => { await revokeFn({ data: { token, id: row.id, revoked: !row.revoked } }); await load(); };
  const status = (r: KeyRow) => r.revoked ? "REVOGADA" : r.expires_at && new Date(r.expires_at) < new Date() ? "EXPIRADA" : r.activated_at ? "ATIVA" : "NÃO USADA";
  return <main className="sx-page">
    <section className="sx-hero compact"><div><p className="eyebrow"><span /> ADMIN COMMAND</p><h1>CENTRAL DE <em>KEYS</em></h1><p>Gere, acompanhe e revogue acessos. A Key admin nunca é exibida nem salva no código.</p></div><ShieldBan size={88} /></section>
    <section className="panel"><div className="section-title"><span className="section-icon"><KeyRound /></span><div><p className="section-tag">ADMIN // ISSUER</p><h2>GERAR NOVAS KEYS</h2></div></div>
      <div className="sx-form-grid admin-create"><label>Duração<select value={duration} onChange={e=>setDuration(e.target.value)}>{Object.entries(DURATION_LABEL).filter(([k])=>k!=="admin").map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>Quantidade<input className="sx-input" type="number" min="1" max="100" value={count} onChange={e=>setCount(Math.max(1,Math.min(100,Number(e.target.value))))}/></label><label>Nota<input className="sx-input" value={note} maxLength={80} onChange={e=>setNote(e.target.value)} placeholder="Lote / cliente"/></label><button className="ui-button" onClick={generate} disabled={busy}>{busy?<RefreshCw className="spin"/>:<KeyRound/>} GERAR E COPIAR</button></div>{copied&&<p className="sx-success"><Check size={15}/>{copied}</p>}
    </section>
    <section className="panel"><div className="flex items-center justify-between gap-3"><div className="section-title mb-0"><span className="section-icon"><KeyRound/></span><div><p className="section-tag">DATABASE // LIVE</p><h2>{rows.length} KEYS</h2></div></div><button className="icon-action" onClick={load} aria-label="Atualizar"><RefreshCw/></button></div>
      <div className="sx-table-wrap"><table className="sx-table"><thead><tr><th>Key</th><th>Plano</th><th>Status</th><th>Expira</th><th>Ação</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><button className="key-code" onClick={()=>{void navigator.clipboard.writeText(r.code);setCopied("Key copiada")}}><Copy size={13}/>{r.code}</button><small>{r.note}</small></td><td>{DURATION_LABEL[r.duration]??r.duration}</td><td><span className={`status-pill s-${status(r).replace(" ","-").toLowerCase()}`}>{status(r)}</span></td><td>{r.expires_at?new Date(r.expires_at).toLocaleDateString("pt-BR"):"—"}</td><td><button className="table-action" onClick={()=>revoke(r)}>{r.revoked?"REATIVAR":"REVOGAR"}</button></td></tr>)}</tbody></table></div>
    </section>
  </main>;
}
