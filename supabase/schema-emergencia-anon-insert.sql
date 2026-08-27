-- ASYGNUZ Dashboard — permite que el formulario público (n8n, sin login)
-- pueda CREAR casos nuevos en casos_emergencia usando la llave pública
-- (anon key). Solo permite INSERT — no puede leer, editar ni borrar nada.
-- Pega esto en el SQL Editor y dale Run.

drop policy if exists "casos_emergencia_insert_publico" on casos_emergencia;
create policy "casos_emergencia_insert_publico" on casos_emergencia
  for insert to anon
  with check (true);

grant insert on casos_emergencia to anon;
