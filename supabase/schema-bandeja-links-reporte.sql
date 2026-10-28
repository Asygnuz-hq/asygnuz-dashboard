-- ==============================================================================
-- ASYGNUZ Dashboard — Bandeja: dominio de links por cuenta, clics por fila y reporte
-- Archivo: supabase/schema-bandeja-links-reporte.sql
-- Ejecutar en Supabase → SQL Editor → Run, ANTES de desplegar. Idempotente.
-- ==============================================================================

-- 1. Dominio propio para los links de los DMs (ej. https://valentinamkt.online)
alter table public.meta_conexiones
  add column if not exists dominio_links text;

-- 2. Un link por envío: cada DM crea su fila con la publicación y la palabra clave
-- que lo originó. Las filas base del flujo (una por botón) siguen con por_envio = false.
alter table public.ig_links_tracking
  add column if not exists por_envio boolean not null default false,
  add column if not exists media_id text,
  add column if not exists palabra_clave text;

-- 3. Un registro por clic, para reportar por día, flujo y publicación
create table if not exists public.ig_clics (
  id uuid primary key default gen_random_uuid(),
  link_id uuid references public.ig_links_tracking(id) on delete set null,
  flujo_id uuid references public.ig_flujos(id) on delete set null,
  conexion_id uuid not null references public.meta_conexiones(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  media_id text,
  clic_en timestamptz not null default now()
);

create index if not exists idx_ig_clics_conexion_fecha on public.ig_clics (conexion_id, clic_en desc);
create index if not exists idx_ig_clics_flujo on public.ig_clics (flujo_id, clic_en desc);

alter table public.ig_clics enable row level security;
revoke all on public.ig_clics from anon, authenticated;
grant all on public.ig_clics to service_role;

-- 4. Reporte por cuenta y rango: una fila por flujo y publicación (media_id vacío = sin publicación)
create or replace function public.bandeja_reporte(
  p_conexion_id uuid,
  p_desde timestamptz,
  p_hasta timestamptz
)
returns table (
  flujo_id uuid,
  flujo_nombre text,
  media_id text,
  disparos bigint,
  dms_enviados bigint,
  respuestas_publicas bigint,
  errores bigint,
  limites bigint,
  clics bigint
)
language sql
stable
security definer set search_path = public
as $$
  with acc as (
    select
      a.flujo_id as fid,
      coalesce(e.media_id, '') as mid,
      count(distinct a.evento_id) as disparos,
      count(*) filter (where a.resultado = 'exito'
        and a.tipo_accion in ('respuesta_privada_comentario', 'flujo_dm')) as dms,
      count(*) filter (where a.resultado = 'exito'
        and a.tipo_accion = 'respuesta_publica_comentario') as pubs,
      count(*) filter (where a.resultado = 'error') as errs,
      count(*) filter (where a.resultado = 'limite_alcanzado') as lims
    from public.ig_acciones a
    left join public.ig_eventos e on e.id = a.evento_id
    where a.conexion_id = p_conexion_id
      and a.flujo_id is not null
      and a.ejecutado_en >= p_desde
      and a.ejecutado_en < p_hasta
    group by a.flujo_id, coalesce(e.media_id, '')
  ),
  cl as (
    select c.flujo_id as fid, coalesce(c.media_id, '') as mid, count(*) as clics
    from public.ig_clics c
    where c.conexion_id = p_conexion_id
      and c.flujo_id is not null
      and c.clic_en >= p_desde
      and c.clic_en < p_hasta
    group by c.flujo_id, coalesce(c.media_id, '')
  )
  select
    coalesce(acc.fid, cl.fid),
    f.nombre,
    coalesce(acc.mid, cl.mid),
    coalesce(acc.disparos, 0),
    coalesce(acc.dms, 0),
    coalesce(acc.pubs, 0),
    coalesce(acc.errs, 0),
    coalesce(acc.lims, 0),
    coalesce(cl.clics, 0)
  from acc
  full join cl on acc.fid = cl.fid and acc.mid = cl.mid
  left join public.ig_flujos f on f.id = coalesce(acc.fid, cl.fid)
  order by f.nombre, coalesce(acc.mid, cl.mid);
$$;

revoke all on function public.bandeja_reporte(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.bandeja_reporte(uuid, timestamptz, timestamptz) to service_role;
