-- ASYGNUZ Dashboard — Panel de Avance del Portal de Cliente.
-- Pega este script completo en Supabase → SQL Editor → Run. Idempotente.
--
-- Amarra a cada cliente (tenant) sus fuentes de datos para la pantalla
-- /portal/avance:
--   - portal_kaneo_proyectos: qué proyecto(s) del Kaneo de ASYGNUZ son de
--     ese cliente (de ahí sale "lo que hicimos").
--   - portal_meta_conexiones: qué conexiones de Meta (cuenta de anuncios
--     y/o Instagram) son de ese cliente. La conexión sigue siendo de
--     ASYGNUZ (la sigue viendo /marketing); esto solo la comparte.
--
-- Mismo blindaje que tenant_kaneo: RLS activo y CERO políticas — solo el
-- service_role (servidor) lee/escribe, y solo después de comprobar en la
-- ruta quién llama (gestiona_portales o el tenant de la sesión).

create table if not exists portal_kaneo_proyectos (
  tenant_id uuid not null references tenants(id) on delete cascade,
  kaneo_project_id text not null,
  kaneo_project_nombre text not null,
  creado_en timestamptz not null default now(),
  primary key (tenant_id, kaneo_project_id)
);

create table if not exists portal_meta_conexiones (
  tenant_id uuid not null references tenants(id) on delete cascade,
  conexion_id uuid not null references meta_conexiones(id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (tenant_id, conexion_id)
);

alter table portal_kaneo_proyectos enable row level security;
alter table portal_meta_conexiones enable row level security;
revoke all on portal_kaneo_proyectos from anon, authenticated;
revoke all on portal_meta_conexiones from anon, authenticated;

-- Verificación (con la sesión de un usuario debe devolver 0 filas / error
-- de permiso):
--   select * from portal_kaneo_proyectos;
--   select * from portal_meta_conexiones;
