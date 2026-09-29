-- Completa el portal de Dra. Ingrid Patiño (Growth) — 2026-09-29
-- Pega en Supabase → SQL Editor → Run. El tenant "dra-ingrid" ya existe;
-- esto solo llena/actualiza la ficha y agrega las reuniones si faltan.
-- Seguro de repetir cuantas veces haga falta.

do $$
declare
  v_tenant_id uuid;
begin
  select id into v_tenant_id from tenants where slug = 'dra-ingrid';
  if v_tenant_id is null then
    raise exception 'No existe el tenant "dra-ingrid" — créalo primero desde Portales de Clientes (Growth).';
  end if;

  insert into portal_proyecto (tenant_id, tipo_proyecto, descripcion)
  values (
    v_tenant_id,
    'Consultoría de marca médica premium',
    'Creación de marca, estructuración de viabilidad operativa y diseño de posicionamiento para tu clínica de medicina estética de alto nivel en el Eje Cafetero (Manizales y Villamaría, Caldas). Incluye identidad visual, experiencia de paciente y estrategia digital. Revisa la sección de Archivos para el detalle completo (viabilidad, mercado y estrategia de marca).'
  )
  on conflict (tenant_id) do update
    set tipo_proyecto = excluded.tipo_proyecto,
        descripcion = excluded.descripcion;

  insert into portal_reuniones (tenant_id, titulo, fecha, notas)
  select v_tenant_id, x.titulo, x.fecha, x.notas
  from (values
    ('Onboarding', date '2026-09-24', 'Primera reunión — levantamiento inicial del proyecto.'),
    ('Seguimiento', date '2026-09-29', 'Hoy, 6:00 p.m.')
  ) as x(titulo, fecha, notas)
  where not exists (
    select 1 from portal_reuniones r
    where r.tenant_id = v_tenant_id and r.titulo = x.titulo and r.fecha = x.fecha
  );
end $$;

-- Verificación:
--   select * from portal_proyecto where tenant_id = (select id from tenants where slug = 'dra-ingrid');
--   select titulo, fecha, notas from portal_reuniones
--   where tenant_id = (select id from tenants where slug = 'dra-ingrid') order by fecha;
