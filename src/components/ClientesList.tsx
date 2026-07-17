"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CustomerSummary, Contact } from "@/lib/types";
import { PortfolioAggregate } from "@/lib/customers";
import { CUSTOMER_STATUS_META, getJourneyStageMeta } from "@/lib/metrics";
import { computeCustomerMetrics } from "@/lib/metrics";
import { formatPrice, parsePriceToCents } from "@/lib/money";
import { initials } from "@/lib/format";
import { IconPlus, IconUsers } from "@/components/icons";
import { ImportContactsModal } from "@/components/ImportContactsModal";

type SortKey = "clv" | "recencia" | "antiguedad" | "nombre";
const SORT_KEYS: SortKey[] = ["clv", "recencia", "antiguedad", "nombre"];
const SORT_STORAGE_KEY = "clientes-sort";

export function ClientesList({
  customers: initialCustomers,
  aggregate,
  demo,
}: {
  customers: CustomerSummary[];
  aggregate: PortfolioAggregate;
  demo: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<string>("todos");
  const [selectedTag, setSelectedTag] = useState<string>("todos");
  const [sort, setSort] = useState<SortKey>("nombre");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [clvMin, setClvMin] = useState("");
  const [clvMax, setClvMax] = useState("");
  const [customers, setCustomers] = useState<CustomerSummary[]>(initialCustomers);

  // Abrir formulario/importador directamente si se llega desde un acceso directo (ej. dashboard)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") setShowForm(true);
    if (params.get("import") === "1") setShowImport(true);
  }, []);

  // Recordar el orden elegido entre visitas a esta página
  useEffect(() => {
    const stored = localStorage.getItem(SORT_STORAGE_KEY) as SortKey | null;
    if (stored && SORT_KEYS.includes(stored)) setSort(stored);
  }, []);

  function updateSort(next: SortKey) {
    setSort(next);
    try {
      localStorage.setItem(SORT_STORAGE_KEY, next);
    } catch {
      // localStorage no disponible — el orden no persiste, pero no rompe la UI
    }
  }

  // En modo demo, agregar contactos temporales de localStorage
  useEffect(() => {
    if (!demo) return;
    try {
      const tempContacts = JSON.parse(localStorage.getItem("temp_contacts") || "[]") as Contact[];
      if (tempContacts.length > 0) {
        const newCustomers = tempContacts
          .filter((tc) => !initialCustomers.some((c) => c.contact.id === tc.id))
          .map((tc) => ({
            contact: tc,
            metrics: computeCustomerMetrics(tc, []),
          }));
        if (newCustomers.length > 0) {
          setCustomers([...initialCustomers, ...newCustomers]);
        }
      }
    } catch (e) {
      console.error("Error reading temp_contacts from localStorage:", e);
    }
  }, [demo, initialCustomers]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    customers.forEach((c) => {
      (c.contact.tags ?? []).forEach((t) => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [customers]);

  const filtered = useMemo(() => {
    const minCLV = clvMin ? parsePriceToCents(clvMin) : 0;
    const maxCLV = clvMax ? parsePriceToCents(clvMax) : Infinity;

    let list = customers.filter((c) => {
      if (estado !== "todos" && c.metrics.estado !== estado) return false;
      if (selectedTag !== "todos" && !(c.contact.tags ?? []).includes(selectedTag)) return false;
      if (c.metrics.clvCents < minCLV || c.metrics.clvCents > maxCLV) return false;
      if (!q) return true;
      const hay = `${c.contact.name ?? ""} ${c.contact.company ?? ""} ${c.contact.email ?? ""} ${c.contact.phone ?? ""} ${(c.contact.tags ?? []).join(" ")}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
    list = [...list].sort((a, b) => {
      if (sort === "clv") return b.metrics.clvCents - a.metrics.clvCents;
      if (sort === "recencia") return (a.metrics.recenciaDias ?? 1e9) - (b.metrics.recenciaDias ?? 1e9);
      if (sort === "nombre") return (a.contact.name ?? "").localeCompare(b.contact.name ?? "");
      return (a.metrics.clienteDesde ?? "9999").localeCompare(b.metrics.clienteDesde ?? "9999");
    });
    return list;
  }, [customers, q, estado, selectedTag, sort, clvMin, clvMax]);

  const hayCompras = aggregate.clientesConCompra > 0;

  return (
    <div className="space-y-5">
      {/* Métricas de cartera */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Clientes" value={String(aggregate.totalClientes)} />
        <Kpi label="Ingresos totales" value={hayCompras ? formatPrice(aggregate.ingresosTotalesCents) : "—"} sub={hayCompras ? undefined : "sin compras aún"} />
        <Kpi label="CLV medio" value={hayCompras ? formatPrice(aggregate.clvMedioCents) : "—"} sub={hayCompras ? undefined : "sin datos"} />
        <Kpi label="% recurrentes" value={hayCompras ? `${Math.round(aggregate.pctRecurrentes * 100)}%` : "—"} sub={hayCompras ? undefined : "sin datos"} />
      </div>

      {/* Controles */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="flex-1 lg:max-w-xs flex flex-col gap-2">
          <input className="input" placeholder="Buscar por nombre, empresa, email, teléfono o etiqueta…" value={q} onChange={(e) => setQ(e.target.value)} />
          {(clvMin || clvMax) && (
            <div className="text-xs text-violet-300/60">
              Rango CLV: {clvMin || "—"} a {clvMax || "—"}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select className="input py-2 w-auto" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="riesgo">En riesgo</option>
            <option value="inactivo">Inactivos</option>
            <option value="potencial">Potenciales</option>
          </select>
          {allTags.length > 0 && (
            <select className="input py-2 w-auto" value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
              <option value="todos">Todas las etiquetas</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}
          <select className="input py-2 w-auto" value={sort} onChange={(e) => updateSort(e.target.value as SortKey)}>
            <option value="nombre">Ordenar: Nombre</option>
            <option value="clv">Ordenar: CLV</option>
            <option value="recencia">Ordenar: Recencia</option>
            <option value="antiguedad">Ordenar: Antigüedad</option>
          </select>
          <button className="btn-ghost text-sm py-2 px-3" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
            ⚙️ Filtros
          </button>
          <button className="btn-ghost flex items-center gap-2 whitespace-nowrap" onClick={() => setShowImport(true)} title="Importar contactos desde CSV, Excel o Google Sheets">
            📥 Importar
          </button>
          <button className="btn-primary flex items-center gap-2 whitespace-nowrap" onClick={() => setShowForm((v) => !v)}>
            <IconPlus width={16} height={16} /> Nuevo
          </button>
        </div>
      </div>

      {showAdvancedFilters && (
        <div className="panel p-4 space-y-3 bg-violet-500/5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-violet-50">Filtros avanzados</h4>
            <button className="text-violet-300/40 hover:text-violet-200 text-sm" onClick={() => setShowAdvancedFilters(false)}>✕</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-violet-300/70 block mb-1">CLV mínimo (€)</label>
              <input type="number" className="input text-sm" placeholder="0" value={clvMin} onChange={(e) => setClvMin(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-violet-300/70 block mb-1">CLV máximo (€)</label>
              <input type="number" className="input text-sm" placeholder="Sin límite" value={clvMax} onChange={(e) => setClvMax(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost text-sm py-1.5 px-3" onClick={() => { setClvMin(""); setClvMax(""); }}>
              Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {demo && (
        <div className="panel-tight px-4 py-2.5 text-xs text-amber-200/90">
          Modo demostración: estás viendo una cartera de ejemplo; los cambios no se guardan.
        </div>
      )}

      {showImport && (
        <ImportContactsModal
          onClose={() => setShowImport(false)}
          onImported={() => router.refresh()}
        />
      )}

      {showForm && (
        <NewContactForm
          demo={demo}
          onDone={(newContact) => {
            setShowForm(false);
            if (newContact) {
              setCustomers((prev) => [
                { contact: newContact, metrics: computeCustomerMetrics(newContact, []) },
                ...prev,
              ]);
            } else {
              router.refresh();
            }
          }}
        />
      )}

      {/* Tabla / listado */}
      {customers.length === 0 ? (
        <EmptyState onCreate={() => setShowForm(true)} />
      ) : (
        <div className="panel overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1fr_0.7fr_1fr_1fr] gap-3 px-5 py-3 text-[11px] uppercase tracking-wider text-violet-300/50 border-b border-[var(--color-edge-soft)]">
            <span>Cliente</span><span>Estado</span><span>Ops.</span><span>CLV</span><span>Última compra</span>
          </div>
          <div className="divide-y divide-[var(--color-edge-soft)]">
            {filtered.map((c) => {
              const meta = CUSTOMER_STATUS_META[c.metrics.estado];
              return (
                <Link key={c.contact.id} href={`/clientes/${c.contact.id}`} className="grid md:grid-cols-[2fr_1fr_0.7fr_1fr_1fr] gap-3 px-5 py-3.5 hover:bg-violet-500/5 transition items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-full grid place-items-center text-xs font-bold text-white shrink-0" style={{ background: "linear-gradient(140deg,#8b5cf6,#6d28d9)" }}>
                      {initials(c.contact.name, c.contact.phone ?? "?")}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-violet-50 truncate">{c.contact.name ?? "Sin nombre"}</div>
                      <div className="text-[11px] text-violet-300/60 truncate">{c.contact.company ?? c.contact.email ?? c.contact.phone ?? ""}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`chip ${meta.cls}`}>{meta.label}</span>
                    {c.contact.journey_stage && (
                      <span className={`chip ${getJourneyStageMeta(c.contact.journey_stage).cls} whitespace-nowrap`}>
                        {getJourneyStageMeta(c.contact.journey_stage).label}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-violet-200">{c.metrics.nOps}</div>
                  <div className="text-sm font-semibold text-violet-50">{c.metrics.clvCents > 0 ? formatPrice(c.metrics.clvCents) : "—"}</div>
                  <div className="text-sm text-violet-300/70">{c.metrics.recenciaDias == null ? "—" : c.metrics.recenciaDias === 0 ? "hoy" : `hace ${c.metrics.recenciaDias} d`}</div>
                </Link>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-5 py-10 text-center text-violet-300/50 text-sm">Ningún cliente coincide con el filtro.</div>
            )}
          </div>
        </div>
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

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="panel p-12 text-center">
      <div className="size-14 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid var(--color-edge)" }}>
        <IconUsers className="text-violet-300" />
      </div>
      <h3 className="text-lg font-semibold text-violet-50">Aún no tienes clientes</h3>
      <p className="text-sm text-violet-300/60 mt-1 max-w-sm mx-auto">Añade tu primer contacto para empezar a registrar operaciones y medir su valor (CLV).</p>
      <button className="btn-primary mt-5 inline-flex items-center gap-2" onClick={onCreate}><IconPlus width={16} height={16} /> Crear primer contacto</button>
    </div>
  );
}

function NewContactForm({ demo, onDone }: { demo: boolean; onDone: (contact?: Contact) => void }) {
  const [f, setF] = useState({ name: "", company: "", phone: "", email: "", tags: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!f.name.trim()) return setError("El nombre es obligatorio.");
    setBusy(true); setError(null);
    try {
      if (demo) {
        const newContact: Contact = {
          id: `tmp-${Date.now()}`,
          name: f.name.trim(),
          company: f.company || null,
          phone: f.phone || null,
          email: f.email || null,
          tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
          notes: f.notes || null,
          ad_source: "Manual",
          ctwa_clid: null,
          blocked: false,
          bot_enabled: true,
          created_at: new Date().toISOString(),
        };
        onDone(newContact);
        return;
      }
      const res = await fetch("/api/customers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean) }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error");
      onDone((j.contact as Contact) ?? undefined);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  }

  return (
    <div className="panel p-6 space-y-4">
      <h3 className="font-semibold text-violet-50">Nuevo contacto</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <input className="input" placeholder="Nombre *" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="input" placeholder="Empresa" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
        <input className="input" placeholder="Teléfono" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input className="input" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      </div>
      <input className="input" placeholder="Etiquetas (separadas por comas)" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} />
      <input className="input" placeholder="Notas" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      {demo && <p className="text-xs text-amber-300/80">Modo demo: no se guardará.</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "Guardando…" : "Crear contacto"}</button>
        <button className="btn-ghost" onClick={() => onDone()}>Cancelar</button>
      </div>
    </div>
  );
}
