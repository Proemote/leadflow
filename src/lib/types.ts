export type LeadScore = "hot" | "warm" | "cold";
export type MessageRole = "user" | "assistant";
export type MessageStatus = "sent" | "delivered" | "read" | "failed";

export interface Contact {
  id: string;
  phone: string;
  name: string | null;
  created_at: string;
  ad_source: string | null;
  ctwa_clid: string | null;
  blocked: boolean;
  bot_enabled: boolean;
}

export interface Message {
  id: string;
  contact_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  whatsapp_message_id: string | null;
  status: MessageStatus | null;
}

export interface Lead {
  id: string;
  contact_id: string;
  score: LeadScore;
  reason: string;
  qualified_at: string;
  notified: boolean;
}

// ─── Servicios y reservas ───────────────────────────────────────

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  duration_min: number | null;
  category: string | null;
  active: boolean;
  created_at: string;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "done";

export interface Booking {
  id: string;
  contact_id: string | null;
  service_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  scheduled_at: string | null;
  duration_min: number | null;
  party_size: number | null;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  /** Sólo para la UI: nombre del servicio resuelto */
  service_name?: string | null;
}

/** 'appointments' = citas con franjas y bloqueo · 'orders' = pedidos/reservas simples */
export type BusinessType = "appointments" | "orders";

/** Rangos horarios por día de la semana (0=domingo … 6=sábado). Cada rango: [inicio, fin] "HH:mm". */
export type OpenHours = Record<string, [string, string][]>;

export interface BusinessConfig {
  businessType: BusinessType;
  openHours: OpenHours;
  slotMin: number;
}

/** Conversación enriquecida para la UI del panel */
export interface ConversationSummary {
  contact: Contact;
  lastMessage: Message | null;
  lead: Lead | null;
  unreadFromUser: number;
  messageCount: number;
}
