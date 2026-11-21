-- ASYGNUZ Dashboard — Portales Exclusivos + Subdominios + Parrilla v2 + Hojas de Trabajo (2026-11-20)
-- Pega este script completo en Supabase → SQL Editor → New query → Run.
-- Seguro de repetir (idempotente). No borra datos existentes.
-- Requiere: schema-tenants.sql, schema-tenants-branding.sql, schema-portal-cliente.sql,
-- schema-portal-marca-pilares.sql, schema-portal-parrilla-v3.sql.

-- =========================================================================
-- 1. Marca exclusiva y subdominio por tenant
-- =========================================================================

alter table tenants add column if not exists subdominio text;
alter table tenants add column if not exists tagline_portal text;
alter table tenants add column if not exists splash_habilitado boolean not null default true;

create unique index if not exists tenants_subdominio_unique_idx
  on tenants (lower(subdominio))
  where subdominio is not null and btrim(subdominio) <> '';

-- Actualizar tenant_actual() para devolver también slug, subdominio, tagline y splash.
drop function if exists public.tenant_actual();
create or replace function public.tenant_actual()
returns table(
  id uuid,
  nombre text,
  slug text,
  logo_url text,
  color_acento text,
  subdominio text,
  tagline_portal text,
  splash_habilitado boolean
)
language sql
security definer set search_path = public
as $$
  select
    t.id,
    t.nombre,
    t.slug,
    t.logo_url,
    t.color_acento,
    t.subdominio,
    t.tagline_portal,
    t.splash_habilitado
  from tenants t
  join profiles p on p.tenant_id = t.id
  where p.id = auth.uid();
$$;

-- Branding público por subdominio (SOLO campos visuales no sensibles) para
-- mostrar el splash del logo y el login white-label en <cliente>.asygnuz.com
-- antes de iniciar sesión. Restringido a tenants con módulo portal_cliente.
drop function if exists public.branding_por_subdominio(text);
create or replace function public.branding_por_subdominio(p_subdominio text)
returns table(
  id uuid,
  nombre text,
  slug text,
  subdominio text,
  logo_url text,
  color_acento text,
  tagline_portal text,
  splash_habilitado boolean
)
language sql
security definer set search_path = public
as $$
  select
    t.id,
    t.nombre,
    t.slug,
    t.subdominio,
    t.logo_url,
    t.color_acento,
    t.tagline_portal,
    t.splash_habilitado
  from tenants t
  where coalesce(t.modulos_habilitados->>'portal_cliente', 'false') = 'true'
    and (
      lower(coalesce(t.subdominio, '')) = lower(btrim(p_subdominio))
      or lower(t.slug) = lower(btrim(p_subdominio))
    )
  limit 1;
$$;

grant execute on function public.branding_por_subdominio(text) to anon, authenticated;

-- =========================================================================
-- 2. Parrilla v2: campañas, uso, procedimiento, guion estructurado,
--    visibilidad y aprobación del cliente con 1 clic
-- =========================================================================

alter table portal_contenido add column if not exists campana text;
alter table portal_contenido add column if not exists uso text;
alter table portal_contenido add column if not exists procedimiento text;
alter table portal_contenido add column if not exists duracion text;
alter table portal_contenido add column if not exists gancho text;
alter table portal_contenido add column if not exists cuerpo text;
alter table portal_contenido add column if not exists cta text;
alter table portal_contenido add column if not exists visible_cliente boolean not null default true;
alter table portal_contenido add column if not exists guion_visible_cliente boolean not null default false;
alter table portal_contenido add column if not exists aprobacion_cliente text not null default 'pendiente';
alter table portal_contenido add column if not exists comentario_cliente text;
alter table portal_contenido add column if not exists aprobado_en timestamptz;

alter table portal_contenido drop constraint if exists portal_contenido_aprobacion_cliente_check;
alter table portal_contenido add constraint portal_contenido_aprobacion_cliente_check
  check (aprobacion_cliente in ('pendiente', 'aprobado', 'cambios'));

-- RLS de portal_contenido: el cliente SOLO ve filas marcadas visible_cliente = true
drop policy if exists "cliente_lee_su_portal" on portal_contenido;
create policy "cliente_lee_su_portal" on portal_contenido
  for select to authenticated
  using (tenant_id = public.current_tenant_id() and visible_cliente = true);

-- RPC segura para que el cliente apruebe o pida ajuste sobre una pieza propia
-- sin otorgar permisos UPDATE directos sobre portal_contenido.
drop function if exists public.responder_aprobacion_contenido(uuid, text, text);
create or replace function public.responder_aprobacion_contenido(
  p_contenido_id uuid,
  p_estado text,
  p_comentario text default null
)
returns table(
  id uuid,
  aprobacion_cliente text,
  comentario_cliente text,
  aprobado_en timestamptz
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.mfa_ok() then
    raise exception 'Se requiere verificación 2FA';
  end if;
  if p_estado not in ('pendiente', 'aprobado', 'cambios') then
    raise exception 'Estado de aprobación inválido';
  end if;

  v_tenant_id := public.current_tenant_id();
  if v_tenant_id is null then
    raise exception 'Usuario sin tenant asignado';
  end if;

  return query
  update portal_contenido pc
  set
    aprobacion_cliente = p_estado,
    comentario_cliente = nullif(btrim(coalesce(p_comentario, '')), ''),
    aprobado_en = case when p_estado = 'pendiente' then null else now() end,
    actualizado_en = now()
  where pc.id = p_contenido_id
    and pc.tenant_id = v_tenant_id
    and pc.visible_cliente = true
  returning pc.id, pc.aprobacion_cliente, pc.comentario_cliente, pc.aprobado_en;
end $$;

grant execute on function public.responder_aprobacion_contenido(uuid, text, text) to authenticated;

-- =========================================================================
-- 3. Hojas de Trabajo tipo Excel (Plan de campaña, Banco de ideas,
--    Benchmarking, Matriz de ángulos, Lista de tomas, etc.)
-- =========================================================================

create table if not exists portal_hojas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  titulo text not null,
  tipo text not null default 'tabla'
    check (tipo in ('tabla', 'ideas', 'benchmarking', 'matriz', 'tomas')),
  descripcion text,
  visible_cliente boolean not null default false,
  columnas jsonb not null default '[]'::jsonb,
  filas jsonb not null default '[]'::jsonb,
  orden int not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists portal_hojas_tenant_orden_idx
  on portal_hojas (tenant_id, orden);

alter table portal_hojas enable row level security;

drop policy if exists "cliente_lee_su_portal" on portal_hojas;
create policy "cliente_lee_su_portal" on portal_hojas
  for select to authenticated
  using (tenant_id = public.current_tenant_id() and visible_cliente = true);

drop policy if exists "mfa_requerido" on portal_hojas;
create policy "mfa_requerido" on portal_hojas as restrictive for all to authenticated
  using (public.mfa_ok()) with check (public.mfa_ok());
