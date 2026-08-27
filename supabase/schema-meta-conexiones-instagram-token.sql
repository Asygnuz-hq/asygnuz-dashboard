-- Instagram se conecta con un login separado (instagram.com), con su
-- propio token — no reutiliza el access_token de anuncios. Un cliente
-- puede tener solo Instagram conectado sin tener anuncios, así que
-- access_token deja de ser obligatorio.
-- Corre esto en Supabase → SQL Editor → New query → Run.

alter table meta_conexiones alter column access_token drop not null;

alter table meta_conexiones add column if not exists instagram_access_token text;
alter table meta_conexiones add column if not exists instagram_token_expira_en timestamptz;
alter table meta_conexiones add column if not exists instagram_username text;
