-- ASYGNUZ Dashboard — credenciales de Kaneo por tenant + hardening de RLS
-- en `tenants`. Pega este script completo en Supabase → SQL Editor → Run.
--
-- Por qué una tabla separada y no columnas en `tenants`: `tenants` se lee
-- desde el cliente vía las funciones tenant_actual()/modulos_habilitados_
-- tenant() (security definer), y aunque esas funciones ya filtran por
-- auth.uid(), la tabla en sí no tenía RLS habilitado -- cualquiera con la
-- anon key pública podía leerla entera vía PostgREST
-- (`/rest/v1/tenants`), sin pasar por esas funciones. Antes de meter ahí
-- un api key de Kaneo, primero se cierra ese hueco; y aun cerrado, el
-- secreto va en una tabla aparte con RLS sin ninguna política (deny-all
-- para anon/authenticated) -- solo el service_role (servidor, nunca el
-- navegador) puede leerla. Defensa en profundidad: dos capas, no una.

-- =========================================================================
-- 1) Cerrar el hueco existente en `tenants`
-- =========================================================================

alter table tenants enable row level security;

drop policy if exists "tenant_lee_su_propia_fila" on tenants;
create policy "tenant_lee_su_propia_fila" on tenants
  for select to authenticated
  using (id = public.current_tenant_id());

-- =========================================================================
-- 2) Credenciales de Kaneo por tenant -- tabla separada, RLS sin políticas
-- =========================================================================

create table if not exists tenant_kaneo (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  kaneo_api_url text not null,
  kaneo_workspace_id text not null,
  kaneo_api_key text not null,
  creado_en timestamptz not null default now()
);

alter table tenant_kaneo enable row level security;
-- A propósito: cero políticas. Ni siquiera el propio tenant puede leer su
-- fila desde el navegador -- solo createAdminClient() (service_role, del
-- lado del servidor) la consulta, nunca código que corra en el cliente.

-- Backfill del tenant único de hoy con los valores que ya estaban en
-- variables de entorno (.env.local / Vercel) -- reemplaza los 3 <...>
-- por los valores reales antes de correr esto.
insert into tenant_kaneo (tenant_id, kaneo_api_url, kaneo_workspace_id, kaneo_api_key)
values (
  'af1f801b-9da5-42e6-ba81-2920bd4f4c57',
  '<KANEO_API_URL actual>',
  '<KANEO_WORKSPACE_ID actual>',
  '<KANEO_API_KEY actual>'
)
on conflict (tenant_id) do update set
  kaneo_api_url = excluded.kaneo_api_url,
  kaneo_workspace_id = excluded.kaneo_workspace_id,
  kaneo_api_key = excluded.kaneo_api_key;

-- =========================================================================
-- Verificación (correr después):
--   -- Debe fallar / devolver 0 filas con la anon key (RLS bloqueando):
--   select * from tenant_kaneo;
--   -- Debe devolver la fila de ASYGNUZ con el service_role:
--   select tenant_id, kaneo_workspace_id from tenant_kaneo;
-- =========================================================================
