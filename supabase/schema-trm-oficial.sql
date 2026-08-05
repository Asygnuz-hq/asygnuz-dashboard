-- ASYGNUZ Dashboard — TRM oficial, EUR en Ingresos, vínculo Ingresos <-> Cuentas
-- Pega en Supabase → SQL Editor → New query → Run.
-- No borra ningún dato: las columnas generadas se recrean a partir de las
-- mismas columnas base (moneda, monto_original, trm_aplicada) que ya existen;
-- solo se amplía la fórmula para que también soporte EUR (antes solo USD).

-- Permitir EUR como moneda de ingreso
alter table ingresos drop constraint if exists ingresos_moneda_check;
alter table ingresos add constraint ingresos_moneda_check check (moneda in ('COP', 'USD', 'EUR'));

-- Recrear monto_cop / monto_usd para que EUR convierta bien.
-- Antes: un ingreso en EUR se sumaba directo como si fuera COP (mismo bug
-- que el de la caja). Ahora USD y EUR convierten igual con trm_aplicada
-- (COP por unidad de moneda extranjera).
-- cascade también tumba las vistas v_historico_mensual y v_rentabilidad_cliente
-- (dependen de monto_cop). Las recreamos idénticas justo abajo, no se pierde nada.
alter table ingresos drop column if exists monto_cop cascade;
alter table ingresos drop column if exists monto_usd cascade;

alter table ingresos add column monto_cop numeric generated always as (
  case when moneda in ('USD', 'EUR') then monto_original * trm_aplicada else monto_original end
) stored;

alter table ingresos add column monto_usd numeric generated always as (
  case
    when moneda = 'USD' then monto_original
    when moneda = 'COP' then case when trm_aplicada = 0 then 0 else monto_original / trm_aplicada end
    else null -- EUR: no tenemos tasa EUR/USD, mejor null que un número inventado
  end
) stored;

-- Recrear las vistas que dependían de monto_cop, idénticas a como estaban.
create or replace view v_historico_mensual as
with meses as (
  select mes from ingresos
  union
  select mes from gastos_variables
),
ing as (
  select mes, sum(monto_cop) as ingresos_cop
  from ingresos
  group by mes
),
gv as (
  select mes, sum(monto_cop) as gastos_variables_cop
  from gastos_variables
  group by mes
),
gf as (
  select coalesce(sum(monto_cop), 0) as gastos_fijos_cop
  from gastos_fijos
  where activo = true
)
select
  m.mes,
  coalesce(ing.ingresos_cop, 0) as ingresos_cop,
  coalesce(gv.gastos_variables_cop, 0) + gf.gastos_fijos_cop as gastos_cop,
  coalesce(ing.ingresos_cop, 0) - (coalesce(gv.gastos_variables_cop, 0) + gf.gastos_fijos_cop) as utilidad_neta_cop,
  case when coalesce(ing.ingresos_cop, 0) = 0 then 0
       else round((coalesce(ing.ingresos_cop, 0) - (coalesce(gv.gastos_variables_cop, 0) + gf.gastos_fijos_cop)) / ing.ingresos_cop, 4)
  end as margen_pct
from meses m
left join ing on ing.mes = m.mes
left join gv on gv.mes = m.mes
cross join gf
order by m.mes;

create or replace view v_rentabilidad_cliente as
select
  c.id as cliente_id,
  c.nombre as cliente,
  c.estado,
  coalesce(ing.total_ingresos_cop, 0) as ingresos_cop,
  coalesce(cob.total_cobrado_usd, 0) as cobrado_usd,
  coalesce(tar.total_costo_cop, 0) as costo_disenador_cop,
  coalesce(ing.total_ingresos_cop, 0) - coalesce(tar.total_costo_cop, 0) as margen_cop
from clientes c
left join (
  select cliente_id, sum(monto_cop) as total_ingresos_cop
  from ingresos
  where cliente_id is not null
  group by cliente_id
) ing on ing.cliente_id = c.id
left join (
  select cliente_id, sum(total_cobrado_usd) as total_cobrado_usd
  from cobros_clientes
  where cliente_id is not null
  group by cliente_id
) cob on cob.cliente_id = c.id
left join (
  select cliente_id, sum(total_cop) as total_costo_cop
  from control_mensual_tareas
  where cliente_id is not null
  group by cliente_id
) tar on tar.cliente_id = c.id;

-- TRM estimada del día para facturas Pendientes (la actualiza el cron diario;
-- no reemplaza trm_aplicada, que sigue siendo la tasa "oficial" de la fila).
alter table ingresos add column if not exists trm_estimada_hoy numeric;

-- Cuenta donde entra la plata cuando se cobra (para vincular con movimientos_cuenta).
alter table ingresos add column if not exists cuenta_id uuid references cuentas (id);

-- Vínculo inverso: qué movimiento de caja nació de qué factura cobrada.
alter table movimientos_cuenta add column if not exists ingreso_id uuid references ingresos (id);
