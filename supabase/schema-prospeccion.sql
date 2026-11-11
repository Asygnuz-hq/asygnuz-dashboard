-- Prospección (House of Dev) — 2026-11-11
-- Pega en Supabase → SQL Editor → Run. Seguro de repetir.
--
-- 1) Flag "prospeccion" para ASYGNUZ (como "analitica"): /crm/prospeccion lee
--    y escribe los leads de ASYGNUZ en EspoCRM, así que no basta con "crm".
-- 2) Tenant "ASYGNUZ Comercial" para la comercial: solo CRM + prospección.
--    Como el aislamiento de datos es por tenant (RLS), desde ahí no ve
--    finanzas, nómina ni nada más de ASYGNUZ, aunque entre por URL o API.

update tenants
set modulos_habilitados = modulos_habilitados || '{"prospeccion": true}'::jsonb
where slug = 'asygnuz';

select public.crear_tenant('ASYGNUZ Comercial', 'asygnuz-comercial', '{"crm": true, "prospeccion": true}'::jsonb)
where not exists (select 1 from tenants where slug = 'asygnuz-comercial');

-- 3) La comercial usa el mismo EspoCRM de ASYGNUZ (copia la conexión, sin
--    escribir la clave a mano). Requiere schema-espocrm-por-tenant.sql.
insert into tenant_espocrm (tenant_id, espocrm_api_url, espocrm_api_key)
select c.id, e.espocrm_api_url, e.espocrm_api_key
from tenants c, tenant_espocrm e
where c.slug = 'asygnuz-comercial' and e.tenant_id = 'af1f801b-9da5-42e6-ba81-2920bd4f4c57'
on conflict (tenant_id) do update set
  espocrm_api_url = excluded.espocrm_api_url,
  espocrm_api_key = excluded.espocrm_api_key;

-- 4) Después de crear a la comercial en Authentication → Users (Invite user),
--    descomenta y corre esta línea con su correo:
-- select public.asignar_usuario_a_tenant('correo@de-la-comercial.com', 'asygnuz-comercial', 'miembro');

-- Verificación:
--   select slug, modulos_habilitados from tenants where slug in ('asygnuz', 'asygnuz-comercial');
