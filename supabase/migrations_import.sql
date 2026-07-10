-- ════════════════════════════════════════════════════════════════
--  LeadFlow AI · Migración Importador Masivo de Contactos
--  Ejecutar en Supabase → SQL Editor. Idempotente.
-- ════════════════════════════════════════════════════════════════

-- ─── Contacts: campos de prospección local ──────────────────────
alter table contacts add column if not exists location text;
alter table contacts add column if not exists google_maps_url text;
alter table contacts add column if not exists website text;
alter table contacts add column if not exists social_links text[] default '{}';

-- Índices para deduplicación rápida en importaciones masivas
create index if not exists idx_contacts_email on contacts(lower(email)) where email is not null;
create index if not exists idx_contacts_phone on contacts(phone) where phone is not null;
