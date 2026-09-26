-- ASYGNUZ Dashboard — seguridad, sprint 2b (2026-09-26)
-- Pega en Supabase → SQL Editor → Run. Seguro de repetir. No borra datos.
--
-- v_costo_equipo_mes leía el mes activo de "configuracion where id = 1", o sea
-- la fila de ASYGNUZ. Para otro tenant esa fila es invisible (RLS): no filtraba
-- datos ajenos, pero su "mes" salía vacío. Ahora lee la configuracion del
-- tenant de la sesión.

create or replace view v_costo_equipo_mes as
select
  (select mes_activo from configuracion where tenant_id = public.current_tenant_id()) as mes,
  (select coalesce(sum(costo_mensual_cop), 0) from equipo where activo = true and eliminado_en is null) as costo_fijo_cop,
  (
    select coalesce(sum(t.total_cop), 0)
    from control_mensual_tareas t
    where t.mes = (select mes_activo from configuracion where tenant_id = public.current_tenant_id())
      and t.eliminado_en is null
  ) as costo_disenadores_cop,
  (select coalesce(sum(costo_mensual_cop), 0) from equipo where activo = true and eliminado_en is null)
    + (
      select coalesce(sum(t.total_cop), 0)
      from control_mensual_tareas t
      where t.mes = (select mes_activo from configuracion where tenant_id = public.current_tenant_id())
        and t.eliminado_en is null
    ) as costo_total_cop;

alter view public.v_costo_equipo_mes set (security_invoker = on);

-- Verificación: debe mostrar el mes activo de ASYGNUZ y security_invoker=on
--   select * from v_costo_equipo_mes;
--   select reloptions from pg_class where relname = 'v_costo_equipo_mes';
