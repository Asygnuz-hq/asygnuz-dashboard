-- ASYGNUZ Dashboard — Portal de Cliente: parrilla tipo tabla (2026-10-14)
-- Pega en Supabase → SQL Editor → Run. Seguro de repetir. No borra datos.
--
-- La parrilla pasa de tarjetas a una tabla tipo hoja de cálculo (canal,
-- fecha, hora, estado, pilar, formato, copy, link de Drive) con vista de
-- calendario. Agrega a portal_contenido:
--   hora        → hora de publicación (hora local del cliente)
--   pilar       → pilar/tema de contenido (Educativo, Lifestyle...)
--   copy        → el texto del post (caption), aparte de las notas internas
--   link_drive  → carpeta/archivo de Drive con las piezas listas para publicar
-- y dos estados nuevos al flujo: idea (antes de grabar) y programado
-- (listo y agendado en la red, antes de publicado).

alter table portal_contenido add column if not exists hora time;
alter table portal_contenido add column if not exists pilar text;
alter table portal_contenido add column if not exists copy text;
alter table portal_contenido add column if not exists link_drive text;

alter table portal_contenido drop constraint if exists portal_contenido_estado_check;
alter table portal_contenido add constraint portal_contenido_estado_check
  check (estado in ('idea', 'grabacion', 'edicion', 'revision', 'programado', 'publicado'));

-- Verificación:
--   select column_name from information_schema.columns
--   where table_name = 'portal_contenido' order by ordinal_position;
