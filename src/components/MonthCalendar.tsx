"use client";

import { useMemo, useState } from "react";
import { Booking } from "@/lib/types";
import { dateKeyOf } from "@/lib/availability";

const DOW = ["L", "M", "X", "J", "V", "S", "D"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const STATUS_DOT: Record<string, string> = {
  pending: "#fbbf24",
  confirmed: "#7dd3fc",
  done: "#fb7185",
  cancelled: "#6b6280",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  done: "Realizada",
  cancelled: "Cancelada",
};

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Matriz de semanas (lunes→domingo) que cubren el mes dado. */
function monthMatrix(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  // getDay: 0=dom … 6=sáb → desplazamiento para que la semana empiece en lunes
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const weeks: Date[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    // Parar si ya hemos pasado el mes y completado la semana
    if (cursor.getMonth() !== month && cursor > new Date(year, month + 1, 1)) break;
  }
  return weeks;
}

export function MonthCalendar({ bookings }: { bookings: Booking[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState<string | null>(ymd(today));

  // Agrupar reservas por día (solo las que tienen fecha)
  const byDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      if (!b.scheduled_at) continue;
      const k = dateKeyOf(b.scheduled_at);
      const arr = map.get(k) ?? [];
      arr.push(b);
      map.set(k, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));
    }
    return map;
  }, [bookings]);

  const weeks = useMemo(() => monthMatrix(cursor.y, cursor.m), [cursor]);
  const todayKey = ymd(today);

  function shift(delta: number) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  const selectedList = selected ? byDay.get(selected) ?? [] : [];

  return (
    <div className="panel p-5">
      {/* Cabecera de navegación */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-violet-50 capitalize">
          {MESES[cursor.m]} {cursor.y}
        </h3>
        <div className="flex gap-2">
          <button className="btn-ghost py-1.5 px-3" onClick={() => shift(-1)}>←</button>
          <button className="btn-ghost py-1.5 px-3" onClick={() => setCursor({ y: today.getFullYear(), m: today.getMonth() })}>Hoy</button>
          <button className="btn-ghost py-1.5 px-3" onClick={() => shift(1)}>→</button>
        </div>
      </div>

      {/* Cabecera días */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {DOW.map((d) => (
          <div key={d} className="text-center text-[11px] uppercase tracking-wider text-violet-300/50 py-1">{d}</div>
        ))}
      </div>

      {/* Cuadrícula */}
      <div className="grid grid-cols-7 gap-1.5">
        {weeks.flat().map((day) => {
          const key = ymd(day);
          const inMonth = day.getMonth() === cursor.m;
          const items = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          const isSel = key === selected;
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className="min-h-[78px] rounded-xl border p-1.5 text-left transition flex flex-col gap-1"
              style={{
                background: isSel ? "rgba(124,58,237,0.22)" : inMonth ? "var(--panel-tight-bg)" : "transparent",
                borderColor: isSel ? "rgba(168,85,247,0.5)" : "var(--color-edge-soft)",
                opacity: inMonth ? 1 : 0.4,
              }}
            >
              <span
                className="text-xs font-semibold grid place-items-center size-5 rounded-full"
                style={isToday ? { background: "linear-gradient(140deg,#8b5cf6,#6d28d9)", color: "#fff" } : { color: "#cbbfe6" }}
              >
                {day.getDate()}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {items.slice(0, 2).map((b) => (
                  <span key={b.id} className="flex items-center gap-1 text-[10px] text-violet-100/90 truncate">
                    <span className="size-1.5 rounded-full shrink-0" style={{ background: STATUS_DOT[b.status] }} />
                    {b.scheduled_at?.slice(11, 16)} {b.customer_name.split(" ")[0]}
                  </span>
                ))}
                {items.length > 2 && (
                  <span className="text-[10px] text-violet-300/60">+{items.length - 2} más</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Detalle del día seleccionado */}
      {selected && (
        <div className="mt-5 pt-4 border-t border-[var(--color-edge-soft)]">
          <h4 className="text-sm font-semibold text-violet-100 mb-2 capitalize">
            {new Date(`${selected}T12:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </h4>
          {selectedList.length === 0 ? (
            <p className="text-sm text-violet-300/50">Sin reservas este día.</p>
          ) : (
            <div className="space-y-2">
              {selectedList.map((b) => (
                <div key={b.id} className="flex items-center gap-3 panel-tight px-3 py-2 text-sm">
                  <span className="font-mono text-violet-200 w-12">{b.scheduled_at?.slice(11, 16)}</span>
                  <span className="text-violet-50 font-medium flex-1 truncate">{b.customer_name}</span>
                  <span className="text-violet-300/60 truncate hidden sm:block">{b.service_name ?? b.notes ?? ""}</span>
                  <span className="flex items-center gap-1.5 text-xs text-violet-300/70">
                    <span className="size-2 rounded-full" style={{ background: STATUS_DOT[b.status] }} />
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
