import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/portal/automatizaciones
// Vista de solo lectura para el Portal de Cliente.
// El tenant sale SIEMPRE de la sesión (rpc("tenant_actual")), nunca de la URL.
export async function GET() {
  const supabase = await createClient();
  const { data: tenantActual, error: tenantErr } = await supabase.rpc("tenant_actual");

  if (tenantErr || !tenantActual) {
    return Response.json({ error: "No autorizado o sin tenant asignado" }, { status: 401 });
  }

  const tenantId = tenantActual;
  const admin = createAdminClient();

  // 1. Obtener conexiones de Meta vinculadas a este tenant
  const { data: vinculos } = await admin
    .from("portal_meta_conexiones")
    .select("conexion_id")
    .eq("tenant_id", tenantId);

  const conexionIds = (vinculos ?? []).map((v) => v.conexion_id);

  // 2. Flujos activos del tenant
  let flujosQuery = admin
    .from("ig_flujos")
    .select("id, nombre, palabras_clave, aplica_a, respuesta_privada, respuesta_publica, botones, activo, creado_en")
    .eq("activo", true);

  if (conexionIds.length > 0) {
    flujosQuery = flujosQuery.or(`tenant_id.eq.${tenantId},conexion_id.in.(${conexionIds.join(",")})`);
  } else {
    flujosQuery = flujosQuery.eq("tenant_id", tenantId);
  }

  const { data: flujos } = await flujosQuery;

  // 3. Métricas agregadas de los últimos 30 días
  const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: acciones } = await admin
    .from("ig_acciones")
    .select("resultado, tipo_accion, flujo_id")
    .eq("tenant_id", tenantId)
    .gte("ejecutado_en", hace30dias);

  const totalAtendidos = (acciones ?? []).filter((a) => a.resultado === "exito").length;

  const { data: links } = await admin
    .from("ig_links_tracking")
    .select("id, titulo, url_destino, clics_count")
    .eq("tenant_id", tenantId);

  const totalClics = (links ?? []).reduce((s, l) => s + (l.clics_count ?? 0), 0);

  const mejorFlujo = (flujos ?? [])[0];
  const palabraClavePrincipal = mejorFlujo?.palabras_clave[0] ?? "CITA";

  const resumenHumano =
    totalAtendidos > 0
      ? `Este mes tus automatizaciones atendieron a ${totalAtendidos} personas en Instagram, ${totalClics} hicieron clic en tus enlaces y tu palabra más efectiva fue "${palabraClavePrincipal}".`
      : `Tus automatizaciones están activas y responderán de forma inmediata a los usuarios que comenten tus publicaciones o te escriban por mensaje directo.`;

  return Response.json({
    resumenHumano,
    flujos: flujos ?? [],
    metricas: {
      totalAtendidos,
      totalClics,
      flujosActivos: (flujos ?? []).length,
    },
    links: links ?? [],
  });
}
