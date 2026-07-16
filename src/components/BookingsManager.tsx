"use client";

import { useState, useEffect, useCallback } from "react";
import { Booking, BookingStatus, BusinessConfig, BusinessType, Service } from "@/lib/types";
import { formatSchedule } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { IconPlus, IconCalendar, IconTrash } from "@/components/icons";
import { MonthCalendar } from "@/components/MonthCalendar";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const STATUS_META: Record<BookingStatus, { label: string; cls: string }> = {
  pending:   { label: "Pendiente",  cls: "chip-warm" },
  confirmed: { label: "Confirmada", cls: "chip-cold" },
  done:      { label: "Realizada",  cls: "chip-hot"  },
  cancelled: { label: "Cancelada",  cls: ""           },
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00..21:00

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(key: string, delta: number): string {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(key: string): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

function bookingMinute(b: Booking): number {
  if (!b.scheduled_at) return 0;
  const [, time] = b.scheduled_at.split("T");
  const [h, m] = time.split(":");
  return parseInt(h) * 60 + parseInt(m);
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
  const [view, setView] = useState<"agenda" | "calendar">("agenda");
  const [agendaDate, setAgendaDate] = useState(todayKey());

  // Abrir formulario de nueva cita/reserva si se llega desde un acceso directo (ej. dashboard)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") setShowForm(true);
  }, []);

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

  async function removeBooking(b: Booking) {
    if (!confirm(`¿Eliminar la cita de ${b.customer_name}? Esta acción no se puede deshacer.`)) return;
    setBookings((arr) => arr.filter((x) => x.id !== b.id));
    if (!demo) await fetch(`/api/bookings/${b.id}`, { method: "DELETE" });
  }

  const upcoming = bookings.filter((b) => b.status !== "cancelled" && b.status !== "done");
  const past     = bookings.filter((b) => b.status === "cancelled" || b.status === "done");

  // Citas del día actual de la vista agenda
  const agendaBookings = bookings
    .filter((b) => b.scheduled_at?.startsWith(agendaDate))
    .sort((a, b) => bookingMinute(a) - bookingMinute(b));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-violet-300/60">
          {upcoming.length} activas · {bookings.length} en total
        </p>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-xl border border-[var(--color-edge-soft)] overflow-hidden">
            {(["agenda", "calendar"] as const).map((v) => (
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
                {v === "agenda" ? "Agenda" : "Calendario"}
              </button>
            ))}
          </div>
          <button className="btn-ghost flex items-center gap-2" onClick={() => setShowSettings((v) => !v)}>
            <IconCalendar width={16} height={16} /> Ajustes
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
          onSave={(c) => { setConfig(c); setShowSettings(false); }}
        />
      )}

      {showForm && (
        <BookingForm
          services={services}
          config={config}
          demo={demo}
          onCreated={(b) => { setBookings((arr) => [b, ...arr]); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {view === "calendar" ? (
        <MonthCalendar bookings={bookings} />
      ) : (
        <AgendaView
          date={agendaDate}
          bookings={agendaBookings}
          past={past}
          upcoming={upcoming}
          isAppt={isAppt}
          onPrev={() => setAgendaDate((d) => addDays(d, -1))}
          onNext={() => setAgendaDate((d) => addDays(d, 1))}
          onToday={() => setAgendaDate(todayKey())}
          onPatch={patchStatus}
          onDelete={removeBooking}
        />
      )}
    </div>
  );
}

// ─── Vista de Agenda (timeline por día) ────────────────────────────

function AgendaView({
  date, bookings, past, upcoming, isAppt,
  onPrev, onNext, onToday, onPatch, onDelete,
}: {
  date: string;
  bookings: Booking[];
  past: Booking[];
  upcoming: Booking[];
  isAppt: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onPatch: (b: Booking, s: BookingStatus) => void;
  onDelete: (b: Booking) => void;
}) {
  const isToday = date === todayKey();

  return (
    <div className="space-y-4">
      {/* Navegación de día */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button className="btn-ghost py-1.5 px-3" onClick={onPrev}>←</button>
            <button className="btn-ghost py-1.5 px-3 text-xs" onClick={onToday}>Hoy</button>
            <button className="btn-ghost py-1.5 px-3" onClick={onNext}>→</button>
          </div>
          <h3 className="font-semibold text-violet-50 capitalize text-sm sm:text-base">{dayLabel(date)}</h3>
          {isToday && <span className="chip chip-hot text-[10px]">Hoy</span>}
        </div>

        {/* Timeline de horas */}
        <div className="relative overflow-y-auto max-h-[520px] pr-1">
          {HOURS.map((h) => {
            const hStr = String(h).padStart(2, "0");
            const slotBookings = bookings.filter((b) => {
              if (!b.scheduled_at) return false;
              const bMin = bookingMinute(b);
              return bMin >= h * 60 && bMin < (h + 1) * 60;
            });
            return (
              <div key={h} className="flex gap-3 min-h-[56px]">
                <div className="w-12 shrink-0 text-[11px] text-violet-300/40 pt-1 text-right font-mono">
                  {hStr}:00
                </div>
                <div className="flex-1 border-t border-[var(--color-edge-soft)] pt-1 pb-1">
                  {slotBookings.length === 0 ? (
                    <div className="h-full" />
                  ) : (
                    <div className="space-y-1">
                      {slotBookings.map((b) => (
                        <AgendaEvent key={b.id} booking={b} isAppt={isAppt} onPatch={onPatch} onDelete={onDelete} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {bookings.length === 0 && (
          <p className="text-sm text-violet-300/40 text-center py-6">Sin citas este día.</p>
        )}
      </div>

      {/* Historial con eliminar/archivar */}
      {past.length > 0 && (
        <div className="panel p-5">
          <h3 className="text-sm uppercase tracking-wider text-violet-300/60 mb-3">Historial</h3>
          <div className="divide-y divide-[var(--color-edge-soft)]">
            {past.map((b) => {
              const meta = STATUS_META[b.status];
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-3 py-3 opacity-70">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-violet-50">{b.customer_name}</div>
                    <div className="text-xs text-violet-300/60">
                      {b.service_name ?? b.notes ?? "Cita"}
                      {b.customer_phone ? ` · ${b.customer_phone}` : ""}
                      {b.scheduled_at ? ` · ${formatSchedule(b.scheduled_at)}` : ""}
                    </div>
                  </div>
                  <span className={`chip ${meta.cls}`}>{meta.label}</span>
                  <div className="flex gap-1.5">
                    {b.status === "cancelled" && (
                      <button
                        className="py-1 px-2.5 text-xs rounded-lg border border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
                        onClick={() => onPatch(b, "pending")}
                      >
                        Restaurar
                      </button>
                    )}
                    <button
                      className="py-1 px-2.5 text-xs rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                      onClick={() => onDelete(b)}
                      title="Eliminar"
                    >
                      <IconTrash width={13} height={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Próximas citas si no hay nada en el día seleccionado */}
      {upcoming.length > 0 && (
        <div className="panel p-5">
          <h3 className="text-sm uppercase tracking-wider text-violet-300/60 mb-3">
            {isAppt ? "Próximas citas" : "Reservas activas"}
          </h3>
          <div className="divide-y divide-[var(--color-edge-soft)]">
            {upcoming.slice(0, 8).map((b) => {
              const meta = STATUS_META[b.status];
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-violet-50">{b.customer_name}</div>
                    <div className="text-xs text-violet-300/60">
                      {b.service_name ?? b.notes ?? "Cita"}
                      {b.customer_phone ? ` · ${b.customer_phone}` : ""}
                    </div>
                  </div>
                  <div className="text-sm text-violet-100 whitespace-nowrap">
                    {b.scheduled_at ? formatSchedule(b.scheduled_at) : "—"}
                  </div>
                  <span className={`chip ${meta.cls}`}>{meta.label}</span>
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
                    <button
                      className="py-1 px-2 text-xs rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                      onClick={() => onDelete(b)}
                      title="Eliminar"
                    >
                      <IconTrash width={13} height={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AgendaEvent({ booking: b, isAppt, onPatch, onDelete }: {
  booking: Booking;
  isAppt: boolean;
  onPatch: (b: Booking, s: BookingStatus) => void;
  onDelete: (b: Booking) => void;
}) {
  const meta = STATUS_META[b.status];
  const colorMap: Record<string, string> = {
    pending:   "rgba(251,191,36,0.15)",
    confirmed: "rgba(125,211,252,0.12)",
    done:      "rgba(251,113,133,0.12)",
    cancelled: "rgba(107,98,128,0.1)",
  };
  return (
    <div
      className="rounded-xl px-3 py-2 text-sm flex flex-wrap items-center gap-2 border"
      style={{ background: colorMap[b.status], borderColor: "var(--color-edge-soft)" }}
    >
      <span className="font-mono text-[11px] text-violet-300/70 w-10 shrink-0">
        {b.scheduled_at?.slice(11, 16)}
      </span>
      <span className="font-medium text-violet-50 flex-1 truncate">{b.customer_name}</span>
      {b.service_name && <span className="text-xs text-violet-300/60 hidden sm:block truncate">{b.service_name}</span>}
      <span className={`chip text-[10px] ${meta.cls}`}>{meta.label}</span>
      <div className="flex gap-1 ml-auto">
        {b.status === "pending" && (
          <button className="text-[10px] px-2 py-0.5 rounded border border-[var(--color-edge)] text-violet-200 hover:bg-violet-500/20" onClick={() => onPatch(b, "confirmed")}>OK</button>
        )}
        {(b.status === "pending" || b.status === "confirmed") && (
          <button className="text-[10px] px-2 py-0.5 rounded border border-rose-500/30 text-rose-300 hover:bg-rose-500/10" onClick={() => onPatch(b, "cancelled")}>✕</button>
        )}
        <button className="text-[10px] px-1.5 py-0.5 rounded border border-rose-500/20 text-rose-400/70 hover:bg-rose-500/10" onClick={() => onDelete(b)} title="Eliminar">
          <IconTrash width={11} height={11} />
        </button>
      </div>
    </div>
  );
}

// ─── Formulario de nueva cita ───────────────────────────────────────

function BookingForm({
  services, config, demo, onCreated, onCancel,
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

  useEffect(() => { loadSlots(); }, [loadSlots]);

  async function submit() {
    if (!name.trim()) return setError("El nombre del cliente es obligatorio.");
    if (isAppt && !time) return setError("Elige una franja horaria.");
    if (!isAppt && !time) return setError("Indica la hora.");
    setBusy(true); setError(null);

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

// ─── Ajustes de agenda ──────────────────────────────────────────────

function AgendaSettings({ config, demo, onSave }: {
  config: BusinessConfig;
  demo: boolean;
  onSave: (c: BusinessConfig) => void;
}) {
  const [type, setType] = useState<BusinessType>(config.businessType);
  const [slot, setSlot] = useState(String(config.slotMin));
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
    setBusy(true); setSaved(false);
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
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "Guardando…" : "Guardar ajustes"}</button>
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
