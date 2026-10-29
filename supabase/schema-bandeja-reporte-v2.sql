-- ==============================================================================
-- ASYGNUZ Dashboard — Bandeja: reporte v2 (clics únicos, bots, leads, serie diaria)
-- Archivo: supabase/schema-bandeja-reporte-v2.sql
-- Ejecutar en Supabase → SQL Editor → Run, DESPUÉS de schema-bandeja-links-reporte.sql
-- y ANTES de desplegar. Idempotente.
-- ==============================================================================

-- 1. Marca de bot en cada clic (vistas previas de Meta, crawlers) y evento que originó cada link
alter table public.ig_clics
  add column if not exists es_bot boolean not null default false;

alter table public.ig_links_tracking
  add column if not exists evento_id uuid references public.ig_eventos(id) on delete set null;

create index if not exists idx_ig_links_evento on public.ig_links_tracking (evento_id);

-- 2. Reporte por flujo y publicación: ahora con clics únicos (un DM = un link) y sin bots
drop function if exists public.bandeja_reporte(uuid, timestamptz, timestamptz);

create function public.bandeja_reporte(
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
  clics bigint,
  clics_unicos bigint
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
    select
      c.flujo_id as fid,
      coalesce(c.media_id, '') as mid,
      count(*) as clics,
      count(distinct c.link_id) as unicos
    from public.ig_clics c
    where c.conexion_id = p_conexion_id
      and c.flujo_id is not null
      and not c.es_bot
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
    coalesce(cl.clics, 0),
    coalesce(cl.unicos, 0)
  from acc
  full join cl on acc.fid = cl.fid and acc.mid = cl.mid
  left join public.ig_flujos f on f.id = coalesce(acc.fid, cl.fid)
  order by f.nombre, coalesce(acc.mid, cl.mid);
$$;

revoke all on function public.bandeja_reporte(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.bandeja_reporte(uuid, timestamptz, timestamptz) to service_role;

-- 3. Serie diaria (día de Colombia): comentarios recibidos, disparos, DMs y clics únicos
create or replace function public.bandeja_reporte_dias(
  p_conexion_id uuid,
  p_desde timestamptz,
  p_hasta timestamptz
)
returns table (
  fecha date,
  comentarios bigint,
  disparos bigint,
  dms_enviados bigint,
  clics_unicos bigint
)
language sql
stable
security definer set search_path = public
as $$
  with dias as (
    select d::date as fecha
    from generate_series(
      (p_desde at time zone 'America/Bogota')::date::timestamp,
      ((p_hasta - interval '1 second') at time zone 'America/Bogota')::date::timestamp,
      interval '1 day'
    ) d
  ),
  com as (
    select (recibido_en at time zone 'America/Bogota')::date as fecha, count(*) as n
    from public.ig_eventos
    where conexion_id = p_conexion_id and tipo = 'comment'
      and recibido_en >= p_desde and recibido_en < p_hasta
    group by 1
  ),
  acc as (
    select (ejecutado_en at time zone 'America/Bogota')::date as fecha,
      count(distinct evento_id) filter (where flujo_id is not null) as disparos,
      count(*) filter (where resultado = 'exito'
        and tipo_accion in ('respuesta_privada_comentario', 'flujo_dm')) as dms
    from public.ig_acciones
    where conexion_id = p_conexion_id
      and ejecutado_en >= p_desde and ejecutado_en < p_hasta
    group by 1
  ),
  cl as (
    select (clic_en at time zone 'America/Bogota')::date as fecha, count(distinct link_id) as unicos
    from public.ig_clics
    where conexion_id = p_conexion_id and not es_bot
      and clic_en >= p_desde and clic_en < p_hasta
    group by 1
  )
  select dias.fecha,
    coalesce(com.n, 0),
    coalesce(acc.disparos, 0),
    coalesce(acc.dms, 0),
    coalesce(cl.unicos, 0)
  from dias
  left join com on com.fecha = dias.fecha
  left join acc on acc.fecha = dias.fecha
  left join cl on cl.fecha = dias.fecha
  order by dias.fecha;
$$;

revoke all on function public.bandeja_reporte_dias(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.bandeja_reporte_dias(uuid, timestamptz, timestamptz) to service_role;

-- 4. Leads: quién disparó un flujo, cuándo, si recibió el DM y si hizo clic
-- (el clic solo se cruza con los links creados después de esta migración)
create or replace function public.bandeja_leads(
  p_conexion_id uuid,
  p_desde timestamptz,
  p_hasta timestamptz,
  p_limite integer default 200
)
returns table (
  evento_id uuid,
  recibido_en timestamptz,
  usuario text,
  texto text,
  tipo text,
  media_id text,
  flujo_nombre text,
  dm_enviado boolean,
  hubo_error boolean,
  clics bigint
)
language sql
stable
security definer set search_path = public
as $$
  select
    e.id,
    e.recibido_en,
    e.ig_usuario_nombre,
    e.texto,
    e.tipo,
    e.media_id,
    (array_agg(f.nombre) filter (where f.nombre is not null))[1],
    coalesce(bool_or(a.resultado = 'exito'
      and a.tipo_accion in ('respuesta_privada_comentario', 'flujo_dm')), false),
    coalesce(bool_or(a.resultado in ('error', 'limite_alcanzado')), false),
    (select count(*) from public.ig_clics c
       join public.ig_links_tracking l on l.id = c.link_id
      where l.evento_id = e.id and not c.es_bot)
  from public.ig_eventos e
  join public.ig_acciones a on a.evento_id = e.id and a.flujo_id is not null
  left join public.ig_flujos f on f.id = a.flujo_id
  where e.conexion_id = p_conexion_id
    and e.recibido_en >= p_desde and e.recibido_en < p_hasta
  group by e.id
  order by e.recibido_en desc
  limit p_limite;
$$;

revoke all on function public.bandeja_leads(uuid, timestamptz, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.bandeja_leads(uuid, timestamptz, timestamptz, integer) to service_role;

-- 5. Conteos para el embudo: comentarios y mensajes directos recibidos en el rango
create or replace function public.bandeja_entrantes(
  p_conexion_id uuid,
  p_desde timestamptz,
  p_hasta timestamptz
)
returns table (comentarios bigint, mensajes bigint)
language sql
stable
security definer set search_path = public
as $$
  select
    count(*) filter (where tipo = 'comment'),
    count(*) filter (where tipo = 'message')
  from public.ig_eventos
  where conexion_id = p_conexion_id
    and recibido_en >= p_desde and recibido_en < p_hasta;
$$;

revoke all on function public.bandeja_entrantes(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.bandeja_entrantes(uuid, timestamptz, timestamptz) to service_role;
