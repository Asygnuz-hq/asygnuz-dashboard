import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { bodyValido } from "@/lib/api/validarBody";

const SchemaGuiaMarca = z.object({
  conexion_id: z.string().uuid("ID de conexión inválido"),
  guia_marca: z.string().max(2000, "Máximo 2000 caracteres"),
});

// GET /api/portal-admin/clientes/[tenantId]/guia-marca?conexion_id=...
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const { tenantId } = await params;
  const { searchParams } = new URL(request.url);
  const conexionId = searchParams.get("conexion_id");

  const supabase = createAdminClient();

  if (conexionId) {
    const { data: conx, error } = await supabase
      .from("meta_conexiones")
      .select("id, cliente_nombre, instagram_username, guia_marca")
      .eq("id", conexionId)
      .maybeSingle();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ guia_marca: conx?.guia_marca ?? "" });
  }

  // Si no se pasa conexion_id, buscar la primera conexión del tenant en portal_meta_conexiones
  const { data: vinculo } = await supabase
    .from("portal_meta_conexiones")
    .select("conexion_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!vinculo) return Response.json({ guia_marca: "" });

  const { data: conx } = await supabase
    .from("meta_conexiones")
    .select("id, cliente_nombre, instagram_username, guia_marca")
    .eq("id", vinculo.conexion_id)
    .maybeSingle();

  return Response.json({
    conexion_id: vinculo.conexion_id,
    guia_marca: conx?.guia_marca ?? "",
  });
}

// PUT /api/portal-admin/clientes/[tenantId]/guia-marca
export async function PUT(
  request: Request,
  { params: _params }: { params: Promise<{ tenantId: string }> }
) {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const validacion = await bodyValido(request, SchemaGuiaMarca);
  if (validacion instanceof Response) return validacion;
  const { conexion_id, guia_marca } = validacion.data;

  const supabase = createAdminClient();
  const { data: conx, error } = await supabase
    .from("meta_conexiones")
    .update({ guia_marca, actualizado_en: new Date().toISOString() })
    .eq("id", conexion_id)
    .select("id, cliente_nombre, guia_marca")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, guia_marca: conx.guia_marca });
}
