import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { tenantIdValido } from "@/lib/portal/tenantId";
import { bodyValido } from "@/lib/api/validarBody";
import { actualizarContenidoSchema } from "@/lib/portal/schemas";

export async function PUT(request: Request, { params }: { params: Promise<{ tenantId: string; id: string }> }) {
  const { tenantId, id } = await params;
  if (!tenantIdValido(tenantId) || !tenantIdValido(id)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const validado = await bodyValido(request, actualizarContenidoSchema);
  if (validado instanceof Response) return validado;
  const { titulo, tipo, plataforma, fechaPublicacion, estado, notas, linkReferencia, link } = validado.data;

  const cambios: Record<string, unknown> = { actualizado_en: new Date().toISOString() };
  if (titulo !== undefined) cambios.titulo = titulo;
  if (tipo !== undefined) cambios.tipo = tipo || null;
  if (plataforma !== undefined) cambios.plataforma = plataforma || null;
  if (fechaPublicacion !== undefined) cambios.fecha_publicacion = fechaPublicacion || null;
  if (estado !== undefined) cambios.estado = estado;
  if (notas !== undefined) cambios.notas = notas || null;
  if (linkReferencia !== undefined) cambios.link_referencia = linkReferencia || null;
  if (link !== undefined) cambios.link = link || null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("portal_contenido")
    .update(cambios)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "No encontrado." }, { status: 404 });
  return Response.json({ contenido: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ tenantId: string; id: string }> }) {
  const { tenantId, id } = await params;
  if (!tenantIdValido(tenantId) || !tenantIdValido(id)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const admin = createAdminClient();
  const { error } = await admin.from("portal_contenido").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
