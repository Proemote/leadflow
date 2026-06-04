-- ════════════════════════════════════════════════════════════════
--  LeadFlow AI — WhatsApp CRM  ·  Schema Supabase
--  Ejecutar completo en: Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════════

-- ─── Contacts ───────────────────────────────────────────────────
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text,
  created_at timestamptz default now(),
  ad_source text,
  ctwa_clid text,
  blocked boolean default false,
  bot_enabled boolean default true
);

-- ─── Messages ───────────────────────────────────────────────────
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now(),
  whatsapp_message_id text,
  status text check (status in ('sent', 'delivered', 'read', 'failed'))
);

create index if not exists idx_messages_contact on messages(contact_id, created_at);
create index if not exists idx_messages_wamid on messages(whatsapp_message_id)
  where whatsapp_message_id is not null;

-- ─── Leads ──────────────────────────────────────────────────────
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade not null,
  score text not null check (score in ('hot', 'warm', 'cold')),
  reason text not null,
  qualified_at timestamptz default now(),
  notified boolean default false
);

create index if not exists idx_leads_score on leads(score, qualified_at);
create index if not exists idx_leads_contact on leads(contact_id);

-- ─── Settings (system prompt, config por clave) ─────────────────
create table if not exists settings (
  key text primary key,
  value text not null
);

-- Prompt por defecto de Leo (Lead Engagement Optimizer)
insert into settings (key, value) values
  ('system_prompt', 'Eres Leo (Lead Engagement Optimizer), asistente comercial de una agencia. Hablas SIEMPRE en español de España con tuteo. Eres cálido, breve y directo. Tu objetivo es entender qué necesita la persona y, si hay interés real, invitarla a agendar una llamada.')
on conflict (key) do nothing;

-- Configuración del negocio (modo agenda y horario de apertura)
insert into settings (key, value) values
  ('business_type', 'appointments'),
  ('open_hours', '{"1":[["10:00","20:00"]],"2":[["10:00","20:00"]],"3":[["10:00","20:00"]],"4":[["10:00","20:00"]],"5":[["10:00","20:00"]],"6":[["10:00","14:00"]],"0":[]}'),
  ('slot_min', '30')
on conflict (key) do nothing;

-- ─── Services (carta / menú de servicios con precios) ───────────
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents integer not null default 0,
  currency text not null default 'EUR',
  duration_min integer,              -- null = sin agenda (ej. plato de carta)
  category text,
  active boolean not null default true,
  created_at timestamptz default now()
);
create index if not exists idx_services_active on services(active, category);

-- ─── Bookings (reservas / citas / pedidos) ──────────────────────
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  scheduled_at timestamptz,          -- inicio de la cita/reserva
  duration_min integer,              -- copiada del servicio al reservar (modo citas)
  party_size integer,                -- comensales (modo pedidos/restaurante)
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'done')),
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_bookings_scheduled on bookings(scheduled_at);
create index if not exists idx_bookings_status on bookings(status, scheduled_at);
create index if not exists idx_bookings_contact on bookings(contact_id);

-- ════════════════════════════════════════════════════════════════
--  Nota sobre RLS:
--  El backend usa SUPABASE_SERVICE_ROLE_KEY (bypassa RLS).
--  Si quieres exponer tablas al cliente con anon key, activa RLS
--  y añade policies. Para este CRM todo el acceso de datos pasa
--  por el servidor, así que dejamos RLS desactivado.
-- ════════════════════════════════════════════════════════════════
