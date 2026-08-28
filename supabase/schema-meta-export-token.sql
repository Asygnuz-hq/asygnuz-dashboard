-- Token público para exportar a Google Sheets (=IMPORTDATA) sin necesitar
-- iniciar sesión en el dashboard — es un secreto largo, no adivinable, no
-- el mismo access_token de Meta.
-- Corre esto en Supabase → SQL Editor → New query → Run.

alter table meta_conexiones add column if not exists export_token uuid default gen_random_uuid();
update meta_conexiones set export_token = gen_random_uuid() where export_token is null;
