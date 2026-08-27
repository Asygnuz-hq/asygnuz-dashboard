-- ASYGNUZ Dashboard — conexiones de clientes a Meta Ads / Instagram
-- Corre esto en Supabase → SQL Editor → New query → Run.
--
-- Guarda, por cliente, el token de acceso de larga duración que resulta de
-- que el cliente autorice a ASYGNUZ (login de Facebook) a leer su cuenta
-- de anuncios y su cuenta de Instagram business. El token nunca llega al
-- navegador: solo se usa desde el servidor (route handlers) para pedir
-- métricas a la Graph API.

create table if not exists meta_conexiones (
  id uuid primary key default gen_random_uuid(),
  cliente_nombre text not null,
  ad_account_id text,
  page_id text,
  instagram_business_id text,
  access_token text not null,
  token_expira_en timestamptz,
  conectado_por uuid references auth.users (id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Restricción única normal (no parcial) — la necesita el upsert con
-- ON CONFLICT (ad_account_id) del callback de OAuth. Postgres trata NULL
-- como distinto entre sí, así que varias filas sin ad_account_id igual
-- están permitidas.
alter table meta_conexiones
  add constraint meta_conexiones_ad_account_id_key unique (ad_account_id);

alter table meta_conexiones enable row level security;
drop policy if exists "team_full_access" on meta_conexiones;
create policy "team_full_access" on meta_conexiones for all to authenticated using (true) with check (true);
