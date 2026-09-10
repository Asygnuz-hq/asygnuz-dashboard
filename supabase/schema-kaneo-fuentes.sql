-- ASYGNUZ Dashboard — fuentes de Kaneo ADICIONALES por tenant
-- Pega este script completo en Supabase → SQL Editor → New query → Run.
-- Requiere haber corrido antes schema-kaneo-por-tenant.sql.
--
-- Para qué: además del Kaneo propio de cada cliente (tabla `tenant_kaneo`,
-- una fila por tenant), un cliente puede querer VER las métricas de otro
-- Kaneo al que tiene acceso pero no administra -- p. ej. ASYGNUZ, que da
-- soporte+desarrollo a "Financieramente" y quiere ver qué está haciendo
-- ese equipo sin tener cuenta en ese Kaneo. Financieramente le da una API
-- key de SOLO LECTURA y se registra acá como fuente adicional.
--
-- Mismo blindaje que `tenant_kaneo`: RLS habilitado, CERO políticas. Solo
-- el service_role (servidor) la lee; la api key jamás llega al navegador.
-- La ruta /api/kaneo/* resuelve el tenant desde la sesión y solo acepta un
-- id de fuente que pertenezca a ESE tenant -- nunca uno que mande el
-- cliente a ciegas.

create table if not exists tenant_kaneo_fuentes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nombre text not null,
  kaneo_api_url text not null,
  kaneo_workspace_id text not null,
  kaneo_api_key text not null,
  -- true = la key es de solo lectura (informativo; el dashboard nunca
  -- escribe contra una fuente adicional de todos modos).
  solo_lectura boolean not null default true,
  creado_en timestamptz not null default now()
);

create index if not exists tenant_kaneo_fuentes_tenant_idx
  on tenant_kaneo_fuentes (tenant_id);

alter table tenant_kaneo_fuentes enable row level security;
-- A propósito: cero políticas (deny-all para anon/authenticated). Solo
-- createAdminClient() (service_role, del lado del servidor) la consulta.

-- =========================================================================
-- Alta de la fuente de Financieramente (correr cuando tengas la API key
-- que te dé Jorge). Reemplazá los <...>:
-- =========================================================================
-- insert into tenant_kaneo_fuentes
--   (tenant_id, nombre, kaneo_api_url, kaneo_workspace_id, kaneo_api_key)
-- values (
--   'af1f801b-9da5-42e6-ba81-2920bd4f4c57',   -- tenant ASYGNUZ
--   'Financieramente (cliente)',
--   '<URL del Kaneo de Financieramente>',
--   '<workspace id de ese Kaneo>',
--   '<API key de solo lectura>'
-- );

-- Verificación (con el service_role):
--   select id, nombre, kaneo_workspace_id from tenant_kaneo_fuentes;
