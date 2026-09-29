-- ASYGNUZ Dashboard — Portal de Cliente: gestión solo para una persona (2026-09-29)
-- Pega en Supabase → SQL Editor → Run. Seguro de repetir. No borra datos.
--
-- Hasta ahora "Portales de Clientes (Growth)" lo veía y podía usar CUALQUIER
-- admin del tenant ASYGNUZ (Pablo, Andrés...). Esto lo acota a la(s)
-- persona(s) que marques con gestiona_portales = true — hoy solo Juan Manuel.
-- No depende de un flag del tenant (eso lo veían todos), sino de la persona.

alter table profiles add column if not exists gestiona_portales boolean not null default false;

create or replace function public.gestiona_portales()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select gestiona_portales from profiles where id = auth.uid()), false);
$$;

-- Cambia el correo por el que usas para entrar al dashboard:
update profiles
set gestiona_portales = true
where id = (select id from auth.users where email = 'PON_AQUI_TU_CORREO@asygnuz.com');

-- =========================================================================
-- Verificación:
--   select u.email, p.gestiona_portales from profiles p
--   join auth.users u on u.id = p.id where p.gestiona_portales = true;
--   -- debe salir SOLO tu fila.
-- =========================================================================
