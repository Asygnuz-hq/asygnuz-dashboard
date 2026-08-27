-- Etiquetas de campaña por publicación de Instagram (ej. "Lanzamiento agosto")
-- para poder agrupar el rendimiento por campaña, no solo por publicación.
-- Corre esto en Supabase → SQL Editor → New query → Run.

create table if not exists meta_publicacion_notas (
  id uuid primary key default gen_random_uuid(),
  conexion_id uuid not null references meta_conexiones (id) on delete cascade,
  media_id text not null,
  etiqueta text not null,
  creado_en timestamptz not null default now(),
  unique (conexion_id, media_id)
);

alter table meta_publicacion_notas enable row level security;
drop policy if exists "team_full_access" on meta_publicacion_notas;
create policy "team_full_access" on meta_publicacion_notas for all to authenticated using (true) with check (true);
