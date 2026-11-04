import { createAdminClient } from "@/lib/supabase/admin";
import { auditarAgente, tokenDePortal } from "@/lib/bandeja/tokenAgente";
import { bodyValido } from "@/lib/api/validarBody";
import {
  crearFlujoSchema,
  enlacesConClics,
  errorDeChoquePalabras,
  errorDeLargoDm,
  resolverConexion,
} from "@/lib/agente/flujos";
import { conexionesInstagramDelPortal, flujosActivosDeConexion } from "@/lib/agente/flujosDatos";

// GET /api/agente/flujos
// Flujos automáticos del portal y clics de sus enlaces.
export async function GET(request: Request) {
  const auth = await tokenDePortal(request);
  if (auth instanceof Response) return auth;

  const admin = createAdminClient();
  const { data: vinculos } = await admin
    .from("portal_meta_conexiones")
    .select("conexion_id")
    .eq("tenant_id", auth.tenantId);
  const conexionIds = (vinculos ?? []).map((v) => v.conexion_id);

  let consulta = admin
    .from("ig_flujos")
    .select("id, conexion_id, nombre, palabras_clave, aplica_a, respuesta_privada, respuesta_publica, botones, activo, creado_en, actualizado_en");
  consulta = conexionIds.length
    ? consulta.or(`tenant_id.eq.${auth.tenantId},conexion_id.in.(${conexionIds.join(",")})`)
    : consulta.eq("tenant_id", auth.tenantId);

  const { data: flujos, error } = await consulta;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Por flujo y no por tenant: los links de flujos creados en la bandeja tienen tenant_id null.
  const flujoIds = (flujos ?? []).map((f) => f.id);
  const { data: links } = flujoIds.length
    ? await admin
        .from("ig_links_tracking")
        .select("id, flujo_id, titulo, url_destino, clics_count, por_envio")
        .in("flujo_id", flujoIds)
        .or("por_envio.eq.false,clics_count.gt.0")
    : { data: [] };

  return Response.json({ flujos: flujos ?? [], enlaces: enlacesConClics(links ?? []) });
}

// POST /api/agente/flujos
// Sin DELETE a propósito: borrar un flujo queda para una persona.
export async function POST(request: Request) {
  const auth = await tokenDePortal(request, true);
  if (auth instanceof Response) return auth;

  const validado = await bodyValido(request, crearFlujoSchema);
  if (validado instanceof Response) return validado;
  const { conexion_id: pedida, ...campos } = validado.data;

  const errorLargo = errorDeLargoDm(campos.respuesta_privada, campos.botones);
  if (errorLargo) return Response.json({ error: errorLargo }, { status: 400 });

  const admin = createAdminClient();
  const conexion = resolverConexion(await conexionesInstagramDelPortal(admin, auth.tenantId), pedida);
  if ("error" in conexion) return Response.json({ error: conexion.error }, { status: conexion.status });

  if (campos.activo) {
    const choque = errorDeChoquePalabras(campos, await flujosActivosDeConexion(admin, conexion.conexionId));
    if (choque) return Response.json({ error: choque }, { status: 409 });
  }

  const { data: flujo, error } = await admin
    .from("ig_flujos")
    .insert({ ...campos, tenant_id: auth.tenantId, conexion_id: conexion.conexionId })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await auditarAgente(auth, "flujo.crear", flujo.id, { ...campos, conexion_id: conexion.conexionId });

  if (campos.botones.length > 0) {
    const { error: errorLinks } = await admin.from("ig_links_tracking").insert(
      campos.botones.map((b) => ({
        flujo_id: flujo.id,
        conexion_id: flujo.conexion_id,
        tenant_id: flujo.tenant_id,
        url_destino: b.url,
        titulo: b.titulo,
      }))
    );
    if (errorLinks) {
      return Response.json(
        { error: `El flujo ${flujo.id} se creó, pero sus enlaces quedaron sin rastreo: ${errorLinks.message}` },
        { status: 500 }
      );
    }
  }

  return Response.json({ flujo }, { status: 201 });
}
