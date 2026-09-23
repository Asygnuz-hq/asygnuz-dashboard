-- ASYGNUZ Dashboard — seguridad, sprint 1a: aislamiento de raíz (2026-09-23)
-- Pega este script completo en Supabase → SQL Editor → New query → Run.
-- Es seguro volver a correrlo. No borra datos.
-- Requiere haber corrido antes: schema-tenants.sql y schema-seguridad-sprint0.sql.
--
-- Qué arregla:
--  1) Un usuario nuevo caía SIEMPRE en el tenant de ASYGNUZ (default de
--     profiles.tenant_id + handle_new_user sin tenant) y veía todos tus datos.
--     Ahora cae en un tenant vacío "Sin asignar" hasta que un operador lo mueva.
--  2) Los inserts de un usuario de otro tenant caían en ASYGNUZ (default
--     constante) o los rechazaba RLS. Ahora toman el tenant de la sesión.
--  3) Un tenant sin la clave de un módulo lo veía (fail-open). El default de
--     modulos_habilitados pasa a '{}' (nada activo) y la app exige === true.
--  4) El 2FA solo se exigía en la interfaz: con la contraseña sola (aal1) se
--     podía llamar a la API directo. Ahora RLS exige aal2 a quien YA tiene un
--     factor verificado (no bloquea a quien aún no lo activó).
--  5) Alta de tenants y usuarios por función (sin SQL a mano ni riesgo de
--     dejar a alguien dentro de ASYGNUZ).

-- =========================================================================
-- 1. Tenant "Sin asignar" (vacío, sin módulos) + módulos fail-closed
-- =========================================================================

insert into tenants (id, nombre, slug, modulos_habilitados)
values ('9e8f16a7-edcd-4ab1-85a1-12a33369eed0', 'Sin asignar', 'sin-asignar', '{}'::jsonb)
on conflict (id) do nothing;

alter table tenants alter column modulos_habilitados set default '{}'::jsonb;

-- ASYGNUZ conserva todo lo que ya usa (su fila no tenía la clave nomina).
update tenants
set modulos_habilitados = modulos_habilitados || '{"financiero":true,"marketing_pauta":true,"crm":true,"operacion":true,"nomina":true}'::jsonb
where slug = 'asygnuz';

-- =========================================================================
-- 2. Nuevos usuarios: tenant tomado de app_metadata (solo lo escribe un admin
--    o el service_role, el usuario NO puede editarlo), o "Sin asignar".
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_tenant uuid;
begin
  begin
    v_tenant := (new.raw_app_meta_data ->> 'tenant_id')::uuid;
  exception when others then
    v_tenant := null;
  end;
  if v_tenant is null or not exists (select 1 from tenants where id = v_tenant) then
    v_tenant := '9e8f16a7-edcd-4ab1-85a1-12a33369eed0';
  end if;

  insert into public.profiles (id, full_name, tenant_id)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), v_tenant);
  return new;
end;
$$;

alter table profiles alter column tenant_id drop default;

-- =========================================================================
-- 3. tenant_id de las tablas de negocio: default = tenant de la sesión.
--    coalesce a ASYGNUZ SOLO cuando no hay sesión (service_role: n8n, seeds).
--    Cualquier inserción de servidor en nombre de OTRO tenant debe pasar
--    tenant_id explícito.
-- =========================================================================

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'ingresos', 'gastos_fijos', 'gastos_variables', 'inversiones',
    'fundacion_donaciones', 'disenadores', 'control_mensual_tareas',
    'cobros_clientes', 'clientes', 'actividades_cliente', 'cuentas',
    'movimientos_cuenta', 'campanas_marketing', 'equipo', 'mercado_watchlist',
    'meta_conexiones', 'meta_conexiones_pendientes', 'meta_publicacion_notas',
    'leads'
  ])
  loop
    execute format(
      'alter table %I alter column tenant_id set default coalesce(public.current_tenant_id(), %L::uuid);',
      t, 'af1f801b-9da5-42e6-ba81-2920bd4f4c57'
    );
  end loop;
end $$;

-- =========================================================================
-- 4. 2FA exigido en la base de datos (RLS restrictiva, se suma a las policies)
-- =========================================================================

create or replace function public.mfa_ok()
returns boolean
language sql
stable
security definer set search_path = public, auth
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors
        where user_id = auth.uid() and status = 'verified'
      );
$$;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'profiles', 'ingresos', 'gastos_fijos', 'gastos_variables', 'inversiones',
    'fundacion_donaciones', 'disenadores', 'control_mensual_tareas',
    'cobros_clientes', 'clientes', 'actividades_cliente', 'cuentas',
    'movimientos_cuenta', 'campanas_marketing', 'equipo', 'mercado_watchlist',
    'meta_conexiones', 'meta_conexiones_pendientes', 'meta_publicacion_notas',
    'leads', 'empleados', 'contratos', 'nominas', 'nominas_detalle',
    'ausencias', 'asignaciones_proyecto', 'onboarding_checklists'
  ])
  loop
    execute format('drop policy if exists "mfa_requerido" on %I;', t);
    execute format(
      'create policy "mfa_requerido" on %I as restrictive for all to authenticated '
      || 'using (public.mfa_ok()) with check (public.mfa_ok());',
      t
    );
  end loop;
end $$;

-- =========================================================================
-- 5. Alta de tenants y usuarios (solo ejecutables desde el SQL Editor o con
--    service_role — NO desde la app).
-- =========================================================================

create or replace function public.crear_tenant(
  p_nombre text,
  p_slug text,
  p_modulos jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into tenants (nombre, slug, modulos_habilitados)
  values (p_nombre, p_slug, coalesce(p_modulos, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.asignar_usuario_a_tenant(
  p_email text,
  p_slug text,
  p_rol text default 'miembro'
)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid;
  v_tenant uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(p_email);
  if v_user is null then
    raise exception 'No existe un usuario con el correo %. Créalo primero en Authentication → Users.', p_email;
  end if;
  select id into v_tenant from tenants where slug = p_slug;
  if v_tenant is null then
    raise exception 'No existe el tenant con slug %.', p_slug;
  end if;
  if p_rol not in ('admin', 'miembro') then
    raise exception 'Rol inválido (usa admin o miembro).';
  end if;

  update profiles set tenant_id = v_tenant, rol = p_rol where id = v_user;
  -- app_metadata: para que futuras re-creaciones del perfil respeten el tenant
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tenant_id', v_tenant)
  where id = v_user;

  return format('%s → tenant %s (%s)', p_email, p_slug, p_rol);
end;
$$;

revoke execute on function public.crear_tenant(text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.asignar_usuario_a_tenant(text, text, text) from public, anon, authenticated;

-- =========================================================================
-- Ejemplo de uso para el primer cliente:
--   select public.crear_tenant('Cliente Uno', 'cliente-uno',
--     '{"financiero": true, "marketing_pauta": true, "operacion": true}');
--   -- (crea el usuario en Authentication → Users → Add user, y luego:)
--   select public.asignar_usuario_a_tenant('persona@cliente.com', 'cliente-uno', 'admin');
--
-- Verificación:
--   select slug, modulos_habilitados from tenants;          -- asygnuz con nomina:true
--   select count(*) from profiles where tenant_id is null;  -- 0
-- =========================================================================
