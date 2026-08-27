-- ASYGNUZ Dashboard — arregla la tabla de Casos/Bodega que salía vacía.
-- El componente de tabla usa una columna eliminado_en (papelera) que estas
-- dos tablas nunca tuvieron. Pega esto en el SQL Editor y dale Run.

alter table casos_emergencia add column if not exists eliminado_en timestamptz;
alter table inventario_emergencia add column if not exists eliminado_en timestamptz;

grant select, insert, update, delete on casos_emergencia to authenticated;
grant select, insert, update, delete on inventario_emergencia to authenticated;
