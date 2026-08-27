-- ASYGNUZ Dashboard — ajusta casos_emergencia a los estados reales que ya
-- usan (no solo Pendiente/Atendido) y agrega Prioridad.
-- Pega en Supabase → SQL Editor → Run. No borra datos existentes.

alter table casos_emergencia drop constraint if exists casos_emergencia_estado_check;
alter table casos_emergencia alter column estado set default 'Consiguiendo';
alter table casos_emergencia add constraint casos_emergencia_estado_check
  check (estado in ('Consiguiendo', 'Por entregar', 'Conseguido', 'Cerrado', 'Cancelado', 'Por confirmar'));

alter table casos_emergencia add column if not exists prioridad text
  check (prioridad in ('Baja', 'Intermedia', 'Urgente'));

alter table casos_emergencia add column if not exists encargado text;
alter table casos_emergencia add column if not exists telefono text;
alter table casos_emergencia add column if not exists ciudad text;

-- El trigger que marca atendido_en ahora dispara con 'Cerrado' (el estado
-- que de verdad significa "resuelto" en su flujo), no con 'Atendido'.
create or replace function public.marcar_atendido_en()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'Cerrado' and old.estado is distinct from 'Cerrado' then
    new.atendido_en := now();
  elsif new.estado <> 'Cerrado' then
    new.atendido_en := null;
  end if;
  return new;
end;
$$;
