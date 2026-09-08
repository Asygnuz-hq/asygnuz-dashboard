-- ASYGNUZ Dashboard — modelo de tenants (clientes del SaaS) + flags de módulo
-- Pega este script completo en Supabase → SQL Editor → New query → Run.
-- No borra nada. Prepara el dashboard para multi-tenant real sin romper el
-- uso actual (single-tenant: ASYGNUZ) — cada tabla de negocio queda con un
-- tenant_id que hoy apunta siempre al mismo tenant (ASYGNUZ), y las RLS se
-- ajustan para filtrar por tenant en vez de dejar todo abierto a cualquier
-- autenticado. El login propio por cliente externo NO se construye aquí
-- (decisión de alcance 2026-09-08) — el OAuth de Meta lo sigue iniciando el
-- equipo ASYGNUZ en nombre de cada cliente.

-- =========================================================================
-- TENANTS
-- =========================================================================

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  -- jsonb en vez de tabla aparte: agregar un módulo nuevo (nomina, soporte,
  -- analitica...) es cambiar el default/una fila, no una migración.
  modulos_habilitados jsonb not null default '{"financiero": true, "marketing_pauta": true, "crm": true, "operacion": true}',
  creado_en timestamptz not null default now()
);

-- El único tenant real hoy. UUID fijo para poder referenciarlo como default
-- en las columnas nuevas de abajo sin subqueries en cada ALTER TABLE.
insert into tenants (id, nombre, slug)
values ('af1f801b-9da5-42e6-ba81-2920bd4f4c57', 'ASYGNUZ', 'asygnuz')
on conflict (id) do nothing;

-- =========================================================================
-- tenant_id EN LAS TABLAS DE NEGOCIO — va ANTES de las funciones de abajo:
-- son "language sql" y Postgres valida las columnas que usan al crearlas,
-- no al llamarlas, así que profiles.tenant_id tiene que existir primero.
-- Se excluyen a propósito: configuracion (fila única global, no por tenant),
-- deudas_personales (dato personal de JM, no dato de negocio del tenant),
-- y las 3 tablas del caso del terremoto (herramienta puntual para
-- voluntarios externos, sin relación con el producto SaaS).
-- El default aplica el backfill solo al agregar la columna.
-- =========================================================================

do $$
declare
  t text;
  asygnuz_id constant uuid := 'af1f801b-9da5-42e6-ba81-2920bd4f4c57';
begin
  for t in select unnest(array[
    'profiles', 'ingresos', 'gastos_fijos', 'gastos_variables', 'inversiones',
    'fundacion_donaciones', 'disenadores', 'control_mensual_tareas',
    'cobros_clientes', 'clientes', 'actividades_cliente', 'cuentas',
    'movimientos_cuenta', 'campanas_marketing', 'equipo', 'mercado_watchlist',
    'meta_conexiones', 'meta_conexiones_pendientes', 'meta_publicacion_notas',
    'leads'
  ])
  loop
    execute format(
      'alter table %I add column if not exists tenant_id uuid references tenants(id) default %L;',
      t, asygnuz_id
    );
    execute format('update %I set tenant_id = %L where tenant_id is null;', t, asygnuz_id);
    execute format('alter table %I alter column tenant_id set not null;', t);
  end loop;
end $$;

-- =========================================================================
-- FUNCIONES (ahora que profiles.tenant_id ya existe)
-- =========================================================================

create or replace function public.current_tenant_id()
returns uuid
language sql
security definer set search_path = public
as $$
  select tenant_id from profiles where id = auth.uid();
$$;

create or replace function public.modulos_habilitados_tenant()
returns jsonb
language sql
security definer set search_path = public
as $$
  select t.modulos_habilitados
  from tenants t
  join profiles p on p.tenant_id = t.id
  where p.id = auth.uid();
$$;

-- Usado por PostHog (grupo "tenant") para poder cruzar analítica de uso
-- por cliente ("qué módulo usa más cada cliente") desde el día 1.
create or replace function public.tenant_actual()
returns table(id uuid, nombre text)
language sql
security definer set search_path = public
as $$
  select t.id, t.nombre
  from tenants t
  join profiles p on p.tenant_id = t.id
  where p.id = auth.uid();
$$;

-- =========================================================================
-- RLS — reescribe "team_full_access" para filtrar por tenant.
-- Grupo A: tablas que ya excluían al rol 'emergencia' (es_emergencia()) —
-- se mantiene esa exclusión, sumando el filtro de tenant.
-- Grupo B: tablas que estaban abiertas (meta_conexiones y afines, leads) —
-- solo se agrega el filtro de tenant, sin tocar el tema emergencia (no
-- aplica a estas).
-- =========================================================================

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'profiles', 'ingresos', 'gastos_fijos', 'gastos_variables', 'inversiones',
    'fundacion_donaciones', 'disenadores', 'control_mensual_tareas',
    'cobros_clientes', 'clientes', 'actividades_cliente', 'cuentas',
    'movimientos_cuenta', 'campanas_marketing', 'equipo', 'mercado_watchlist'
  ])
  loop
    execute format('drop policy if exists "team_full_access" on %I;', t);
    execute format(
      'create policy "team_full_access" on %I for all to authenticated '
      || 'using (tenant_id = public.current_tenant_id() and not public.es_emergencia()) '
      || 'with check (tenant_id = public.current_tenant_id() and not public.es_emergencia());',
      t
    );
  end loop;

  for t in select unnest(array[
    'meta_conexiones', 'meta_conexiones_pendientes', 'meta_publicacion_notas', 'leads'
  ])
  loop
    execute format('drop policy if exists "team_full_access" on %I;', t);
    execute format(
      'create policy "team_full_access" on %I for all to authenticated '
      || 'using (tenant_id = public.current_tenant_id()) '
      || 'with check (tenant_id = public.current_tenant_id());',
      t
    );
  end loop;
end $$;

-- =========================================================================
-- Verificación (correr después, debe dar 0 filas en todas):
--   select 'clientes', count(*) from clientes where tenant_id is null
--   union all select 'cuentas', count(*) from cuentas where tenant_id is null
--   union all select 'meta_conexiones', count(*) from meta_conexiones where tenant_id is null;
-- =========================================================================
