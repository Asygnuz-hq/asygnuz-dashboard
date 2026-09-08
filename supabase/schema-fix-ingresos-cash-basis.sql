-- ASYGNUZ Dashboard — v_historico_mensual: ingresos por caja
-- Pega en Supabase → SQL Editor → New query → Run.
--
-- v4 — versión final. Un ingreso cuenta cuando está Cobrado con fecha de
-- pago real, sin exigir que tenga un movimiento en Cuentas (confirmado:
-- hay ingresos reales de julio que entraron antes de que existiera el
-- sistema de Cuentas, o por fuera de Global66usd/cop — no por eso dejan
-- de ser ingreso real). Lo Pendiente sigue sin contar hasta que se cobre.
-- Los duplicados ya identificados y corregidos quedan fuera vía
-- eliminado_en (borrado suave), no vía esta regla.

create or replace view v_historico_mensual as
with meses as (
  select date_trunc('month', fecha_pago_real)::date as mes
  from ingresos
  where estado = 'Cobrado' and fecha_pago_real is not null and eliminado_en is null
  union
  select mes from gastos_variables where eliminado_en is null
),
ing as (
  select date_trunc('month', fecha_pago_real)::date as mes, sum(monto_cop) as ingresos_cop
  from ingresos
  where estado = 'Cobrado' and fecha_pago_real is not null and eliminado_en is null
  group by 1
),
gv as (
  select mes, sum(monto_cop) as gastos_variables_cop
  from gastos_variables
  where eliminado_en is null
  group by mes
),
gf as (
  select coalesce(sum(monto_cop), 0) as gastos_fijos_cop
  from gastos_fijos
  where activo = true and eliminado_en is null
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

alter view v_historico_mensual set (security_invoker = on);
