import { OpenHours } from "./types";

/** "HH:mm" → minutos desde medianoche */
export function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** minutos → "HH:mm" */
export function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" → día de la semana (0=domingo … 6=sábado) */
export function weekday(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00`).getDay();
}

/** Fecha y minutos actuales en la zona del negocio (por defecto Madrid). */
export function nowParts(tz = "Europe/Madrid"): { dateKey: string; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date())) parts[p.type] = p.value;
  let hour = parseInt(parts.hour, 10);
  if (hour === 24) hour = 0;
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hour * 60 + parseInt(parts.minute, 10),
  };
}

/**
 * Trabajamos con la hora como "hora del negocio" usando los componentes
 * literales del string ("YYYY-MM-DDTHH:mm[...]"), sin conversión de zona.
 * Así lo que se elige en el panel es exactamente lo que se compara y guarda.
 */

/** De un scheduled_at devuelve la fecha "YYYY-MM-DD" */
export function dateKeyOf(iso: string): string {
  return iso.slice(0, 10);
}

/** Minutos desde medianoche del scheduled_at (lee HH:mm literal) */
export function minutesOf(iso: string): number {
  const hh = parseInt(iso.slice(11, 13), 10);
  const mm = parseInt(iso.slice(14, 16), 10);
  return (hh || 0) * 60 + (mm || 0);
}

export interface BusyInterval {
  start: number; // min
  end: number; // min
}

function overlaps(aS: number, aE: number, bS: number, bE: number): boolean {
  return aS < bE && bS < aE;
}

/**
 * Calcula las franjas de inicio disponibles para un día.
 * @param dateKey   "YYYY-MM-DD"
 * @param openHours horario de apertura por día
 * @param slotMin   granularidad de inicio (ej. 30)
 * @param durationMin duración del servicio (ej. 60)
 * @param busy      intervalos ya ocupados ese día (en minutos)
 */
export function availableSlots(
  dateKey: string,
  openHours: OpenHours,
  slotMin: number,
  durationMin: number,
  busy: BusyInterval[]
): string[] {
  const ranges = openHours[String(weekday(dateKey))] ?? [];
  const slots: string[] = [];

  for (const [open, close] of ranges) {
    const start = timeToMin(open);
    const end = timeToMin(close);
    for (let t = start; t + durationMin <= end; t += slotMin) {
      const conflict = busy.some((b) => overlaps(t, t + durationMin, b.start, b.end));
      if (!conflict) slots.push(minToTime(t));
    }
  }
  return slots;
}

/** Comprueba si una nueva cita solapa con las existentes (mismo día). */
export function hasConflict(
  startMin: number,
  durationMin: number,
  busy: BusyInterval[]
): boolean {
  return busy.some((b) => overlaps(startMin, startMin + durationMin, b.start, b.end));
}
