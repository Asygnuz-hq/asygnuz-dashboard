-- ASYGNUZ Dashboard — Requisitos de Negocio + Historias de Usuario
-- Pega este script completo en Supabase → SQL Editor → New query → Run.
--
-- Modelo en dos niveles, igual al que ya se usaba fuera del dashboard:
-- un Requisito de Negocio es el objetivo general de un cliente (con su
-- propio seguimiento de trazabilidad y avance), y cada Requisito tiene
-- N Historias de Usuario -- el detalle de cómo se logra ese objetivo,
-- en formato Como/Quiero/Para + AS-IS/TO-BE + reglas + criterios.

create table if not exists requisitos_negocio (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) default 'af1f801b-9da5-42e6-ba81-2920bd4f4c57',
  cliente_id uuid references clientes(id) on delete set null,
  numero int not null,
  descripcion text not null,
  estado_trazabilidad text not null default 'inicio'
    check (estado_trazabilidad in ('inicio', 'cotizacion', 'desarrollo', 'pruebas', 'finalizado', 'bloqueado')),
  pct_planificado numeric not null default 0 check (pct_planificado between 0 and 100),
  pct_ejecutado numeric not null default 0 check (pct_ejecutado between 0 and 100),
  fecha_inicio date,
  fecha_fin date,
  fase_implementacion text,
  plataforma_software text,
  responsable_id uuid references equipo(id) on delete set null,
  tipo_cambio text,
  prioridad int not null default 3 check (prioridad between 1 and 5),
  kaneo_task_id text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, numero)
);

create table if not exists historias_usuario (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) default 'af1f801b-9da5-42e6-ba81-2920bd4f4c57',
  requisito_id uuid not null references requisitos_negocio(id) on delete cascade,
  codigo text not null,
  estado text not null default 'Borrador'
    check (estado in ('Borrador', 'En Revisión', 'Aprobada', 'En Desarrollo', 'Lista')),
  como text not null default '',
  quiero text not null default '',
  para text not null default '',
  comportamiento_actual text not null default '',
  comportamiento_esperado text not null default '',
  criterios_aceptacion text not null default '',
  reglas_negocio text not null default '',
  requisitos_funcionales text not null default '',
  definicion_terminado text not null default '',
  kaneo_task_id text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requisito_id, codigo)
);

alter table requisitos_negocio enable row level security;
alter table historias_usuario enable row level security;

drop policy if exists "team_full_access" on requisitos_negocio;
create policy "team_full_access" on requisitos_negocio for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

drop policy if exists "team_full_access" on historias_usuario;
create policy "team_full_access" on historias_usuario for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create index if not exists idx_requisitos_cliente on requisitos_negocio (cliente_id);
create index if not exists idx_historias_requisito on historias_usuario (requisito_id);
