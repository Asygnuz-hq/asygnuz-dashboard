import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { tenantIdValido } from "@/lib/portal/tenantId";
import { bodyValido } from "@/lib/api/validarBody";
import { importarContenidoSchema } from "@/lib/portal/schemas";
import { columnasContenido } from "@/lib/portal/contenido";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  if (!tenantIdValido(tenantId)) return Response.json({ error: "tenantId inválido" }, { status: 400 });
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const validado = await bodyValido(request, importarContenidoSchema);
  if (validado instanceof Response) return validado;

  const admin = createAdminClient();
  const { count } = await admin
    .from("portal_contenido")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  const baseOrden = count ?? 0;
  const registros = validado.data.filas.map((fila, idx) => ({
    tenant_id: tenantId,
    ...columnasContenido({
      ...fila,
      campana: fila.campana || validado.data.campana || undefined,
    }),
    orden: baseOrden + idx,
  }));

  const { data, error } = await admin
    .from("portal_contenido")
    .insert(registros)
    .select();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ insertados: data ?? [] });
}
