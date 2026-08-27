-- ASYGNUZ Dashboard — número de caso (para identificar y buscar cada caso)
-- Pega este script completo en Supabase → SQL Editor → New query → Run.
--
-- Numera los casos existentes por orden de creación (que sigue el orden en
-- que se cargaron desde la planilla). Si un número no coincide con el de tu
-- Excel original, corrígelo directo en la tabla — el campo queda editable.

alter table casos_emergencia add column if not exists numero_caso integer;

with numerados as (
  select id, row_number() over (order by creado_en) as n
  from casos_emergencia
  where numero_caso is null
)
update casos_emergencia c
set numero_caso = numerados.n
from numerados
where c.id = numerados.id;

create unique index if not exists idx_casos_emergencia_numero_caso on casos_emergencia(numero_caso);
