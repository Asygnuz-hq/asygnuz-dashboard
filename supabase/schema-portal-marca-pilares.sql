-- ASYGNUZ Dashboard — Portal de Cliente: color de marca + pilares estratégicos (2026-09-29)
-- Pega en Supabase → SQL Editor → Run. Seguro de repetir. No borra datos.
--
-- Opción C aprobada por JM: cada cliente de Growth tiene su propio color de
-- marca (no el genérico verde de ASYGNUZ) y la ficha del proyecto se
-- reparte en "pilares" (tarjetas cortas) en vez de un solo párrafo largo.

alter table tenants add column if not exists color_acento text;

drop function if exists public.tenant_actual();
create or replace function public.tenant_actual()
returns table(id uuid, nombre text, logo_url text, color_acento text)
language sql
security definer set search_path = public
as $$
  select t.id, t.nombre, t.logo_url, t.color_acento
  from tenants t
  join profiles p on p.tenant_id = t.id
  where p.id = auth.uid();
$$;

create table if not exists portal_pilares (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  icono text not null default '🎯',
  titulo text not null,
  texto text not null,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

alter table portal_pilares enable row level security;
drop policy if exists "cliente_lee_su_portal" on portal_pilares;
create policy "cliente_lee_su_portal" on portal_pilares
  for select to authenticated
  using (tenant_id = public.current_tenant_id());
drop policy if exists "mfa_requerido" on portal_pilares;
create policy "mfa_requerido" on portal_pilares as restrictive for all to authenticated
  using (public.mfa_ok()) with check (public.mfa_ok());

-- =========================================================================
-- Datos de Dra. Ingrid: su color de marca (azul marino) + los 4 pilares del
-- resumen estratégico (el mismo texto de la propuesta visual aprobada).
-- =========================================================================

update tenants set color_acento = '#16233D' where slug = 'dra-ingrid';

insert into portal_pilares (tenant_id, icono, titulo, texto, orden)
select t.id, x.icono, x.titulo, x.texto, x.orden
from tenants t, (values
  ('🎯', 'Posicionamiento',
   'Well-aging, bioseguridad clínica y "transparencia extrema" — mapeo facial con ecografía Doppler como diferenciador frente al mercado informal.', 0),
  ('📍', 'Mercado',
   'Toxina botulínica $1.25M–$1.6M COP, bioestimuladores $1.65M–$2.1M — clúster médico y universitario con capacidad de pago.', 1),
  ('💰', 'Pauta digital',
   'CAC de $8.000–$25.000 COP por lead calificado. Presupuesto mínimo $600.000 COP/mes para competir localmente en Meta Ads.', 2),
  ('⚖️', 'Blindaje legal',
   'Afiliación FEPASDE (SCARE). Ninguna publicación promete resultados exactos — protege la cobertura del seguro.', 3)
) as x(icono, titulo, texto, orden)
where t.slug = 'dra-ingrid'
  and not exists (select 1 from portal_pilares p where p.tenant_id = t.id and p.titulo = x.titulo);

-- Verificación:
--   select color_acento from tenants where slug = 'dra-ingrid';
--   select icono, titulo from portal_pilares
--   where tenant_id = (select id from tenants where slug = 'dra-ingrid') order by orden;
