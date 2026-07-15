-- ASYGNUZ Dashboard — ampliación: Marketing, Equipo/RRHH, Watchlist de Mercado
-- Corre esto DESPUÉS de los scripts anteriores (schema.sql, schema-clientes.sql, schema-cuentas.sql).
-- Pega en Supabase → SQL Editor → New query → Run.

-- =========================================================================
-- MARKETING — campañas publicitarias, inversión y resultado
-- =========================================================================

create table if not exists campanas_marketing (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  plataforma text not null default 'Meta Ads' check (
    plataforma in ('Meta Ads', 'Google Ads', 'TikTok Ads', 'LinkedIn Ads', 'Otro')
  ),
  fecha_inicio date,
  fecha_fin date,
  moneda text not null default 'COP' check (moneda in ('COP', 'USD')),
  inversion numeric not null default 0,
  trm_aplicada numeric not null default 0,
  inversion_cop numeric generated always as (
    case when moneda = 'USD' then inversion * trm_aplicada else inversion end
  ) stored,
  resultado_tipo text not null default 'Leads' check (resultado_tipo in ('Leads', 'Ventas', 'Ingresos', 'Otro')),
  resultado_cantidad numeric,
  ingresos_generados_cop numeric,
  estado text not null default 'Activa' check (estado in ('Activa', 'Pausada', 'Finalizada')),
  notas text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create or replace view v_roi_campanas as
select
  id,
  nombre,
  plataforma,
  estado,
  inversion_cop,
  resultado_tipo,
  resultado_cantidad,
  coalesce(ingresos_generados_cop, 0) as ingresos_generados_cop,
  coalesce(ingresos_generados_cop, 0) - inversion_cop as ganancia_cop,
  case when inversion_cop = 0 then null
       else round((coalesce(ingresos_generados_cop, 0) - inversion_cop) / inversion_cop, 4)
  end as roi_pct,
  case when coalesce(resultado_cantidad, 0) = 0 then null
       else round(inversion_cop / resultado_cantidad, 0)
  end as costo_por_resultado_cop
from campanas_marketing;

-- =========================================================================
-- EQUIPO — personal de costo fijo (los diseñadores por pieza ya viven en
-- disenadores / control_mensual_tareas y se combinan en la vista de abajo)
-- =========================================================================

create table if not exists equipo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rol text,
  costo_mensual numeric not null default 0,
  moneda text not null default 'COP' check (moneda in ('COP', 'USD')),
  trm_aplicada numeric not null default 0,
  costo_mensual_cop numeric generated always as (
    case when moneda = 'USD' then costo_mensual * trm_aplicada else costo_mensual end
  ) stored,
  activo boolean not null default true,
  fecha_ingreso date,
  notas text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- Costo total de equipo del mes activo: personal fijo activo + lo pagado a
-- diseñadores ese mes según Control Mensual.
create or replace view v_costo_equipo_mes as
select
  (select mes_activo from configuracion where id = 1) as mes,
  (select coalesce(sum(costo_mensual_cop), 0) from equipo where activo = true) as costo_fijo_cop,
  (
    select coalesce(sum(t.total_cop), 0)
    from control_mensual_tareas t
    where t.mes = (select mes_activo from configuracion where id = 1)
  ) as costo_disenadores_cop,
  (select coalesce(sum(costo_mensual_cop), 0) from equipo where activo = true)
    + (
      select coalesce(sum(t.total_cop), 0)
      from control_mensual_tareas t
      where t.mes = (select mes_activo from configuracion where id = 1)
    ) as costo_total_cop;

-- =========================================================================
-- WATCHLIST DE MERCADO — solo guarda qué activos seguir; los precios se
-- consultan en vivo desde la app (no se almacenan históricos aquí).
-- =========================================================================

create table if not exists mercado_watchlist (
  id uuid primary key default gen_random_uuid(),
  simbolo text not null,
  nombre text not null,
  categoria text not null check (categoria in ('Cripto', 'Acción', 'ETF / Fondo', 'Metal', 'Divisa')),
  fuente text not null check (fuente in ('yahoo', 'coingecko')),
  query_id text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (simbolo)
);

-- =========================================================================
-- RLS
-- =========================================================================

do $$
declare
  t text;
begin
  for t in select unnest(array['campanas_marketing', 'equipo', 'mercado_watchlist'])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "team_full_access" on %I;', t);
    execute format(
      'create policy "team_full_access" on %I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;
