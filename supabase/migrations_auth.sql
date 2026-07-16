-- ════════════════════════════════════════════════════════════════
--  LeadFlow — Migración de Autenticación Multi-Usuario
--  Ejecutar en: Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════════

-- ─── Profiles (vincula auth.users con datos de LeadFlow) ────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  company_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_email on profiles(email);

-- Trigger para actualizar updated_at automáticamente
create or replace function update_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_update_timestamp on profiles;
create trigger profiles_update_timestamp
  before update on profiles
  for each row
  execute function update_profiles_updated_at();

-- ─── Agregar user_id a las tablas existentes ────────────────────

-- Contacts
alter table if exists contacts add column if not exists user_id uuid references profiles(id) on delete cascade;
create index if not exists idx_contacts_user on contacts(user_id);

-- Messages
alter table if exists messages add column if not exists user_id uuid references profiles(id) on delete cascade;
create index if not exists idx_messages_user on messages(user_id);

-- Leads
alter table if exists leads add column if not exists user_id uuid references profiles(id) on delete cascade;
create index if not exists idx_leads_user on leads(user_id);

-- Services
alter table if exists services add column if not exists user_id uuid references profiles(id) on delete cascade;
create index if not exists idx_services_user on services(user_id);

-- Bookings
alter table if exists bookings add column if not exists user_id uuid references profiles(id) on delete cascade;
create index if not exists idx_bookings_user on bookings(user_id);

-- Contact Notes (comments)
alter table if exists contact_notes add column if not exists user_id uuid references profiles(id) on delete cascade;
create index if not exists idx_contact_notes_user on contact_notes(user_id);

-- Opportunities
alter table if exists opportunities add column if not exists user_id uuid references profiles(id) on delete cascade;
create index if not exists idx_opportunities_user on opportunities(user_id);

-- Operations
alter table if exists operations add column if not exists user_id uuid references profiles(id) on delete cascade;
create index if not exists idx_operations_user on operations(user_id);

-- Contact Services
alter table if exists contact_services add column if not exists user_id uuid references profiles(id) on delete cascade;
create index if not exists idx_contact_services_user on contact_services(user_id);

-- ────────────────────────────────────────────────────────────────
--  Función para crear profile automáticamente al registrarse
-- ────────────────────────────────────────────────────────────────

create or replace function create_profile_on_auth()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, company_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'company_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function create_profile_on_auth();

-- ════════════════════════════════════════════════════════════════
