import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { tenantIdValido } from "@/lib/portal/tenantId";
import { bodyValido } from "@/lib/api/validarBody";
import { crearHojaSchema } from "@/lib/portal/schemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  if (!tenantIdValido(tenantId)) return Response.json({ error: "tenantId inválido" }, { status: 400 });
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("portal_hojas")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("orden", { ascending: true })
    .order("creado_en", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ hojas: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  if (!tenantIdValido(tenantId)) return Response.json({ error: "tenantId inválido" }, { status: 400 });
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const validado = await bodyValido(request, crearHojaSchema);
  if (validado instanceof Response) return validado;

  const admin = createAdminClient();
  const { count } = await admin
    .from("portal_hojas")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  const { titulo, tipo, descripcion, visibleCliente, columnas, filas } = validado.data;
  const { data, error } = await admin
    .from("portal_hojas")
    .insert({
      tenant_id: tenantId,
      titulo,
      tipo,
      descripcion: descripcion || null,
      visible_cliente: visibleCliente,
      columnas,
      filas,
      orden: count ?? 0,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ hoja: data });
}
