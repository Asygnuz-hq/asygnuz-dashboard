-- ASYGNUZ Dashboard — vínculo Gastos Variables <-> Cuentas
-- Pega en Supabase → SQL Editor → New query → Run.
-- Mismo patrón que Ingresos <-> Cuentas: un gasto variable (ej. nómina de un
-- mes) puede vincularse a la cuenta real que lo pagó, y eso genera un
-- movimiento que sí descuenta el saldo en Cuentas / Caja.

alter table gastos_variables add column if not exists cuenta_id uuid references cuentas (id);
alter table movimientos_cuenta add column if not exists gasto_id uuid references gastos_variables (id);
