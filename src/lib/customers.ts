import { supabaseAdmin, isSupabaseConfigured } from "./supabase/admin";
import { Contact, Operation, CustomerSummary } from "./types";
import { computeCustomerMetrics } from "./metrics";
import { demoContacts, demoOperations } from "./demo";

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
  const { contacts, opsByContact } = await loadContactsAndOps();

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
} | null> {
  if (!isSupabaseConfigured()) {
    const contact = demoContacts.find((c) => c.id === id);
    if (!contact) return null;
    return {
      contact,
      operations: demoOperations
        .filter((o) => o.contact_id === id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    };
  }
  const sb = supabaseAdmin();
  const { data: contact } = await sb.from("contacts").select("*").eq("id", id).single();
  if (!contact) return null;
  const { data: ops } = await sb
    .from("operations")
    .select("*")
    .eq("contact_id", id)
    .order("date", { ascending: false });
  return { contact: contact as Contact, operations: (ops ?? []) as Operation[] };
}

export async function createContact(input: {
  name: string;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  tags?: string[];
  notes?: string | null;
  ad_source?: string | null;
}): Promise<Contact> {
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
  patch: Partial<Pick<Contact, "name" | "phone" | "email" | "company" | "tags" | "notes">>
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
