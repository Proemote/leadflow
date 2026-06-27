"use client";

import { useState, useMemo } from "react";
import { Opportunity, PipelineStage, PIPELINE_STAGES, TERMINAL_STAGES } from "@/lib/types";
import { formatPrice, parsePriceToCents } from "@/lib/money";
import { IconPlus, IconTrash } from "@/components/icons";

const STAGE_COLOR: Record<string, string> = {
  Ganado: "#34d399",
  Perdido: "#fb7185",
};
function stageAccent(stage: string): string {
  return STAGE_COLOR[stage] ?? "#a855f7";
}

interface ContactOpt { id: string; name: string }

export function KanbanBoard({
  initialOpportunities,
  contacts,
  demo,
}: {
  initialOpportunities: Opportunity[];
  contacts: ContactOpt[];
  demo: boolean;
}) {
  const [opps, setOpps] = useState<Opportunity[]>(initialOpportunities);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [editing, setEditing] = useState<Opportunity | "new" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const open = opps.filter((o) => !TERMINAL_STAGES.includes(o.stage));
    const ganadas = opps.filter((o) => o.stage === "Ganado").length;
    const perdidas = opps.filter((o) => o.stage === "Perdido").length;
    const cerradas = ganadas + perdidas;
    return {
      total: open.reduce((s, o) => s + o.value_cents, 0),
      ponderado: Math.round(open.reduce((s, o) => s + (o.value_cents * o.probability) / 100, 0)),
      abiertas: open.length,
      conversion: cerradas > 0 ? ganadas / cerradas : null,
    };
  }, [opps]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function move(id: string, stage: PipelineStage) {
    const opp = opps.find((o) => o.id === id);
    if (!opp || opp.stage === stage) return;
    const prob = stage === "Ganado" ? 100 : stage === "Perdido" ? 0 : opp.probability;
    setOpps((arr) => arr.map((o) => (o.id === id ? { ...o, stage, probability: prob } : o)));
    if (demo) {
      if (stage === "Ganado" && opp.contact_id) flash(`✓ Operación generada para ${opp.contact_name ?? "el cliente"} (demo)`);
      return;
    }
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, probability: prob }),
      });
      const j = await res.json();
      if (j.operationCreated) flash(`✓ Oportunidad ganada: operación de ${formatPrice(opp.value_cents)} añadida al cliente`);
    } catch { /* la UI ya está optimista */ }
  }

  function upsertLocal(o: Opportunity) {
    setOpps((arr) => (arr.some((x) => x.id === o.id) ? arr.map((x) => (x.id === o.id ? o : x)) : [o, ...arr]));
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar esta oportunidad?")) return;
    setOpps((arr) => arr.filter((o) => o.id !== id));
    if (!demo) await fetch(`/api/opportunities/${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-5">
      {/* Métricas pipeline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Valor del pipeline" value={metrics.abiertas ? formatPrice(metrics.total) : "—"} sub={metrics.abiertas ? "abiertas" : "sin oportunidades"} />
        <Kpi label="Valor ponderado" value={metrics.abiertas ? formatPrice(metrics.ponderado) : "—"} sub={metrics.abiertas ? "por probabilidad" : undefined} />
        <Kpi label="Oportunidades abiertas" value={String(metrics.abiertas)} />
        <Kpi label="Tasa de conversión" value={metrics.conversion == null ? "—" : `${Math.round(metrics.conversion * 100)}%`} sub={metrics.conversion == null ? "sin cierres aún" : "ganadas / cerradas"} />
      </div>

      <div className="flex justify-end">
        <button className="btn-primary flex items-center gap-2" onClick={() => setEditing("new")}>
          <IconPlus width={16} height={16} /> Nueva oportunidad
        </button>
      </div>

      {demo && (
        <div className="panel-tight px-4 py-2.5 text-xs text-amber-200/90">
          Modo demostración: pipeline de ejemplo; los cambios no se guardan.
        </div>
      )}

      {/* Tablero */}
      <div className="flex gap-3 overflow-x-auto pb-3">
        {PIPELINE_STAGES.map((stage) => {
          const items = opps.filter((o) => o.stage === stage);
          const sum = items.reduce((s, o) => s + o.value_cents, 0);
          return (
            <div
              key={stage}
              onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
              onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
              onDrop={() => { if (dragId) move(dragId, stage); setDragId(null); setOverStage(null); }}
              className="shrink-0 w-[260px] rounded-2xl p-2.5 transition"
              style={{
                background: overStage === stage ? "rgba(124,58,237,0.12)" : "rgba(17,11,26,0.5)",
                border: `1px solid ${overStage === stage ? "rgba(168,85,247,0.4)" : "var(--color-edge-soft)"}`,
              }}
            >
              <div className="flex items-center justify-between px-1.5 py-1 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: stageAccent(stage) }} />
                  <span className="text-sm font-semibold text-violet-50">{stage}</span>
                  <span className="text-[11px] text-violet-300/50">{items.length}</span>
                </div>
                <span className="text-[11px] text-violet-300/70">{sum > 0 ? formatPrice(sum) : ""}</span>
              </div>
              <div className="space-y-2 min-h-[60px]">
                {items.map((o) => (
                  <article
                    key={o.id}
                    draggable
                    onDragStart={() => setDragId(o.id)}
                    onDragEnd={() => setDragId(null)}
                    className="panel-tight p-3 cursor-grab active:cursor-grabbing hover:border-violet-500/40 transition"
                    style={{ borderLeft: `3px solid ${stageAccent(stage)}` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => setEditing(o)} className="text-sm font-medium text-violet-50 text-left hover:text-white leading-snug">{o.title}</button>
                      <button onClick={() => remove(o.id)} className="text-violet-300/40 hover:text-rose-400 shrink-0"><IconTrash width={14} height={14} /></button>
                    </div>
                    {o.contact_name && <div className="text-[11px] text-violet-300/60 mt-0.5 truncate">{o.contact_name}</div>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-semibold text-violet-100">{formatPrice(o.value_cents)}</span>
                      <span className="text-[11px] text-violet-300/60">{o.probability}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-violet-500/10 mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${o.probability}%`, background: "linear-gradient(90deg,#c084fc,#7c3aed)" }} />
                    </div>
                    {(o.expected_close || o.last_activity) && (
                      <div className="text-[10px] text-violet-300/45 mt-2 truncate">
                        {o.expected_close ? `Cierre: ${new Date(`${o.expected_close}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}` : ""}
                        {o.expected_close && o.last_activity ? " · " : ""}
                        {o.last_activity ?? ""}
                      </div>
                    )}
                    {/* Mover por teclado/móvil */}
                    <select
                      value={stage}
                      onChange={(e) => move(o.id, e.target.value as PipelineStage)}
                      className="mt-2 w-full text-[11px] bg-[rgba(11,7,16,0.6)] border border-[var(--color-edge-soft)] rounded-md px-1.5 py-1 text-violet-300/80"
                      aria-label="Cambiar etapa"
                    >
                      {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </article>
                ))}
                {items.length === 0 && (
                  <div className="text-[11px] text-violet-300/30 text-center py-4">Suelta aquí</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <OpportunityForm
          opportunity={editing === "new" ? null : editing}
          contacts={contacts}
          demo={demo}
          onSaved={(o) => { upsertLocal(o); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 panel px-4 py-3 text-sm text-emerald-200 border border-emerald-500/30">{toast}</div>
      )}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="panel p-4">
      <div className="text-[11px] uppercase tracking-wider text-violet-300/60">{label}</div>
      <div className="text-2xl font-bold text-violet-50 mt-1">{value}</div>
      {sub && <div className="text-[11px] text-violet-300/40 mt-0.5">{sub}</div>}
    </div>
  );
}

function OpportunityForm({
  opportunity,
  contacts,
  demo,
  onSaved,
  onClose,
}: {
  opportunity: Opportunity | null;
  contacts: ContactOpt[];
  demo: boolean;
  onSaved: (o: Opportunity) => void;
  onClose: () => void;
}) {
  const editingId = opportunity?.id ?? null;
  const [f, setF] = useState({
    title: opportunity?.title ?? "",
    contact_id: opportunity?.contact_id ?? "",
    new_contact_name: "",
    value: opportunity ? (opportunity.value_cents / 100).toString() : "",
    probability: String(opportunity?.probability ?? 50),
    stage: (opportunity?.stage ?? "Nuevo") as PipelineStage,
    expected_close: opportunity?.expected_close ?? "",
    owner: opportunity?.owner ?? "",
    last_activity: opportunity?.last_activity ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!f.title.trim()) return setError("El título es obligatorio.");
    setBusy(true); setError(null);
    const value_cents = parsePriceToCents(f.value);
    const payload = {
      title: f.title.trim(),
      contact_id: f.contact_id || null,
      new_contact_name: f.contact_id === "__new__" ? f.new_contact_name : "",
      value_cents,
      probability: Number(f.probability),
      stage: f.stage,
      expected_close: f.expected_close || null,
      owner: f.owner || null,
      last_activity: f.last_activity || null,
    };
    try {
      if (demo) {
        const contact_name = contacts.find((c) => c.id === f.contact_id)?.name ?? (f.new_contact_name || null);
        onSaved({
          id: editingId ?? `tmp-${Date.now()}`,
          title: payload.title, contact_id: payload.contact_id, value_cents, currency: "EUR",
          probability: payload.probability, stage: payload.stage, expected_close: payload.expected_close,
          owner: payload.owner, last_activity: payload.last_activity,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(), contact_name,
        });
        return;
      }
      const url = editingId ? `/api/opportunities/${editingId}` : "/api/opportunities";
      const res = await fetch(url, { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingId ? payload : { ...payload, contact_id: f.contact_id === "__new__" ? null : payload.contact_id }) });
      if (!res.ok) {
        let errorMsg = "Error desconocido";
        try {
          const err = await res.json();
          errorMsg = err.error || errorMsg;
        } catch {
          errorMsg = `${res.status} ${res.statusText || "Error"}`;
        }
        throw new Error(errorMsg);
      }
      const j = await res.json();
      const o = j.opportunity as Opportunity;
      o.contact_name = contacts.find((c) => c.id === o.contact_id)?.name ?? (f.new_contact_name || null);
      onSaved(o);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="panel p-6 w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-violet-50">{editingId ? "Editar oportunidad" : "Nueva oportunidad"}</h3>
        <input className="input" placeholder="Título *" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-3">
          <select className="input" value={f.contact_id} onChange={(e) => setF({ ...f, contact_id: e.target.value })}>
            <option value="">— sin contacto —</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="__new__">+ Nuevo contacto…</option>
          </select>
          {f.contact_id === "__new__"
            ? <input className="input" placeholder="Nombre del nuevo contacto" value={f.new_contact_name} onChange={(e) => setF({ ...f, new_contact_name: e.target.value })} />
            : <input className="input" placeholder="Valor (€)" inputMode="decimal" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />}
        </div>
        {f.contact_id === "__new__" && <input className="input" placeholder="Valor (€)" inputMode="decimal" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-violet-300/70 mb-1.5 block">Probabilidad: {f.probability}%</span>
            <input type="range" min={0} max={100} step={5} value={f.probability} onChange={(e) => setF({ ...f, probability: e.target.value })} className="w-full accent-violet-500" />
          </label>
          <label className="block">
            <span className="text-xs text-violet-300/70 mb-1.5 block">Etapa</span>
            <select className="input" value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value as PipelineStage })}>
              {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block"><span className="text-xs text-violet-300/70 mb-1.5 block">Cierre estimado</span><input type="date" className="input" value={f.expected_close} onChange={(e) => setF({ ...f, expected_close: e.target.value })} /></label>
          <label className="block"><span className="text-xs text-violet-300/70 mb-1.5 block">Responsable</span><input className="input" placeholder="Responsable" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></label>
        </div>
        <input className="input" placeholder="Última actividad / nota" value={f.last_activity} onChange={(e) => setF({ ...f, last_activity: e.target.value })} />
        {f.stage === "Ganado" && <p className="text-xs text-emerald-300/80">Al guardar como “Ganado” se generará una operación en el cliente con este valor.</p>}
        {demo && <p className="text-xs text-amber-300/80">Modo demo: no se guardará.</p>}
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <div className="flex gap-3">
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
