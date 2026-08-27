-- Guarda temporalmente el token + lista de cuentas mientras el usuario
-- elige cuál cuenta de anuncios/portafolio conectar (paso intermedio entre
-- el callback de OAuth y la confirmación). Se borra apenas se confirma.
-- Corre esto en Supabase → SQL Editor → New query → Run.

create table if not exists meta_conexiones_pendientes (
  id uuid primary key default gen_random_uuid(),
  cliente_nombre text not null,
  access_token text not null,
  token_expira_en timestamptz,
  cuentas jsonb not null,
  conectado_por uuid references auth.users (id),
  creado_en timestamptz not null default now()
);

alter table meta_conexiones_pendientes enable row level security;
drop policy if exists "team_full_access" on meta_conexiones_pendientes;
create policy "team_full_access" on meta_conexiones_pendientes for all to authenticated using (true) with check (true);
