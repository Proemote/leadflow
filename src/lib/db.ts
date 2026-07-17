import { supabaseAdmin, isSupabaseConfigured } from "./supabase/admin";
import {
  Contact,
  Lead,
  Message,
  MessageStatus,
  LeadScore,
  ConversationSummary,
} from "./types";
import {
  buildDemoConversations,
  demoContacts,
  demoMessages,
  demoLeads,
} from "./demo";

export { isSupabaseConfigured };

// ─── Lecturas para la UI (con fallback a demo) ──────────────────

export async function getConversations(): Promise<ConversationSummary[]> {
  if (!isSupabaseConfigured()) return buildDemoConversations().filter((c) => c.messageCount > 0);
  const sb = supabaseAdmin();

  const { data: contacts } = await sb
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: messages } = await sb
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: leads } = await sb
    .from("leads")
    .select("*")
    .order("qualified_at", { ascending: false });

  const list: ConversationSummary[] = (contacts ?? []).map((c: Contact) => {
    const cMsgs = (messages ?? []).filter((m: Message) => m.contact_id === c.id);
    const lead = (leads ?? []).find((l: Lead) => l.contact_id === c.id) ?? null;
    return {
      contact: c,
      lastMessage: cMsgs[0] ?? null,
      lead,
      unreadFromUser: 0,
      messageCount: cMsgs.length,
    };
  });

  // Solo conversaciones activas (con al menos un mensaje), ordenadas por último mensaje desc
  return list
    .filter((c) => c.messageCount > 0)
    .sort((a, b) => {
      const ta = a.lastMessage?.created_at ?? a.contact.created_at;
      const tb = b.lastMessage?.created_at ?? b.contact.created_at;
      return tb.localeCompare(ta);
    });
}

export async function getConversation(contactId: string): Promise<{
  contact: Contact;
  messages: Message[];
  lead: Lead | null;
} | null> {
  if (!isSupabaseConfigured()) {
    const contact = demoContacts.find((c) => c.id === contactId);
    if (!contact) return null;
    return {
      contact,
      messages: demoMessages[contactId] ?? [],
      lead: demoLeads.find((l) => l.contact_id === contactId) ?? null,
    };
  }
  const sb = supabaseAdmin();
  const { data: contact } = await sb
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();
  if (!contact) return null;

  const { data: messages } = await sb
    .from("messages")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true });

  const { data: lead } = await sb
    .from("leads")
    .select("*")
    .eq("contact_id", contactId)
    .order("qualified_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { contact, messages: messages ?? [], lead: lead ?? null };
}

export interface DashboardMetrics {
  activeLeads: number;
  hot: number;
  warm: number;
  cold: number;
  totalContacts: number;
  totalMessages: number;
  sources: { label: string; count: number }[];
  hotPct: number;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  let contacts: Contact[];
  let leads: Lead[];
  let messageCount: number;

  if (!isSupabaseConfigured()) {
    contacts = demoContacts;
    leads = demoLeads;
    messageCount = Object.values(demoMessages).reduce((a, m) => a + m.length, 0);
  } else {
    const sb = supabaseAdmin();
    const [{ data: c }, { data: l }, { count }] = await Promise.all([
      sb.from("contacts").select("*"),
      sb.from("leads").select("*"),
      sb.from("messages").select("*", { count: "exact", head: true }),
    ]);
    contacts = (c as Contact[]) ?? [];
    leads = (l as Lead[]) ?? [];
    messageCount = count ?? 0;
  }

  const hot = leads.filter((l) => l.score === "hot").length;
  const warm = leads.filter((l) => l.score === "warm").length;
  const cold = leads.filter((l) => l.score === "cold").length;
  const total = leads.length || 1;

  const sourceMap = new Map<string, number>();
  for (const c of contacts) {
    const key = c.ad_source ?? "Directo";
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
  }
  const sources = [...sourceMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return {
    activeLeads: leads.length,
    hot,
    warm,
    cold,
    totalContacts: contacts.length,
    totalMessages: messageCount,
    sources,
    hotPct: Math.round((hot / total) * 100),
  };
}

export async function getWeeklyActivity(): Promise<
  { label: string; value: number }[]
> {
  const weeks = [0, 1, 2, 3]; // W4..W1 (más viejo a más nuevo)
  if (!isSupabaseConfigured()) {
    return [
      { label: "S1", value: 38 },
      { label: "S2", value: 52 },
      { label: "S3", value: 74 },
      { label: "S4", value: 61 },
    ];
  }
  const sb = supabaseAdmin();
  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const out: { label: string; value: number }[] = [];
  for (const w of [...weeks].reverse()) {
    const start = new Date(now - (w + 1) * WEEK).toISOString();
    const end = new Date(now - w * WEEK).toISOString();
    const { count } = await sb
      .from("messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", start)
      .lt("created_at", end);
    out.push({ label: `S${4 - w}`, value: count ?? 0 });
  }
  return out;
}

// ─── Escrituras (requieren Supabase) ────────────────────────────

export async function getOrCreateContact(
  phone: string,
  extra: Partial<Pick<Contact, "name" | "ad_source" | "ctwa_clid">> = {}
): Promise<Contact> {
  const sb = supabaseAdmin();
  const { data: existing } = await sb
    .from("contacts")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    // Completar datos faltantes si llegan nuevos (ej: ad_source)
    const patch: Record<string, unknown> = {};
    if (extra.name && !existing.name) patch.name = extra.name;
    if (extra.ad_source && !existing.ad_source) patch.ad_source = extra.ad_source;
    if (extra.ctwa_clid && !existing.ctwa_clid) patch.ctwa_clid = extra.ctwa_clid;
    if (Object.keys(patch).length) {
      const { data: updated } = await sb
        .from("contacts")
        .update(patch)
        .eq("id", existing.id)
        .select("*")
        .single();
      return updated as Contact;
    }
    return existing as Contact;
  }

  const { data, error } = await sb
    .from("contacts")
    .insert({ phone, ...extra })
    .select("*")
    .single();
  if (error) throw error;
  return data as Contact;
}

export async function insertMessage(
  msg: Omit<Message, "id" | "created_at">
): Promise<Message> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("messages")
    .insert(msg)
    .select("*")
    .single();
  if (error) throw error;
  return data as Message;
}

export async function getRecentMessages(
  contactId: string,
  limit = 20
): Promise<Message[]> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("messages")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Message[]).reverse();
}

export async function updateMessageStatusByWamid(
  wamid: string,
  status: MessageStatus
): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("messages").update({ status }).eq("whatsapp_message_id", wamid);
}

export async function countUserMessages(contactId: string): Promise<number> {
  const sb = supabaseAdmin();
  const { count } = await sb
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("contact_id", contactId)
    .eq("role", "user");
  return count ?? 0;
}

export async function upsertLead(
  contactId: string,
  score: LeadScore,
  reason: string
): Promise<Lead> {
  const sb = supabaseAdmin();
  const { data: existing } = await sb
    .from("leads")
    .select("*")
    .eq("contact_id", contactId)
    .order("qualified_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { data } = await sb
      .from("leads")
      .update({ score, reason, qualified_at: new Date().toISOString(), notified: existing.notified && score !== "hot" })
      .eq("id", existing.id)
      .select("*")
      .single();
    return data as Lead;
  }
  const { data, error } = await sb
    .from("leads")
    .insert({ contact_id: contactId, score, reason })
    .select("*")
    .single();
  if (error) throw error;
  return data as Lead;
}

export async function markLeadNotified(leadId: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("leads").update({ notified: true }).eq("id", leadId);
}

export async function setContactFlag(
  contactId: string,
  patch: Partial<Pick<Contact, "blocked" | "bot_enabled">>
): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("contacts").update(patch).eq("id", contactId);
}

// ─── Settings ───────────────────────────────────────────────────

export async function getSetting(
  key: string,
  fallback = ""
): Promise<string> {
  if (!isSupabaseConfigured()) return fallback;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("settings").upsert({ key, value });
}

// ════════════════════════════════════════════════════════════════
// ─── Multi-User Functions (con user_id isolation) ──────────────
// Nuevas funciones que filtran por usuario. Los endpoints deben migrar aquí.
// ════════════════════════════════════════════════════════════════

export async function getConversationsForUser(
  userId: string
): Promise<ConversationSummary[]> {
  if (!isSupabaseConfigured()) return buildDemoConversations().filter((c) => c.messageCount > 0);
  const sb = supabaseAdmin();

  const { data: contacts } = await sb
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const { data: messages } = await sb
    .from("messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const { data: leads } = await sb
    .from("leads")
    .select("*")
    .eq("user_id", userId)
    .order("qualified_at", { ascending: false });

  const list: ConversationSummary[] = (contacts ?? []).map((c: Contact) => {
    const cMsgs = (messages ?? []).filter((m: Message) => m.contact_id === c.id);
    const lead = (leads ?? []).find((l: Lead) => l.contact_id === c.id) ?? null;
    return {
      contact: c,
      lastMessage: cMsgs[0] ?? null,
      lead,
      unreadFromUser: 0,
      messageCount: cMsgs.length,
    };
  });

  return list
    .filter((c) => c.messageCount > 0)
    .sort((a, b) => {
      const ta = a.lastMessage?.created_at ?? a.contact.created_at;
      const tb = b.lastMessage?.created_at ?? b.contact.created_at;
      return tb.localeCompare(ta);
    });
}

export async function getConversationForUser(
  userId: string,
  contactId: string
): Promise<{
  contact: Contact;
  messages: Message[];
  lead: Lead | null;
} | null> {
  if (!isSupabaseConfigured()) {
    const contact = demoContacts.find((c) => c.id === contactId);
    if (!contact) return null;
    return {
      contact,
      messages: demoMessages[contactId] ?? [],
      lead: demoLeads.find((l) => l.contact_id === contactId) ?? null,
    };
  }
  const sb = supabaseAdmin();
  const { data: contact } = await sb
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .eq("user_id", userId)
    .single();
  if (!contact) return null;

  const { data: messages } = await sb
    .from("messages")
    .select("*")
    .eq("contact_id", contactId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const { data: lead } = await sb
    .from("leads")
    .select("*")
    .eq("contact_id", contactId)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    contact,
    messages: messages ?? [],
    lead: (lead as Lead) ?? null,
  };
}

export async function insertMessageForUser(
  userId: string,
  msg: Omit<Message, "id" | "created_at" | "user_id">
): Promise<Message> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("messages")
    .insert({
      ...msg,
      user_id: userId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Message;
}

export async function getOrCreateContactForUser(
  userId: string,
  phone: string,
  extra?: Partial<Contact>
): Promise<Contact> {
  const sb = supabaseAdmin();
  const { data: existing } = await sb
    .from("contacts")
    .select("*")
    .eq("phone", phone)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing as Contact;

  const { data, error } = await sb
    .from("contacts")
    .insert({ phone, user_id: userId, ...extra })
    .select("*")
    .single();
  if (error) throw error;
  return data as Contact;
}

export async function getDashboardMetricsForUser(userId: string): Promise<DashboardMetrics> {
  let contacts: Contact[];
  let leads: Lead[];
  let messageCount: number;

  if (!isSupabaseConfigured()) {
    contacts = demoContacts;
    leads = demoLeads;
    messageCount = Object.values(demoMessages).reduce((a, m) => a + m.length, 0);
  } else {
    const sb = supabaseAdmin();
    const [{ data: c }, { data: l }, { count }] = await Promise.all([
      sb.from("contacts").select("*").eq("user_id", userId),
      sb.from("leads").select("*").eq("user_id", userId),
      sb.from("messages").select("*", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    contacts = (c as Contact[]) ?? [];
    leads = (l as Lead[]) ?? [];
    messageCount = count ?? 0;
  }

  const hot = leads.filter((l) => l.score === "hot").length;
  const warm = leads.filter((l) => l.score === "warm").length;
  const cold = leads.filter((l) => l.score === "cold").length;
  const total = leads.length || 1;

  const sourceMap = new Map<string, number>();
  for (const c of contacts) {
    const key = c.ad_source ?? "Directo";
    sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
  }
  const sources = [...sourceMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return {
    activeLeads: leads.length,
    hot,
    warm,
    cold,
    totalContacts: contacts.length,
    totalMessages: messageCount,
    sources,
    hotPct: Math.round((hot / total) * 100),
  };
}

export async function getWeeklyActivityForUser(
  userId: string
): Promise<{ label: string; value: number }[]> {
  const weeks = [0, 1, 2, 3]; // W4..W1 (más viejo a más nuevo)
  if (!isSupabaseConfigured()) {
    return [
      { label: "S1", value: 38 },
      { label: "S2", value: 52 },
      { label: "S3", value: 74 },
      { label: "S4", value: 61 },
    ];
  }
  const sb = supabaseAdmin();
  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const out: { label: string; value: number }[] = [];
  for (const w of [...weeks].reverse()) {
    const start = new Date(now - (w + 1) * WEEK).toISOString();
    const end = new Date(now - w * WEEK).toISOString();
    const { count } = await sb
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", start)
      .lt("created_at", end);
    out.push({ label: `S${4 - w}`, value: count ?? 0 });
  }
  return out;
}

export async function getRecentMessagesForUser(
  userId: string,
  contactId: string,
  limit = 20
): Promise<Message[]> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("messages")
    .select("*")
    .eq("contact_id", contactId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Message[]).reverse();
}

export async function setContactFlagForUser(
  userId: string,
  contactId: string,
  patch: Partial<Pick<Contact, "blocked" | "bot_enabled">>
): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("contacts").update(patch).eq("id", contactId).eq("user_id", userId);
}

export async function upsertLeadForUser(
  userId: string,
  contactId: string,
  score: LeadScore,
  reason: string
): Promise<Lead> {
  const sb = supabaseAdmin();
  const { data: existing } = await sb
    .from("leads")
    .select("*")
    .eq("contact_id", contactId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { data } = await sb
      .from("leads")
      .update({ score, reason, qualified_at: new Date().toISOString(), notified: existing.notified && score !== "hot" })
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    return data as Lead;
  }
  const { data, error } = await sb
    .from("leads")
    .insert({ contact_id: contactId, score, reason, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as Lead;
}
