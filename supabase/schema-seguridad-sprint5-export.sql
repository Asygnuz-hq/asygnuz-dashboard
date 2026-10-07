-- ASYGNUZ Dashboard — Seguridad sprint 5: export público a Google Sheets
-- (Kaneo #40). Corre esto en Supabase → SQL Editor → New query → Run.
-- Idempotente: se puede correr más de una vez.
--
-- Qué arregla:
--  1) export_token (el secreto de /api/meta/exportar-publico) era legible por
--     cualquier usuario del tenant con un select directo a la API REST. Ahora
--     solo el servidor lo lee, y solo se lo entrega a un admin del tenant
--     (GET /api/meta/conexiones/[id]/export-token). El mismo endpoint lo rota
--     con POST.
--  2) /api/meta/exportar-publico no tenía límite de intentos. Ahora cada
--     token inválido queda registrado por IP y, con 30 fallos en 15 minutos,
--     esa IP recibe 429 hasta que se enfríe.

-- =========================================================================
-- 1. export_token fuera del alcance de la API pública
-- =========================================================================
-- sprint1b ya concede SELECT columna por columna sobre meta_conexiones; aquí
-- solo se quita la de export_token.
revoke select (export_token) on public.meta_conexiones from authenticated, anon;

-- =========================================================================
-- 2. Registro de intentos fallidos para el rate limit
-- =========================================================================
create table if not exists public.export_intentos_fallidos (
  id bigserial primary key,
  ip text not null,
  creado_en timestamptz not null default now()
);
create index if not exists export_intentos_fallidos_ip_fecha
  on public.export_intentos_fallidos (ip, creado_en desc);

-- RLS activo y CERO políticas: solo service_role (el servidor) la toca.
alter table public.export_intentos_fallidos enable row level security;
revoke all on public.export_intentos_fallidos from anon, authenticated;

-- =========================================================================
-- Verificación (debe devolver 0 filas: authenticated ya no ve el token)
-- =========================================================================
-- select column_name from information_schema.column_privileges
-- where grantee = 'authenticated' and table_name = 'meta_conexiones'
--   and column_name = 'export_token';
