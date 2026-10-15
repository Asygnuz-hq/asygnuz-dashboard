import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { bodyValido } from "@/lib/api/validarBody";

const SchemaBienvenida = z.object({
  conexion_id: z.string().uuid("ID de conexión inválido"),
  tenant_id: z.string().uuid().nullable().optional(),
  mensaje: z.string().min(1, "El mensaje no puede estar vacío").max(1000),
  activo: z.boolean().default(true),
});

// GET /api/bandeja/bienvenida?conexion_id=...
export async function GET(request: Request) {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const conexionId = searchParams.get("conexion_id");
  if (!conexionId) {
    return Response.json({ error: "Falta conexion_id" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: bienvenida, error } = await supabase
    .from("ig_bienvenida")
    .select("*")
    .eq("conexion_id", conexionId)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ bienvenida: bienvenida ?? null });
}

// PUT /api/bandeja/bienvenida
export async function PUT(request: Request) {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const validacion = await bodyValido(request, SchemaBienvenida);
  if (validacion instanceof Response) return validacion;
  const data = validacion.data;

  const supabase = createAdminClient();
  const { data: bienvenida, error } = await supabase
    .from("ig_bienvenida")
    .upsert(
      {
        conexion_id: data.conexion_id,
        tenant_id: data.tenant_id ?? null,
        mensaje: data.mensaje,
        activo: data.activo,
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: "conexion_id" }
    )
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, bienvenida });
}
