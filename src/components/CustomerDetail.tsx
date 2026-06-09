"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Contact, Operation, CustomerMetrics, OperationStatus } from "@/lib/types";
import { CUSTOMER_STATUS_META } from "@/lib/metrics";
import { formatPrice } from "@/lib/money";
import { initials } from "@/lib/format";
import { IconBack, IconPlus } from "@/components/icons";

const OP_STATUS: Record<OperationStatus, { label: string; cls: string }> = {
  completed: { label: "Completada", cls: "chip-hot" },
  pending: { label: "Pendiente", cls: "chip-warm" },
  refunded: { label: "Reembolsada", cls: "" },
};

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export function CustomerDetail({
  contact,
  operations: initialOps,
  metrics: initialMetrics,
  demo,
}: {
  contact: Contact;
  operations: Operation[];
  metrics: CustomerMetrics;
  demo: boolean;
}) {
  const router = useRouter();
  const [operations] = useState(initialOps);
  const [showForm, setShowForm] = useState(false);
  const meta = CUSTOMER_STATUS_META[initialMetrics.estado];
  const m = initialMetrics;

  return (
    <div className="space-y-6">
      <Link href="/clientes" className="inline-flex items-center gap-1.5 text-sm text-violet-300 hover:text-white">
        <IconBack width={16} height={16} /> Clientes
      </Link>

      {/* Cabecera */}
      <div className="panel p-6 flex flex-wrap items-center gap-4">
        <div className="size-14 rounded-full grid place-items-center text-lg font-bold text-white shrink-0" style={{ background: "linear-gradient(140deg,#8b5cf6,#6d28d9)" }}>
          {initials(contact.name, contact.phone ?? "?")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-violet-50">{contact.name ?? "Sin nombre"}</h1>
            <span className={`chip ${meta.cls}`}>{meta.label}</span>
          </div>
          <div className="text-sm text-violet-300/70 mt-0.5">
            {[contact.company, contact.email, contact.phone].filter(Boolean).join(" · ") || "Sin datos de contacto"}
          </div>
          {(contact.tags ?? []).length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {(contact.tags ?? []).map((t) => (
                <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-200 border border-[var(--color-edge)]">{t}</span>
              ))}
            </div>
          )}
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm((v) => !v)}>
          <IconPlus width={16} height={16} /> Añadir operación
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="CLV (histórico)" value={m.nOps ? formatPrice(m.clvCents) : "—"} sub={m.nOps ? undefined : "sin compras"} highlight />
        <Metric label="Ticket medio" value={m.nOps ? formatPrice(m.aovCents) : "—"} />
        <Metric label="Operaciones" value={String(m.nOps)} sub={m.recurrente ? "Cliente recurrente" : m.nOps === 1 ? "Primera compra" : undefined} />
        <Metric label="Cliente desde" value={m.clienteDesde ? fecha(m.clienteDesde) : "—"} sub={m.antiguedad ?? undefined} />
        <Metric label="Recencia" value={m.recenciaDias == null ? "—" : m.recenciaDias === 0 ? "hoy" : `hace ${m.recenciaDias} d`} sub={m.nOps ? "última compra" : undefined} />
        <Metric label="Frecuencia media" value={m.frecuenciaMediaDias == null ? "—" : `${m.frecuenciaMediaDias} d`} sub={m.frecuenciaMediaDias == null ? "≥2 compras" : "entre compras"} />
        <Metric label="Recurrencia" value={m.nOps ? `${Math.round(m.tasaRecurrencia * 100)}%` : "—"} />
        <Metric label="Estado" value={meta.label} />
      </div>

      {showForm && <AddOperationForm contactId={contact.id} demo={demo} onDone={() => { setShowForm(false); router.refresh(); }} />}

      {/* Operaciones */}
      <div className="panel p-5">
        <h3 className="font-semibold text-violet-50 mb-3">Historial de operaciones</h3>
        {operations.length === 0 ? (
          <p className="text-sm text-violet-300/50 py-6 text-center">Aún no hay operaciones. Añade la primera para calcular su valor.</p>
        ) : (
          <div className="divide-y divide-[var(--color-edge-soft)]">
            {operations.map((o) => {
              const s = OP_STATUS[o.status];
              return (
                <div key={o.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-violet-50 truncate">{o.concept}</div>
                    <div className="text-[11px] text-violet-300/60">{fecha(o.date)}{o.source === "opportunity" ? " · desde oportunidad" : ""}</div>
                  </div>
                  <span className={`chip ${s.cls}`}>{s.label}</span>
                  <div className="text-sm font-semibold text-violet-50 w-24 text-right">{formatPrice(o.amount_cents, o.currency)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="panel p-4">
      <div className="text-[11px] uppercase tracking-wider text-violet-300/60">{label}</div>
      <div className={`text-xl font-bold mt-1 ${highlight ? "gradient-text" : "text-violet-50"}`}>{value}</div>
      {sub && <div className="text-[11px] text-violet-300/40 mt-0.5">{sub}</div>}
    </div>
  );
}

function AddOperationForm({ contactId, demo, onDone }: { contactId: string; demo: boolean; onDone: () => void }) {
  const [f, setF] = useState({ concept: "", amount: "", status: "completed", date: new Date().toISOString().slice(0, 10) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!f.concept.trim()) return setError("El concepto es obligatorio.");
    setBusy(true); setError(null);
    try {
      if (demo) { onDone(); return; }
      const res = await fetch("/api/operations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: contactId, concept: f.concept, amount: f.amount, status: f.status, date: new Date(`${f.date}T12:00:00`).toISOString() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error");
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  }

  return (
    <div className="panel p-6 space-y-4">
      <h3 className="font-semibold text-violet-50">Nueva operación</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <input className="input" placeholder="Concepto / servicio *" value={f.concept} onChange={(e) => setF({ ...f, concept: e.target.value })} />
        <input className="input" placeholder="Importe (€)" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option value="completed">Completada</option>
          <option value="pending">Pendiente</option>
          <option value="refunded">Reembolsada</option>
        </select>
        <input type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
      </div>
      {demo && <p className="text-xs text-amber-300/80">Modo demo: no se guardará.</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "Guardando…" : "Añadir"}</button>
        <button className="btn-ghost" onClick={onDone}>Cancelar</button>
      </div>
    </div>
  );
}
