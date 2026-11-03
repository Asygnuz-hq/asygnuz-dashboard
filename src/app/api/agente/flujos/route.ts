import { createAdminClient } from "@/lib/supabase/admin";
import { tokenDePortal } from "@/lib/bandeja/tokenAgente";

// GET /api/agente/flujos
// Flujos automáticos del portal y clics de sus enlaces. Solo lectura: un flujo activo responde en nombre de la cuenta.
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
    .select("id, nombre, palabras_clave, aplica_a, respuesta_privada, respuesta_publica, botones, activo, creado_en");
  consulta = conexionIds.length
    ? consulta.or(`tenant_id.eq.${auth.tenantId},conexion_id.in.(${conexionIds.join(",")})`)
    : consulta.eq("tenant_id", auth.tenantId);

  const [{ data: flujos, error }, { data: enlaces }] = await Promise.all([
    consulta,
    admin.from("ig_links_tracking").select("id, titulo, url_destino, clics_count").eq("tenant_id", auth.tenantId),
  ]);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ flujos: flujos ?? [], enlaces: enlaces ?? [] });
}
