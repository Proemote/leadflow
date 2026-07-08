import { supabaseAdmin, isSupabaseConfigured } from "./supabase/admin";
import { ContactService, ContactServiceStatus } from "./types";
import { demoContactServices } from "./demo";

export async function getContactServices(contactId: string): Promise<ContactService[]> {
  if (!isSupabaseConfigured()) {
    return demoContactServices
      .filter((cs) => cs.contact_id === contactId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("contact_services")
    .select("*, service:services(name, price_cents, currency)")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as (ContactService & { service?: { name?: string; price_cents?: number; currency?: string } | null })[]).map(
    (cs) => ({
      ...cs,
      service_name: cs.service?.name ?? null,
      service_price_cents: cs.service?.price_cents ?? null,
      service_currency: cs.service?.currency ?? null,
    })
  );
}

export async function assignService(input: {
  contact_id: string;
  service_id: string;
  status?: ContactServiceStatus;
  notes?: string | null;
}): Promise<ContactService> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("contact_services")
    .insert({
      contact_id: input.contact_id,
      service_id: input.service_id,
      status: input.status ?? "contratado",
      notes: input.notes ?? null,
    })
    .select("*, service:services(name, price_cents, currency)")
    .single();
  if (error) throw error;
  const cs = data as ContactService & { service?: { name?: string; price_cents?: number; currency?: string } | null };
  return {
    ...cs,
    service_name: cs.service?.name ?? null,
    service_price_cents: cs.service?.price_cents ?? null,
    service_currency: cs.service?.currency ?? null,
  };
}

export async function updateContactServiceStatus(id: string, status: ContactServiceStatus): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("contact_services").update({ status }).eq("id", id);
}

export async function deleteContactService(id: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("contact_services").delete().eq("id", id);
}
