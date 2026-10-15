-- ==============================================================================
-- ASYGNUZ Dashboard — Bandeja de Instagram & Automatizaciones (Flujos, DMs, Comentarios)
-- Archivo: supabase/schema-bandeja-instagram.sql
-- Ejecutar en Supabase → SQL Editor → Run. Idempotente.
-- ==============================================================================

-- 1. Ampliación de meta_conexiones
-- Agrega campos para almacenar la guía de marca de cada cuenta y los permisos concedidos
alter table public.meta_conexiones
  add column if not exists guia_marca text,
  add column if not exists instagram_scopes text[] default '{}'::text[];

create index if not exists idx_meta_conexiones_ig_bus_id
  on public.meta_conexiones (instagram_business_id);

-- 2. Tabla: ig_flujos
-- Reglas de automatización: disparadores por palabra clave, respuesta pública y privada
create table if not exists public.ig_flujos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  conexion_id uuid not null references public.meta_conexiones(id) on delete cascade,
  nombre text not null,
  palabras_clave text[] not null default '{}'::text[],
  aplica_a text not null default 'todas', -- 'todas' o lista de media_ids
  respuesta_privada text not null,
  respuesta_publica text[] not null default '{}'::text[],
  botones jsonb not null default '[]'::jsonb, -- [{ titulo: string, url: string }]
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_ig_flujos_conexion on public.ig_flujos (conexion_id);
create index if not exists idx_ig_flujos_tenant on public.ig_flujos (tenant_id);

-- 3. Tabla: ig_bienvenida
-- Mensaje de bienvenida del primer DM por conexión
create table if not exists public.ig_bienvenida (
  id uuid primary key default gen_random_uuid(),
  conexion_id uuid not null unique references public.meta_conexiones(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  mensaje text not null,
  activo boolean not null default true,
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_ig_bienvenida_conexion on public.ig_bienvenida (conexion_id);

-- 4. Tabla: ig_eventos
-- Registro de cada webhook recibido para deduplicación y auditoría
-- conexion_id es nullable: si llega un aviso de una cuenta no registrada en ASYGNUZ, se descarta/guarda sin romper
create table if not exists public.ig_eventos (
  id uuid primary key default gen_random_uuid(),
  meta_evento_id text not null unique,
  tipo text not null check (tipo in ('comment', 'message', 'postback')),
  conexion_id uuid references public.meta_conexiones(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  ig_usuario_id text not null,
  ig_usuario_nombre text,
  texto text,
  media_id text,
  comment_id text,
  recibido_en timestamptz not null default now(),
  crudo jsonb
);

alter table public.ig_eventos alter column conexion_id drop not null;

create index if not exists idx_ig_eventos_conexion on public.ig_eventos (conexion_id, recibido_en desc);
create index if not exists idx_ig_eventos_usuario on public.ig_eventos (ig_usuario_id);

-- 5. Tabla: ig_conversaciones
-- Un hilo por usuario de Instagram y cuenta.
-- Control de ventana de 24h estricto para DMs y control de respuesta privada a comentarios (máx 1 dentro de 7 días).
create table if not exists public.ig_conversaciones (
  id uuid primary key default gen_random_uuid(),
  conexion_id uuid not null references public.meta_conexiones(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  ig_usuario_id text not null,
  ig_usuario_nombre text,
  ultimo_mensaje_usuario_en timestamptz not null default now(),
  ultimo_dm_usuario_en timestamptz, -- Solo cuenta mensajes directos entrantes (para la ventana de 24h de DMs)
  ha_enviado_dm boolean not null default false, -- Indica si el usuario alguna vez escribió por DM
  comment_id_origen text, -- ID del comentario si la conversación nació de un comentario
  respuesta_privada_enviada boolean not null default false, -- Control de respuesta privada única permitida por Meta
  ultimo_mensaje_texto text,
  tipo_ultimo_evento text default 'message' check (tipo_ultimo_evento in ('message', 'comment')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'respondida', 'archivada')),
  flujo_origen uuid references public.ig_flujos(id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint uq_ig_conversacion_cuenta_usuario unique (conexion_id, ig_usuario_id)
);

-- Modificaciones idempotentes por si la tabla ya existía
alter table public.ig_conversaciones
  add column if not exists ultimo_dm_usuario_en timestamptz,
  add column if not exists ha_enviado_dm boolean not null default false,
  add column if not exists comment_id_origen text,
  add column if not exists respuesta_privada_enviada boolean not null default false;

create index if not exists idx_ig_conv_conexion_estado on public.ig_conversaciones (conexion_id, estado);
create index if not exists idx_ig_conv_ultimo_msg on public.ig_conversaciones (ultimo_mensaje_usuario_en desc);
create index if not exists idx_ig_conv_tenant on public.ig_conversaciones (tenant_id);

-- 6. Tabla: ig_mensajes
-- Mensajes entrantes y salientes de cada conversación
create table if not exists public.ig_mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.ig_conversaciones(id) on delete cascade,
  remitente text not null check (remitente in ('usuario', 'cuenta')),
  texto text not null,
  enviado_por text check (enviado_por in ('n8n', 'dashboard', 'claude')),
  estado_envio text not null default 'enviado' check (estado_envio in ('enviado', 'fallido', 'pendiente')),
  meta_mensaje_id text,
  creado_en timestamptz not null default now()
);

create index if not exists idx_ig_mensajes_conv on public.ig_mensajes (conversacion_id, creado_en asc);

-- 7. Tabla: ig_acciones
-- Registro de cada respuesta automática (para estadísticas, auditoría y control de tasa horaria)
create table if not exists public.ig_acciones (
  id uuid primary key default gen_random_uuid(),
  conexion_id uuid not null references public.meta_conexiones(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  flujo_id uuid references public.ig_flujos(id) on delete set null,
  evento_id uuid references public.ig_eventos(id) on delete set null,
  conversacion_id uuid references public.ig_conversaciones(id) on delete set null,
  tipo_accion text not null, -- 'respuesta_comentario_privada', 'respuesta_comentario_publica', 'bienvenida', 'respuesta_dm'
  resultado text not null check (resultado in ('exito', 'error', 'limite_alcanzado')),
  error_detalle text,
  ejecutado_en timestamptz not null default now()
);

create index if not exists idx_ig_acciones_conexion_hora on public.ig_acciones (conexion_id, ejecutado_en desc);
create index if not exists idx_ig_acciones_flujo on public.ig_acciones (flujo_id, ejecutado_en desc);

-- 8. Tabla: ig_links_tracking
-- Redirecciones internas para rastreo de clics en enlaces de DMs (/r/[id])
create table if not exists public.ig_links_tracking (
  id uuid primary key default gen_random_uuid(),
  flujo_id uuid references public.ig_flujos(id) on delete set null,
  conexion_id uuid not null references public.meta_conexiones(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  url_destino text not null,
  titulo text,
  clics_count integer not null default 0,
  creado_en timestamptz not null default now()
);

create index if not exists idx_ig_links_conexion on public.ig_links_tracking (conexion_id);
create index if not exists idx_ig_links_flujo on public.ig_links_tracking (flujo_id);

-- Función para incremento atómico de clics
create or replace function public.incrementar_clic_link(p_link_id uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_nuevo_conteo integer;
begin
  update public.ig_links_tracking
  set clics_count = clics_count + 1
  where id = p_link_id
  returning clics_count into v_nuevo_conteo;

  return v_nuevo_conteo;
end;
$$;

revoke all on function public.incrementar_clic_link(uuid) from public, anon;
grant execute on function public.incrementar_clic_link(uuid) to service_role;

-- 9. Tabla: tokens_agente
-- Tokens personales para Claude Code u otros agentes locales
create table if not exists public.tokens_agente (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  token_hash text not null unique,
  token_prefix text not null,
  revocado boolean not null default false,
  creado_en timestamptz not null default now(),
  ultimo_uso_en timestamptz
);

create index if not exists idx_tokens_agente_hash on public.tokens_agente (token_hash) where not revocado;

-- ==============================================================================
-- Seguridad RLS: todas las tablas blindadas sin acceso público directo
-- Solo service_role accede directamente; la aplicación filtra por permisos y sesión
-- ==============================================================================

alter table public.ig_flujos enable row level security;
alter table public.ig_bienvenida enable row level security;
alter table public.ig_eventos enable row level security;
alter table public.ig_conversaciones enable row level security;
alter table public.ig_mensajes enable row level security;
alter table public.ig_acciones enable row level security;
alter table public.ig_links_tracking enable row level security;
alter table public.tokens_agente enable row level security;

revoke all on public.ig_flujos from anon, authenticated;
revoke all on public.ig_bienvenida from anon, authenticated;
revoke all on public.ig_eventos from anon, authenticated;
revoke all on public.ig_conversaciones from anon, authenticated;
revoke all on public.ig_mensajes from anon, authenticated;
revoke all on public.ig_acciones from anon, authenticated;
revoke all on public.ig_links_tracking from anon, authenticated;
revoke all on public.tokens_agente from anon, authenticated;

grant all on public.ig_flujos to service_role;
grant all on public.ig_bienvenida to service_role;
grant all on public.ig_eventos to service_role;
grant all on public.ig_conversaciones to service_role;
grant all on public.ig_mensajes to service_role;
grant all on public.ig_acciones to service_role;
grant all on public.ig_links_tracking to service_role;
grant all on public.tokens_agente to service_role;
