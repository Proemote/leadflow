-- ════════════════════════════════════════════════════════════════
--  LeadFlow AI · Migración CRM (Contactos enriquecidos + Operaciones
--  + Oportunidades / Kanban). Ejecutar en Supabase → SQL Editor.
--  Idempotente: se puede relanzar sin problema.
-- ════════════════════════════════════════════════════════════════

-- ─── Contacts: campos de cartera de clientes ────────────────────
alter table contacts add column if not exists email text;
alter table contacts add column if not exists company text;
alter table contacts add column if not exists tags text[] default '{}';
alter table contacts add column if not exists notes text;
-- Permitir clientes añadidos a mano sin WhatsApp
alter table contacts alter column phone drop not null;

-- ─── Operations (operaciones / compras de un contacto) ──────────
create table if not exists operations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade not null,
  concept text not null,
  amount_cents integer not null default 0,
  currency text not null default 'EUR',
  status text not null default 'completed'
    check (status in ('completed', 'pending', 'refunded')),
  source text not null default 'manual'
    check (source in ('manual', 'opportunity')),
  opportunity_id uuid,
  date timestamptz not null default now(),
  created_at timestamptz default now()
);
create index if not exists idx_operations_contact on operations(contact_id, date);
create index if not exists idx_operations_status on operations(status);

-- ─── Opportunities (pipeline / Kanban) ──────────────────────────
create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  contact_id uuid references contacts(id) on delete set null,
  value_cents integer not null default 0,
  currency text not null default 'EUR',
  probability integer not null default 50,   -- 0..100
  stage text not null default 'Nuevo',
  expected_close date,
  owner text,
  last_activity text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_opportunities_stage on opportunities(stage);
create index if not exists idx_opportunities_contact on opportunities(contact_id);
