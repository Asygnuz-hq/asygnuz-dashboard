import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { tenantIdValido } from "@/lib/portal/tenantId";
import { bodyValido } from "@/lib/api/validarBody";
import { actualizarLeadSchema } from "@/lib/leads/schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ tenantId: string; id: string }> }) {
  const { tenantId, id } = await params;
  if (!tenantIdValido(tenantId) || !tenantIdValido(id)) return Response.json({ error: "Identificador inválido" }, { status: 400 });
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const validado = await bodyValido(request, actualizarLeadSchema);
  if (validado instanceof Response) return validado;

  const { data, error } = await createAdminClient()
    .from("leads_web")
    .update({ estado: validado.data.estado })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select("id, estado")
    .maybeSingle();
  if (error) return Response.json({ error: "No se pudo actualizar" }, { status: 500 });
  if (!data) return Response.json({ error: "Lead no encontrado" }, { status: 404 });
  return Response.json({ lead: data });
}
