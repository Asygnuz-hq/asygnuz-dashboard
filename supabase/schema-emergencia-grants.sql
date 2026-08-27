-- ASYGNUZ Dashboard — asegura que los roles anon/authenticated tengan
-- permiso de tabla sobre casos_emergencia e inventario_emergencia.
-- Las políticas RLS ya existentes controlan QUÉ filas se ven; esto solo
-- garantiza que el permiso base de la tabla no esté bloqueando la lectura.
-- Es idempotente y seguro de correr aunque ya existan los permisos.

grant select, insert, update, delete on casos_emergencia to authenticated;
grant select, insert, update, delete on inventario_emergencia to authenticated;
