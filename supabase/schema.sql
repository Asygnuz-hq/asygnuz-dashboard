-- ASYGNUZ Dashboard — esquema inicial
-- Pega este script completo en Supabase → SQL Editor → New query → Run.
-- Es seguro volver a correrlo (usa IF NOT EXISTS / OR REPLACE donde aplica).

create extension if not exists pgcrypto;

-- =========================================================================
-- PERFILES (uno por usuario autenticado: Juan Manuel, Dari, Pablo, Andrés)
-- =========================================================================

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- CONFIGURACIÓN (fila única: TRM del día + mes activo, reemplaza Dashboard!B4/E4)
-- =========================================================================

create table if not exists configuracion (
  id smallint primary key default 1,
  trm_actual numeric not null default 0,
  mes_activo date not null default date_trunc('month', now())::date,
  constraint configuracion_singleton check (id = 1)
);

insert into configuracion (id, trm_actual, mes_activo)
values (1, 0, date_trunc('month', now())::date)
on conflict (id) do nothing;

-- =========================================================================
-- FINANZAS ASYGNUZ
-- =========================================================================

create table if not exists ingresos (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  concepto text,
  mes date not null,
  moneda text not null default 'COP' check (moneda in ('COP', 'USD')),
  monto_original numeric not null default 0,
  trm_aplicada numeric not null default 0,
  monto_cop numeric generated always as (
    case when moneda = 'USD' then monto_original * trm_aplicada else monto_original end
  ) stored,
  monto_usd numeric generated always as (
    case when moneda = 'USD' then monto_original
         else case when trm_aplicada = 0 then 0 else monto_original / trm_aplicada end
    end
  ) stored,
  estado text not null default 'Pendiente' check (estado in ('Cobrado', 'Pendiente')),
  fecha_pago_real date,
  fecha_pago_esperada date,
  factura_no text,
  notas text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists gastos_fijos (
  id uuid primary key default gen_random_uuid(),
  concepto text not null,
  categoria text,
  moneda text not null default 'COP' check (moneda in ('COP', 'USD')),
  monto numeric not null default 0,
  trm_aplicada numeric not null default 0,
  monto_cop numeric generated always as (
    case when moneda = 'USD' then monto * trm_aplicada else monto end
  ) stored,
  frecuencia text not null default 'Mensual',
  activo boolean not null default true,
  proveedor text,
  notas text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists gastos_variables (
  id uuid primary key default gen_random_uuid(),
  concepto text not null,
  mes date not null,
  categoria text,
  moneda text not null default 'COP' check (moneda in ('COP', 'USD')),
  monto numeric not null default 0,
  trm_aplicada numeric not null default 0,
  monto_cop numeric generated always as (
    case when moneda = 'USD' then monto * trm_aplicada else monto end
  ) stored,
  fecha date,
  proveedor text,
  proyecto_relacionado text,
  notas text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists inversiones (
  id uuid primary key default gen_random_uuid(),
  tipo text,
  activo_descripcion text not null,
  fecha_entrada date,
  moneda text not null default 'COP' check (moneda in ('COP', 'USD')),
  monto_invertido numeric not null default 0,
  trm_entrada numeric not null default 0,
  monto_cop_entrada numeric generated always as (
    case when moneda = 'USD' then monto_invertido * trm_entrada else monto_invertido end
  ) stored,
  valor_actual_manual numeric not null default 0,
  trm_valoracion numeric not null default 0,
  valor_cop_actual numeric generated always as (
    case when moneda = 'USD' then valor_actual_manual * trm_valoracion else valor_actual_manual end
  ) stored,
  ganancia_perdida_cop numeric generated always as (
    (case when moneda = 'USD' then valor_actual_manual * trm_valoracion else valor_actual_manual end)
    - (case when moneda = 'USD' then monto_invertido * trm_entrada else monto_invertido end)
  ) stored,
  retorno_pct numeric generated always as (
    case when (case when moneda = 'USD' then monto_invertido * trm_entrada else monto_invertido end) = 0 then 0
    else (
      (case when moneda = 'USD' then valor_actual_manual * trm_valoracion else valor_actual_manual end)
      - (case when moneda = 'USD' then monto_invertido * trm_entrada else monto_invertido end)
    ) / (case when moneda = 'USD' then monto_invertido * trm_entrada else monto_invertido end)
    end
  ) stored,
  estado text,
  notas text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists fundacion_donaciones (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  causa_proyecto text not null,
  beneficiario text,
  descripcion text,
  moneda text not null default 'COP' check (moneda in ('COP', 'USD')),
  monto numeric not null default 0,
  trm_aplicada numeric not null default 0,
  monto_cop numeric generated always as (
    case when moneda = 'USD' then monto * trm_aplicada else monto end
  ) stored,
  estado text not null default 'Comprometido' check (estado in ('Comprometido', 'Pagado')),
  fecha_pago date,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- =========================================================================
-- DISEÑADORES
-- =========================================================================

create table if not exists disenadores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists control_mensual_tareas (
  id uuid primary key default gen_random_uuid(),
  disenador_id uuid not null references disenadores (id) on delete restrict,
  mes date not null,
  proyecto_tarea text not null,
  tipo text,
  piezas_entregadas numeric not null default 0,
  revisiones numeric not null default 0,
  fecha_limite date,
  fecha_entregada date,
  estado text not null default 'Pendiente',
  tarifa_cop numeric not null default 0,
  total_cop numeric generated always as (tarifa_cop * piezas_entregadas) stored,
  calificacion numeric,
  aprobado boolean,
  notas text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists cobros_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  mes date not null,
  proyecto_pieza text,
  tipo text,
  piezas_cobradas numeric not null default 0,
  tarifa_unit_usd numeric not null default 0,
  total_cobrado_usd numeric generated always as (piezas_cobradas * tarifa_unit_usd) stored,
  fecha_factura date,
  estado_cobro text not null default 'Pendiente',
  pagado boolean not null default false,
  margen_adicional_usd numeric,
  notas text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- =========================================================================
-- DEUDAS PERSONALES
-- =========================================================================

create table if not exists deudas_personales (
  id uuid primary key default gen_random_uuid(),
  acreedor text not null check (acreedor in ('Juan Manuel', 'Pablo', 'Andres')),
  deudor text not null,
  monto numeric not null default 0,
  moneda text not null default 'COP' check (moneda in ('COP', 'USD')),
  fecha date,
  estado text not null default 'Pendiente' check (estado in ('Pendiente', 'Pagado')),
  notas text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- =========================================================================
-- VISTAS DE RESUMEN (reemplazan las hojas "Resumen ..." / "Historico")
-- =========================================================================

create or replace view v_historico_mensual as
with meses as (
  select mes from ingresos
  union
  select mes from gastos_variables
),
ing as (
  select mes, sum(monto_cop) as ingresos_cop
  from ingresos
  group by mes
),
gv as (
  select mes, sum(monto_cop) as gastos_variables_cop
  from gastos_variables
  group by mes
),
gf as (
  select coalesce(sum(monto_cop), 0) as gastos_fijos_cop
  from gastos_fijos
  where activo = true
)
select
  m.mes,
  coalesce(ing.ingresos_cop, 0) as ingresos_cop,
  coalesce(gv.gastos_variables_cop, 0) + gf.gastos_fijos_cop as gastos_cop,
  coalesce(ing.ingresos_cop, 0) - (coalesce(gv.gastos_variables_cop, 0) + gf.gastos_fijos_cop) as utilidad_neta_cop,
  case when coalesce(ing.ingresos_cop, 0) = 0 then 0
       else round((coalesce(ing.ingresos_cop, 0) - (coalesce(gv.gastos_variables_cop, 0) + gf.gastos_fijos_cop)) / ing.ingresos_cop, 4)
  end as margen_pct
from meses m
left join ing on ing.mes = m.mes
left join gv on gv.mes = m.mes
cross join gf
order by m.mes;
-- Nota: los Gastos Fijos activos se suman completos a cada mes histórico
-- (igual que hacía el Excel: no llevan fecha propia, son recurrentes).

create or replace view v_resumen_disenador as
select
  d.id as disenador_id,
  d.nombre as disenador,
  t.mes,
  count(*) as tareas_registradas,
  sum(t.piezas_entregadas) as piezas_entregadas,
  sum(t.revisiones) as revisiones,
  sum(t.total_cop) as total_a_pagar_cop,
  round(avg(t.calificacion) filter (where t.calificacion is not null), 2) as calificacion_promedio,
  round(
    (count(*) filter (where t.estado = 'Aprobado'))::numeric / nullif(count(*), 0),
    4
  ) as pct_aprobadas
from control_mensual_tareas t
join disenadores d on d.id = t.disenador_id
group by d.id, d.nombre, t.mes
order by t.mes desc, d.nombre;

create or replace view v_resumen_cobros as
select
  cliente,
  mes,
  sum(piezas_cobradas) as piezas_cobradas,
  sum(total_cobrado_usd) as total_cobrado_usd
from cobros_clientes
group by cliente, mes
order by mes desc, cliente;

-- =========================================================================
-- ROW LEVEL SECURITY
-- Cualquier usuario autenticado del equipo (Juan Manuel, Dari, Pablo, Andrés)
-- puede leer y escribir todas las tablas de negocio. Sin acceso anónimo.
-- =========================================================================

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'profiles', 'configuracion', 'ingresos', 'gastos_fijos', 'gastos_variables',
    'inversiones', 'fundacion_donaciones', 'disenadores', 'control_mensual_tareas',
    'cobros_clientes', 'deudas_personales'
  ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "team_full_access" on %I;', t);
    execute format(
      'create policy "team_full_access" on %I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;
