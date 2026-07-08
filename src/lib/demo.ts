import {
  Contact,
  Lead,
  Message,
  ConversationSummary,
  Service,
  Booking,
  Operation,
  Opportunity,
  ContactService,
} from "./types";

/**
 * Datos demo: se usan automáticamente cuando Supabase NO está
 * configurado, para poder ver el panel sin backend. En producción
 * (con SUPABASE_* seteadas) nunca se usan.
 */

function ago(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

export const demoContacts: Contact[] = [
  { id: "c1", phone: "+5491134567890", name: "Elina Lopez", created_at: ago(2880), ad_source: "Meta Ads · Reels", ctwa_clid: "ctwa_abc1", blocked: false, bot_enabled: true },
  { id: "c2", phone: "+5491145678901", name: "Marcus Chen", created_at: ago(1440), ad_source: "Website", ctwa_clid: null, blocked: false, bot_enabled: true },
  { id: "c3", phone: "+5491156789012", name: "Sarah Jenkins", created_at: ago(720), ad_source: "Referido", ctwa_clid: null, blocked: false, bot_enabled: true },
  { id: "c4", phone: "+5491167890123", name: "Diego Fernández", created_at: ago(300), ad_source: "Meta Ads · Stories", ctwa_clid: "ctwa_def2", blocked: false, bot_enabled: true },
  { id: "c5", phone: "+5491178901234", name: null, created_at: ago(90), ad_source: "Eventos", ctwa_clid: null, blocked: false, bot_enabled: true },
  { id: "c6", phone: "+5491189012345", name: "Spam Bot", created_at: ago(60), ad_source: null, ctwa_clid: null, blocked: true, bot_enabled: false },
];

export const demoMessages: Record<string, Message[]> = {
  c1: [
    { id: "m1", contact_id: "c1", role: "user", content: "¡Hola! vi el anuncio, ¿hacéis campañas de meta ads?", created_at: ago(180), whatsapp_message_id: "wamid.1", status: "read" },
    { id: "m2", contact_id: "c1", role: "assistant", content: "¡Hola Elina! Sí. Cuéntame, ¿qué quieres lograr con las campañas?", created_at: ago(179), whatsapp_message_id: "wamid.2", status: "read" },
    { id: "m3", contact_id: "c1", role: "user", content: "Quiero más citas para mi clínica estética, ahora vienen muy pocas", created_at: ago(170), whatsapp_message_id: "wamid.3", status: "read" },
    { id: "m4", contact_id: "c1", role: "assistant", content: "Genial, eso lo trabajamos a menudo. ¿Cuántas citas por semana te gustaría sumar?", created_at: ago(169), whatsapp_message_id: "wamid.4", status: "read" },
    { id: "m5", contact_id: "c1", role: "user", content: "unas 20 más. ¿cuánto cuesta y cuándo podemos hablar?", created_at: ago(20), whatsapp_message_id: "wamid.5", status: "read" },
    { id: "m6", contact_id: "c1", role: "assistant", content: "Lo preparamos a medida. Te propongo una llamada de 30 min para verlo bien: calendly.com/agencia/30min 🙌", created_at: ago(19), whatsapp_message_id: "wamid.6", status: "delivered" },
  ],
  c2: [
    { id: "m10", contact_id: "c2", role: "user", content: "buenas, ¿hacéis páginas web?", created_at: ago(400), whatsapp_message_id: "wamid.10", status: "read" },
    { id: "m11", contact_id: "c2", role: "assistant", content: "¡Hola! Sí. ¿Qué necesitas resolver con la web?", created_at: ago(399), whatsapp_message_id: "wamid.11", status: "read" },
    { id: "m12", contact_id: "c2", role: "user", content: "tengo un ecommerce y vende poco, quiero mejorarlo", created_at: ago(390), whatsapp_message_id: "wamid.12", status: "read" },
    { id: "m13", contact_id: "c2", role: "assistant", content: "Entiendo. ¿Sabes más o menos cuánta gente entra y no compra?", created_at: ago(389), whatsapp_message_id: "wamid.13", status: "read" },
  ],
  c3: [
    { id: "m20", contact_id: "c3", role: "user", content: "Hola, me recomendó una amiga", created_at: ago(240), whatsapp_message_id: "wamid.20", status: "read" },
    { id: "m21", contact_id: "c3", role: "assistant", content: "¡Hola Sarah! Qué bien. Cuéntame, ¿en qué te puedo ayudar?", created_at: ago(239), whatsapp_message_id: "wamid.21", status: "read" },
    { id: "m22", contact_id: "c3", role: "user", content: "gracias, luego te escribo con más detalles", created_at: ago(235), whatsapp_message_id: "wamid.22", status: "read" },
  ],
  c4: [
    { id: "m30", contact_id: "c4", role: "user", content: "precios?", created_at: ago(50), whatsapp_message_id: "wamid.30", status: "read" },
    { id: "m31", contact_id: "c4", role: "assistant", content: "¡Hola! Depende de lo que necesites. ¿Qué te gustaría lograr?", created_at: ago(49), whatsapp_message_id: "wamid.31", status: "delivered" },
  ],
  c5: [
    { id: "m40", contact_id: "c5", role: "user", content: "hola", created_at: ago(85), whatsapp_message_id: "wamid.40", status: "read" },
    { id: "m41", contact_id: "c5", role: "assistant", content: "¡Hola! ¿Qué estás buscando resolver hoy?", created_at: ago(84), whatsapp_message_id: "wamid.41", status: "sent" },
  ],
  c6: [
    { id: "m50", contact_id: "c6", role: "user", content: "GANA DINERO RÁPIDO haz clic aquí", created_at: ago(58), whatsapp_message_id: "wamid.50", status: "read" },
  ],
};

export const demoLeads: Lead[] = [
  { id: "l1", contact_id: "c1", score: "hot", reason: "Pidió precio y quiere agendar llamada. Interés concreto en Meta Ads para su clínica.", qualified_at: ago(18), notified: true },
  { id: "l2", contact_id: "c2", score: "warm", reason: "Tiene un problema real (ecommerce convierte poco) pero todavía no pidió reunión.", qualified_at: ago(385), notified: false },
  { id: "l3", contact_id: "c4", score: "warm", reason: "Preguntó por precios directo, falta entender la necesidad.", qualified_at: ago(48), notified: false },
  { id: "l4", contact_id: "c6", score: "cold", reason: "Spam / mensaje automático sin interés real.", qualified_at: ago(57), notified: false },
];

// ─── Servicios demo (ejemplo: clínica de belleza, modo citas) ───
export const demoServices: Service[] = [
  { id: "s1", name: "Limpieza facial profunda", description: "Higiene facial completa con extracción e hidratación.", price_cents: 4500, currency: "EUR", duration_min: 60, category: "Facial", active: true, created_at: ago(10000) },
  { id: "s2", name: "Manicura semipermanente", description: "Esmaltado de larga duración.", price_cents: 2500, currency: "EUR", duration_min: 45, category: "Uñas", active: true, created_at: ago(9000) },
  { id: "s3", name: "Masaje relajante", description: "Masaje corporal de 90 minutos.", price_cents: 6000, currency: "EUR", duration_min: 90, category: "Masajes", active: true, created_at: ago(8000) },
  { id: "s4", name: "Corte y peinado", description: "Corte personalizado y peinado.", price_cents: 2000, currency: "EUR", duration_min: 30, category: "Peluquería", active: true, created_at: ago(7000) },
  { id: "s5", name: "Depilación láser (sesión)", description: "Sesión por zona pequeña.", price_cents: 3500, currency: "EUR", duration_min: 30, category: "Depilación", active: false, created_at: ago(6000) },
];

/** Construye una fecha-hora local literal "YYYY-MM-DDTHH:mm:00" (sin zona). */
function at(dayOffset: number, hhmm: string): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `${ymd}T${hhmm}:00`;
}

export const demoBookings: Booking[] = [
  { id: "b1", contact_id: "c1", service_id: "s1", customer_name: "Elina Lopez", customer_phone: "+34611111111", scheduled_at: at(0, "11:00"), duration_min: 60, party_size: null, status: "confirmed", notes: "Primera visita.", created_at: ago(120), service_name: "Limpieza facial profunda" },
  { id: "b2", contact_id: "c3", service_id: "s2", customer_name: "Sarah Jenkins", customer_phone: "+34622222222", scheduled_at: at(0, "16:30"), duration_min: 45, party_size: null, status: "pending", notes: null, created_at: ago(90), service_name: "Manicura semipermanente" },
  { id: "b3", contact_id: null, service_id: "s3", customer_name: "Lucía Romero", customer_phone: "+34633333333", scheduled_at: at(1, "10:00"), duration_min: 90, party_size: null, status: "confirmed", notes: null, created_at: ago(60), service_name: "Masaje relajante" },
  { id: "b4", contact_id: "c4", service_id: "s4", customer_name: "Diego Fernández", customer_phone: "+34644444444", scheduled_at: at(2, "12:30"), duration_min: 30, party_size: null, status: "done", notes: null, created_at: ago(2000), service_name: "Corte y peinado" },
];

export const demoContactServices: ContactService[] = [
  { id: "cs1", contact_id: "c1", service_id: "s1", status: "contratado", notes: null, created_at: ago(200), service_name: "Limpieza facial profunda", service_price_cents: 4500, service_currency: "EUR" },
  { id: "cs2", contact_id: "c1", service_id: "s3", status: "completado", notes: "Sesión de regalo por fidelidad.", created_at: ago(4000), service_name: "Masaje relajante", service_price_cents: 6000, service_currency: "EUR" },
  { id: "cs3", contact_id: "c2", service_id: "s2", status: "cancelado", notes: null, created_at: ago(1000), service_name: "Manicura semipermanente", service_price_cents: 2500, service_currency: "EUR" },
];

// ─── Cartera de clientes demo: enriquecemos algunos contactos ───
for (const c of demoContacts) {
  if (c.id === "c1") { c.email = "elina@clinicaglow.es"; c.company = "Clínica Glow"; c.tags = ["VIP", "Estética"]; }
  if (c.id === "c2") { c.email = "marcus@chenstore.com"; c.company = "Chen Store"; c.tags = ["Ecommerce"]; }
  if (c.id === "c3") { c.email = "sarah@jenkins.io"; c.company = "Jenkins & Co"; c.tags = ["Referido"]; }
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export const demoOperations: Operation[] = [
  // c1 — cliente activo y recurrente
  { id: "o1", contact_id: "c1", concept: "Campaña Meta Ads (mensual)", amount_cents: 60000, currency: "EUR", status: "completed", source: "manual", opportunity_id: null, date: daysAgo(280), created_at: daysAgo(280) },
  { id: "o2", contact_id: "c1", concept: "Campaña Meta Ads (mensual)", amount_cents: 60000, currency: "EUR", status: "completed", source: "manual", opportunity_id: null, date: daysAgo(160), created_at: daysAgo(160) },
  { id: "o3", contact_id: "c1", concept: "Diseño de landing", amount_cents: 90000, currency: "EUR", status: "completed", source: "manual", opportunity_id: null, date: daysAgo(40), created_at: daysAgo(40) },
  // c2 — una compra, en riesgo
  { id: "o4", contact_id: "c2", concept: "Auditoría ecommerce", amount_cents: 45000, currency: "EUR", status: "completed", source: "manual", opportunity_id: null, date: daysAgo(120), created_at: daysAgo(120) },
  // c3 — compra antigua, inactivo
  { id: "o5", contact_id: "c3", concept: "Branding básico", amount_cents: 120000, currency: "EUR", status: "completed", source: "manual", opportunity_id: null, date: daysAgo(400), created_at: daysAgo(400) },
  // pendiente (no cuenta para CLV)
  { id: "o6", contact_id: "c1", concept: "Vídeo promocional", amount_cents: 80000, currency: "EUR", status: "pending", source: "manual", opportunity_id: null, date: daysAgo(5), created_at: daysAgo(5) },
];

export const demoOpportunities: Opportunity[] = [
  { id: "op1", title: "Web corporativa", contact_id: "c4", contact_name: "Diego Fernández", value_cents: 250000, currency: "EUR", probability: 40, stage: "Cualificado", expected_close: daysAgo(-20).slice(0, 10), owner: "Alex", last_activity: "Enviada propuesta inicial", created_at: daysAgo(12), updated_at: daysAgo(2) },
  { id: "op2", title: "Gestión RRSS anual", contact_id: "c2", contact_name: "Marcus Chen", value_cents: 360000, currency: "EUR", probability: 60, stage: "Propuesta", expected_close: daysAgo(-10).slice(0, 10), owner: "Elina", last_activity: "Pendiente de aprobación", created_at: daysAgo(20), updated_at: daysAgo(1) },
  { id: "op3", title: "Tienda online", contact_id: "c5", contact_name: "Lucía Romero", value_cents: 180000, currency: "EUR", probability: 20, stage: "Contactado", expected_close: daysAgo(-30).slice(0, 10), owner: "Alex", last_activity: "Primer contacto", created_at: daysAgo(6), updated_at: daysAgo(6) },
  { id: "op4", title: "Rediseño marca", contact_id: "c3", contact_name: "Sarah Jenkins", value_cents: 140000, currency: "EUR", probability: 80, stage: "Negociación", expected_close: daysAgo(-5).slice(0, 10), owner: "Elina", last_activity: "Negociando alcance", created_at: daysAgo(25), updated_at: daysAgo(1) },
  { id: "op5", title: "Campaña lanzamiento", contact_id: "c1", contact_name: "Elina Lopez", value_cents: 300000, currency: "EUR", probability: 100, stage: "Ganado", expected_close: daysAgo(15).slice(0, 10), owner: "Alex", last_activity: "Cerrada y facturada", created_at: daysAgo(60), updated_at: daysAgo(15) },
  { id: "op6", title: "SEO local", contact_id: null, contact_name: null, value_cents: 90000, currency: "EUR", probability: 0, stage: "Perdido", expected_close: daysAgo(20).slice(0, 10), owner: "Alex", last_activity: "Eligió a otra agencia", created_at: daysAgo(50), updated_at: daysAgo(20) },
  { id: "op7", title: "Newsletter mensual", contact_id: null, contact_name: null, value_cents: 60000, currency: "EUR", probability: 10, stage: "Nuevo", expected_close: null, owner: "Elina", last_activity: "Lead entrante", created_at: daysAgo(1), updated_at: daysAgo(1) },
];

export function buildDemoConversations(): ConversationSummary[] {
  return demoContacts.map((contact) => {
    const msgs = demoMessages[contact.id] ?? [];
    const lead = demoLeads.find((l) => l.contact_id === contact.id) ?? null;
    return {
      contact,
      lastMessage: msgs.length ? msgs[msgs.length - 1] : null,
      lead,
      unreadFromUser: 0,
      messageCount: msgs.length,
    };
  });
}
