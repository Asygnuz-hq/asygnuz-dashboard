-- ==============================================================================
-- Tabla: kaneo_tareas_cerradas
-- Propósito: Registrar cuándo una tarea de Kaneo pasó a estado 'done' para
-- calcular el % de entregas a tiempo y entregas semanales reales.
-- Kaneo no almacena la fecha de cierre de tareas.
-- ==============================================================================

create table if not exists public.kaneo_tareas_cerradas (
  task_id text primary key,
  project_id text not null,
  cerrada_en timestamptz not null default now(),
  fecha_limite date null
);

-- RLS activado sin políticas públicas (solo service_role vía createAdminClient)
alter table public.kaneo_tareas_cerradas enable row level security;
revoke all on public.kaneo_tareas_cerradas from anon, authenticated;
grant all on public.kaneo_tareas_cerradas to service_role;

-- Índice para consultas rápidas por proyecto y fecha
create index if not exists idx_kaneo_tareas_cerradas_proj on public.kaneo_tareas_cerradas (project_id, cerrada_en);
