-- ASYGNUZ Dashboard — agrega EUR y el tipo de movimiento "Rendimiento"
-- Pega en Supabase → SQL Editor → New query → Run.

-- Permitir EUR como moneda de cuenta
alter table cuentas drop constraint if exists cuentas_moneda_check;
alter table cuentas add constraint cuentas_moneda_check check (moneda in ('COP', 'USD', 'EUR'));

-- Permitir Compra/Venta de EUR y el nuevo tipo "Rendimiento"
alter table movimientos_cuenta drop constraint if exists movimientos_cuenta_tipo_check;
alter table movimientos_cuenta add constraint movimientos_cuenta_tipo_check check (
  tipo in (
    'Ingreso', 'Gasto',
    'Compra USD', 'Venta USD',
    'Compra EUR', 'Venta EUR',
    'Rendimiento',
    'Transferencia Entrada', 'Transferencia Salida'
  )
);

-- Vista de saldo actualizada: Rendimiento y Compra EUR suman, Venta EUR resta
create or replace view v_saldo_cuentas as
select
  c.id as cuenta_id,
  c.nombre as cuenta,
  c.moneda,
  c.tipo,
  c.activa,
  c.saldo_inicial
    + coalesce(sum(m.monto) filter (
        where m.tipo in ('Ingreso', 'Compra USD', 'Compra EUR', 'Rendimiento', 'Transferencia Entrada')
      ), 0)
    - coalesce(sum(m.monto) filter (
        where m.tipo in ('Gasto', 'Venta USD', 'Venta EUR', 'Transferencia Salida')
      ), 0) as saldo_actual
from cuentas c
left join movimientos_cuenta m on m.cuenta_id = c.id
group by c.id, c.nombre, c.moneda, c.tipo, c.activa, c.saldo_inicial;
