-- ASYGNUZ Dashboard — marca blanca por tenant, autoservicio (2026-09-28)
-- Pega este script completo en Supabase → SQL Editor → New query → Run.
-- Es seguro volver a correrlo. No borra datos.
-- Requiere haber corrido antes: schema-tenants.sql, schema-tenants-branding.sql
-- y schema-kaneo-por-tenant.sql (RLS de `tenants` ya habilitado).
--
-- Hasta hoy, nombre/logo de un tenant solo se podían cambiar a mano en SQL
-- (service_role). Esto le da a un admin del propio tenant una forma segura
-- de cambiarlos desde la app:
--  1) UPDATE en `tenants`, pero SOLO en las columnas nombre/logo_url (nunca
--     slug ni modulos_habilitados), solo su propia fila, solo si es admin,
--     y solo con aal2 si ya tiene 2FA activado (mismo criterio que el resto
--     del dashboard).
--  2) Un bucket de Storage público para los logos, con el mismo candado:
--     cada tenant solo puede escribir dentro de su propia carpeta
--     (`<tenant_id>/...`) y solo si es admin.

-- =========================================================================
-- 1. UPDATE acotado en tenants
-- =========================================================================

revoke update on tenants from authenticated;
grant update (nombre, logo_url) on tenants to authenticated;

drop policy if exists "tenant_admin_actualiza_marca" on tenants;
create policy "tenant_admin_actualiza_marca" on tenants
  for update to authenticated
  using (
    id = public.current_tenant_id()
    and exists (select 1 from profiles where id = auth.uid() and rol = 'admin')
  )
  with check (
    id = public.current_tenant_id()
    and exists (select 1 from profiles where id = auth.uid() and rol = 'admin')
  );

drop policy if exists "mfa_requerido" on tenants;
create policy "mfa_requerido" on tenants as restrictive for all to authenticated
  using (public.mfa_ok()) with check (public.mfa_ok());

-- =========================================================================
-- 2. Bucket de Storage para logos
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('logos-tenants', 'logos-tenants', true)
on conflict (id) do nothing;

drop policy if exists "logos_tenants_lectura_publica" on storage.objects;
create policy "logos_tenants_lectura_publica" on storage.objects
  for select to public
  using (bucket_id = 'logos-tenants');

drop policy if exists "logos_tenants_admin_escribe" on storage.objects;
create policy "logos_tenants_admin_escribe" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'logos-tenants'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and exists (select 1 from profiles where id = auth.uid() and rol = 'admin')
  );

drop policy if exists "logos_tenants_admin_reemplaza" on storage.objects;
create policy "logos_tenants_admin_reemplaza" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos-tenants' and (storage.foldername(name))[1] = public.current_tenant_id()::text)
  with check (
    bucket_id = 'logos-tenants'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and exists (select 1 from profiles where id = auth.uid() and rol = 'admin')
  );

drop policy if exists "logos_tenants_admin_borra" on storage.objects;
create policy "logos_tenants_admin_borra" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'logos-tenants'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and exists (select 1 from profiles where id = auth.uid() and rol = 'admin')
  );

-- =========================================================================
-- Verificación:
--   select grantee, privilege_type, column_name from information_schema.column_privileges
--   where table_name = 'tenants' and grantee = 'authenticated';
--   -- debe mostrar SOLO nombre y logo_url con UPDATE.
--   select id, public from storage.buckets where id = 'logos-tenants'; -- public = true
-- =========================================================================
