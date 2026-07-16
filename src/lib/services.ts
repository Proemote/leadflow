import { supabaseAdmin, isSupabaseConfigured } from "./supabase/admin";
import { Service } from "./types";
import { demoServices } from "./demo";

export async function getServices(onlyActive = false): Promise<Service[]> {
  if (!isSupabaseConfigured()) {
    const list = onlyActive ? demoServices.filter((s) => s.active) : demoServices;
    return [...list];
  }
  const sb = supabaseAdmin();
  let query = sb.from("services").select("*").order("category", { ascending: true });
  if (onlyActive) query = query.eq("active", true);
  const { data } = await query;
  return (data ?? []) as Service[];
}

export async function createService(
  input: Omit<Service, "id" | "created_at">
): Promise<Service> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("services").insert(input).select("*").single();
  if (error) throw error;
  return data as Service;
}

export async function updateService(
  id: string,
  patch: Partial<Omit<Service, "id" | "created_at">>
): Promise<Service> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("services")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Service;
}

export async function deleteService(id: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("services").delete().eq("id", id);
}

// ════════════════════════════════════════════════════════════════
// ─── Multi-User Functions (con user_id isolation) ──────────────
// ════════════════════════════════════════════════════════════════

export async function getServicesForUser(userId: string, onlyActive = false): Promise<Service[]> {
  if (!isSupabaseConfigured()) {
    const list = onlyActive ? demoServices.filter((s) => s.active) : demoServices;
    return [...list];
  }
  const sb = supabaseAdmin();
  let query = sb.from("services").select("*").eq("user_id", userId).order("category", { ascending: true });
  if (onlyActive) query = query.eq("active", true);
  const { data } = await query;
  return (data ?? []) as Service[];
}

export async function createServiceForUser(
  userId: string,
  input: Omit<Service, "id" | "created_at">
): Promise<Service> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("services")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as Service;
}

export async function updateServiceForUser(
  userId: string,
  id: string,
  patch: Partial<Omit<Service, "id" | "created_at">>
): Promise<Service> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("services")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Service;
}

export async function deleteServiceForUser(userId: string, id: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("services").delete().eq("id", id).eq("user_id", userId);
}

/** Texto del catálogo para inyectar en el contexto de Leo. */
export function servicesToContext(services: Service[]): string {
  const active = services.filter((s) => s.active);
  if (active.length === 0) return "";
  const lines = active.map((s) => {
    const price = (s.price_cents / 100).toLocaleString("es-ES", {
      style: "currency",
      currency: s.currency || "EUR",
      minimumFractionDigits: s.price_cents % 100 === 0 ? 0 : 2,
    });
    const dur = s.duration_min ? `, ${s.duration_min} min` : "";
    return `- ${s.name}: ${price}${dur}${s.description ? ` (${s.description})` : ""}`;
  });
  return lines.join("\n");
}
