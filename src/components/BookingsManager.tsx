"use client";

import { useState, useEffect, useCallback } from "react";
import { Booking, BookingStatus, BusinessConfig, BusinessType, Service } from "@/lib/types";
import { formatSchedule } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { IconPlus, IconCalendar } from "@/components/icons";
import { MonthCalendar } from "@/components/MonthCalendar";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const STATUS_META: Record<BookingStatus, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "chip-warm" },
  confirmed: { label: "Confirmada", cls: "chip-cold" },
  done: { label: "Realizada", cls: "chip-hot" },
  cancelled: { label: "Cancelada", cls: "" },
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BookingsManager({
  initialBookings,
  services,
  config: initialConfig,
  demo,
}: {
  initialBookings: Booking[];
  services: Service[];
  config: BusinessConfig;
  demo: boolean;
}) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [config, setConfig] = useState<BusinessConfig>(initialConfig);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");

  const isAppt = config.businessType === "appointments";

  async function patchStatus(b: Booking, status: BookingStatus) {
    setBookings((arr) => arr.map((x) => (x.id === b.id ? { ...x, status } : x)));
    if (!demo) {
      await fetch(`/api/bookings/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    }
  }

  const upcoming = bookings.filter(
    (b) => b.status !== "cancelled" && b.status !== "done"
  );
  const past = bookings.filter((b) => b.status === "cancelled" || b.status === "done");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-violet-300/60">
          {upcoming.length} activas · {bookings.length} en total
        </p>
        <div className="flex flex-wrap gap-2">
          {/* Conmutador de vista */}
          <div className="flex rounded-xl border border-[var(--color-edge-soft)] overflow-hidden">
            {(["list", "calendar"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3.5 py-2 text-sm transition"
                style={
                  view === v
                    ? { background: "linear-gradient(180deg,rgba(124,58,237,0.5),rgba(109,40,217,0.3))", color: "#fff" }
                    : { color: "#b3aac6" }
                }
              >
                {v === "list" ? "Lista" : "Calendario"}
              </button>
            ))}
          </div>
          <button className="btn-ghost flex items-center gap-2" onClick={() => setShowSettings((v) => !v)}>
            <IconCalendar width={16} height={16} /> Ajustes de la agenda
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm((v) => !v)}>
            <IconPlus width={16} height={16} /> Nueva {isAppt ? "cita" : "reserva"}
          </button>
        </div>
      </div>

      {demo && (
        <div className="panel-tight px-4 py-2.5 text-xs text-amber-200/90">
          Modo demostración: la disponibilidad se calcula sobre datos de ejemplo y los cambios no se guardan.
        </div>
      )}

      {showSettings && (
        <AgendaSettings
          config={config}
          demo={demo}
          onSave={(c) => {
            setConfig(c);
            setShowSettings(false);
          }}
        />
      )}

      {showForm && (
        <BookingForm
          services={services}
          config={config}
          demo={demo}
          onCreated={(b) => {
            setBookings((arr) => [b, ...arr]);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {view === "calendar" ? (
        <MonthCalendar bookings={bookings} />
      ) : (
        <>
          <BookingGroup title={isAppt ? "Próximas citas" : "Reservas activas"} items={upcoming} onPatch={patchStatus} isAppt={isAppt} />
          {past.length > 0 && (
            <BookingGroup title="Historial" items={past} onPatch={patchStatus} isAppt={isAppt} muted />
          )}
          {bookings.length === 0 && (
            <div className="panel p-10 text-center text-violet-300/50">
              Todavía no hay {isAppt ? "citas" : "reservas"}.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BookingGroup({
  title,
  items,
  onPatch,
  isAppt,
  muted,
}: {
  title: string;
  items: Booking[];
  onPatch: (b: Booking, s: BookingStatus) => void;
  isAppt: boolean;
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="panel p-5">
      <h3 className="text-sm uppercase tracking-wider text-violet-300/60 mb-3">{title}</h3>
      <div className="divide-y divide-[var(--color-edge-soft)]">
        {items.map((b) => {
          const meta = STATUS_META[b.status];
          return (
            <div key={b.id} className={`flex flex-wrap items-center gap-3 py-3 ${muted ? "opacity-60" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-violet-50">{b.customer_name}</div>
                <div className="text-xs text-violet-300/60">
                  {b.service_name ?? b.notes ?? "Cita"}
                  {b.party_size ? ` · ${b.party_size} pers.` : ""}
                  {b.customer_phone ? ` · ${b.customer_phone}` : ""}
                </div>
                {b.service_name && b.notes && (
                  <div className="text-xs text-violet-300/40 mt-0.5">“{b.notes}”</div>
                )}
              </div>
              <div className="text-sm text-violet-100 whitespace-nowrap">
                {isAppt || b.scheduled_at ? formatSchedule(b.scheduled_at) : "—"}
              </div>
              <span className={`chip ${meta.cls}`}>{meta.label}</span>
              {!muted && (
                <div className="flex gap-1.5">
                  {b.status === "pending" && (
                    <button className="btn-ghost py-1 px-2.5 text-xs" onClick={() => onPatch(b, "confirmed")}>Confirmar</button>
                  )}
                  {(b.status === "pending" || b.status === "confirmed") && (
                    <>
                      <button className="btn-ghost py-1 px-2.5 text-xs" onClick={() => onPatch(b, "done")}>Hecha</button>
                      <button className="py-1 px-2.5 text-xs rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10" onClick={() => onPatch(b, "cancelled")}>Cancelar</button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BookingForm({
  services,
  config,
  demo,
  onCreated,
  onCancel,
}: {
  services: Service[];
  config: BusinessConfig;
  demo: boolean;
  onCreated: (b: Booking) => void;
  onCancel: () => void;
}) {
  const isAppt = config.businessType === "appointments";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(todayKey());
  const [time, setTime] = useState("");
  const [party, setParty] = useState("");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [closed, setClosed] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = services.find((s) => s.id === serviceId);
  const duration = service?.duration_min ?? 30;

  const loadSlots = useCallback(async () => {
    if (!isAppt || !date) return;
    setLoadingSlots(true);
    setTime("");
    try {
      const res = await fetch(`/api/availability?date=${date}&duration=${duration}`);
      const j = await res.json();
      setSlots(j.slots ?? []);
      setClosed(Boolean(j.closed));
    } finally {
      setLoadingSlots(false);
    }
  }, [isAppt, date, duration]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  async function submit() {
    if (!name.trim()) return setError("El nombre del cliente es obligatorio.");
    if (isAppt && !time) return setError("Elige una franja horaria.");
    if (!isAppt && !time) return setError("Indica la hora.");
    setBusy(true);
    setError(null);

    const scheduled_at = `${date}T${time}:00`;
    const payload = {
      service_id: serviceId || null,
      customer_name: name.trim(),
      customer_phone: phone.trim() || null,
      scheduled_at,
      duration_min: isAppt ? duration : null,
      party_size: !isAppt && party ? parseInt(party, 10) : null,
      notes: notes.trim() || null,
    };

    try {
      if (demo) {
        onCreated({
          id: `tmp-${Date.now()}`,
          contact_id: null,
          created_at: new Date().toISOString(),
          status: "pending",
          service_name: service?.name ?? null,
          ...payload,
        });
      } else {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? "Error al crear");
        onCreated({ ...j.booking, service_name: service?.name ?? null });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel p-6 space-y-4">
      <h3 className="font-semibold text-violet-50">Nueva {isAppt ? "cita" : "reserva"}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Nombre del cliente">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. María García" />
        </Field>
        <Field label="Teléfono">
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+34 600 000 000" />
        </Field>
        <Field label="Servicio">
          <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {services.length === 0 && <option value="">— sin servicios —</option>}
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatPrice(s.price_cents, s.currency)}
                {s.duration_min ? ` · ${s.duration_min}min` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha">
          <input type="date" className="input" value={date} min={todayKey()} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      {/* Hora: franjas (citas) o time libre (pedidos) */}
      {isAppt ? (
        <div>
          <span className="text-xs text-violet-300/70 mb-1.5 block">Franja disponible</span>
          {loadingSlots ? (
            <p className="text-sm text-violet-300/50">Calculando disponibilidad…</p>
          ) : closed ? (
            <p className="text-sm text-amber-300/80">Cerrado ese día. Elige otra fecha.</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-amber-300/80">No quedan franjas libres para este servicio ese día.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  key={s}
                  onClick={() => setTime(s)}
                  className="px-3 py-1.5 rounded-lg text-sm border transition"
                  style={
                    time === s
                      ? { background: "linear-gradient(180deg,#8b5cf6,#6d28d9)", borderColor: "rgba(168,85,247,0.5)", color: "#fff" }
                      : { background: "rgba(124,58,237,0.08)", borderColor: "var(--color-edge)", color: "#cbbfe6" }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Hora">
            <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Nº de personas">
            <input className="input" value={party} onChange={(e) => setParty(e.target.value.replace(/\D/g, ""))} placeholder="2" inputMode="numeric" />
          </Field>
        </div>
      )}

      <Field label="Notas (opcional)">
        <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Alergias, preferencias, etc." />
      </Field>

      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={submit} disabled={busy}>
          {busy ? "Guardando…" : `Crear ${isAppt ? "cita" : "reserva"}`}
        </button>
        <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function AgendaSettings({
  config,
  demo,
  onSave,
}: {
  config: BusinessConfig;
  demo: boolean;
  onSave: (c: BusinessConfig) => void;
}) {
  const [type, setType] = useState<BusinessType>(config.businessType);
  const [slot, setSlot] = useState(String(config.slotMin));
  // Editor de horario: un único turno por día (apertura/cierre) para simplicidad
  const [hours, setHours] = useState(() => {
    const init: Record<string, { open: string; close: string; on: boolean }> = {};
    for (let d = 0; d < 7; d++) {
      const r = config.openHours[String(d)]?.[0];
      init[d] = { open: r?.[0] ?? "10:00", close: r?.[1] ?? "20:00", on: Boolean(r) };
    }
    return init;
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    const openHours: Record<string, [string, string][]> = {};
    for (let d = 0; d < 7; d++) {
      openHours[String(d)] = hours[d].on ? [[hours[d].open, hours[d].close]] : [];
    }
    const next: BusinessConfig = {
      businessType: type,
      slotMin: Math.max(5, parseInt(slot, 10) || 30),
      openHours,
    };
    try {
      if (!demo) {
        await fetch("/api/business", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
      }
      setSaved(true);
      onSave(next);
    } finally {
      setBusy(false);
    }
  }

  // Orden lunes→domingo para la UI
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="panel p-6 space-y-5">
      <h3 className="font-semibold text-violet-50">Ajustes de la agenda</h3>

      <div>
        <span className="text-xs text-violet-300/70 mb-2 block">Tipo de negocio</span>
        <div className="flex gap-2">
          {([
            { v: "appointments", l: "Citas (con franjas)" },
            { v: "orders", l: "Reservas / pedidos" },
          ] as const).map((o) => (
            <button
              key={o.v}
              onClick={() => setType(o.v)}
              className="px-4 py-2 rounded-xl text-sm border transition"
              style={
                type === o.v
                  ? { background: "linear-gradient(180deg,rgba(124,58,237,0.5),rgba(109,40,217,0.3))", borderColor: "rgba(168,85,247,0.4)", color: "#fff" }
                  : { background: "rgba(124,58,237,0.08)", borderColor: "var(--color-edge-soft)", color: "#b3aac6" }
              }
            >
              {o.l}
            </button>
          ))}
        </div>
        <p className="text-xs text-violet-300/50 mt-2">
          {type === "appointments"
            ? "Cada servicio usa su duración para calcular franjas y bloquear solapamientos."
            : "Reservas con hora libre y nº de personas, sin bloqueo estricto de disponibilidad."}
        </p>
      </div>

      {type === "appointments" && (
        <div className="grid sm:grid-cols-[120px_1fr] gap-3 items-center">
          <span className="text-xs text-violet-300/70">Intervalo de franjas</span>
          <select className="input sm:max-w-[160px]" value={slot} onChange={(e) => setSlot(e.target.value)}>
            {[15, 20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>{m} minutos</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <span className="text-xs text-violet-300/70 mb-2 block">Horario de apertura</span>
        <div className="space-y-1.5">
          {order.map((d) => (
            <div key={d} className="flex items-center gap-3">
              <label className="flex items-center gap-2 w-32 text-sm text-violet-100">
                <input type="checkbox" className="accent-violet-500 size-4" checked={hours[d].on} onChange={(e) => setHours({ ...hours, [d]: { ...hours[d], on: e.target.checked } })} />
                {DAY_NAMES[d]}
              </label>
              {hours[d].on ? (
                <div className="flex items-center gap-2">
                  <input type="time" className="input py-1.5 w-28" value={hours[d].open} onChange={(e) => setHours({ ...hours, [d]: { ...hours[d], open: e.target.value } })} />
                  <span className="text-violet-300/50">–</span>
                  <input type="time" className="input py-1.5 w-28" value={hours[d].close} onChange={(e) => setHours({ ...hours, [d]: { ...hours[d], close: e.target.value } })} />
                </div>
              ) : (
                <span className="text-sm text-violet-300/40">Cerrado</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? "Guardando…" : "Guardar ajustes"}
        </button>
        {saved && <span className="text-sm text-emerald-300">✓ Guardado</span>}
        {demo && <span className="text-xs text-amber-300/80">Modo demo: aplica solo en esta sesión.</span>}
      </div>
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
