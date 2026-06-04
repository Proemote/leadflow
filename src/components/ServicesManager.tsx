"use client";

import { useState } from "react";
import { Service } from "@/lib/types";
import { formatPrice, parsePriceToCents } from "@/lib/money";
import { IconPlus, IconTrash } from "@/components/icons";

type Draft = {
  id?: string;
  name: string;
  category: string;
  price: string;
  duration: string;
  description: string;
  active: boolean;
};

const EMPTY: Draft = {
  name: "",
  category: "",
  price: "",
  duration: "",
  description: "",
  active: true,
};

export function ServicesManager({
  initial,
  demo,
}: {
  initial: Service[];
  demo: boolean;
}) {
  const [services, setServices] = useState<Service[]>(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openNew() {
    setError(null);
    setDraft({ ...EMPTY });
  }
  function openEdit(s: Service) {
    setError(null);
    setDraft({
      id: s.id,
      name: s.name,
      category: s.category ?? "",
      price: (s.price_cents / 100).toString().replace(".", ","),
      duration: s.duration_min ? String(s.duration_min) : "",
      description: s.description ?? "",
      active: s.active,
    });
  }

  async function save() {
    if (!draft || !draft.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      name: draft.name.trim(),
      category: draft.category.trim() || null,
      price_cents: parsePriceToCents(draft.price),
      currency: "EUR",
      duration_min: draft.duration ? parseInt(draft.duration, 10) : null,
      description: draft.description.trim() || null,
      active: draft.active,
    };

    try {
      if (demo) {
        // Modo demo: sólo en memoria
        if (draft.id) {
          setServices((arr) =>
            arr.map((s) => (s.id === draft.id ? { ...s, ...payload } : s))
          );
        } else {
          setServices((arr) => [
            ...arr,
            { id: `tmp-${Date.now()}`, created_at: new Date().toISOString(), ...payload },
          ]);
        }
      } else {
        const url = draft.id ? `/api/services/${draft.id}` : "/api/services";
        const res = await fetch(url, {
          method: draft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? "Error al guardar");
        setServices((arr) =>
          draft.id
            ? arr.map((s) => (s.id === draft.id ? j.service : s))
            : [...arr, j.service]
        );
      }
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(s: Service) {
    const next = !s.active;
    setServices((arr) => arr.map((x) => (x.id === s.id ? { ...x, active: next } : x)));
    if (!demo) {
      await fetch(`/api/services/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
    }
  }

  async function remove(s: Service) {
    if (!confirm(`¿Eliminar "${s.name}"?`)) return;
    setServices((arr) => arr.filter((x) => x.id !== s.id));
    if (!demo) {
      await fetch(`/api/services/${s.id}`, { method: "DELETE" });
    }
  }

  // Agrupar por categoría
  const groups = services.reduce<Record<string, Service[]>>((acc, s) => {
    const k = s.category ?? "Sin categoría";
    (acc[k] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-violet-300/60">
          {services.length} servicios · {services.filter((s) => s.active).length} activos
        </p>
        <button className="btn-primary flex items-center gap-2" onClick={openNew}>
          <IconPlus width={16} height={16} /> Añadir servicio
        </button>
      </div>

      {demo && (
        <div className="panel-tight px-4 py-2.5 text-xs text-amber-200/90">
          Modo demostración: los cambios no se guardan. Conecta Supabase para persistirlos.
        </div>
      )}

      {/* Formulario */}
      {draft && (
        <div className="panel p-6 space-y-4">
          <h3 className="font-semibold text-violet-50">
            {draft.id ? "Editar servicio" : "Nuevo servicio"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombre">
              <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ej. Limpieza facial" />
            </Field>
            <Field label="Categoría">
              <input className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Ej. Facial" />
            </Field>
            <Field label="Precio (€)">
              <input className="input" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="45" inputMode="decimal" />
            </Field>
            <Field label="Duración (min) — vacío si no requiere cita">
              <input className="input" value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value.replace(/\D/g, "") })} placeholder="60" inputMode="numeric" />
            </Field>
          </div>
          <Field label="Descripción">
            <textarea className="input min-h-[70px] resize-y" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Breve descripción para que Leo la cuente." />
          </Field>
          <label className="flex items-center gap-2 text-sm text-violet-100 cursor-pointer">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="accent-violet-500 size-4" />
            Activo (visible para Leo)
          </label>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <div className="flex gap-3">
            <button className="btn-primary" onClick={save} disabled={busy}>
              {busy ? "Guardando…" : "Guardar"}
            </button>
            <button className="btn-ghost" onClick={() => setDraft(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista por categorías */}
      {Object.entries(groups).map(([cat, items]) => (
        <div key={cat} className="panel p-5">
          <h3 className="text-sm uppercase tracking-wider text-violet-300/60 mb-3">{cat}</h3>
          <div className="divide-y divide-[var(--color-edge-soft)]">
            {items.map((s) => (
              <div key={s.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${s.active ? "text-violet-50" : "text-violet-300/40 line-through"}`}>
                      {s.name}
                    </span>
                    {s.duration_min && (
                      <span className="text-[11px] text-violet-300/60">· {s.duration_min} min</span>
                    )}
                  </div>
                  {s.description && (
                    <div className="text-xs text-violet-300/50 truncate">{s.description}</div>
                  )}
                </div>
                <div className="text-violet-50 font-semibold whitespace-nowrap">
                  {formatPrice(s.price_cents, s.currency)}
                </div>
                <button
                  onClick={() => toggleActive(s)}
                  title={s.active ? "Desactivar" : "Activar"}
                  className="relative w-10 h-5.5 rounded-full transition shrink-0"
                  style={{
                    background: s.active ? "linear-gradient(90deg,#8b5cf6,#6d28d9)" : "rgba(124,58,237,0.2)",
                    height: 22, width: 40,
                  }}
                >
                  <span className="absolute top-0.5 size-4 rounded-full bg-white transition-all" style={{ left: s.active ? "1.25rem" : "0.15rem" }} />
                </button>
                <button onClick={() => openEdit(s)} className="text-xs text-violet-300 hover:text-white px-2">Editar</button>
                <button onClick={() => remove(s)} className="text-rose-400/70 hover:text-rose-400 p-1" title="Eliminar">
                  <IconTrash width={16} height={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {services.length === 0 && (
        <div className="panel p-10 text-center text-violet-300/50">
          Aún no hay servicios. Añade el primero para que Leo lo conozca.
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-violet-300/70 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
