-- ASYGNUZ Dashboard — Portal de Cliente (Growth), 2026-09-29
-- Pega este script completo en Supabase → SQL Editor → New query → Run.
-- Es seguro volver a correrlo. No borra datos.
-- Requiere: schema-tenants.sql, schema-tenants-branding.sql,
-- schema-seguridad-sprint1a.sql (mfa_ok()).
--
-- Qué es: un módulo nuevo, "portal_cliente", para clientes de ASYGNUZ
-- Growth (contenido/marca — Mayra Fit, Santi, Claudia...), distinto del
-- SaaS de métricas. Cada cliente de Growth es un tenant con SOLO ese
-- módulo activo: mismo login/RLS/infra que el resto del dashboard, vista
-- propia y simple.
--
-- Modelo de permisos, a propósito asimétrico:
--  - El cliente (su tenant) SOLO puede LEER su propio portal. Nunca
--    escribe directo por RLS.
--  - Quien arma/edita el portal (parrilla, enlaces, reuniones, archivos)
--    es el equipo de ASYGNUZ, vía rutas /api/portal-admin/* que usan el
--    cliente de servicio (createAdminClient) tras comprobar que quien
--    llama es admin del tenant ASYGNUZ — igual que ya hace todo lo de
--    Kaneo con tenant_kaneo. No se le da a ASYGNUZ una policy RLS
--    "lee/escribe cualquier tenant": el candado lo pone la ruta del
--    servidor, no una excepción abierta en la base.

-- =========================================================================
-- 0. Flag para que ASYGNUZ vea la pantalla de gestión de portales
-- =========================================================================

update tenants
set modulos_habilitados = modulos_habilitados || '{"portal_admin": true}'::jsonb
where slug = 'asygnuz';

-- =========================================================================
-- 1. Tablas
-- =========================================================================

create table if not exists portal_proyecto (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  fecha_inicio date,
  fecha_fin date,
  tipo_proyecto text,
  descripcion text,
  contacto_nombre text,
  contacto_email text,
  responsable_nombre text,
  responsable_email text,
  actualizado_en timestamptz not null default now()
);

create table if not exists portal_enlaces (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  titulo text not null,
  url text not null,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

create table if not exists portal_reuniones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  titulo text not null,
  fecha date not null,
  notas text,
  creado_en timestamptz not null default now()
);

create table if not exists portal_archivos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nombre text not null,
  storage_path text not null,
  tamano_bytes bigint,
  subido_en timestamptz not null default now()
);

create table if not exists portal_contenido (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  titulo text not null,
  tipo text,
  fecha_publicacion date,
  estado text not null default 'grabacion'
    check (estado in ('grabacion', 'revision', 'edicion', 'publicado')),
  notas text,
  link text,
  orden int not null default 0,
  actualizado_en timestamptz not null default now()
);

-- =========================================================================
-- 2. RLS — el cliente SOLO lee su propio tenant. Sin policy de escritura
--    para 'authenticated': solo service_role (rutas /api/portal-admin/*)
--    puede insertar/editar/borrar.
-- =========================================================================

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'portal_proyecto', 'portal_enlaces', 'portal_reuniones',
    'portal_archivos', 'portal_contenido'
  ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "cliente_lee_su_portal" on %I;', t);
    execute format(
      'create policy "cliente_lee_su_portal" on %I for select to authenticated '
      || 'using (tenant_id = public.current_tenant_id());',
      t
    );
    execute format('drop policy if exists "mfa_requerido" on %I;', t);
    execute format(
      'create policy "mfa_requerido" on %I as restrictive for all to authenticated '
      || 'using (public.mfa_ok()) with check (public.mfa_ok());',
      t
    );
  end loop;
end $$;

-- =========================================================================
-- 3. Storage: archivos del portal (privado — no público como los logos)
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('portal-archivos', 'portal-archivos', false)
on conflict (id) do nothing;

drop policy if exists "portal_archivos_tenant_lee" on storage.objects;
create policy "portal_archivos_tenant_lee" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'portal-archivos'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );
-- Sin policy de insert/update/delete para 'authenticated': los archivos los
-- sube el equipo de ASYGNUZ vía /api/portal-admin (service_role, bypassa RLS).

-- =========================================================================
-- Alta de un cliente de Growth (además de crear el tenant desde la pantalla
-- de Gestión de Portales, o a mano):
--   select public.crear_tenant('Mayra Fit', 'mayra-fit', '{"portal_cliente": true}');
--   insert into portal_proyecto (tenant_id) select id from tenants where slug = 'mayra-fit';
--   -- (crear el usuario en Authentication → Users → Add user, y luego:)
--   select public.asignar_usuario_a_tenant('mayra@correo.com', 'mayra-fit', 'admin');
--
-- Verificación:
--   select tablename, policyname from pg_policies
--   where tablename like 'portal_%' order by 1,2;
-- =========================================================================
