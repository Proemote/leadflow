-- ════════════════════════════════════════════════════════════════
--  LeadFlow AI · Datos de ejemplo del CRM (clientes, operaciones,
--  oportunidades). OPCIONAL. Ejecutar DESPUÉS de migrations_crm.sql.
--  Idempotente: borra y recrea su propio set (marcado con ad_source
--  'seed' / owner 'seed'), no toca tus datos reales.
-- ════════════════════════════════════════════════════════════════
do $$
declare
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid;
begin
  -- Limpieza de un seed anterior
  delete from opportunities where owner = 'seed';
  delete from contacts where ad_source = 'seed';

  insert into contacts (name, email, company, tags, ad_source, phone)
    values ('Elina López', 'elina@clinicaglow.es', 'Clínica Glow', array['VIP','Estética'], 'seed', '+34600000001') returning id into c1;
  insert into contacts (name, email, company, tags, ad_source, phone)
    values ('Marcus Chen', 'marcus@chenstore.com', 'Chen Store', array['Ecommerce'], 'seed', '+34600000002') returning id into c2;
  insert into contacts (name, email, company, tags, ad_source, phone)
    values ('Sarah Jenkins', 'sarah@jenkins.io', 'Jenkins & Co', array['Referido'], 'seed', '+34600000003') returning id into c3;
  insert into contacts (name, email, company, tags, ad_source, phone)
    values ('Diego Fernández', 'diego@fernandez.es', 'Fernández Pro', array['Lead'], 'seed', '+34600000004') returning id into c4;
  insert into contacts (name, email, company, tags, ad_source, phone)
    values ('Lucía Romero', 'lucia@romero.es', 'Romero Studio', array['Lead'], 'seed', '+34600000005') returning id into c5;

  -- Operaciones (alimentan CLV)
  insert into operations (contact_id, concept, amount_cents, status, source, date) values
    (c1, 'Campaña Meta Ads (mensual)', 60000, 'completed', 'manual', now() - interval '280 days'),
    (c1, 'Campaña Meta Ads (mensual)', 60000, 'completed', 'manual', now() - interval '160 days'),
    (c1, 'Diseño de landing', 90000, 'completed', 'manual', now() - interval '40 days'),
    (c1, 'Vídeo promocional', 80000, 'pending', 'manual', now() - interval '5 days'),
    (c2, 'Auditoría ecommerce', 45000, 'completed', 'manual', now() - interval '120 days'),
    (c3, 'Branding básico', 120000, 'completed', 'manual', now() - interval '400 days');

  -- Oportunidades (pipeline)
  insert into opportunities (title, contact_id, value_cents, probability, stage, expected_close, owner, last_activity) values
    ('Web corporativa', c4, 250000, 40, 'Cualificado', current_date + 20, 'seed', 'Enviada propuesta inicial'),
    ('Gestión RRSS anual', c2, 360000, 60, 'Propuesta', current_date + 10, 'seed', 'Pendiente de aprobación'),
    ('Tienda online', c5, 180000, 20, 'Contactado', current_date + 30, 'seed', 'Primer contacto'),
    ('Rediseño marca', c3, 140000, 80, 'Negociación', current_date + 5, 'seed', 'Negociando alcance'),
    ('Campaña lanzamiento', c1, 300000, 100, 'Ganado', current_date - 15, 'seed', 'Cerrada y facturada'),
    ('SEO local', null, 90000, 0, 'Perdido', current_date - 20, 'seed', 'Eligió a otra agencia'),
    ('Newsletter mensual', null, 60000, 10, 'Nuevo', null, 'seed', 'Lead entrante');
end $$;
