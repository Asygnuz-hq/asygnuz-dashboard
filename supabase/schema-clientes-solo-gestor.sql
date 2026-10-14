-- ASYGNUZ Dashboard — los datos de Meta de los clientes con Portal solo los
-- ve quien gestiona portales (gestiona_portales = true, hoy solo JM).
-- Pega este script completo en Supabase → SQL Editor → Run. Idempotente.
--
-- Una conexión de Meta amarrada a un Portal de Cliente (portal_meta_conexiones)
-- deja de verse en /marketing para el resto del equipo de ASYGNUZ. Las
-- conexiones propias de ASYGNUZ (sin portal) se siguen viendo como antes.
--
-- portal_meta_conexiones no tiene políticas (nadie la lee con su sesión), así
-- que la comprobación va en una función security definer.

create or replace function public.conexion_es_de_portal(p_conexion_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from portal_meta_conexiones where conexion_id = p_conexion_id);
$$;

revoke all on function public.conexion_es_de_portal(uuid) from public, anon;
grant execute on function public.conexion_es_de_portal(uuid) to authenticated;

drop policy if exists "clientes_solo_gestor" on meta_conexiones;
create policy "clientes_solo_gestor" on meta_conexiones
  as restrictive for all to authenticated
  using (not public.conexion_es_de_portal(id) or public.gestiona_portales())
  with check (not public.conexion_es_de_portal(id) or public.gestiona_portales());

-- Verificación: con la sesión de Pablo o Andrés, una conexión amarrada a un
-- portal no aparece en /marketing; con la de JM sí.
