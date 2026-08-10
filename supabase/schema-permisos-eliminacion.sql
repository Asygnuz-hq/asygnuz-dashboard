-- ASYGNUZ Dashboard — solo un administrador puede eliminar/restaurar
-- Pega en Supabase → SQL Editor → New query → Run.
-- No borra nada. Agrega rol a profiles (Juan Manuel = admin, resto = miembro)
-- y un trigger que bloquea eliminar/restaurar a quien no sea admin —
-- a nivel de base de datos, no solo escondiendo el botón en la app.

alter table profiles add column if not exists rol text not null default 'miembro'
  check (rol in ('admin', 'miembro'));

-- Las dos filas "Juan Manuel" (por si hay cuentas duplicadas del mismo dueño).
update profiles set rol = 'admin' where full_name = 'Juan Manuel';

create or replace function public.soy_admin()
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and rol = 'admin');
$$;

create or replace function public.solo_admin_elimina()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- El SQL Editor (sin auth.role()) y las llamadas con service_role
  -- (cron, arreglos manuales tuyos) nunca quedan bloqueadas por esta regla.
  if auth.role() is null or auth.role() = 'service_role' then
    return coalesce(new, old);
  end if;

  if TG_OP = 'DELETE' then
    if not public.soy_admin() then
      raise exception 'Solo un administrador puede eliminar registros.';
    end if;
    return old;
  end if;

  if (old.eliminado_en is distinct from new.eliminado_en) and not public.soy_admin() then
    raise exception 'Solo un administrador puede eliminar o restaurar registros.';
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'ingresos', 'gastos_fijos', 'gastos_variables', 'inversiones', 'fundacion_donaciones',
    'disenadores', 'control_mensual_tareas', 'cobros_clientes', 'deudas_personales',
    'clientes', 'actividades_cliente', 'cuentas', 'movimientos_cuenta',
    'campanas_marketing', 'equipo', 'mercado_watchlist'
  ])
  loop
    execute format('drop trigger if exists trg_solo_admin_elimina_upd on %I;', t);
    execute format(
      'create trigger trg_solo_admin_elimina_upd before update on %I for each row execute function public.solo_admin_elimina();',
      t
    );
    execute format('drop trigger if exists trg_solo_admin_elimina_del on %I;', t);
    execute format(
      'create trigger trg_solo_admin_elimina_del before delete on %I for each row execute function public.solo_admin_elimina();',
      t
    );
  end loop;
end $$;
