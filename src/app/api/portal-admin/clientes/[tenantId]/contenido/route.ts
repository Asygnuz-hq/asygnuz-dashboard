import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { tenantIdValido } from "@/lib/portal/tenantId";
import { bodyValido } from "@/lib/api/validarBody";
import { crearContenidoSchema } from "@/lib/portal/schemas";
import { columnasContenido } from "@/lib/portal/contenido";

export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  if (!tenantIdValido(tenantId)) return Response.json({ error: "tenantId inválido" }, { status: 400 });
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const validado = await bodyValido(request, crearContenidoSchema);
  if (validado instanceof Response) return validado;
  const admin = createAdminClient();
  const { count } = await admin
    .from("portal_contenido")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  const { data, error } = await admin
    .from("portal_contenido")
    .insert({
      tenant_id: tenantId,
      ...columnasContenido(validado.data),
      orden: count ?? 0,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ contenido: data });
}
