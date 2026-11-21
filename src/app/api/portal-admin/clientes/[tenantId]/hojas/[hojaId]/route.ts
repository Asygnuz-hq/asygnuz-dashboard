import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { tenantIdValido } from "@/lib/portal/tenantId";
import { bodyValido } from "@/lib/api/validarBody";
import { actualizarHojaSchema } from "@/lib/portal/schemas";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tenantId: string; hojaId: string }> }
) {
  const { tenantId, hojaId } = await params;
  if (!tenantIdValido(tenantId) || !tenantIdValido(hojaId)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const validado = await bodyValido(request, actualizarHojaSchema);
  if (validado instanceof Response) return validado;

  const { titulo, tipo, descripcion, visibleCliente, columnas, filas } = validado.data;
  const cambios: Record<string, unknown> = { actualizado_en: new Date().toISOString() };
  if (titulo !== undefined) cambios.titulo = titulo;
  if (tipo !== undefined) cambios.tipo = tipo;
  if (descripcion !== undefined) cambios.descripcion = descripcion || null;
  if (visibleCliente !== undefined) cambios.visible_cliente = visibleCliente;
  if (columnas !== undefined) cambios.columnas = columnas;
  if (filas !== undefined) cambios.filas = filas;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("portal_hojas")
    .update(cambios)
    .eq("id", hojaId)
    .eq("tenant_id", tenantId)
    .select()
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Hoja no encontrada." }, { status: 404 });
  return Response.json({ hoja: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string; hojaId: string }> }
) {
  const { tenantId, hojaId } = await params;
  if (!tenantIdValido(tenantId) || !tenantIdValido(hojaId)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const admin = createAdminClient();
  const { error } = await admin
    .from("portal_hojas")
    .delete()
    .eq("id", hojaId)
    .eq("tenant_id", tenantId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
