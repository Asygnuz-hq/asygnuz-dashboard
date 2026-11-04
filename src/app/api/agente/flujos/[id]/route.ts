import { createAdminClient } from "@/lib/supabase/admin";
import { auditarAgente, tokenDePortal } from "@/lib/bandeja/tokenAgente";
import { tenantIdValido } from "@/lib/portal/tenantId";
import { bodyValido } from "@/lib/api/validarBody";
import { actualizarFlujoSchema, cambiosDeEnlaces, errorDeChoquePalabras, errorDeLargoDm } from "@/lib/agente/flujos";
import { conexionesInstagramDelPortal, flujosActivosDeConexion } from "@/lib/agente/flujosDatos";

// PATCH /api/agente/flujos/[id]. Sin DELETE a propósito: para apagar un flujo basta activo: false.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!tenantIdValido(id)) return Response.json({ error: "id inválido" }, { status: 400 });
  const auth = await tokenDePortal(request, true);
  if (auth instanceof Response) return auth;

  const validado = await bodyValido(request, actualizarFlujoSchema);
  if (validado instanceof Response) return validado;
  const cambios = validado.data;

  const admin = createAdminClient();
  const conexiones = await conexionesInstagramDelPortal(admin, auth.tenantId);
  // 404 también para el flujo de otra cuenta: no se confirma que exista.
  const { data: actual, error: errorActual } = conexiones.length
    ? await admin.from("ig_flujos").select("*").eq("id", id).in("conexion_id", conexiones).maybeSingle()
    : { data: null, error: null };
  if (errorActual) return Response.json({ error: errorActual.message }, { status: 500 });
  if (!actual) return Response.json({ error: "No encontrado." }, { status: 404 });

  const resultado = { ...actual, ...cambios };
  // Solo si queda prendido: apagar un flujo siempre debe poder hacerse, aunque sea antiguo y no cumpla.
  if (resultado.activo) {
    const errorLargo = errorDeLargoDm(resultado.respuesta_privada, resultado.botones);
    if (errorLargo) return Response.json({ error: errorLargo }, { status: 400 });
    const choque = errorDeChoquePalabras(resultado, await flujosActivosDeConexion(admin, actual.conexion_id));
    if (choque) return Response.json({ error: choque }, { status: 409 });
  }

  const { data: flujo, error } = await admin
    .from("ig_flujos")
    .update({ ...cambios, actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .eq("conexion_id", actual.conexion_id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await auditarAgente(auth, "flujo.actualizar", id, cambios);

  if (cambios.botones) {
    const errorLinks = await sincronizarEnlaces(admin, flujo, cambios.botones);
    if (errorLinks) {
      return Response.json({ error: `El flujo se guardó, pero sus enlaces no se sincronizaron: ${errorLinks}` }, { status: 500 });
    }
  }

  return Response.json({ flujo });
}

async function sincronizarEnlaces(
  admin: ReturnType<typeof createAdminClient>,
  flujo: { id: string; conexion_id: string; tenant_id: string | null },
  botones: { titulo: string; url: string }[]
): Promise<string | null> {
  const { data: base, error } = await admin
    .from("ig_links_tracking")
    .select("id, url_destino, titulo")
    .eq("flujo_id", flujo.id)
    .eq("por_envio", false);
  if (error) return error.message;

  const { borrar, crear } = cambiosDeEnlaces(base ?? [], botones);
  if (borrar.length > 0) {
    const { error: errorBorrar } = await admin.from("ig_links_tracking").delete().in("id", borrar);
    if (errorBorrar) return errorBorrar.message;
  }
  if (crear.length > 0) {
    const { error: errorCrear } = await admin.from("ig_links_tracking").insert(
      crear.map((b) => ({
        flujo_id: flujo.id,
        conexion_id: flujo.conexion_id,
        tenant_id: flujo.tenant_id,
        url_destino: b.url,
        titulo: b.titulo,
      }))
    );
    if (errorCrear) return errorCrear.message;
  }
  return null;
}
