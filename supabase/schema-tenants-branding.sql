-- ASYGNUZ Dashboard — marca blanca por tenant
-- Pega este script completo en Supabase → SQL Editor → New query → Run.
-- Requiere haber corrido antes schema-tenants.sql. Agrega logo_url a
-- tenants (nulo = usa el logo/nombre de ASYGNUZ por defecto) y actualiza
-- tenant_actual() para devolverlo — sin esto, cualquier cliente nuevo del
-- SaaS vería la marca de ASYGNUZ en su propio dashboard.

alter table tenants add column if not exists logo_url text;

create or replace function public.tenant_actual()
returns table(id uuid, nombre text, logo_url text)
language sql
security definer set search_path = public
as $$
  select t.id, t.nombre, t.logo_url
  from tenants t
  join profiles p on p.tenant_id = t.id
  where p.id = auth.uid();
$$;
