-- ASYGNUZ Dashboard — Negocios por mensualidad (2026-11-13)
-- Pega en Supabase → SQL Editor → Run. Seguro de repetir. No borra datos.
-- Los negocios que ya existen quedan como 'proyecto' (precio fijo). En mensualidad, `precio` guarda el fee mensual.

alter table casos_negocio add column if not exists tipo text not null default 'proyecto';
alter table casos_negocio drop constraint if exists casos_negocio_tipo_check;
alter table casos_negocio add constraint casos_negocio_tipo_check check (tipo in ('proyecto','mensualidad'));
