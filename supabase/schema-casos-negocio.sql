-- ASYGNUZ Dashboard — Casos de negocio (2026-11-11)
-- Pega en Supabase → SQL Editor → Run. Seguro de repetir. No borra datos.
--
-- /crm/casos-negocio calcula cuánto cobrar por un proyecto (Monte Carlo del
-- Excel Pricing_MonteCarlo_Proyecto). Guarda costos internos (sueldos), así
-- que es interna de ASYGNUZ: flag propio "casos_negocio", como "prospeccion".

create table if not exists casos_negocio (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references tenants(id) on delete cascade,
  nombre text not null,
  cliente text,
  precio numeric not null default 0,
  supuestos jsonb not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table casos_negocio enable row level security;
revoke all on casos_negocio from anon;
drop policy if exists "tenant_gestiona_sus_casos" on casos_negocio;
create policy "tenant_gestiona_sus_casos" on casos_negocio
  for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
drop policy if exists "mfa_requerido" on casos_negocio;
create policy "mfa_requerido" on casos_negocio as restrictive for all to authenticated
  using (public.mfa_ok()) with check (public.mfa_ok());

update tenants
set modulos_habilitados = modulos_habilitados || '{"casos_negocio": true}'::jsonb
where slug = 'asygnuz';

-- Primer caso: el del Excel (Senior + Medium + Claude Code), para comparar.
insert into casos_negocio (tenant_id, nombre, cliente, precio, supuestos)
select t.id, 'Proyecto base (Excel Libro 1)', null, 69000000, '{"equipo":[{"nombre":"Dev. Senior Full Stack","pagoMensual":3000000,"dedicacion":1},{"nombre":"Dev. Medium Full Stack","pagoMensual":2500000,"dedicacion":1}],"herramientas":[{"nombre":"Claude Code","usdMes":100,"cantidad":3}],"riesgos":[{"nombre":"Retrasos de infraestructura","impacto":5500000,"momento":"inicio","prob":{"pesimista":0.6,"probable":0.4,"optimista":0.2}},{"nombre":"Reprocesos en pruebas (UAT)","impacto":6550000,"momento":"entrega","prob":{"pesimista":1,"probable":1,"optimista":0.7}},{"nombre":"API o base de datos del cliente","impacto":3000000,"momento":"mitad","prob":{"pesimista":0.9,"probable":0.7,"optimista":0.4}},{"nombre":"Soporte de problemas en producción","impacto":6550000,"momento":"postEntrega","prob":{"pesimista":1,"probable":1,"optimista":0.6}},{"nombre":"Sobrecosto de IA","impacto":315000,"momento":"mensual","prob":{"pesimista":0.5,"probable":0.3,"optimista":0.15}}],"escenarios":{"pesimista":{"duracion":{"min":14,"moda":16,"max":20},"rezago":{"min":4,"moda":6,"max":10},"trm":{"min":3500,"moda":3750,"max":4200},"multRiesgo":{"min":0.9,"moda":1.2,"max":1.8}},"probable":{"duracion":{"min":7,"moda":8,"max":11},"rezago":{"min":3,"moda":4,"max":6},"trm":{"min":3300,"moda":3500,"max":3850},"multRiesgo":{"min":0.6,"moda":1,"max":1.4}},"optimista":{"duracion":{"min":3,"moda":4,"max":6},"rezago":{"min":2,"moda":3,"max":5},"trm":{"min":3200,"moda":3450,"max":3700},"multRiesgo":{"min":0.4,"moda":0.7,"max":1}}},"pesos":{"pesimista":0.25,"probable":0.5,"optimista":0.25},"tasaDescuentoEA":0.165,"metaRoi":0.4,"administracion":0.1,"pctSobrePrecio":0,"anticipo":0,"semanasPorMes":4.333333333333333}'::jsonb
from tenants t
where t.slug = 'asygnuz'
  and not exists (select 1 from casos_negocio c where c.tenant_id = t.id and c.nombre = 'Proyecto base (Excel Libro 1)');
