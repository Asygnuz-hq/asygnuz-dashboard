-- ASYGNUZ Dashboard — segundo identificador de la cuenta de Instagram.
-- Pega este script en Supabase → SQL Editor → Run. Idempotente.
--
-- Instagram maneja dos ids para la misma cuenta profesional:
--   - instagram_business_id: el id de /me con "Instagram API with Instagram Login"
--     (ej. 28210510655253388). Lo usan las métricas y el envío de mensajes.
--   - instagram_user_id: el id de cuenta profesional (/me?fields=user_id,
--     ej. 17841400371838663). Es el que llega en entry.id de los webhooks.
-- La Bandeja busca la conexión por cualquiera de los dos.

alter table public.meta_conexiones add column if not exists instagram_user_id text;
create index if not exists idx_meta_conexiones_ig_user_id on public.meta_conexiones (instagram_user_id);
