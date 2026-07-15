-- ASYGNUZ Dashboard — ampliación: Cuentas / Caja
-- Corre esto DESPUÉS de supabase/schema.sql y schema-clientes.sql.
-- Pega en Supabase → SQL Editor → New query → Run.

-- =========================================================================
-- CUENTAS (bancos, billeteras digitales, efectivo)
-- =========================================================================

create table if not exists cuentas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  moneda text not null default 'COP' check (moneda in ('COP', 'USD')),
  tipo text not null default 'Banco' check (tipo in ('Banco', 'Efectivo', 'Billetera digital', 'Otro')),
  saldo_inicial numeric not null default 0,
  activa boolean not null default true,
  notas text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- =========================================================================
-- MOVIMIENTOS DE CUENTA (bitácora: ingresos, gastos, compra/venta de USD)
-- =========================================================================

create table if not exists movimientos_cuenta (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references cuentas (id) on delete cascade,
  fecha date not null default current_date,
  tipo text not null check (
    tipo in ('Ingreso', 'Gasto', 'Compra USD', 'Venta USD', 'Transferencia Entrada', 'Transferencia Salida')
  ),
  monto numeric not null default 0,
  tasa_cambio numeric,
  descripcion text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- =========================================================================
-- VISTA: saldo actual por cuenta
-- =========================================================================

create or replace view v_saldo_cuentas as
select
  c.id as cuenta_id,
  c.nombre as cuenta,
  c.moneda,
  c.tipo,
  c.activa,
  c.saldo_inicial
    + coalesce(sum(m.monto) filter (
        where m.tipo in ('Ingreso', 'Compra USD', 'Transferencia Entrada')
      ), 0)
    - coalesce(sum(m.monto) filter (
        where m.tipo in ('Gasto', 'Venta USD', 'Transferencia Salida')
      ), 0) as saldo_actual
from cuentas c
left join movimientos_cuenta m on m.cuenta_id = c.id
group by c.id, c.nombre, c.moneda, c.tipo, c.activa, c.saldo_inicial;

-- =========================================================================
-- RLS
-- =========================================================================

do $$
declare
  t text;
begin
  for t in select unnest(array['cuentas', 'movimientos_cuenta'])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "team_full_access" on %I;', t);
    execute format(
      'create policy "team_full_access" on %I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;
