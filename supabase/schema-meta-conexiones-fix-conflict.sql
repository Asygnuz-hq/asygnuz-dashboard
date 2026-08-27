-- Corrige meta_conexiones: el índice único parcial no sirve para ON CONFLICT.
-- Corre esto en Supabase → SQL Editor → New query → Run.

drop index if exists idx_meta_conexiones_ad_account;

alter table meta_conexiones
  add constraint meta_conexiones_ad_account_id_key unique (ad_account_id);
