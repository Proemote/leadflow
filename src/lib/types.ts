export type LeadScore = "hot" | "warm" | "cold";
export type MessageRole = "user" | "assistant";
export type MessageStatus = "sent" | "delivered" | "read" | "failed";

export interface Contact {
  id: string;
  phone: string | null;
  name: string | null;
  created_at: string;
  ad_source: string | null;
  ctwa_clid: string | null;
  blocked: boolean;
  bot_enabled: boolean;
  // Campos de cartera de clientes
  email?: string | null;
  company?: string | null;
  tags?: string[] | null;
  notes?: string | null;
}

export type OperationStatus = "completed" | "pending" | "refunded";
export type OperationSource = "manual" | "opportunity";

export interface Operation {
  id: string;
  contact_id: string;
  concept: string;
  amount_cents: number;
  currency: string;
  status: OperationStatus;
  source: OperationSource;
  opportunity_id: string | null;
  date: string;
  created_at: string;
}

/** Etapas del pipeline (configurables aquí). Las dos últimas son terminales. */
export const PIPELINE_STAGES = [
  "Nuevo",
  "Contactado",
  "Cualificado",
  "Propuesta",
  "Negociación",
  "Ganado",
  "Perdido",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export const TERMINAL_STAGES: PipelineStage[] = ["Ganado", "Perdido"];

export interface Opportunity {
  id: string;
  title: string;
  contact_id: string | null;
  value_cents: number;
  currency: string;
  probability: number;
  stage: PipelineStage;
  expected_close: string | null;
  owner: string | null;
  last_activity: string | null;
  created_at: string;
  updated_at: string;
  /** Sólo UI: nombre del contacto resuelto */
  contact_name?: string | null;
}

export type CustomerStatus = "potencial" | "activo" | "riesgo" | "inactivo";

export interface CustomerMetrics {
  clienteDesde: string | null;
  antiguedad: string | null;
  nOps: number;
  clvCents: number;
  aovCents: number;
  recurrente: boolean;
  tasaRecurrencia: number; // 0..1
  frecuenciaMediaDias: number | null;
  recenciaDias: number | null;
  estado: CustomerStatus;
}

/** Contacto + sus métricas para el listado de clientes */
export interface CustomerSummary {
  contact: Contact;
  metrics: CustomerMetrics;
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

export type ContactServiceStatus = "contratado" | "completado" | "cancelado";

export interface ContactService {
  id: string;
  contact_id: string;
  service_id: string;
  status: ContactServiceStatus;
  notes: string | null;
  created_at: string;
  /** Sólo para la UI: datos del servicio resueltos */
  service_name?: string | null;
  service_price_cents?: number | null;
  service_currency?: string | null;
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
