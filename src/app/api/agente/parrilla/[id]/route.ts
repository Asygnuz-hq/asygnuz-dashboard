import { createAdminClient } from "@/lib/supabase/admin";
import { auditarAgente, tokenDePortal } from "@/lib/bandeja/tokenAgente";
import { tenantIdValido } from "@/lib/portal/tenantId";
import { bodyValido } from "@/lib/api/validarBody";
import { actualizarContenidoSchema } from "@/lib/portal/schemas";
import { columnasContenido } from "@/lib/portal/contenido";

// PATCH /api/agente/parrilla/[id]. Sin DELETE a propósito: borrar queda para una persona.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!tenantIdValido(id)) return Response.json({ error: "id inválido" }, { status: 400 });
  const auth = await tokenDePortal(request, true);
  if (auth instanceof Response) return auth;

  const validado = await bodyValido(request, actualizarContenidoSchema);
  if (validado instanceof Response) return validado;

  const columnas = columnasContenido(validado.data);
  const { data, error } = await createAdminClient()
    .from("portal_contenido")
    .update({ ...columnas, actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", auth.tenantId)
    .select()
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "No encontrado." }, { status: 404 });
  await auditarAgente(auth, "parrilla.actualizar", id, columnas);
  return Response.json({ contenido: data });
}
