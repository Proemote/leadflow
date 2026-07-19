-- Checklist diario de /jornada (plan del día de Leo).
-- Aplicada en Supabase (proyecto ldoghruvsloedstlebpb) el 19 julio 2026.
-- Nota: se añade user_id sobre el esquema base porque el CRM es multi-tenant
-- (aislamiento por usuario desde el 16 julio). RLS activado sin políticas:
-- solo accesible vía service_role, mismo patrón que proposal_files.
create table if not exists jornada_completados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  fecha date not null,
  item_key text not null, -- ej. 'lead_caliente:{contacto_id}', 'cita:{cita_id}', 'oportunidad:{oportunidad_id}', 'sugerencia:{contacto_id}'
  completado_por text,
  created_at timestamptz default now(),
  unique (user_id, fecha, item_key)
);

create index if not exists jornada_completados_user_fecha_idx
  on jornada_completados (user_id, fecha);

alter table jornada_completados enable row level security;
