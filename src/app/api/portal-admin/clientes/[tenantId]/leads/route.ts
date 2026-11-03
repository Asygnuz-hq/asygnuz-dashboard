import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { tenantIdValido } from "@/lib/portal/tenantId";

export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  if (!tenantIdValido(tenantId)) return Response.json({ error: "tenantId inválido" }, { status: 400 });
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const { data, error } = await createAdminClient()
    .from("leads_web")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("creado_en", { ascending: false });
  if (error) return Response.json({ error: "No se pudieron leer los leads" }, { status: 500 });
  return Response.json({ leads: data ?? [] });
}
