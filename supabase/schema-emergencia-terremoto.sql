-- ASYGNUZ Dashboard — seguimiento de casos del terremoto
-- Pega este script completo en Supabase → SQL Editor → New query → Run.
-- No borra nada. Crea la tabla casos_emergencia y agrega un rol nuevo
-- ('emergencia') a profiles para dar acceso a gente externa al equipo
-- ASYGNUZ, aislado a nivel de base de datos: quien tenga ese rol no puede
-- leer ni escribir NINGUNA otra tabla de negocio, solo casos_emergencia.
-- No es solo esconder el botón en la app — se bloquea en Postgres mismo.

-- =========================================================================
-- TABLA
-- =========================================================================

create table if not exists casos_emergencia (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  necesidad text not null,
  zona text,
  ubicacion_detalle text,
  estado text not null default 'Pendiente' check (estado in ('Pendiente', 'Atendido')),
  fuente text not null default 'Telegram',
  creado_en timestamptz not null default now(),
  atendido_en timestamptz,
  notas text
);

create or replace function public.marcar_atendido_en()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'Atendido' and old.estado is distinct from 'Atendido' then
    new.atendido_en := now();
  elsif new.estado = 'Pendiente' then
    new.atendido_en := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_marcar_atendido_en on casos_emergencia;
create trigger trg_marcar_atendido_en
  before update on casos_emergencia
  for each row execute function public.marcar_atendido_en();

-- =========================================================================
-- ROL 'emergencia' EN PROFILES
-- =========================================================================

alter table profiles drop constraint if exists profiles_rol_check;
alter table profiles add column if not exists rol text not null default 'miembro';
alter table profiles add constraint profiles_rol_check
  check (rol in ('admin', 'miembro', 'emergencia'));

create or replace function public.es_emergencia()
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and rol = 'emergencia');
$$;

-- =========================================================================
-- RLS de casos_emergencia — cualquier autenticado (equipo + usuario externo)
-- =========================================================================

alter table casos_emergencia enable row level security;
drop policy if exists "casos_emergencia_access" on casos_emergencia;
create policy "casos_emergencia_access" on casos_emergencia
  for all to authenticated using (true) with check (true);

-- =========================================================================
-- BLOQUEAR AL ROL 'emergencia' EN TODAS LAS DEMÁS TABLAS DE NEGOCIO
-- Reemplaza la política existente ("cualquier autenticado, acceso total")
-- para excluir explícitamente a quien tenga rol = 'emergencia'.
-- =========================================================================

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'profiles', 'configuracion', 'ingresos', 'gastos_fijos', 'gastos_variables',
    'inversiones', 'fundacion_donaciones', 'disenadores', 'control_mensual_tareas',
    'cobros_clientes', 'deudas_personales', 'clientes', 'actividades_cliente',
    'cuentas', 'movimientos_cuenta', 'campanas_marketing', 'equipo', 'mercado_watchlist'
  ])
  loop
    execute format('drop policy if exists "team_full_access" on %I;', t);
    execute format(
      'create policy "team_full_access" on %I for all to authenticated using (not public.es_emergencia()) with check (not public.es_emergencia());',
      t
    );
  end loop;
end $$;

-- =========================================================================
-- Para crear el usuario externo:
-- 1. Supabase → Authentication → Users → Add user (correo + contraseña).
-- 2. Corre esto UNA VEZ con su correo real:
--    update profiles set rol = 'emergencia'
--    where id = (select id from auth.users where email = 'correo@ejemplo.com');
-- =========================================================================
