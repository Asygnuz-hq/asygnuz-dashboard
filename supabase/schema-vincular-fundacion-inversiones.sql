-- ASYGNUZ Dashboard — vincular Fundación e Inversiones con Cuentas
-- Pega en Supabase → SQL Editor → New query → Run.
-- Mismo patrón que Gastos Variables: una donación o una inversión puede
-- vincularse a la cuenta real que la pagó, y eso genera un movimiento que
-- sí descuenta el saldo en Cuentas / Caja.

alter table fundacion_donaciones add column if not exists cuenta_id uuid references cuentas (id);
alter table inversiones add column if not exists cuenta_id uuid references cuentas (id);

alter table movimientos_cuenta add column if not exists donacion_id uuid references fundacion_donaciones (id);
alter table movimientos_cuenta add column if not exists inversion_id uuid references inversiones (id);
