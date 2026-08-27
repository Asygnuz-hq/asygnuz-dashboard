-- ASYGNUZ Dashboard — ítems por caso de emergencia (seguimiento de entregas)
-- Pega este script completo en Supabase → SQL Editor → New query → Run.
-- Corre esto DESPUÉS de schema-emergencia-terremoto.sql. No borra nada.
--
-- Permite dividir la "Necesidad" de un caso (ej. "cama, mercado, casa") en
-- ítems individuales que se marcan entregado/pendiente por separado.

create table if not exists items_caso_emergencia (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references casos_emergencia(id) on delete cascade,
  item text not null,
  entregado boolean not null default false,
  entregado_en timestamptz,
  creado_en timestamptz not null default now()
);

create index if not exists idx_items_caso_emergencia_caso_id on items_caso_emergencia(caso_id);

-- Mismo acceso que casos_emergencia / inventario_emergencia: cualquier
-- autenticado (equipo + usuario externo del terremoto), aislado del resto.
alter table items_caso_emergencia enable row level security;
drop policy if exists "items_caso_emergencia_access" on items_caso_emergencia;
create policy "items_caso_emergencia_access" on items_caso_emergencia
  for all to authenticated using (true) with check (true);
