-- ASYGNUZ Dashboard — seguridad, sprint 0 (2026-09-23)
-- Pega este script completo en Supabase → SQL Editor → New query → Run.
-- Es seguro volver a correrlo. No borra datos.
--
-- 1) Las 7 tablas del módulo RRHH tenían policies "FOR ALL USING (true)" sin
--    `TO authenticated`: aplicaban al rol PUBLIC, que incluye `anon`, y la
--    clave anon va en el bundle del navegador. Cualquiera podía leer y
--    escribir salarios, contratos y nóminas con un simple GET/POST a
--    /rest/v1/empleados. Hoy las tablas están vacías, así que no se filtró
--    nada — hay que cerrarlo ANTES de cargar nómina real.
-- 2) Cualquier miembro podía hacerse admin (PATCH a profiles con rol=admin)
--    o cambiarse de tenant, porque la policy de profiles es "for all" por
--    tenant sin limitar columnas.
--
-- Requiere haber corrido antes schema-tenants.sql (current_tenant_id, es_emergencia).

-- =========================================================================
-- 1. RRHH: tenant_id + policies solo para autenticados del mismo tenant
-- =========================================================================

do $$
declare
  t text;
  asygnuz_id constant uuid := 'af1f801b-9da5-42e6-ba81-2920bd4f4c57';
begin
  for t in select unnest(array[
    'empleados', 'contratos', 'nominas', 'nominas_detalle', 'ausencias',
    'asignaciones_proyecto', 'onboarding_checklists'
  ])
  loop
    -- columna sin default primero (para que el backfill no dependa de auth.uid())
    execute format('alter table %I add column if not exists tenant_id uuid references tenants(id);', t);
    execute format('update %I set tenant_id = %L where tenant_id is null;', t, asygnuz_id);
    execute format('alter table %I alter column tenant_id set not null;', t);
    -- los inserts del navegador no mandan tenant_id: lo toma de la sesión
    execute format('alter table %I alter column tenant_id set default public.current_tenant_id();', t);

    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "team_full_access" on %I;', t);
    execute format(
      'create policy "team_full_access" on %I for all to authenticated '
      || 'using (tenant_id = public.current_tenant_id() and not public.es_emergencia()) '
      || 'with check (tenant_id = public.current_tenant_id() and not public.es_emergencia());',
      t
    );

    -- sin acceso alguno para el rol anónimo
    execute format('revoke all on %I from anon;', t);
  end loop;
end $$;

-- Las policies viejas (USING (true), rol PUBLIC) tenían estos nombres.
drop policy if exists "empleados_access" on empleados;
drop policy if exists "contratos_access" on contratos;
drop policy if exists "nominas_access" on nominas;
drop policy if exists "nominas_detalle_access" on nominas_detalle;
drop policy if exists "ausencias_access" on ausencias;
drop policy if exists "asignaciones_access" on asignaciones_proyecto;
drop policy if exists "onboarding_access" on onboarding_checklists;

-- =========================================================================
-- 2. profiles: nadie cambia su propio rol ni su tenant
-- =========================================================================
-- Trigger en vez de policy por columna: cubre PostgREST, el SDK y cualquier
-- otra vía. Con auth.uid() nulo (SQL Editor, service_role) no estorba, así
-- que TÚ sigues pudiendo ascender o mover usuarios a mano.

create or replace function public.proteger_profiles()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'El tenant de un usuario no se puede cambiar desde la app.';
  end if;

  if new.rol is distinct from old.rol
     and not exists (
       select 1 from profiles
       where id = auth.uid() and rol = 'admin' and tenant_id = old.tenant_id
     ) then
    raise exception 'Solo un admin puede cambiar el rol de un usuario.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_proteger_profiles on profiles;
create trigger trg_proteger_profiles
  before update on profiles
  for each row execute function public.proteger_profiles();

-- =========================================================================
-- Verificación (correr después):
--   -- debe listar SOLO la policy "team_full_access" con roles {authenticated}:
--   select tablename, policyname, roles from pg_policies
--   where tablename in ('empleados','contratos','nominas','nominas_detalle',
--                       'ausencias','asignaciones_proyecto','onboarding_checklists');
--   -- debe dar 0 filas (anon ya no tiene ningún privilegio en RRHH):
--   select table_name, privilege_type from information_schema.role_table_grants
--   where grantee = 'anon' and table_name in ('empleados','contratos','nominas',
--     'nominas_detalle','ausencias','asignaciones_proyecto','onboarding_checklists');
-- =========================================================================
