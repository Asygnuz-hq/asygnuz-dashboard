-- ASYGNUZ Dashboard — corregir alerta "Security Definer View" de Supabase Advisor
-- Pega en Supabase → SQL Editor → New query → Run.
-- No cambia el resultado de ninguna vista, solo hace que respeten los
-- permisos de quien consulta (RLS) en vez de los del dueño de la base.

alter view v_historico_mensual set (security_invoker = on);
alter view v_rentabilidad_cliente set (security_invoker = on);
alter view v_saldo_cuentas set (security_invoker = on);
alter view v_resumen_disenador set (security_invoker = on);
alter view v_resumen_cobros set (security_invoker = on);
alter view v_roi_campanas set (security_invoker = on);
alter view v_costo_equipo_mes set (security_invoker = on);
