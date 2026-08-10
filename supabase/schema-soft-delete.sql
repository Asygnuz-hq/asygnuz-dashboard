-- ASYGNUZ Dashboard — Papelera (soft-delete) en vez de borrado permanente
-- Pega en Supabase → SQL Editor → New query → Run.
-- No borra nada existente: solo agrega una columna "eliminado_en" a cada
-- tabla de negocio. A partir de ahora, "Eliminar" en la app marca la fila
-- con la fecha de hoy en vez de borrarla; queda oculta pero recuperable
-- desde "Ver papelera". Las vistas se actualizan para que una fila
-- eliminada deje de sumar en Dashboard, saldos, resúmenes, etc.

alter table ingresos add column if not exists eliminado_en timestamptz;
alter table gastos_fijos add column if not exists eliminado_en timestamptz;
alter table gastos_variables add column if not exists eliminado_en timestamptz;
alter table inversiones add column if not exists eliminado_en timestamptz;
alter table fundacion_donaciones add column if not exists eliminado_en timestamptz;
alter table disenadores add column if not exists eliminado_en timestamptz;
alter table control_mensual_tareas add column if not exists eliminado_en timestamptz;
alter table cobros_clientes add column if not exists eliminado_en timestamptz;
alter table deudas_personales add column if not exists eliminado_en timestamptz;
alter table clientes add column if not exists eliminado_en timestamptz;
alter table actividades_cliente add column if not exists eliminado_en timestamptz;
alter table cuentas add column if not exists eliminado_en timestamptz;
alter table movimientos_cuenta add column if not exists eliminado_en timestamptz;
alter table campanas_marketing add column if not exists eliminado_en timestamptz;
alter table equipo add column if not exists eliminado_en timestamptz;
alter table mercado_watchlist add column if not exists eliminado_en timestamptz;

-- =========================================================================
-- Vistas: recreadas idénticas, solo agregando "eliminado_en is null"
-- =========================================================================

create or replace view v_historico_mensual as
with meses as (
  select mes from ingresos where eliminado_en is null
  union
  select mes from gastos_variables where eliminado_en is null
),
ing as (
  select mes, sum(monto_cop) as ingresos_cop
  from ingresos
  where eliminado_en is null
  group by mes
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
  where cliente_id is not null and eliminado_en is null
  group by cliente_id
) ing on ing.cliente_id = c.id
left join (
  select cliente_id, sum(total_cobrado_usd) as total_cobrado_usd
  from cobros_clientes
  where cliente_id is not null and eliminado_en is null
  group by cliente_id
) cob on cob.cliente_id = c.id
left join (
  select cliente_id, sum(total_cop) as total_costo_cop
  from control_mensual_tareas
  where cliente_id is not null and eliminado_en is null
  group by cliente_id
) tar on tar.cliente_id = c.id
where c.eliminado_en is null;

create or replace view v_saldo_cuentas as
select
  c.id as cuenta_id,
  c.nombre as cuenta,
  c.moneda,
  c.tipo,
  c.activa,
  c.saldo_inicial
    + coalesce(sum(m.monto) filter (
        where m.tipo in ('Ingreso', 'Compra USD', 'Compra EUR', 'Rendimiento', 'Transferencia Entrada') and m.eliminado_en is null
      ), 0)
    - coalesce(sum(m.monto) filter (
        where m.tipo in ('Gasto', 'Venta USD', 'Venta EUR', 'Transferencia Salida') and m.eliminado_en is null
      ), 0) as saldo_actual
from cuentas c
left join movimientos_cuenta m on m.cuenta_id = c.id
where c.eliminado_en is null
group by c.id, c.nombre, c.moneda, c.tipo, c.activa, c.saldo_inicial;

create or replace view v_resumen_disenador as
select
  d.id as disenador_id,
  d.nombre as disenador,
  t.mes,
  count(*) as tareas_registradas,
  sum(t.piezas_entregadas) as piezas_entregadas,
  sum(t.revisiones) as revisiones,
  sum(t.total_cop) as total_a_pagar_cop,
  round(avg(t.calificacion) filter (where t.calificacion is not null), 2) as calificacion_promedio,
  round(
    (count(*) filter (where t.estado = 'Aprobado'))::numeric / nullif(count(*), 0),
    4
  ) as pct_aprobadas
from control_mensual_tareas t
join disenadores d on d.id = t.disenador_id
where t.eliminado_en is null and d.eliminado_en is null
group by d.id, d.nombre, t.mes
order by t.mes desc, d.nombre;

create or replace view v_resumen_cobros as
select
  cliente,
  mes,
  sum(piezas_cobradas) as piezas_cobradas,
  sum(total_cobrado_usd) as total_cobrado_usd
from cobros_clientes
where eliminado_en is null
group by cliente, mes
order by mes desc, cliente;

create or replace view v_roi_campanas as
select
  id,
  nombre,
  plataforma,
  estado,
  inversion_cop,
  resultado_tipo,
  resultado_cantidad,
  coalesce(ingresos_generados_cop, 0) as ingresos_generados_cop,
  coalesce(ingresos_generados_cop, 0) - inversion_cop as ganancia_cop,
  case when inversion_cop = 0 then null
       else round((coalesce(ingresos_generados_cop, 0) - inversion_cop) / inversion_cop, 4)
  end as roi_pct,
  case when coalesce(resultado_cantidad, 0) = 0 then null
       else round(inversion_cop / resultado_cantidad, 0)
  end as costo_por_resultado_cop
from campanas_marketing
where eliminado_en is null;

create or replace view v_costo_equipo_mes as
select
  (select mes_activo from configuracion where id = 1) as mes,
  (select coalesce(sum(costo_mensual_cop), 0) from equipo where activo = true and eliminado_en is null) as costo_fijo_cop,
  (
    select coalesce(sum(t.total_cop), 0)
    from control_mensual_tareas t
    where t.mes = (select mes_activo from configuracion where id = 1) and t.eliminado_en is null
  ) as costo_disenadores_cop,
  (select coalesce(sum(costo_mensual_cop), 0) from equipo where activo = true and eliminado_en is null)
    + (
      select coalesce(sum(t.total_cop), 0)
      from control_mensual_tareas t
      where t.mes = (select mes_activo from configuracion where id = 1) and t.eliminado_en is null
    ) as costo_total_cop;
