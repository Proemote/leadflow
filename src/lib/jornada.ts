import { supabaseAdmin, isSupabaseConfigured } from "./supabase/admin";

export { isSupabaseConfigured };

/**
 * Persistencia del checklist diario de /jornada.
 * Cada fila = un ítem marcado como completado en una fecha concreta.
 * item_key: 'lead_caliente:{contacto_id}' · 'cita:{cita_id}' ·
 *           'oportunidad:{oportunidad_id}' · 'sugerencia:{contacto_id}'
 */

export async function getJornadaCompletadosForUser(
  userId: string,
  fecha: string
): Promise<string[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("jornada_completados")
    .select("item_key")
    .eq("user_id", userId)
    .eq("fecha", fecha);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.item_key as string);
}

export async function markJornadaItemForUser(
  userId: string,
  fecha: string,
  itemKey: string,
  completadoPor?: string | null
): Promise<void> {
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("jornada_completados")
    .upsert(
      { user_id: userId, fecha, item_key: itemKey, completado_por: completadoPor ?? null },
      { onConflict: "user_id,fecha,item_key" }
    );
  if (error) throw new Error(error.message);
}

export async function unmarkJornadaItemForUser(
  userId: string,
  fecha: string,
  itemKey: string
): Promise<void> {
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("jornada_completados")
    .delete()
    .eq("user_id", userId)
    .eq("fecha", fecha)
    .eq("item_key", itemKey);
  if (error) throw new Error(error.message);
}
