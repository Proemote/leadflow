import { supabaseAdmin, isSupabaseConfigured } from "./supabase/admin";
import { Contact, Operation, CustomerSummary, Opportunity, Booking, ContactService } from "./types";
import { computeCustomerMetrics } from "./metrics";
import { demoContacts, demoOperations, demoContactServices } from "./demo";

export interface PortfolioAggregate {
  totalClientes: number;
  clientesConCompra: number;
  clvMedioCents: number;
  pctRecurrentes: number; // 0..1 sobre clientes con compra
  ingresosTotalesCents: number;
}

export interface CustomerListResult {
  customers: CustomerSummary[];
  aggregate: PortfolioAggregate;
}

async function loadContactsAndOps(): Promise<{
  contacts: Contact[];
  opsByContact: Map<string, Operation[]>;
}> {
  let contacts: Contact[];
  let operations: Operation[];

  if (!isSupabaseConfigured()) {
    contacts = demoContacts;
    operations = demoOperations;
  } else {
    const sb = supabaseAdmin();
    const [{ data: c }, { data: o }] = await Promise.all([
      sb.from("contacts").select("*").order("created_at", { ascending: false }),
      sb.from("operations").select("*"),
    ]);
    contacts = (c ?? []) as Contact[];
    operations = (o ?? []) as Operation[];
  }

  const opsByContact = new Map<string, Operation[]>();
  for (const op of operations) {
    const arr = opsByContact.get(op.contact_id) ?? [];
    arr.push(op);
    opsByContact.set(op.contact_id, arr);
  }
  return { contacts, opsByContact };
}

export async function getCustomers(): Promise<CustomerListResult> {
  let { contacts, opsByContact } = await loadContactsAndOps();

  // En modo demo, incluir contactos temporales guardados en localStorage
  if (!isSupabaseConfigured() && typeof window !== "undefined") {
    try {
      const tempContacts = JSON.parse(localStorage.getItem("temp_contacts") || "[]");
      contacts = [...contacts, ...tempContacts].filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
    } catch (e) {
      // Ignorar errores de localStorage
    }
  }

  const customers: CustomerSummary[] = contacts.map((contact) => ({
    contact,
    metrics: computeCustomerMetrics(contact, opsByContact.get(contact.id) ?? []),
  }));

  const conCompra = customers.filter((c) => c.metrics.nOps > 0);
  const ingresos = customers.reduce((s, c) => s + c.metrics.clvCents, 0);
  const recurrentes = conCompra.filter((c) => c.metrics.recurrente).length;

  const aggregate: PortfolioAggregate = {
    totalClientes: customers.length,
    clientesConCompra: conCompra.length,
    clvMedioCents: conCompra.length ? Math.round(ingresos / conCompra.length) : 0,
    pctRecurrentes: conCompra.length ? recurrentes / conCompra.length : 0,
    ingresosTotalesCents: ingresos,
  };

  // Orden por CLV desc por defecto
  customers.sort((a, b) => b.metrics.clvCents - a.metrics.clvCents);
  return { customers, aggregate };
}

export async function getCustomer(id: string): Promise<{
  contact: Contact;
  operations: Operation[];
  opportunities: Opportunity[];
  bookings: Booking[];
  contractedServices: ContactService[];
} | null> {
  if (!isSupabaseConfigured()) {
    const contact = demoContacts.find((c) => c.id === id);
    if (!contact) return null;
    return {
      contact,
      operations: demoOperations.filter((o) => o.contact_id === id).sort((a, b) => b.date.localeCompare(a.date)),
      opportunities: [],
      bookings: [],
      contractedServices: demoContactServices.filter((cs) => cs.contact_id === id),
    };
  }
  const sb = supabaseAdmin();
  const { data: contact } = await sb.from("contacts").select("*").eq("id", id).single();
  if (!contact) return null;
  const [{ data: ops }, { data: opps }, { data: bks }, { data: css }] = await Promise.all([
    sb.from("operations").select("*").eq("contact_id", id).order("date", { ascending: false }),
    sb.from("opportunities").select("*").eq("contact_id", id).order("updated_at", { ascending: false }),
    sb.from("bookings").select("*, service:services(name)").eq("contact_id", id).order("scheduled_at", { ascending: false }),
    sb.from("contact_services").select("*, service:services(name, price_cents, currency)").eq("contact_id", id).order("created_at", { ascending: false }),
  ]);
  const bookings = ((bks ?? []) as (Booking & { service?: { name?: string } | null })[]).map(
    (b) => ({ ...b, service_name: b.service?.name ?? null })
  );
  const contractedServices = ((css ?? []) as (ContactService & { service?: { name?: string; price_cents?: number; currency?: string } | null })[]).map(
    (cs) => ({ ...cs, service_name: cs.service?.name ?? null, service_price_cents: cs.service?.price_cents ?? null, service_currency: cs.service?.currency ?? null })
  );
  return {
    contact: contact as Contact,
    operations: (ops ?? []) as Operation[],
    opportunities: (opps ?? []) as Opportunity[],
    bookings,
    contractedServices,
  };
}

export async function createContact(input: {
  name: string;
  surname?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  tags?: string[];
  notes?: string | null;
  ad_source?: string | null;
}): Promise<Contact> {
  if (!isSupabaseConfigured()) {
    return {
      id: `tmp-${Date.now()}`,
      name: input.name,
      surname: input.surname || null,
      phone: input.phone || null,
      email: input.email || null,
      company: input.company || null,
      tags: input.tags ?? [],
      notes: input.notes || null,
      ad_source: input.ad_source || "Manual",
      ctwa_clid: null,
      blocked: false,
      bot_enabled: true,
      created_at: new Date().toISOString(),
    };
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("contacts")
    .insert({
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      company: input.company || null,
      tags: input.tags ?? [],
      notes: input.notes || null,
      ad_source: input.ad_source || "Manual",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Contact;
}

export async function updateContact(
  id: string,
  patch: Partial<Pick<Contact, "name" | "surname" | "phone" | "email" | "company" | "tags" | "notes" | "journey_stage">>
): Promise<Contact> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("contacts")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Contact;
}

export async function addOperation(input: {
  contact_id: string;
  concept: string;
  amount_cents: number;
  status?: string;
  date?: string;
  source?: string;
  opportunity_id?: string | null;
}): Promise<Operation> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("operations")
    .insert({
      contact_id: input.contact_id,
      concept: input.concept,
      amount_cents: Math.max(0, Math.round(input.amount_cents)),
      currency: "EUR",
      status: input.status ?? "completed",
      source: input.source ?? "manual",
      opportunity_id: input.opportunity_id ?? null,
      date: input.date ?? new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Operation;
}
