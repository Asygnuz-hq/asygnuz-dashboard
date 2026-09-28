-- ASYGNUZ Dashboard — seguridad, sprint 3: aislar Emergencia por tenant (2026-09-28)
-- Pega en Supabase → SQL Editor → Run. Seguro de repetir. No borra datos.
--
-- casos_emergencia / inventario_emergencia / items_caso_emergencia se
-- crearon cuando ASYGNUZ era el único tenant: la policy es
-- "for all to authenticated using (true)", o sea CUALQUIER usuario
-- autenticado -- incluido el empleado de un cliente nuevo -- puede leer y
-- editar los casos del terremoto (nombres, ubicaciones, notas de gente
-- real). Ahora que hay tenants de clientes de verdad, esto es una fuga.
--
-- Se restringe a: el equipo de ASYGNUZ (su tenant) + el usuario externo con
-- rol 'emergencia' (que puede estar en el tenant "Sin asignar"). Nadie más.

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'casos_emergencia', 'inventario_emergencia', 'items_caso_emergencia'
  ])
  loop
    execute format('drop policy if exists "%I_access" on %I;', t, t);
    execute format(
      'create policy "%I_access" on %I for all to authenticated '
      || 'using (public.current_tenant_id() = ''af1f801b-9da5-42e6-ba81-2920bd4f4c57''::uuid or public.es_emergencia()) '
      || 'with check (public.current_tenant_id() = ''af1f801b-9da5-42e6-ba81-2920bd4f4c57''::uuid or public.es_emergencia());',
      t, t
    );
  end loop;
end $$;

-- El insert público (formulario externo de n8n, sin login) sigue igual:
-- solo INSERT con la llave anónima, sin SELECT/UPDATE/DELETE. No se toca.

-- =========================================================================
-- Verificación:
--   -- ver las policies nuevas:
--   select tablename, policyname, qual from pg_policies
--   where tablename in ('casos_emergencia','inventario_emergencia','items_caso_emergencia');
--   -- correr de nuevo supabase/test-aislamiento.sql: el usuario del tenant B
--   -- debe seguir viendo 0 filas si se agrega 'casos_emergencia' a su lista.
-- =========================================================================
