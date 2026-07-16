import { supabaseAdmin, isSupabaseConfigured } from "./supabase/admin";
import { Booking, BookingStatus } from "./types";
import { demoBookings, demoServices } from "./demo";
import { getBusinessConfig } from "./business";
import {
  availableSlots,
  hasConflict,
  dateKeyOf,
  minutesOf,
  timeToMin,
  weekday,
  nowParts,
  BusyInterval,
} from "./availability";

const ACTIVE_STATUSES: BookingStatus[] = ["pending", "confirmed"];

export async function getBookings(): Promise<Booking[]> {
  if (!isSupabaseConfigured()) {
    return [...demoBookings].sort((a, b) =>
      (b.scheduled_at ?? b.created_at).localeCompare(a.scheduled_at ?? a.created_at)
    );
  }
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("bookings")
    .select("*, service:services(name)")
    .order("scheduled_at", { ascending: false, nullsFirst: false });

  return ((data ?? []) as (Booking & { service?: { name?: string } | null })[]).map(
    (b) => ({ ...b, service_name: b.service?.name ?? null })
  );
}

/** Intervalos ocupados (min) de un día concreto, para citas activas. */
async function busyForDate(dateKey: string): Promise<BusyInterval[]> {
  let rows: Pick<Booking, "scheduled_at" | "duration_min" | "status">[];
  if (!isSupabaseConfigured()) {
    rows = demoBookings;
  } else {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("bookings")
      .select("scheduled_at, duration_min, status")
      .in("status", ACTIVE_STATUSES);
    rows = (data ?? []) as typeof rows;
  }
  return rows
    .filter(
      (b) =>
        b.scheduled_at &&
        ACTIVE_STATUSES.includes(b.status) &&
        dateKeyOf(b.scheduled_at) === dateKey
    )
    .map((b) => {
      const start = minutesOf(b.scheduled_at!);
      return { start, end: start + (b.duration_min ?? 30) };
    });
}

export interface AvailabilityResult {
  slots: string[];
  closed: boolean;
}

/** Franjas disponibles para una fecha y un servicio (modo citas). */
export async function getAvailability(
  dateKey: string,
  durationMin: number
): Promise<AvailabilityResult> {
  const cfg = await getBusinessConfig();
  const ranges = cfg.openHours[String(new Date(`${dateKey}T12:00:00`).getDay())] ?? [];
  if (ranges.length === 0) return { slots: [], closed: true };
  const busy = await busyForDate(dateKey);
  const slots = availableSlots(dateKey, cfg.openHours, cfg.slotMin, durationMin, busy);
  return { slots, closed: false };
}

/** Mapa fecha → intervalos ocupados, cargando las citas activas de una vez. */
async function activeBusyMap(): Promise<Map<string, BusyInterval[]>> {
  let rows: Pick<Booking, "scheduled_at" | "duration_min" | "status">[];
  if (!isSupabaseConfigured()) {
    rows = demoBookings;
  } else {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("bookings")
      .select("scheduled_at, duration_min, status")
      .in("status", ACTIVE_STATUSES);
    rows = (data ?? []) as typeof rows;
  }
  const map = new Map<string, BusyInterval[]>();
  for (const b of rows) {
    if (!b.scheduled_at || !ACTIVE_STATUSES.includes(b.status)) continue;
    const dk = dateKeyOf(b.scheduled_at);
    const start = minutesOf(b.scheduled_at);
    const arr = map.get(dk) ?? [];
    arr.push({ start, end: start + (b.duration_min ?? 30) });
    map.set(dk, arr);
  }
  return map;
}

export interface UpcomingDay {
  dateKey: string;
  slots: string[];
}

/**
 * Próximos huecos disponibles (modo citas), para que Leo proponga horas
 * concretas. Usa `durationMin` como colchón (idealmente la duración máxima
 * de los servicios) para que cualquier hueco propuesto sea válido.
 */
export async function getUpcomingAvailability(
  durationMin: number,
  opts: { maxDays?: number; maxPerDay?: number; horizon?: number } = {}
): Promise<UpcomingDay[]> {
  const { maxDays = 4, maxPerDay = 4, horizon = 21 } = opts;
  const cfg = await getBusinessConfig();
  if (cfg.businessType !== "appointments") return [];

  const busyMap = await activeBusyMap();
  const { dateKey: today, minutes: nowMin } = nowParts();
  const out: UpcomingDay[] = [];

  const cursor = new Date(`${today}T12:00:00`);
  for (let i = 0; i < horizon && out.length < maxDays; i++) {
    const dk = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    const ranges = cfg.openHours[String(weekday(dk))] ?? [];
    if (ranges.length > 0) {
      let slots = availableSlots(dk, cfg.openHours, cfg.slotMin, durationMin, busyMap.get(dk) ?? []);
      if (dk === today) slots = slots.filter((s) => timeToMin(s) > nowMin);
      if (slots.length > 0) out.push({ dateKey: dk, slots: slots.slice(0, maxPerDay) });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export interface CreateBookingInput {
  service_id: string | null;
  customer_name: string;
  customer_phone?: string | null;
  scheduled_at?: string | null;
  duration_min?: number | null;
  party_size?: number | null;
  notes?: string | null;
  contact_id?: string | null;
}

/**
 * Crea una reserva. En modo citas valida que no solape con otra
 * activa. Lanza Error("SLOT_TAKEN") si la franja ya está ocupada.
 */
export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const cfg = await getBusinessConfig();

  if (cfg.businessType === "appointments" && input.scheduled_at && input.duration_min) {
    const dateKey = dateKeyOf(input.scheduled_at);
    const busy = await busyForDate(dateKey);
    if (hasConflict(minutesOf(input.scheduled_at), input.duration_min, busy)) {
      throw new Error("SLOT_TAKEN");
    }
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("bookings")
    .insert({
      service_id: input.service_id,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone ?? null,
      scheduled_at: input.scheduled_at ?? null,
      duration_min: input.duration_min ?? null,
      party_size: input.party_size ?? null,
      notes: input.notes ?? null,
      contact_id: input.contact_id ?? null,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Booking;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("bookings").update({ status }).eq("id", id);
}

/** Resumen para métricas / dashboard. */
export async function getUpcomingCount(): Promise<number> {
  const all = await getBookings();
  const now = Date.now();
  return all.filter(
    (b) =>
      b.scheduled_at &&
      new Date(b.scheduled_at).getTime() >= now &&
      ACTIVE_STATUSES.includes(b.status)
  ).length;
}

export async function deleteBooking(id: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("bookings").delete().eq("id", id);
}

export { demoServices };

// ════════════════════════════════════════════════════════════════
// ─── Multi-User Functions (con user_id isolation) ──────────────
// ════════════════════════════════════════════════════════════════

export async function getBookingsForUser(userId: string): Promise<Booking[]> {
  if (!isSupabaseConfigured()) return [];
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .order("scheduled_at", { ascending: true });
  return (data ?? []) as Booking[];
}

export async function createBookingForUser(
  userId: string,
  input: {
    contact_id: string | null;
    service_id: string | null;
    customer_name: string;
    customer_phone?: string | null;
    scheduled_at?: string | null;
    duration_min?: number | null;
    party_size?: number | null;
    status?: "pending" | "confirmed" | "cancelled" | "done";
    notes?: string | null;
  }
): Promise<Booking> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("bookings")
    .insert({
      contact_id: input.contact_id || null,
      service_id: input.service_id || null,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone || null,
      scheduled_at: input.scheduled_at || null,
      duration_min: input.duration_min || null,
      party_size: input.party_size || null,
      status: input.status || "pending",
      notes: input.notes || null,
      user_id: userId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Booking;
}

export async function updateBookingStatusForUser(
  userId: string,
  id: string,
  status: "pending" | "confirmed" | "cancelled" | "done"
): Promise<void> {
  const sb = supabaseAdmin();
  await sb
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .eq("user_id", userId);
}

export async function deleteBookingForUser(userId: string, id: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("bookings").delete().eq("id", id).eq("user_id", userId);
}
