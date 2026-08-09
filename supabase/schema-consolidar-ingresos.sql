-- ASYGNUZ Dashboard — consolidar "Cobros a Clientes" dentro de Ingresos
-- Pega en Supabase → SQL Editor → New query → Run.
-- No borra ni toca la tabla cobros_clientes (queda intacta como histórico).
-- Solo agrega 2 columnas nuevas a ingresos para poder migrar los cobros de
-- piezas de diseño ahí, y que el Dashboard los vea.

alter table ingresos add column if not exists tipo_ingreso text
  check (tipo_ingreso in ('Retainer', 'Piezas adicionales', 'Proyecto único', 'Otro'));

-- Trazabilidad: de qué fila de cobros_clientes vino este ingreso (para no
-- migrar dos veces por error, y para poder rastrear el origen si hace falta).
alter table ingresos add column if not exists origen_cobro_id uuid references cobros_clientes (id);
