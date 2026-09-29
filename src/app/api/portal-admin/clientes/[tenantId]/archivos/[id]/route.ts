import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { tenantIdValido } from "@/lib/portal/tenantId";

export async function DELETE(_request: Request, { params }: { params: Promise<{ tenantId: string; id: string }> }) {
  const { tenantId, id } = await params;
  if (!tenantIdValido(tenantId) || !tenantIdValido(id)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const admin = createAdminClient();
  const { data: archivo } = await admin
    .from("portal_archivos")
    .select("storage_path")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!archivo) return Response.json({ error: "No encontrado." }, { status: 404 });

  await admin.storage.from("portal-archivos").remove([archivo.storage_path]);
  const { error } = await admin.from("portal_archivos").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
