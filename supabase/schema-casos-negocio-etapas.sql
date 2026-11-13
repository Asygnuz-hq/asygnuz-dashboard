-- ASYGNUZ Dashboard — Negocios: etapas sobre casos_negocio (2026-11-13)
-- Pega en Supabase → SQL Editor → Run. Seguro de repetir. No borra datos.
-- Requiere schema-casos-negocio.sql. Las políticas RLS de la tabla ya cubren las columnas nuevas.

alter table casos_negocio add column if not exists etapa text not null default 'caso';
alter table casos_negocio add column if not exists prob_cierre numeric;
alter table casos_negocio add column if not exists fecha_cierre date;
alter table casos_negocio add column if not exists responsable text;
alter table casos_negocio add column if not exists proyecto_kaneo text;
alter table casos_negocio add column if not exists notas text;
alter table casos_negocio add column if not exists motivo_perdida text;
alter table casos_negocio add column if not exists etapa_desde timestamptz not null default now();

alter table casos_negocio drop constraint if exists casos_negocio_etapa_check;
alter table casos_negocio add constraint casos_negocio_etapa_check
  check (etapa in ('diagnostico','caso','propuesta','negociacion','ganado','desarrollo','entregado','perdido'));
alter table casos_negocio drop constraint if exists casos_negocio_prob_check;
alter table casos_negocio add constraint casos_negocio_prob_check
  check (prob_cierre is null or (prob_cierre >= 0 and prob_cierre <= 1));
