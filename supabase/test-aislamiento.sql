-- ASYGNUZ Dashboard — prueba de aislamiento entre tenants (2026-09-23)
-- Pega en Supabase → SQL Editor → Run. NO deja nada guardado: al final lanza
-- una excepción a propósito con el reporte, y eso revierte TODO lo que creó
-- (tenant y usuarios de prueba incluidos). Lee el reporte en el mensaje rojo.
-- Sirve para repetirlo después de cualquier cambio de RLS/permisos.
--
-- Simula (con set role + claims JWT) a: un usuario de OTRO tenant, un usuario
-- "Sin asignar" y a la clave anónima, y comprueba que no ven ni tocan datos
-- de ASYGNUZ ni leen tokens de Meta ni se hacen admin.

do $$
declare
  rep text := '';
  b uuid;
  ub uuid := gen_random_uuid();
  us uuid := gen_random_uuid();
  n int;
  n_asy int;
  t text;
  mods jsonb;
begin
  -- ---------- preparación (como superusuario) ----------
  b := public.crear_tenant('Prueba B', 'prueba-b-test', '{"financiero": true}'::jsonb);
  insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (ub, 'authenticated', 'authenticated', 'usuario-b@prueba.invalid', jsonb_build_object('tenant_id', b), '{}'::jsonb, now(), now()),
    (us, 'authenticated', 'authenticated', 'sin-asignar@prueba.invalid', '{}'::jsonb, '{}'::jsonb, now(), now());

  select count(*) into n_asy from ingresos;
  rep := rep || format('CONTROL: ASYGNUZ tiene %s ingresos (deben existir para que la prueba valga)', n_asy) || E'\n\n';

  -- ---------- 1) usuario de OTRO tenant (B) ----------
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  execute 'set local role authenticated';

  rep := rep || E'== Usuario del tenant B ==\n';
  foreach t in array array['ingresos','clientes','cuentas','gastos_fijos','gastos_variables','leads',
                           'meta_conexiones','disenadores','equipo','empleados','nominas'] loop
    execute format('select count(*) from %I', t) into n;
    rep := rep || format('  ve %-18s %s filas  %s', t, n, case when n = 0 then 'OK' else '*** FALLA ***' end) || E'\n';
  end loop;

  select count(*) into n from configuracion;
  rep := rep || format('  ve configuracion: %s fila(s) (debe ser 1, la suya)  %s', n, case when n = 1 then 'OK' else '*** FALLA ***' end) || E'\n';

  select public.modulos_habilitados_tenant() into mods;
  rep := rep || format('  módulos que ve: %s  %s', mods, case when mods = '{"financiero": true}'::jsonb then 'OK' else '*** FALLA ***' end) || E'\n';

  update ingresos set concepto = 'hack';
  get diagnostics n = row_count;
  rep := rep || format('  UPDATE sobre ingresos de ASYGNUZ: %s filas  %s', n, case when n = 0 then 'OK' else '*** FALLA ***' end) || E'\n';
  delete from clientes;
  get diagnostics n = row_count;
  rep := rep || format('  DELETE sobre clientes de ASYGNUZ: %s filas  %s', n, case when n = 0 then 'OK' else '*** FALLA ***' end) || E'\n';

  begin
    perform access_token from meta_conexiones limit 1;
    rep := rep || E'  lee access_token de Meta: *** FALLA (pudo leerlo) ***\n';
  exception when insufficient_privilege then
    rep := rep || E'  no puede leer access_token de Meta: OK\n';
  end;

  begin
    update profiles set rol = 'admin' where id = ub;
    get diagnostics n = row_count;
    rep := rep || format('  hacerse admin: %s filas  %s', n, case when n = 0 then 'OK' else '*** FALLA ***' end) || E'\n';
  exception when others then
    rep := rep || format('  hacerse admin: bloqueado (%s)  OK', sqlerrm) || E'\n';
  end;

  begin
    update profiles set tenant_id = 'af1f801b-9da5-42e6-ba81-2920bd4f4c57' where id = ub;
    get diagnostics n = row_count;
    rep := rep || format('  cambiarse a ASYGNUZ: %s filas  %s', n, case when n = 0 then 'OK' else '*** FALLA ***' end) || E'\n';
  exception when others then
    rep := rep || format('  cambiarse a ASYGNUZ: bloqueado (%s)  OK', sqlerrm) || E'\n';
  end;

  -- ---------- 2) usuario "Sin asignar" ----------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', us, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  perform set_config('request.jwt.claim.sub', us::text, true);
  execute 'set local role authenticated';

  rep := rep || E'\n== Usuario nuevo sin asignar ==\n';
  foreach t in array array['ingresos','clientes','cuentas','meta_conexiones','empleados'] loop
    execute format('select count(*) from %I', t) into n;
    rep := rep || format('  ve %-18s %s filas  %s', t, n, case when n = 0 then 'OK' else '*** FALLA ***' end) || E'\n';
  end loop;
  select public.modulos_habilitados_tenant() into mods;
  rep := rep || format('  módulos que ve: %s  %s', mods, case when mods = '{}'::jsonb then 'OK' else '*** FALLA ***' end) || E'\n';

  -- ---------- 3) clave anónima ----------
  execute 'reset role';
  execute 'set local role anon';
  rep := rep || E'\n== Clave anónima (sin login) ==\n';
  foreach t in array array['empleados','contratos','nominas','ingresos','profiles','meta_conexiones'] loop
    begin
      execute format('select count(*) from %I', t) into n;
      rep := rep || format('  ve %-18s %s filas  %s', t, n, case when n = 0 then 'OK' else '*** FALLA ***' end) || E'\n';
    exception when insufficient_privilege then
      rep := rep || format('  %-18s sin permiso  OK', t) || E'\n';
    end;
  end loop;

  execute 'reset role';
  raise exception E'REPORTE DE AISLAMIENTO (todo se revierte, no quedó nada guardado)\n\n%', rep;
end $$;
