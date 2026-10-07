-- ASYGNUZ Dashboard — credenciales de EspoCRM por tenant (Kaneo #34).
-- Pega este script completo en Supabase → SQL Editor → Run. Idempotente.
--
-- Antes el CRM leía ESPOCRM_API_URL / ESPOCRM_API_KEY globales (las de
-- ASYGNUZ): un cliente con su propio EspoCRM no podía conectarlo. Mismo
-- diseño que tenant_kaneo: tabla aparte con RLS y CERO políticas, solo el
-- service_role (servidor) la lee — src/lib/espocrm/tenant-config.ts.
--
-- Orden de despliegue: 1) correr este SQL con los valores reales,
-- 2) desplegar el código, 3) borrar ESPOCRM_API_URL / ESPOCRM_API_KEY de
-- Vercel y de .env.local (el código ya no las usa).

create table if not exists tenant_espocrm (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  espocrm_api_url text not null,
  espocrm_api_key text not null,
  creado_en timestamptz not null default now()
);

alter table tenant_espocrm enable row level security;
-- A propósito: cero políticas. Ni el propio tenant lee su fila desde el
-- navegador.
revoke all on tenant_espocrm from anon, authenticated;

-- Migrar ASYGNUZ a la tabla con los valores que hoy están en las variables
-- de entorno — reemplaza los 2 <...> antes de correr.
insert into tenant_espocrm (tenant_id, espocrm_api_url, espocrm_api_key)
values (
  'af1f801b-9da5-42e6-ba81-2920bd4f4c57',   -- tenant ASYGNUZ
  '<ESPOCRM_API_URL actual>',
  '<ESPOCRM_API_KEY actual>'
)
on conflict (tenant_id) do update set
  espocrm_api_url = excluded.espocrm_api_url,
  espocrm_api_key = excluded.espocrm_api_key;

-- Alta de otro cliente: el mismo insert con su tenant_id (select id, slug
-- from tenants) y sus credenciales.
--
-- Verificación (con la anon key / sesión de usuario debe devolver 0 filas):
--   select * from tenant_espocrm;
