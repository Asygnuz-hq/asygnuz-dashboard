-- ASYGNUZ Dashboard — inventario de bodega para el terremoto
-- Pega este script completo en Supabase → SQL Editor → New query → Run.
-- Corre esto DESPUÉS de schema-emergencia-terremoto.sql (necesita la función
-- es_emergencia() que ese script crea). No borra nada.

create table if not exists inventario_emergencia (
  id uuid primary key default gen_random_uuid(),
  item text not null,
  cantidad numeric not null default 0,
  unidad text not null default 'unidades',
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create or replace function public.marcar_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists trg_inventario_actualizado_en on inventario_emergencia;
create trigger trg_inventario_actualizado_en
  before update on inventario_emergencia
  for each row execute function public.marcar_actualizado_en();

-- Mismo acceso que casos_emergencia: cualquier autenticado (equipo +
-- usuario externo del terremoto), aislado del resto del negocio.
alter table inventario_emergencia enable row level security;
drop policy if exists "inventario_emergencia_access" on inventario_emergencia;
create policy "inventario_emergencia_access" on inventario_emergencia
  for all to authenticated using (true) with check (true);
