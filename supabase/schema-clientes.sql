-- ASYGNUZ Dashboard — ampliación: Clientes, Actividades, Metas
-- Corre esto DESPUÉS de supabase/schema.sql (una sola vez).
-- Pega en Supabase → SQL Editor → New query → Run.

-- =========================================================================
-- CLIENTES
-- =========================================================================

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  tipo text,
  estado text not null default 'Activo' check (estado in ('Activo', 'En riesgo', 'Pausado', 'Terminado')),
  fecha_inicio date,
  contacto text,
  notas text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists actividades_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  fecha date not null default current_date,
  tipo text not null default 'Nota' check (tipo in ('Reunión', 'Entrega', 'Llamada', 'Tarea', 'Nota')),
  descripcion text not null,
  horas numeric,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- Vincula cada ingreso / cobro / tarea a un cliente real (opcional, nullable
-- para no romper los datos históricos migrados que no tienen match claro).
alter table ingresos add column if not exists cliente_id uuid references clientes (id);
alter table cobros_clientes add column if not exists cliente_id uuid references clientes (id);
alter table control_mensual_tareas add column if not exists cliente_id uuid references clientes (id);

-- =========================================================================
-- METAS MENSUALES (se editan junto con TRM y mes activo en Configuración)
-- =========================================================================

alter table configuracion add column if not exists meta_ingresos_cop numeric not null default 0;
alter table configuracion add column if not exists meta_margen_pct numeric not null default 0;

-- =========================================================================
-- VISTA: rentabilidad real por cliente
-- (ingresos y cobros ya vinculados) - (costo de diseñador de tareas vinculadas)
-- =========================================================================

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
  where cliente_id is not null
  group by cliente_id
) ing on ing.cliente_id = c.id
left join (
  select cliente_id, sum(total_cobrado_usd) as total_cobrado_usd
  from cobros_clientes
  where cliente_id is not null
  group by cliente_id
) cob on cob.cliente_id = c.id
left join (
  select cliente_id, sum(total_cop) as total_costo_cop
  from control_mensual_tareas
  where cliente_id is not null
  group by cliente_id
) tar on tar.cliente_id = c.id;

-- =========================================================================
-- RLS para las tablas nuevas
-- =========================================================================

do $$
declare
  t text;
begin
  for t in select unnest(array['clientes', 'actividades_cliente'])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "team_full_access" on %I;', t);
    execute format(
      'create policy "team_full_access" on %I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;
