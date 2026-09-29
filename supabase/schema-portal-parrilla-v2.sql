-- ASYGNUZ Dashboard — Portal de Cliente: parrilla más estructurada (2026-09-29)
-- Pega en Supabase → SQL Editor → Run. Seguro de repetir. No borra datos.
--
-- Agrega a portal_contenido lo que faltaba para que la parrilla sea una
-- pantalla propia con filtros: plataforma, y el link del video/imagen de
-- REFERENCIA (antes de grabar) — distinto de "link", que es la publicación
-- ya hecha.

alter table portal_contenido add column if not exists plataforma text;
alter table portal_contenido add column if not exists link_referencia text;

-- Verificación:
--   select column_name from information_schema.columns
--   where table_name = 'portal_contenido' order by ordinal_position;
