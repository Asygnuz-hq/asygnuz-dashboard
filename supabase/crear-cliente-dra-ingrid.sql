-- Alta del portal de Dra. Ingrid Patiño (Growth) — 2026-09-29
-- Pega en Supabase → SQL Editor → Run. Corre una sola vez (si lo repites,
-- el insert de tenants fallará por slug duplicado — no rompe nada, solo
-- no hace nada más).

do $$
declare
  v_tenant_id uuid;
begin
  v_tenant_id := public.crear_tenant('Dra. Ingrid Patiño', 'dra-ingrid', '{"portal_cliente": true}'::jsonb);

  insert into portal_proyecto (tenant_id, tipo_proyecto, descripcion)
  values (
    v_tenant_id,
    'Consultoría de marca médica premium',
    'Creación de marca, estructuración de viabilidad operativa y diseño de posicionamiento para tu clínica de medicina estética de alto nivel en el Eje Cafetero (Manizales y Villamaría, Caldas). Incluye identidad visual, experiencia de paciente y estrategia digital. Revisa la sección de Archivos para el detalle completo (viabilidad, mercado y estrategia de marca).'
  );

  insert into portal_reuniones (tenant_id, titulo, fecha, notas)
  values
    (v_tenant_id, 'Onboarding', '2026-09-24', 'Primera reunión — levantamiento inicial del proyecto.'),
    (v_tenant_id, 'Seguimiento', '2026-09-29', 'Hoy, 6:00 p.m.');
end $$;

-- Verificación:
--   select id, nombre, slug from tenants where slug = 'dra-ingrid';
--   select * from portal_proyecto where tenant_id = (select id from tenants where slug = 'dra-ingrid');
--   select titulo, fecha, notas from portal_reuniones
--   where tenant_id = (select id from tenants where slug = 'dra-ingrid') order by fecha;
