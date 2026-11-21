-- =========================================================================
-- ASYGNUZ Dashboard — Seed completo del Portal Exclusivo de Lumia Odontología
-- Ejecutar DESPUÉS de supabase/schema-portal-exclusivo.sql.
-- Idempotente: seguro de repetir sin duplicar datos.
-- =========================================================================

do $$
declare
  v_tenant_id uuid;
begin
  -- 1. Crear o actualizar tenant Lumia Odontología
  insert into tenants (nombre, slug, subdominio, logo_url, color_acento, tagline_portal, splash_habilitado, modulos_habilitados)
  values (
    'Lumia Odontología',
    'lumia',
    'lumia',
    '/lumia/media/lumia-logo.png',
    '#C9A45C',
    'Clínica de autor · Diseño de sonrisa e implantología · Manizales',
    true,
    '{"portal_cliente": true}'::jsonb
  )
  on conflict (slug) do update set
    nombre = excluded.nombre,
    subdominio = excluded.subdominio,
    logo_url = excluded.logo_url,
    color_acento = excluded.color_acento,
    tagline_portal = excluded.tagline_portal,
    splash_habilitado = excluded.splash_habilitado,
    modulos_habilitados = tenants.modulos_habilitados || '{"portal_cliente": true}'::jsonb
  returning id into v_tenant_id;

  -- 2. Ficha del proyecto
  insert into portal_proyecto (tenant_id, fecha_inicio, tipo_proyecto, descripcion, contacto_nombre, responsable_nombre, responsable_email)
  values (
    v_tenant_id,
    date '2026-11-17',
    'Estrategia, pauta, contenido cinematográfico y crecimiento',
    'Posicionamos a Lumia como la clínica de autor de Manizales: autoridad clínica del Dr. Alejandro Restrepo, cerámica diseñada y fabricada en casa y pauta con trazabilidad real de valoraciones y cierres.',
    'Sebastián Restrepo · Dr. Alejandro Restrepo',
    'Juan Manuel Marín',
    'juan.marin@asygnuz.com'
  )
  on conflict (tenant_id) do update set
    tipo_proyecto = excluded.tipo_proyecto,
    descripcion = excluded.descripcion,
    contacto_nombre = excluded.contacto_nombre,
    responsable_nombre = excluded.responsable_nombre,
    responsable_email = excluded.responsable_email;

  -- 3. Pilares estratégicos (4 ejes)
  insert into portal_pilares (tenant_id, icono, titulo, texto, orden)
  select v_tenant_id, '01', 'Criterio del Dr. Alejo (30 %)', 'Autoridad clínica en consultorio: opinión experta, mitos vs. realidad y criterios reales para decidir un tratamiento sin caer en promesas de precio bajo.', 0
  where not exists (select 1 from portal_pilares where tenant_id = v_tenant_id and titulo = 'Criterio del Dr. Alejo (30 %)');
  insert into portal_pilares (tenant_id, icono, titulo, texto, orden)
  select v_tenant_id, '02', 'Hecho en Lumia (25 %)', 'Ceramistas propios, diseño digital y precisión artesanal en casa. Serie insignia ''Se diseña aquí'' mostrando del escáner 3D a la cerámica terminada.', 1
  where not exists (select 1 from portal_pilares where tenant_id = v_tenant_id and titulo = 'Hecho en Lumia (25 %)');
  insert into portal_pilares (tenant_id, icono, titulo, texto, orden)
  select v_tenant_id, '03', 'Pacientes reales (25 %)', 'Transformaciones auténticas con consentimiento, formato tableta antes/después y testimonios que disuelven el miedo a la primera valoración.', 2
  where not exists (select 1 from portal_pilares where tenant_id = v_tenant_id and titulo = 'Pacientes reales (25 %)');
  insert into portal_pilares (tenant_id, icono, titulo, texto, orden)
  select v_tenant_id, '04', 'Experiencia Lumia (20 %)', 'Turismo dental para pacientes internacionales (500+ casos), equipo elegido a mano y campaña Black Week ''Del negro a la luz'' sin bajar el valor de marca.', 3
  where not exists (select 1 from portal_pilares where tenant_id = v_tenant_id and titulo = 'Experiencia Lumia (20 %)');

  -- 4. Enlaces clave
  insert into portal_enlaces (tenant_id, titulo, url, orden)
  select v_tenant_id, 'Propuesta comercial ASYGNUZ × Lumia', 'https://app.asygnuz.com/lumia/propuesta', 0
  where not exists (select 1 from portal_enlaces where tenant_id = v_tenant_id and titulo = 'Propuesta comercial ASYGNUZ × Lumia');
  insert into portal_enlaces (tenant_id, titulo, url, orden)
  select v_tenant_id, 'Resultados y casos de referencia', 'https://app.asygnuz.com/lumia/resultados', 1
  where not exists (select 1 from portal_enlaces where tenant_id = v_tenant_id and titulo = 'Resultados y casos de referencia');
  insert into portal_enlaces (tenant_id, titulo, url, orden)
  select v_tenant_id, 'Análisis y diagnóstico inicial de pauta', 'https://app.asygnuz.com/lumia/analisis', 2
  where not exists (select 1 from portal_enlaces where tenant_id = v_tenant_id and titulo = 'Análisis y diagnóstico inicial de pauta');
  insert into portal_enlaces (tenant_id, titulo, url, orden)
  select v_tenant_id, 'Instagram @lumiaodontologia', 'https://www.instagram.com/lumiaodontologia/', 3
  where not exists (select 1 from portal_enlaces where tenant_id = v_tenant_id and titulo = 'Instagram @lumiaodontologia');

  -- 5. Bitácora inicial de reuniones
  insert into portal_reuniones (tenant_id, titulo, fecha, notas)
  select v_tenant_id, 'Diagnóstico de pauta y trazabilidad', date '2026-10-20', 'Auditoría de Meta Ads (~$4,2M–$6M/mes), Google Ads, medición GA4 y detección de error 503 en www.lumiaodontologia.com.'
  where not exists (select 1 from portal_reuniones where tenant_id = v_tenant_id and titulo = 'Diagnóstico de pauta y trazabilidad' and fecha = date '2026-10-20');
  insert into portal_reuniones (tenant_id, titulo, fecha, notas)
  select v_tenant_id, 'Benchmarking internacional y estrategia Black Week', date '2026-11-19', 'Definición de 4 pilares editoriales y concepto ''Del negro a la luz'' (23–30 nov): pauta directa a WhatsApp con códigos BW- y redes cinematográficas sin oferta en el feed.'
  where not exists (select 1 from portal_reuniones where tenant_id = v_tenant_id and titulo = 'Benchmarking internacional y estrategia Black Week' and fecha = date '2026-11-19');
  insert into portal_reuniones (tenant_id, titulo, fecha, notas)
  select v_tenant_id, 'Jornada de grabación Black Week', date '2026-11-21', 'Bloque de 4 horas en clínica cerrada (12:30–4:10 p. m.) para grabar las 6 piezas de pauta y las 4 películas de marca.'
  where not exists (select 1 from portal_reuniones where tenant_id = v_tenant_id and titulo = 'Jornada de grabación Black Week' and fecha = date '2026-11-21');

  -- 6. Parrilla de contenido (Black Week + Jornada 1)
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Tu sonrisa para diciembre', 'Anuncio', 'Meta Ads', date '2026-11-23',
    'grabacion', 'Criterio del Dr. Alejo', 'Video del Dr. Alejo explicando cuántas citas toma un diseño y por qué alcanza antes de diciembre.', 'Código interno: P1 · Formato: Dr. Alejo a cámara + b-roll · Tomas: A01, A02, C05, C07',
    'Black Week', 'Pauta', 'Diseño de sonrisa', '30–40 s',
    '3 versiones: "Si quieres tu sonrisa lista para el 24, tienes hasta el 30 de noviembre para empezar." / "¿Cuántas citas toma un diseño de sonrisa? Menos de las que crees." / "Diciembre es el mes con más fotos del año. ¿Cómo quieres salir en ellas?"', '"Un diseño de sonrisa en Lumia se hace en dos o tres citas. Primero te valoro y diseñamos en digital cómo va a quedar. Te lo muestro antes de tocar un diente. Después nuestros ceramistas fabrican tu sonrisa aquí mismo, en la clínica. Si empiezas esta semana, llegas a diciembre con ella puesta."', 'Cierre del día (hoja Cierres diarios). WhatsApp: BW-DICIEMBRE',
    true, false, 0
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Tu sonrisa para diciembre' and coalesce(campana, '') = 'Black Week'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Transformación en tableta', 'Anuncio', 'Meta Ads', date '2026-11-23',
    'grabacion', 'Pacientes reales', 'Video corto de transformación antes y después real con permiso del paciente.', 'Código interno: P2 · Formato: Plano fijo con la tableta · Tomas: B01, B02',
    'Black Week', 'Pauta', 'Diseño de sonrisa', '10–15 s',
    'Texto arriba, 3 versiones: "Dos citas." / "Ella quería verse como ella, pero mejor." / "Diseñado y fabricado en Lumia."', 'Tableta con el antes en primer plano → transición al después → el Dr. Alejo reacciona detrás. 2–3 casos.', 'Solo pacientes de Lumia con consentimiento. WhatsApp: BW-SONRISA',
    true, false, 1
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Transformación en tableta' and coalesce(campana, '') = 'Black Week'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Un implante barato te sale caro', 'Anuncio', 'Meta Ads', date '2026-11-23',
    'grabacion', 'Criterio del Dr. Alejo', 'Video del Dr. Alejo explicando qué incluye un buen implante y qué evaluar antes de decidir.', 'Código interno: P3 · Formato: Dr. Alejo a cámara · Tomas: A03, A04, A09',
    'Black Week', 'Pauta', 'Implantes', '35–45 s',
    '3 versiones: "Un implante barato te sale caro. Te explico por qué." / "¿Por qué un implante cuesta tan distinto de una clínica a otra?" / "Lo que no ves de un implante es lo que más importa."', '"Lo que pagas en un implante no es solo el tornillo. Es la marca del implante, la planeación con tomografía, la corona que va encima y quién la hace. Cuando algo de eso se recorta, el problema aparece a los dos o tres años. En Lumia te muestro el plan completo y el precio completo desde la valoración, sin sorpresas."', 'Cierre del día. WhatsApp: BW-IMPLANTE',
    true, false, 2
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Un implante barato te sale caro' and coalesce(campana, '') = 'Black Week'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Se diseña aquí + oferta', 'Anuncio', 'Meta Ads', date '2026-11-23',
    'grabacion', 'Hecho en Lumia', 'Del escáner a la cerámica terminada en casa, con la oferta de Black Week.', 'Código interno: P4 · Formato: Corte de R2 + tarjeta de oferta · Tomas: C07–C15',
    'Black Week', 'Pauta', 'Diseño de sonrisa y cerámica', '15–20 s',
    'Texto en pantalla, 3 versiones: "Tu sonrisa no se manda a hacer afuera." / "Del escáner a la cerámica, en la misma sala." / "Una semana. [N cupos]."', 'Los 10–12 s más fuertes de R2.', 'Tarjeta sobre negro: "BLACK WEEK · [beneficio] · [N cupos] · Escríbenos". WhatsApp: BW-AQUI',
    true, false, 3
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Se diseña aquí + oferta' and coalesce(campana, '') = 'Black Week'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, '¿Vienes a Colombia en diciembre?', 'Anuncio', 'Meta Ads', date '2026-11-25',
    'grabacion', 'Experiencia Lumia', 'Video del Dr. Alejo en español e inglés para colombianos que viajan en diciembre.', 'Código interno: P5 · Formato: Dr. Alejo, español e inglés · Tomas: A05, A06',
    'Black Week', 'Pauta', 'Turismo dental', '30 s',
    '3 versiones: "¿Vienes a Colombia en diciembre? Te puedes ir con tu sonrisa nueva." / "Más de 500 pacientes han venido desde afuera a Lumia. Así funciona." / EN: "Coming to Colombia this December? Leave with a new smile."', '"Si llegas en diciembre, reserva ahora. Hacemos tu valoración por videollamada, tenemos tu plan listo antes de que aterrices y organizamos las citas para que alcances a hacer todo en tu viaje." (Confirmar valoración virtual.)', 'Segmentar: colombianos en EE. UU. y España. WhatsApp: BW-VIAJE',
    true, false, 4
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = '¿Vienes a Colombia en diciembre?' and coalesce(campana, '') = 'Black Week'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Lo que más miedo me daba era…', 'Anuncio', 'Meta Ads', date '2026-11-25',
    'grabacion', 'Pacientes reales', 'Testimonio real de paciente contando cómo perdió el miedo a la primera cita.', 'Código interno: P6 · Formato: Paciente a cámara · Tomas: B03',
    'Black Week', 'Pauta', 'Valoración', '30–45 s',
    'Sale de la mejor frase del paciente.', '4 preguntas sin guion: qué te daba miedo, qué te hizo decidirte, cómo fue el proceso, qué sentiste al verte.', 'Si no hay paciente el sábado, pasa a diciembre. WhatsApp: BW-MIEDO',
    true, false, 5
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Lo que más miedo me daba era…' and coalesce(campana, '') = 'Black Week'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'LUZ (manifiesto)', 'Reels', 'Instagram', date '2026-11-23',
    'grabacion', 'Experiencia Lumia', 'Pieza manifiesto de alto nivel visual que presenta la clínica (''Del negro a la luz'').', 'Código interno: R1 · Formato: Cine, sin oferta · Tomas: C01–C06, C17',
    'Black Week', 'Orgánico', 'Marca', '30–45 s',
    'Negro total; se enciende un haz fino de luz.', 'Haz sobre instrumentos → carilla en contraluz → manos del Dr. Alejo en cámara lenta → pantalla del diseño ilumina su cara (voz: "La luz no se pone.") → sonrisa de sombra a luz ("Se diseña.").', 'Palabra LUZ + logo dorado. Expectativa dom 22: planos 1–3, 10 s, texto "23.11".',
    true, false, 6
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'LUZ (manifiesto)' and coalesce(campana, '') = 'Black Week'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Se diseña aquí', 'Reels', 'Instagram', date '2026-11-25',
    'grabacion', 'Hecho en Lumia', 'Del escáner intraoral a la cerámica terminada en clave cinematográfica, sin voz.', 'Código interno: R2 · Formato: Cine, sin voz · Tomas: C07–C09, C14, C15',
    'Black Week', 'Orgánico', 'Diseño de sonrisa', '20–30 s',
    'Escáner intraoral entrando a cuadro, en cámara lenta.', 'Modelo 3D girando a oscuras → Dr. Alejo y ceramista de perfil frente a la pantalla → primera capa de cerámica → horno abriéndose → pieza en terciopelo negro.', 'Palabra AQUÍ + logo.',
    true, false, 7
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Se diseña aquí' and coalesce(campana, '') = 'Black Week'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Las manos', 'Reels', 'Instagram', date '2026-11-27',
    'grabacion', 'Hecho en Lumia', 'El oficio artesanal de los ceramistas propios en Lumia.', 'Código interno: R3 · Formato: Cine, sin voz · Tomas: C10–C13',
    'Black Week', 'Orgánico', 'Cerámica', '30–45 s',
    'Manos limpias, quietas, a contraluz.', 'Pincel cargando polvo → capas a 120 fps → ojo detrás de la lupa → guía de tonos junto a la pieza → polvo cayendo a contraluz.', 'Palabra MANOS + logo. Necesita ceramista; si no, pasa a diciembre.',
    true, false, 8
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Las manos' and coalesce(campana, '') = 'Black Week'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Retrato del Dr. Alejo', 'Reels', 'Instagram', date '2026-11-30',
    'grabacion', 'Criterio del Dr. Alejo', 'Retrato documental del Dr. Alejo contando su criterio clínico.', 'Código interno: R4 · Formato: Mini documental, voz en off · Tomas: C16, C17',
    'Black Week', 'Orgánico', 'Marca', '45–60 s',
    '"Llevo más de quince años haciendo sonrisas en Manizales. Y aprendí algo: una sonrisa no se copia."', '"No se saca de una foto de internet. Se mira la cara, la forma de hablar, la edad, lo que la persona quiere decir cuando se ríe. Por eso aquí el diseño y la cerámica se hacen en la misma sala. Para que cuando te mires, te reconozcas." B-roll: llegada, bata, modelo a contraluz, ceramista, ventana.', 'Palabra CRITERIO + firma manuscrita + logo.',
    true, false, 9
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Retrato del Dr. Alejo' and coalesce(campana, '') = 'Black Week'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Carrusel: Retrato', 'Carrusel', 'Instagram', date '2026-11-25',
    'grabacion', 'Experiencia Lumia', 'Carrusel fotográfico en clave baja del Dr. Alejo y el equipo.', 'Código interno: C1 · Formato: Fotos en clave baja · Tomas: E01–E03',
    'Black Week', 'Orgánico', 'Marca', '6 láminas',
    'Retrato del Dr. Alejo.', 'Doctor y equipo, una frase de criterio por foto.', '—',
    true, false, 10
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Carrusel: Retrato' and coalesce(campana, '') = 'Black Week'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Carrusel: Las piezas', 'Carrusel', 'Instagram', date '2026-11-29',
    'grabacion', 'Hecho en Lumia', 'Carrusel de detalle sobre piezas, cerámica y guía de tonos.', 'Código interno: C2 · Formato: Fotos de detalle · Tomas: E04, E05',
    'Black Week', 'Orgánico', 'Cerámica', '6 láminas',
    'Detalle de cerámica.', 'Cerámica, instrumentos y guía de tonos, una palabra por lámina.', 'Última lámina: "Se diseña y se fabrica en Lumia".',
    true, false, 11
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Carrusel: Las piezas' and coalesce(campana, '') = 'Black Week'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Esto es Lumia', 'Reels', 'Instagram', null,
    'idea', 'Criterio del Dr. Alejo', 'Quiénes somos (15 años, CC Fundadores) → ceramistas en casa → más de 500 pacientes de otras ciudades y países → el equipo.', 'Jornada 1 (Día 1) · Tomas: A05, A06, A13, B04, D06, E01–E06 · Nota Black Week: Parecida a R1 ''LUZ'' (manifiesto): definir si es una sola pieza',
    'Jornada 1', 'Orgánico', 'Diseño de sonrisa / Implantes', '45–60 s',
    'Elegir 1: "En 2008 abrimos con una idea: que la sonrisa se diseñe y se fabrique en el mismo lugar." / "Esto es lo que pasa detrás de cada sonrisa de Lumia."', 'Quiénes somos (15 años, CC Fundadores) → ceramistas en casa → más de 500 pacientes de otras ciudades y países → el equipo.', '"Esto es Lumia." + logo dorado.',
    true, false, 12
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Esto es Lumia' and coalesce(campana, '') = 'Jornada 1'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Carillas sin desgaste', 'Reels', 'Instagram', null,
    'idea', 'Criterio del Dr. Alejo', 'Qué significa en realidad → cuándo se puede no desgastar → por qué a veces se necesita una preparación mínima (función, estética, salud).', 'Jornada 1 (Día 3) · Tomas: A01, A02, A10',
    'Jornada 1', 'Orgánico + pauta', 'Diseño de sonrisa / Implantes', '35–50 s',
    '3 versiones: "''Carillas sin desgaste'' es una frase de marketing." / "¿Te prometieron carillas sin tocar tus dientes? Escucha esto." / "Antes de hacerte carillas, tienes que saber esto."', 'Qué significa en realidad → cuándo se puede no desgastar → por qué a veces se necesita una preparación mínima (función, estética, salud).', '"En Lumia decidimos según tu diente, no según la tendencia." CTA: escríbenos por WhatsApp.',
    true, false, 13
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Carillas sin desgaste' and coalesce(campana, '') = 'Jornada 1'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Transformación en tableta', 'Reels', 'Instagram', null,
    'idea', 'Pacientes reales', 'Transición al después; el doctor mira a cámara y reacciona. Texto: "Diseño de sonrisa · Lumia". Sin tiempos ni promesas.', 'Jornada 1 (Día 5) · Tomas: B01, B02, B03 · Nota Black Week: Sí: P2 (misma toma)',
    'Jornada 1', 'Pauta + orgánico', 'Diseño de sonrisa / Implantes', '7–12 s',
    'Tableta en primer plano con la foto del antes; el Dr. Alejo trabaja detrás.', 'Transición al después; el doctor mira a cámara y reacciona. Texto: "Diseño de sonrisa · Lumia". Sin tiempos ni promesas.', 'Paciente de Lumia con consentimiento firmado.',
    true, false, 14
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Transformación en tableta' and coalesce(campana, '') = 'Jornada 1'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Se diseña aquí', 'Reels', 'Instagram', null,
    'idea', 'Hecho en Lumia', 'Diseño en pantalla → manos del ceramista, pincel y horno → doctor y ceramista revisan la pieza → paciente sonríe al espejo.', 'Jornada 1 (Día 8) · Tomas: C04, D02–D07, D09, B03 · Nota Black Week: Sí: P4 (pauta con oferta) y R2 (cine)',
    'Jornada 1', 'Orgánico', 'Diseño de sonrisa / Implantes', '25–35 s',
    'Macro del escáner intraoral.', 'Diseño en pantalla → manos del ceramista, pincel y horno → doctor y ceramista revisan la pieza → paciente sonríe al espejo.', '"Se diseña aquí. Se fabrica aquí." + logo. Macros que falten: jornada externa.',
    true, false, 15
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Se diseña aquí' and coalesce(campana, '') = 'Jornada 1'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Implante barato sale caro', 'Reels', 'Instagram', null,
    'idea', 'Criterio del Dr. Alejo', '3 cosas que no se ven: la planeación con tomografía, la calidad del implante y la corona, y el seguimiento.', 'Jornada 1 (Día 10) · Tomas: A03, A04, A11, A12 · Nota Black Week: Sí: P3 (Black Week agrega cierre con oferta)',
    'Jornada 1', 'Pauta + orgánico', 'Diseño de sonrisa / Implantes', '40–55 s',
    '3 versiones: "Un implante barato puede salir muy caro." / "Lo que no ves de un implante es lo que más importa." / "Antes de comparar precios de implantes, pregunta esto."', '3 cosas que no se ven: la planeación con tomografía, la calidad del implante y la corona, y el seguimiento.', '"Un implante es una decisión de largo plazo: elige por lo que no se ve." CTA: valoración por WhatsApp.',
    true, false, 16
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Implante barato sale caro' and coalesce(campana, '') = 'Jornada 1'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Tu primera valoración', 'Reels', 'Instagram', null,
    'idea', 'Pacientes reales', 'Llegada a CC Fundadores → recepción → fotos y escáner → el doctor muestra su diseño en pantalla → explicación del plan → sale. Texto: "1. Te recibimos…" hasta "5. Te vas con tu plan claro".', 'Jornada 1 (Día 12) · Tomas: A07, C01–C10',
    'Jornada 1', 'Pauta + orgánico', 'Diseño de sonrisa / Implantes', '30–45 s',
    '3 ganchos a cámara del Dr. Alejo (A07).', 'Llegada a CC Fundadores → recepción → fotos y escáner → el doctor muestra su diseño en pantalla → explicación del plan → sale. Texto: "1. Te recibimos…" hasta "5. Te vas con tu plan claro".', '"Así empieza tu sonrisa en Lumia." CTA: agenda por WhatsApp.',
    true, false, 17
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Tu primera valoración' and coalesce(campana, '') = 'Jornada 1'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Por qué los precios varían', 'Reels', 'Instagram', null,
    'idea', 'Pacientes reales', 'Material (resina o cerámica), cuántos dientes, quién lo diseña y lo fabrica, garantía y seguimiento. Sin nombrar a nadie.', 'Jornada 1 (Reserva) · Tomas: A08, A09',
    'Jornada 1', 'Orgánico', 'Diseño de sonrisa / Implantes', '40–50 s',
    '"¿Por qué un diseño de sonrisa cuesta $700.000 en un lado y $3.000.000 en otro?"', 'Material (resina o cerámica), cuántos dientes, quién lo diseña y lo fabrica, garantía y seguimiento. Sin nombrar a nadie.', '"Pregunta siempre qué incluye."',
    true, false, 18
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Por qué los precios varían' and coalesce(campana, '') = 'Jornada 1'
  );
  insert into portal_contenido (
    tenant_id, titulo, tipo, plataforma, fecha_publicacion, estado, pilar, copy, notas,
    campana, uso, procedimiento, duracion, gancho, cuerpo, cta,
    visible_cliente, guion_visible_cliente, orden
  )
  select
    v_tenant_id, 'Conoce a nuestro ceramista', 'Reels', 'Instagram', null,
    'idea', 'Hecho en Lumia', 'B-roll: manos, horno, pieza a contraluz.', 'Jornada 1 (Reserva) · Tomas: D01–D05, D07 · Nota Black Week: Sí: R3 ''Las manos'' (sin voz)',
    'Jornada 1', 'Orgánico', 'Diseño de sonrisa / Implantes', '40–60 s',
    'Preguntas: ¿hace cuánto haces esto?, ¿qué es lo más difícil de una carilla?, ¿por qué importa trabajar al lado del doctor?', 'B-roll: manos, horno, pieza a contraluz.', 'El ceramista sostiene la pieza + logo.',
    true, false, 19
  where not exists (
    select 1 from portal_contenido
    where tenant_id = v_tenant_id and titulo = 'Conoce a nuestro ceramista' and coalesce(campana, '') = 'Jornada 1'
  );

  -- 7. Hojas de trabajo tipo Excel (4 visibles al cliente + 2 listas de tomas internas)
  insert into portal_hojas (tenant_id, titulo, tipo, descripcion, visible_cliente, columnas, filas, orden)
  select
    v_tenant_id,
    'Plan Black Week',
    'tabla',
    'Del 23 al 30 de noviembre de 2026 · Grabación de 4 horas el sábado 21 nov. Meta: llenar la agenda de diciembre sin bajar el valor de la marca.',
    true,
    '[{"key": "num", "label": "#", "tipo": "texto", "ancho": "48px"}, {"key": "tipo", "label": "Tipo", "tipo": "select", "opciones": ["Anuncios", "Redes", "Historias", "En vivo"]}, {"key": "tema", "label": "Tema", "tipo": "texto"}, {"key": "procedimiento", "label": "Procedimiento", "tipo": "texto"}, {"key": "que_hacemos", "label": "Qué hacemos", "tipo": "texto"}, {"key": "grabacion", "label": "Grabación", "tipo": "texto"}, {"key": "edicion", "label": "Edición", "tipo": "texto"}, {"key": "sale", "label": "Sale", "tipo": "texto"}]'::jsonb,
    '[{"id": "bwc_1", "num": "1", "tipo": "Anuncios", "tema": "Tu sonrisa lista para diciembre", "procedimiento": "Diseño de sonrisa", "que_hacemos": "Video del Dr. Alejo explicando cuántas citas toma y por qué alcanza antes de diciembre", "grabacion": "20 min", "edicion": "1 día", "sale": "Lun 23 nov"}, {"id": "bwc_2", "num": "2", "tipo": "Anuncios", "tema": "Antes y después real", "procedimiento": "Diseño de sonrisa", "que_hacemos": "Video corto con un caso de la clínica, con permiso del paciente", "grabacion": "15 min", "edicion": "1 día", "sale": "Lun 23 nov"}, {"id": "bwc_3", "num": "3", "tipo": "Anuncios", "tema": "Por qué un implante barato sale caro", "procedimiento": "Implantes", "que_hacemos": "Video del Dr. Alejo explicando qué incluye un buen implante", "grabacion": "20 min", "edicion": "1 día", "sale": "Lun 23 nov"}, {"id": "bwc_4", "num": "4", "tipo": "Anuncios", "tema": "Tu sonrisa se hace aquí", "procedimiento": "Diseño de sonrisa y cerámica", "que_hacemos": "Video del escáner a la cerámica terminada, con la oferta de Black Week", "grabacion": "Sale de la grabación de marca", "edicion": "1 día", "sale": "Lun 23 nov"}, {"id": "bwc_5", "num": "5", "tipo": "Anuncios", "tema": "Pacientes que vienen del exterior", "procedimiento": "Turismo dental", "que_hacemos": "Video del Dr. Alejo en español y en inglés para colombianos que vienen en diciembre", "grabacion": "15 min", "edicion": "2 días", "sale": "Mié 25 nov"}, {"id": "bwc_6", "num": "6", "tipo": "Anuncios", "tema": "Perder el miedo", "procedimiento": "Valoración", "que_hacemos": "Un paciente cuenta su experiencia (si hay paciente disponible)", "grabacion": "15 min", "edicion": "2 días", "sale": "Mié 25 nov"}, {"id": "bwc_7", "num": "7", "tipo": "Redes", "tema": "Manifiesto de Lumia", "procedimiento": "Marca", "que_hacemos": "Video de alto nivel que presenta la clínica", "grabacion": "1 h 30 min (todo el contenido de marca)", "edicion": "2 días", "sale": "Lun 23 nov"}, {"id": "bwc_8", "num": "8", "tipo": "Redes", "tema": "Así se diseña una sonrisa en Lumia", "procedimiento": "Diseño de sonrisa", "que_hacemos": "Del escáner a la cerámica, sin voz", "grabacion": "Incluido arriba", "edicion": "2 días", "sale": "Mié 25 nov"}, {"id": "bwc_9", "num": "9", "tipo": "Redes", "tema": "El trabajo del ceramista", "procedimiento": "Cerámica", "que_hacemos": "El oficio de los ceramistas propios", "grabacion": "Incluido arriba", "edicion": "2 días", "sale": "Vie 27 nov"}, {"id": "bwc_10", "num": "10", "tipo": "Redes", "tema": "Retrato del Dr. Alejo", "procedimiento": "Marca", "que_hacemos": "El doctor cuenta cómo piensa una sonrisa", "grabacion": "Incluido arriba", "edicion": "3 días", "sale": "Lun 30 nov"}, {"id": "bwc_11", "num": "11", "tipo": "Redes", "tema": "Fotos de la clínica y el equipo", "procedimiento": "Marca", "que_hacemos": "2 carruseles de fotos", "grabacion": "20 min", "edicion": "1 día", "sale": "Mié 25 y dom 29 nov"}, {"id": "bwc_12", "num": "12", "tipo": "Historias", "tema": "Cupos y oferta del día", "procedimiento": "Black Week", "que_hacemos": "Historias diarias con el tablero de cupos y el enlace a WhatsApp", "grabacion": "El equipo de Lumia, 10 min al día", "edicion": "—", "sale": "Todos los días, 23–30 nov"}, {"id": "bwc_13", "num": "13", "tipo": "En vivo", "tema": "Pregúntale al Dr. Alejo", "procedimiento": "Todas", "que_hacemos": "Transmisión en vivo respondiendo preguntas", "grabacion": "20 min", "edicion": "—", "sale": "Vie 27 nov, 7 p. m."}]'::jsonb,
    0
  where not exists (
    select 1 from portal_hojas where tenant_id = v_tenant_id and titulo = 'Plan Black Week'
  );
  insert into portal_hojas (tenant_id, titulo, tipo, descripcion, visible_cliente, columnas, filas, orden)
  select
    v_tenant_id,
    'Banco de Ideas',
    'ideas',
    'Ideas derivadas del benchmarking internacional y local. Desde gestión puedes pasar cualquiera a la parrilla en un clic.',
    true,
    '[{"key": "num", "label": "#", "tipo": "texto", "ancho": "44px"}, {"key": "idea", "label": "Idea", "tipo": "texto"}, {"key": "referente", "label": "Referente", "tipo": "texto"}, {"key": "formato", "label": "Formato", "tipo": "texto"}, {"key": "pilar", "label": "Pilar", "tipo": "texto"}, {"key": "angulo", "label": "Ángulo", "tipo": "texto"}, {"key": "uso", "label": "Uso", "tipo": "select", "opciones": ["Orgánico", "Pauta", "Orgánico + pauta"]}, {"key": "prioridad", "label": "Prioridad", "tipo": "select", "opciones": ["Alta", "Media", "Baja"]}, {"key": "estado", "label": "Estado", "tipo": "select", "opciones": ["Idea", "En parrilla", "Grabada", "Publicada"]}]'::jsonb,
    '[{"id": "idea_1", "num": "1", "idea": "Serie ''Se diseña aquí'': del escáner a la cerámica terminada", "referente": "Pereira, Kharma", "formato": "Película de procedimiento", "pilar": "Hecho en Lumia", "angulo": "Proceso y oficio", "uso": "Orgánico", "prioridad": "Alta", "estado": "Idea"}, {"id": "idea_2", "num": "2", "idea": "Carillas sin desgaste: mito y verdad (Dr. Alejo)", "referente": "Vince, Viviana Giraldo", "formato": "Autoridad", "pilar": "Criterio del Dr. Alejo", "angulo": "Mito vs. realidad", "uso": "Orgánico + pauta", "prioridad": "Alta", "estado": "Idea"}, {"id": "idea_3", "num": "3", "idea": "Un implante barato puede salir caro: lo que no ves", "referente": "Vince", "formato": "Autoridad", "pilar": "Criterio del Dr. Alejo", "angulo": "Objeción de precio", "uso": "Pauta", "prioridad": "Alta", "estado": "Idea"}, {"id": "idea_4", "num": "4", "idea": "Transformación en tableta con reacción", "referente": "Bedier", "formato": "Transformación en tableta", "pilar": "Pacientes reales", "angulo": "Transformación", "uso": "Pauta", "prioridad": "Alta", "estado": "Idea"}, {"id": "idea_5", "num": "5", "idea": "Así es tu primera valoración en Lumia", "referente": "Dental Beauty", "formato": "POV paso a paso", "pilar": "Experiencia Lumia", "angulo": "Miedo o vergüenza", "uso": "Pauta", "prioridad": "Alta", "estado": "Idea"}, {"id": "idea_6", "num": "6", "idea": "Testimonio: ''lo que más miedo me daba era…''", "referente": "María Velásquez", "formato": "Testimonio", "pilar": "Pacientes reales", "angulo": "Testimonio", "uso": "Orgánico + pauta", "prioridad": "Alta", "estado": "Idea"}, {"id": "idea_7", "num": "7", "idea": "Qué incluye un diseño de sonrisa y por qué los precios varían tanto", "referente": "María Velásquez, Dental Beauty", "formato": "Autoridad", "pilar": "Criterio del Dr. Alejo", "angulo": "Objeción de precio", "uso": "Orgánico", "prioridad": "Media", "estado": "Idea"}, {"id": "idea_8", "num": "8", "idea": "Conoce a nuestro ceramista (equipo elegido a mano)", "referente": "Apa", "formato": "Mini documental", "pilar": "Hecho en Lumia", "angulo": "Equipo y talento", "uso": "Orgánico", "prioridad": "Media", "estado": "Idea"}, {"id": "idea_9", "num": "9", "idea": "Turismo dental: un paciente de afuera, de principio a fin", "referente": "Apa (documental)", "formato": "Mini documental", "pilar": "Experiencia Lumia", "angulo": "Turismo dental", "uso": "Orgánico + pauta", "prioridad": "Media", "estado": "Idea"}, {"id": "idea_10", "num": "10", "idea": "Me caso en 3 semanas: ¿alcanzo?", "referente": "Ninguno (hueco)", "formato": "Autoridad + caso", "pilar": "Pacientes reales", "angulo": "Fecha límite", "uso": "Pauta", "prioridad": "Media", "estado": "Idea"}, {"id": "idea_11", "num": "11", "idea": "Las 3 preguntas antes de hacerte un diseño de sonrisa", "referente": "Apa", "formato": "Autoridad", "pilar": "Criterio del Dr. Alejo", "angulo": "Educación al paciente", "uso": "Orgánico", "prioridad": "Media", "estado": "Idea"}, {"id": "idea_12", "num": "12", "idea": "Ve tu sonrisa antes de empezar (diseño digital en pantalla)", "referente": "Dental Beauty, Vince", "formato": "Demostración", "pilar": "Hecho en Lumia", "angulo": "Tecnología", "uso": "Pauta", "prioridad": "Media", "estado": "Idea"}, {"id": "idea_13", "num": "13", "idea": "Caso de rehabilitación en 3 frases (problema → decisión → resultado)", "referente": "Pereira", "formato": "Caso explicado", "pilar": "Criterio del Dr. Alejo", "angulo": "Autoridad", "uso": "Orgánico", "prioridad": "Baja", "estado": "Idea"}]'::jsonb,
    1
  where not exists (
    select 1 from portal_hojas where tenant_id = v_tenant_id and titulo = 'Banco de Ideas'
  );
  insert into portal_hojas (tenant_id, titulo, tipo, descripcion, visible_cliente, columnas, filas, orden)
  select
    v_tenant_id,
    'Benchmarking Competitivo',
    'benchmarking',
    'Referentes aspiracionales internacionales y competencia local en Manizales frente a la línea base de Lumia.',
    true,
    '[{"key": "cuenta", "label": "Cuenta", "tipo": "texto"}, {"key": "nombre", "label": "Nombre", "tipo": "texto"}, {"key": "nivel", "label": "Nivel", "tipo": "select", "opciones": ["Aspiracional internacional", "Referente de formato", "Competencia local", "Línea base (nuestro cliente)"]}, {"key": "seguidores", "label": "Seguidores", "tipo": "numero"}, {"key": "formato", "label": "Formato principal", "tipo": "texto"}, {"key": "puntaje", "label": "Puntaje", "tipo": "puntaje"}, {"key": "leccion", "label": "Lección para Lumia", "tipo": "texto"}]'::jsonb,
    '[{"id": "bench_1", "cuenta": "@drcarlospereira", "nombre": "Dr. Carlos Pereira", "nivel": "Aspiracional internacional", "seguidores": "1000000", "formato": "Película de procedimiento sin voz", "puntaje": "4.67", "leccion": "La película de procedimiento para la serie ''Se diseña aquí''. La estructura del caso en 3 frases para implantes y rehabilitación. Una firma visual propia (Lumia: dorado + firma del Dr. Alejo)."}, {"id": "bench_2", "cuenta": "@doctorapa", "nombre": "Michael Apa", "nivel": "Aspiracional internacional", "seguidores": "649000", "formato": "Entrevista de opinión", "puntaje": "4.17", "leccion": "El Dr. Alejo como voz de criterio. Presentar a los ceramistas y al equipo con la lógica de Apa. Educar al paciente para elegir bien."}, {"id": "bench_3", "cuenta": "@doctor.vince", "nombre": "Dr. Vince Avallone", "nivel": "Aspiracional internacional", "seguidores": "8466", "formato": "Autoridad que desmitifica", "puntaje": "4", "leccion": "El formato exacto para la serie del Dr. Alejo: gancho de mito, explicación con analogía y cierre que diferencia. Caja de subtítulos en el color de la marca (dorado)."}, {"id": "bench_4", "cuenta": "@orthosmileclinics", "nombre": "Dr. Joe Kharma (Orthosmile)", "nivel": "Aspiracional internacional", "seguidores": "125000", "formato": "Película de marca sin voz", "puntaje": "3.33", "leccion": "La idea de superponer gráficos técnicos sobre la cerámica y el escáner para ''Se diseña aquí''."}, {"id": "bench_5", "cuenta": "@dr.haytham_bedier", "nombre": "Dr. Haytham Bedier", "nivel": "Referente de formato", "seguidores": "613", "formato": "Transformación en tableta", "puntaje": "3", "leccion": "El formato completo para pauta y alcance, con pacientes propios y consentimiento firmado."}, {"id": "bench_6", "cuenta": "@odontologialasermanizales", "nombre": "Artek Odontología Láser Manizales", "nivel": "Competencia local", "seguidores": "15000", "formato": "Anuncio de dolor + beneficios", "puntaje": "4", "leccion": "La claridad del dolor en el gancho. El CTA por palabra clave (''Escribe SONRISA'')."}, {"id": "bench_7", "cuenta": "@vivianagrodontologa", "nombre": "Dra. Viviana Giraldo Raigosa", "nivel": "Competencia local", "seguidores": "14000", "formato": "Anuncio educativo", "puntaje": "3.67", "leccion": "Es la competidora directa en discurso premium. Lumia debe ir un paso más allá: ceramistas propios y criterio del Dr. Alejo (diseño + fabricación en casa)."}, {"id": "bench_8", "cuenta": "Por confirmar", "nombre": "Dra. María G. Velásquez", "nivel": "Competencia local", "seguidores": "", "formato": "Testimonio + promoción", "puntaje": "3.67", "leccion": "El testimonio como primer paso. Entender que el paciente compara contra $699.000: Lumia debe explicar qué incluye un diseño de verdad, sin atacar a nadie."}, {"id": "bench_9", "cuenta": "Por confirmar", "nombre": "Dental Beauty", "nivel": "Competencia local", "seguidores": "", "formato": "Anuncio de embudo", "puntaje": "4", "leccion": "La idea de mostrar la simulación antes de empezar (Lumia tiene diseño digital). Precios de referencia publicados pueden filtrar mejor a los pacientes."}, {"id": "bench_10", "cuenta": "@lumiaodontologia", "nombre": "Lumia Odontología Especializada", "nivel": "Línea base (nuestro cliente)", "seguidores": "8438", "formato": "Video de procedimiento / resultado", "puntaje": "2.5", "leccion": "Huecos que puede tomar: turismo dental, fecha límite, objeción de precio, equipo y ceramistas, criterio del doctor."}]'::jsonb,
    2
  where not exists (
    select 1 from portal_hojas where tenant_id = v_tenant_id and titulo = 'Benchmarking Competitivo'
  );
  insert into portal_hojas (tenant_id, titulo, tipo, descripcion, visible_cliente, columnas, filas, orden)
  select
    v_tenant_id,
    'Matriz de Ángulos',
    'matriz',
    'Qué ángulos usa cada referente/competidor y dónde están los huecos sin explotar en Manizales.',
    true,
    '[{"key": "angulo", "label": "Ángulo", "tipo": "texto"}, {"key": "pereira", "label": "Pereira", "tipo": "texto", "ancho": "70px"}, {"key": "apa", "label": "Apa", "tipo": "texto", "ancho": "62px"}, {"key": "vince", "label": "Vince", "tipo": "texto", "ancho": "66px"}, {"key": "kharma", "label": "Kharma", "tipo": "texto", "ancho": "70px"}, {"key": "artek", "label": "Artek", "tipo": "texto", "ancho": "66px"}, {"key": "viviana", "label": "V. Giraldo", "tipo": "texto", "ancho": "82px"}, {"key": "dental", "label": "D. Beauty", "tipo": "texto", "ancho": "82px"}, {"key": "lumia", "label": "Lumia hoy", "tipo": "texto", "ancho": "82px"}, {"key": "cuentas", "label": "Total", "tipo": "numero", "ancho": "60px"}, {"key": "para_lumia", "label": "Para Lumia", "tipo": "oportunidad"}]'::jsonb,
    '[{"id": "mat_1", "angulo": "Autoridad / opinión del doctor", "pereira": "Sí", "apa": "Sí", "vince": "Sí", "kharma": "", "artek": "", "viviana": "", "dental": "", "lumia": "Sí", "cuentas": "3", "para_lumia": ""}, {"id": "mat_2", "angulo": "Mito vs. realidad", "pereira": "", "apa": "", "vince": "Sí", "kharma": "", "artek": "", "viviana": "Sí", "dental": "", "lumia": "", "cuentas": "2", "para_lumia": ""}, {"id": "mat_3", "angulo": "Proceso y oficio (detrás de cámaras)", "pereira": "Sí", "apa": "Sí", "vince": "Sí", "kharma": "Sí", "artek": "", "viviana": "", "dental": "", "lumia": "", "cuentas": "4", "para_lumia": ""}, {"id": "mat_4", "angulo": "Tecnología (escáner, diseño digital, láser)", "pereira": "Sí", "apa": "", "vince": "Sí", "kharma": "Sí", "artek": "Sí", "viviana": "Sí", "dental": "Sí", "lumia": "", "cuentas": "6", "para_lumia": ""}, {"id": "mat_5", "angulo": "Transformación (antes / después)", "pereira": "Sí", "apa": "", "vince": "", "kharma": "", "artek": "", "viviana": "", "dental": "", "lumia": "Sí", "cuentas": "2", "para_lumia": ""}, {"id": "mat_6", "angulo": "Testimonio de paciente", "pereira": "", "apa": "", "vince": "", "kharma": "", "artek": "", "viviana": "", "dental": "", "lumia": "", "cuentas": "1", "para_lumia": "Oportunidad"}, {"id": "mat_7", "angulo": "Precio u oferta", "pereira": "", "apa": "", "vince": "", "kharma": "", "artek": "", "viviana": "Sí", "dental": "Sí", "lumia": "Sí", "cuentas": "3", "para_lumia": ""}, {"id": "mat_8", "angulo": "Objeción de precio (valor vs. barato)", "pereira": "", "apa": "", "vince": "", "kharma": "", "artek": "", "viviana": "", "dental": "", "lumia": "", "cuentas": "0", "para_lumia": "Oportunidad"}, {"id": "mat_9", "angulo": "Miedo o vergüenza", "pereira": "", "apa": "", "vince": "", "kharma": "", "artek": "Sí", "viviana": "Sí", "dental": "Sí", "lumia": "", "cuentas": "3", "para_lumia": ""}, {"id": "mat_10", "angulo": "Fecha límite (boda, viaje, evento)", "pereira": "", "apa": "", "vince": "", "kharma": "", "artek": "", "viviana": "", "dental": "", "lumia": "", "cuentas": "0", "para_lumia": "Oportunidad"}, {"id": "mat_11", "angulo": "Turismo dental", "pereira": "", "apa": "", "vince": "", "kharma": "", "artek": "", "viviana": "", "dental": "", "lumia": "", "cuentas": "0", "para_lumia": "Oportunidad"}, {"id": "mat_12", "angulo": "Equipo y talento", "pereira": "", "apa": "Sí", "vince": "Sí", "kharma": "", "artek": "", "viviana": "", "dental": "", "lumia": "", "cuentas": "2", "para_lumia": ""}, {"id": "mat_13", "angulo": "Estilo de vida / lujo", "pereira": "Sí", "apa": "Sí", "vince": "", "kharma": "Sí", "artek": "", "viviana": "", "dental": "", "lumia": "", "cuentas": "3", "para_lumia": ""}, {"id": "mat_14", "angulo": "Educación al paciente (cómo elegir)", "pereira": "", "apa": "Sí", "vince": "Sí", "kharma": "", "artek": "Sí", "viviana": "Sí", "dental": "", "lumia": "", "cuentas": "4", "para_lumia": ""}, {"id": "mat_15", "angulo": "Urgencia o cupos", "pereira": "", "apa": "", "vince": "", "kharma": "", "artek": "", "viviana": "", "dental": "Sí", "lumia": "", "cuentas": "2", "para_lumia": ""}]'::jsonb,
    3
  where not exists (
    select 1 from portal_hojas where tenant_id = v_tenant_id and titulo = 'Matriz de Ángulos'
  );
  insert into portal_hojas (tenant_id, titulo, tipo, descripcion, visible_cliente, columnas, filas, orden)
  select
    v_tenant_id,
    'Lista de Tomas · Black Week',
    'tomas',
    'Sáb 21 nov, 12:30–4:10 p. m., clínica cerrada · 2 cámaras · 4K 24 fps. Marca cada toma en el set.',
    false,
    '[{"key": "codigo", "label": "#", "tipo": "texto", "ancho": "62px"}, {"key": "bloque", "label": "Bloque", "tipo": "texto"}, {"key": "toma", "label": "Toma", "tipo": "texto"}, {"key": "pieza", "label": "Pieza", "tipo": "texto", "ancho": "88px"}, {"key": "prioridad", "label": "Prio.", "tipo": "select", "opciones": ["E", "O"], "ancho": "70px"}, {"key": "hecho", "label": "Hecho", "tipo": "check", "ancho": "72px"}, {"key": "notas", "label": "Notas en el set", "tipo": "texto"}]'::jsonb,
    '[{"id": "bwt_1", "codigo": "A01", "bloque": "A · Entrevista pauta (12:30–1:30)", "toma": "P1 cuerpo completo, 2 tomas (A en PM, B en PP perfil)", "pieza": "P1", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_2", "codigo": "A02", "bloque": "A · Entrevista pauta (12:30–1:30)", "toma": "P1: 3 ganchos mirando al lente", "pieza": "P1", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_3", "codigo": "A03", "bloque": "A · Entrevista pauta (12:30–1:30)", "toma": "P3 cuerpo completo, 2 tomas", "pieza": "P3", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_4", "codigo": "A04", "bloque": "A · Entrevista pauta (12:30–1:30)", "toma": "P3: 3 ganchos mirando al lente", "pieza": "P3", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_5", "codigo": "A05", "bloque": "A · Entrevista pauta (12:30–1:30)", "toma": "P5 en español: cuerpo + 2 ganchos", "pieza": "P5", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_6", "codigo": "A06", "bloque": "A · Entrevista pauta (12:30–1:30)", "toma": "P5 en inglés: gancho + cuerpo", "pieza": "P5", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "bwt_7", "codigo": "A07", "bloque": "A · Entrevista pauta (12:30–1:30)", "toma": "Los 6 cierres diarios seguidos", "pieza": "Cierres", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_8", "codigo": "A08", "bloque": "A · Entrevista pauta (12:30–1:30)", "toma": "Respuestas cortas para historias (3 preguntas frecuentes)", "pieza": "Historias", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "bwt_9", "codigo": "A09", "bloque": "A · Entrevista pauta (12:30–1:30)", "toma": "B-roll: modelo de implante en la mano, tomografía en pantalla", "pieza": "P3", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_10", "codigo": "B01", "bloque": "B · Paciente (1:30–2:00)", "toma": "Tableta caso 1: antes → después → reacción del doctor", "pieza": "P2", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_11", "codigo": "B02", "bloque": "B · Paciente (1:30–2:00)", "toma": "Tableta casos 2 y 3", "pieza": "P2", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "bwt_12", "codigo": "B03", "bloque": "B · Paciente (1:30–2:00)", "toma": "Testimonio del paciente (4 preguntas)", "pieza": "P6", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "bwt_13", "codigo": "C01", "bloque": "C · Cine clave baja (2:00–3:30)", "toma": "Haz de luz encendiéndose sobre negro (3 versiones)", "pieza": "R1", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_14", "codigo": "C02", "bloque": "C · Cine clave baja (2:00–3:30)", "toma": "Bandeja de instrumentos, cenital, con el haz recorriéndola", "pieza": "R1", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_15", "codigo": "C03", "bloque": "C · Cine clave baja (2:00–3:30)", "toma": "Carilla en contraluz, macro", "pieza": "R1", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_16", "codigo": "C04", "bloque": "C · Cine clave baja (2:00–3:30)", "toma": "Manos del Dr. Alejo con guantes, 120 fps", "pieza": "R1", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_17", "codigo": "C05", "bloque": "C · Cine clave baja (2:00–3:30)", "toma": "Pantalla del diseño con la cara del doctor iluminada por ella", "pieza": "R1 / P1", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_18", "codigo": "C06", "bloque": "C · Cine clave baja (2:00–3:30)", "toma": "Sonrisa de paciente de sombra a luz (con consentimiento)", "pieza": "R1", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "bwt_19", "codigo": "C07", "bloque": "C · Cine clave baja (2:00–3:30)", "toma": "Escáner intraoral entrando a cuadro", "pieza": "R2 / P4", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_20", "codigo": "C08", "bloque": "C · Cine clave baja (2:00–3:30)", "toma": "Modelo 3D girando en pantalla", "pieza": "R2 / P4", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_21", "codigo": "C09", "bloque": "C · Cine clave baja (2:00–3:30)", "toma": "Dr. Alejo y ceramista de perfil frente a la pantalla", "pieza": "R2", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_22", "codigo": "C10", "bloque": "C · Cine clave baja (2:00–3:30)", "toma": "Pincel cargando polvo y capas sobre la pieza (macro, 120 fps)", "pieza": "R3", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_23", "codigo": "C11", "bloque": "C · Cine clave baja (2:00–3:30)", "toma": "Ojo del ceramista detrás de la lupa", "pieza": "R3", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "bwt_24", "codigo": "C12", "bloque": "C · Cine clave baja (2:00–3:30)", "toma": "Guía de tonos junto a la pieza", "pieza": "R3", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_25", "codigo": "C13", "bloque": "C · Cine clave baja (2:00–3:30)", "toma": "Polvo cayendo a contraluz", "pieza": "R3", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "bwt_26", "codigo": "C14", "bloque": "C · Cine clave baja (2:00–3:30)", "toma": "Horno abriéndose y pieza entrando", "pieza": "R2", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_27", "codigo": "C15", "bloque": "C · Cine clave baja (2:00–3:30)", "toma": "Pieza terminada sobre terciopelo negro", "pieza": "R2 / P4", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_28", "codigo": "C16", "bloque": "C · Cine clave baja (2:00–3:30)", "toma": "Dr. Alejo llegando, poniéndose la bata, en la ventana con la ciudad", "pieza": "R4", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_29", "codigo": "C17", "bloque": "C · Cine clave baja (2:00–3:30)", "toma": "Voz en off de R1 y R4 (3 lecturas cada una, en silencio)", "pieza": "R1 / R4", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_30", "codigo": "D01", "bloque": "D · Equipo y tablero (3:30–3:50)", "toma": "Tablero de cupos en recepción", "pieza": "Historias", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_31", "codigo": "D02", "bloque": "D · Equipo y tablero (3:30–3:50)", "toma": "Equipo trabajando, recepción, detalles de marca", "pieza": "Historias", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "bwt_32", "codigo": "E01", "bloque": "E · Fotos (3:50–4:10)", "toma": "Retrato del Dr. Alejo en clave baja", "pieza": "C1", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_33", "codigo": "E02", "bloque": "E · Fotos (3:50–4:10)", "toma": "Retratos del equipo", "pieza": "C1", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "bwt_34", "codigo": "E03", "bloque": "E · Fotos (3:50–4:10)", "toma": "Dr. Alejo con el ceramista", "pieza": "C1", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "bwt_35", "codigo": "E04", "bloque": "E · Fotos (3:50–4:10)", "toma": "Detalles de cerámica e instrumentos", "pieza": "C2", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "bwt_36", "codigo": "E05", "bloque": "E · Fotos (3:50–4:10)", "toma": "Guía de tonos y pieza terminada", "pieza": "C2", "prioridad": "O", "hecho": false, "notas": ""}]'::jsonb,
    4
  where not exists (
    select 1 from portal_hojas where tenant_id = v_tenant_id and titulo = 'Lista de Tomas · Black Week'
  );
  insert into portal_hojas (tenant_id, titulo, tipo, descripcion, visible_cliente, columnas, filas, orden)
  select
    v_tenant_id,
    'Lista de Tomas · Jornada 1',
    'tomas',
    'Plan de rodaje de Jornada 1 · 2 cámaras · 4K 24 fps (lentas a 60 fps).',
    false,
    '[{"key": "codigo", "label": "#", "tipo": "texto", "ancho": "62px"}, {"key": "bloque", "label": "Bloque", "tipo": "texto"}, {"key": "toma", "label": "Toma", "tipo": "texto"}, {"key": "pieza", "label": "Reel", "tipo": "texto", "ancho": "110px"}, {"key": "prioridad", "label": "Prio.", "tipo": "select", "opciones": ["E", "O"], "ancho": "70px"}, {"key": "hecho", "label": "Hecho", "tipo": "check", "ancho": "72px"}, {"key": "notas", "label": "Notas en el set", "tipo": "texto"}]'::jsonb,
    '[{"id": "j1t_1", "codigo": "A01", "bloque": "A · Dr. Alejo (75 min)", "toma": "Respuesta en entrevista sobre carillas (A en PM, B en PP perfil)", "pieza": "Carillas", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_2", "codigo": "A02", "bloque": "A · Dr. Alejo (75 min)", "toma": "3 ganchos de carillas, mirando al lente", "pieza": "Carillas / pauta", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_3", "codigo": "A03", "bloque": "A · Dr. Alejo (75 min)", "toma": "Respuesta en entrevista sobre implantes", "pieza": "Implante", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_4", "codigo": "A04", "bloque": "A · Dr. Alejo (75 min)", "toma": "3 ganchos de implante, mirando al lente", "pieza": "Implante / pauta", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_5", "codigo": "A05", "bloque": "A · Dr. Alejo (75 min)", "toma": "Historia desde 2008, ceramistas propios, pacientes de afuera (entrevista)", "pieza": "Esto es Lumia", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_6", "codigo": "A06", "bloque": "A · Dr. Alejo (75 min)", "toma": "Cierre \"Esto es Lumia\", mirando al lente", "pieza": "Esto es Lumia", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_7", "codigo": "A07", "bloque": "A · Dr. Alejo (75 min)", "toma": "3 ganchos de valoración, mirando al lente", "pieza": "Valoración / pauta", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_8", "codigo": "A08", "bloque": "A · Dr. Alejo (75 min)", "toma": "Respuesta en entrevista sobre precios", "pieza": "Precios (reserva)", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_9", "codigo": "A09", "bloque": "A · Dr. Alejo (75 min)", "toma": "Gancho de precios, mirando al lente", "pieza": "Precios", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "j1t_10", "codigo": "A10", "bloque": "A · Dr. Alejo (75 min)", "toma": "Manos del doctor con el modelo de cerámica (PP, 60 fps)", "pieza": "Varios", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_11", "codigo": "A11", "bloque": "A · Dr. Alejo (75 min)", "toma": "El doctor revisa la tomografía en pantalla (sobre el hombro)", "pieza": "Implante", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_12", "codigo": "A12", "bloque": "A · Dr. Alejo (75 min)", "toma": "Implante o maqueta en la mano (PPP)", "pieza": "Implante", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_13", "codigo": "A13", "bloque": "A · Dr. Alejo (75 min)", "toma": "El doctor entra y se sienta en el set (PM)", "pieza": "Esto es Lumia", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "j1t_14", "codigo": "A14", "bloque": "A · Dr. Alejo (75 min)", "toma": "10 s de silencio del set", "pieza": "Audio", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_15", "codigo": "B01", "bloque": "B · Tableta (30 min)", "toma": "Plano fijo: tableta con el antes, doctor detrás, transición al después y reacción. Paciente 1", "pieza": "Tableta", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_16", "codigo": "B02", "bloque": "B · Tableta (30 min)", "toma": "Misma toma con paciente 2 u otro encuadre", "pieza": "Tableta", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_17", "codigo": "B03", "bloque": "B · Tableta (30 min)", "toma": "El paciente se mira al espejo y sonríe (PP, cámara B)", "pieza": "Tableta / Se diseña aquí", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_18", "codigo": "B04", "bloque": "B · Tableta (30 min)", "toma": "Doctor y paciente conversan y ríen (PM)", "pieza": "Esto es Lumia", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "j1t_19", "codigo": "B05", "bloque": "B · Tableta (30 min)", "toma": "Manos firmando el consentimiento, sin datos visibles", "pieza": "Confianza", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "j1t_20", "codigo": "C01", "bloque": "C · Valoración (40 min)", "toma": "Llegada al CC Fundadores y entrada al local (cámara en mano)", "pieza": "Valoración", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_21", "codigo": "C02", "bloque": "C · Valoración (40 min)", "toma": "Recepción: saludo y café (PM)", "pieza": "Valoración", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_22", "codigo": "C03", "bloque": "C · Valoración (40 min)", "toma": "Fotos clínicas del paciente (PP)", "pieza": "Valoración", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_23", "codigo": "C04", "bloque": "C · Valoración (40 min)", "toma": "Escáner intraoral (PPP, 60 fps)", "pieza": "Valoración / Se diseña aquí", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_24", "codigo": "C05", "bloque": "C · Valoración (40 min)", "toma": "El doctor le muestra su diseño en pantalla (sobre el hombro)", "pieza": "Valoración", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_25", "codigo": "C06", "bloque": "C · Valoración (40 min)", "toma": "Reacción del paciente al ver su diseño (PP, cámara B)", "pieza": "Valoración", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_26", "codigo": "C07", "bloque": "C · Valoración (40 min)", "toma": "Explicación del plan (PM, sin mostrar precios)", "pieza": "Valoración", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_27", "codigo": "C08", "bloque": "C · Valoración (40 min)", "toma": "Despedida y salida (PM)", "pieza": "Valoración", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_28", "codigo": "C09", "bloque": "C · Valoración (40 min)", "toma": "Sala de espera y detalles (PP)", "pieza": "Valoración", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "j1t_29", "codigo": "C10", "bloque": "C · Valoración (40 min)", "toma": "Versión POV con celular en gimbal", "pieza": "Valoración", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "j1t_30", "codigo": "D01", "bloque": "D · Laboratorio (45 min)", "toma": "Entrevista corta al ceramista, 3 preguntas (A en PM, B en PP)", "pieza": "Ceramista (reserva)", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_31", "codigo": "D02", "bloque": "D · Laboratorio (45 min)", "toma": "Manos con pincel aplicando cerámica (PPP, 60 fps)", "pieza": "Se diseña aquí", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_32", "codigo": "D03", "bloque": "D · Laboratorio (45 min)", "toma": "Pieza a contraluz (PPP)", "pieza": "Se diseña aquí", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_33", "codigo": "D04", "bloque": "D · Laboratorio (45 min)", "toma": "El horno abre y cierra (PP)", "pieza": "Se diseña aquí", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_34", "codigo": "D05", "bloque": "D · Laboratorio (45 min)", "toma": "Ceramista de perfil, concentrado, luz lateral (PP)", "pieza": "Ceramista", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_35", "codigo": "D06", "bloque": "D · Laboratorio (45 min)", "toma": "Doctor y ceramista revisan la pieza juntos (PM)", "pieza": "Se diseña aquí / Esto es Lumia", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_36", "codigo": "D07", "bloque": "D · Laboratorio (45 min)", "toma": "Pieza terminada en la palma de la mano (PPP)", "pieza": "Se diseña aquí", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_37", "codigo": "D08", "bloque": "D · Laboratorio (45 min)", "toma": "Modelo o impresión 3D (PPP)", "pieza": "Se diseña aquí", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "j1t_38", "codigo": "D09", "bloque": "D · Laboratorio (45 min)", "toma": "Pantalla de diseño digital, sin datos (PP)", "pieza": "Se diseña aquí", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "j1t_39", "codigo": "D10", "bloque": "D · Laboratorio (45 min)", "toma": "10 s de silencio del laboratorio", "pieza": "Audio", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_40", "codigo": "E01", "bloque": "E · Lumia empresa (30 min)", "toma": "Fachada y letrero de Lumia en CC Fundadores (PG)", "pieza": "Esto es Lumia", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_41", "codigo": "E02", "bloque": "E · Lumia empresa (30 min)", "toma": "Logo en la pared, movimiento lento (PP)", "pieza": "Esto es Lumia / cierre", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_42", "codigo": "E03", "bloque": "E · Lumia empresa (30 min)", "toma": "Recepción con el equipo (PM)", "pieza": "Esto es Lumia", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_43", "codigo": "E04", "bloque": "E · Lumia empresa (30 min)", "toma": "Equipo trabajando, sin pacientes reconocibles (PM)", "pieza": "Esto es Lumia", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_44", "codigo": "E05", "bloque": "E · Lumia empresa (30 min)", "toma": "Pasillos y consultorios vacíos, con movimiento (PG)", "pieza": "Esto es Lumia", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_45", "codigo": "E06", "bloque": "E · Lumia empresa (30 min)", "toma": "Retrato grupal del equipo, foto y video", "pieza": "Esto es Lumia / carrusel", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_46", "codigo": "E07", "bloque": "E · Lumia empresa (30 min)", "toma": "Retratos del Dr. Alejo (foto)", "pieza": "Carruseles", "prioridad": "E", "hecho": false, "notas": ""}, {"id": "j1t_47", "codigo": "E08", "bloque": "E · Lumia empresa (30 min)", "toma": "Retratos individuales del equipo (foto)", "pieza": "Carruseles", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "j1t_48", "codigo": "E09", "bloque": "E · Lumia empresa (30 min)", "toma": "Detalles de marca: instrumentos ordenados, uniformes (PPP)", "pieza": "Varios", "prioridad": "O", "hecho": false, "notas": ""}, {"id": "j1t_50", "codigo": "", "bloque": "Externa", "toma": "Cementado de carillas", "pieza": "", "prioridad": "", "hecho": false, "notas": ""}, {"id": "j1t_51", "codigo": "", "bloque": "Externa", "toma": "Cirugía de implante, con consentimiento y sin sangre en primer plano", "pieza": "", "prioridad": "", "hecho": false, "notas": ""}, {"id": "j1t_52", "codigo": "", "bloque": "Externa", "toma": "Blanqueamiento", "pieza": "", "prioridad": "", "hecho": false, "notas": ""}, {"id": "j1t_53", "codigo": "", "bloque": "Externa", "toma": "Instrumentos en macro", "pieza": "", "prioridad": "", "hecho": false, "notas": ""}, {"id": "j1t_54", "codigo": "", "bloque": "Externa", "toma": "Ciclo completo del horno", "pieza": "", "prioridad": "", "hecho": false, "notas": ""}, {"id": "j1t_55", "codigo": "", "bloque": "Externa", "toma": "Time-lapse del ceramista", "pieza": "", "prioridad": "", "hecho": false, "notas": ""}, {"id": "j1t_56", "codigo": "", "bloque": "Externa", "toma": "Planos de Manizales para turismo dental", "pieza": "", "prioridad": "", "hecho": false, "notas": ""}]'::jsonb,
    5
  where not exists (
    select 1 from portal_hojas where tenant_id = v_tenant_id and titulo = 'Lista de Tomas · Jornada 1'
  );
end $$;

-- Verificación rápida:
--   select id, nombre, slug, subdominio, logo_url, color_acento from tenants where slug = 'lumia';
--   select titulo, tipo, visible_cliente, jsonb_array_length(filas) as filas from portal_hojas where tenant_id = (select id from tenants where slug = 'lumia') order by orden;
--   select campana, count(*) from portal_contenido where tenant_id = (select id from tenants where slug = 'lumia') group by 1;
