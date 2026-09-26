-- ASYGNUZ Dashboard — seguridad, sprint 2a (2026-09-26)
-- Pega este script completo en Supabase → SQL Editor → New query → Run.
-- Es seguro volver a correrlo. No borra datos.
-- Requiere haber corrido antes: sprint0, sprint1a y sprint1b.
--
-- 1) /analitica pasa a ser una herramienta interna: solo la ve un tenant con
--    el flag "analitica" (hoy solo ASYGNUZ). El middleware y el sidebar lo
--    exigen desde este despliegue; sin este UPDATE, ASYGNUZ tampoco la vería.
-- 2) Todas las vistas de public quedan con security_invoker = on. Una vista
--    sin esa opción corre con los permisos de su dueño y se salta RLS, o sea
--    mostraría a un tenant los datos de los demás. `create or replace view` en
--    scripts posteriores puede haber reseteado la opción sin que nadie lo notara.

update tenants
set modulos_habilitados = modulos_habilitados || '{"analitica": true}'::jsonb
where slug = 'asygnuz';

do $$
declare
  v record;
begin
  for v in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
  loop
    execute format('alter view public.%I set (security_invoker = on);', v.relname);
  end loop;
end $$;

-- Verificación: TODAS las filas deben decir security_invoker=on
--   select c.relname as vista, coalesce(c.reloptions::text, '(sin opciones)') as opciones
--   from pg_class c join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public' and c.relkind = 'v' order by 1;
--   select slug, modulos_habilitados -> 'analitica' as analitica from tenants;
