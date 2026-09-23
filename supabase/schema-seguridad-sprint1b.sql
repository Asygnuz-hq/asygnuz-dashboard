-- ASYGNUZ Dashboard — seguridad, sprint 1b (2026-09-23)
-- Pega este script completo en Supabase → SQL Editor → New query → Run.
-- Es seguro volver a correrlo. No borra datos.
-- Requiere haber corrido antes: schema-seguridad-sprint0.sql y sprint1a.sql.
--
-- ORDEN IMPORTANTE: corre este script ANTES de desplegar el código del
-- sprint 1b (el código nuevo lee los tokens de Meta con el cliente de
-- servidor y usa configuracion por tenant; el viejo se rompe con estos
-- cambios y viceversa).
--
-- Qué arregla:
--  1) Los tokens de Meta (access_token / instagram_access_token) eran
--     legibles por cualquier usuario del tenant con un select directo a la
--     API REST. Ahora el rol `authenticated` NO tiene SELECT sobre esas
--     columnas: solo el servidor las lee (src/lib/meta/conexion.ts).
--  2) `configuracion` era una fila única global (mes activo, metas, TRM)
--     compartida por todos los tenants. Ahora hay una fila por tenant.

-- =========================================================================
-- 1. Tokens de Meta fuera del alcance de la API pública
-- =========================================================================
-- Se revoca el SELECT de tabla y se concede columna por columna, EXCEPTO los
-- tokens. Si algún día agregas una columna nueva a estas tablas, concédele
-- SELECT a mano (grant select (columna) on ... to authenticated) o la app no
-- podrá leerla.

do $$
declare
  cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'meta_conexiones'
    and column_name not in ('access_token', 'instagram_access_token');
  execute 'revoke select on public.meta_conexiones from authenticated, anon';
  execute format('grant select (%s) on public.meta_conexiones to authenticated', cols);

  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'meta_conexiones_pendientes'
    and column_name not in ('access_token');
  execute 'revoke select on public.meta_conexiones_pendientes from authenticated, anon';
  execute format('grant select (%s) on public.meta_conexiones_pendientes to authenticated', cols);
end $$;

-- =========================================================================
-- 2. configuracion por tenant
-- =========================================================================

alter table configuracion add column if not exists tenant_id uuid references tenants(id);
update configuracion set tenant_id = 'af1f801b-9da5-42e6-ba81-2920bd4f4c57' where tenant_id is null;
alter table configuracion alter column tenant_id set not null;
alter table configuracion alter column tenant_id
  set default coalesce(public.current_tenant_id(), 'af1f801b-9da5-42e6-ba81-2920bd4f4c57'::uuid);

-- Deja de ser una fila única: se quita el check id = 1 y los ids nuevos salen
-- de una secuencia (la fila de ASYGNUZ conserva el id 1).
alter table configuracion drop constraint if exists configuracion_singleton;
create sequence if not exists configuracion_id_seq start 2;
alter table configuracion alter column id set default (nextval('configuracion_id_seq'))::smallint;

create unique index if not exists configuracion_tenant_key on configuracion (tenant_id);

alter table configuracion enable row level security;
drop policy if exists "team_full_access" on configuracion;
create policy "team_full_access" on configuracion for all to authenticated
  using (tenant_id = public.current_tenant_id() and not public.es_emergencia())
  with check (tenant_id = public.current_tenant_id() and not public.es_emergencia());

drop policy if exists "mfa_requerido" on configuracion;
create policy "mfa_requerido" on configuracion as restrictive for all to authenticated
  using (public.mfa_ok()) with check (public.mfa_ok());

-- crear_tenant ahora también deja lista su fila de configuracion (parte de la
-- TRM vigente de ASYGNUZ, que es la oficial y es una sola para todos).
create or replace function public.crear_tenant(
  p_nombre text,
  p_slug text,
  p_modulos jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
  v_trm numeric;
begin
  insert into tenants (nombre, slug, modulos_habilitados)
  values (p_nombre, p_slug, coalesce(p_modulos, '{}'::jsonb))
  returning id into v_id;

  select trm_actual into v_trm from configuracion
  where tenant_id = 'af1f801b-9da5-42e6-ba81-2920bd4f4c57';

  insert into configuracion (tenant_id, trm_actual, mes_activo)
  values (v_id, coalesce(v_trm, 0), date_trunc('month', now())::date);

  return v_id;
end;
$$;

revoke execute on function public.crear_tenant(text, text, jsonb) from public, anon, authenticated;

-- Tenants creados antes de este script (solo "Sin asignar" y los de prueba):
insert into configuracion (tenant_id, trm_actual, mes_activo)
select t.id, coalesce((select trm_actual from configuracion where tenant_id = 'af1f801b-9da5-42e6-ba81-2920bd4f4c57'), 0),
       date_trunc('month', now())::date
from tenants t
where not exists (select 1 from configuracion c where c.tenant_id = t.id);

-- =========================================================================
-- Verificación (correr después):
--   -- los tokens ya no se pueden leer con un usuario normal; esto (corrido
--   -- como service_role/SQL Editor) devuelve las columnas SIN token:
--   select column_name from information_schema.column_privileges
--   where grantee = 'authenticated' and table_name = 'meta_conexiones'
--     and privilege_type = 'SELECT';
--   -- una fila de configuracion por tenant:
--   select t.slug, c.mes_activo from tenants t left join configuracion c on c.tenant_id = t.id;
-- =========================================================================
