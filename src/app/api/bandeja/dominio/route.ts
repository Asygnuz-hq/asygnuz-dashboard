import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { bodyValido } from "@/lib/api/validarBody";

const SchemaDominio = z.object({
  conexion_id: z.string().uuid("ID de conexión inválido"),
  // Vacío = volver al dominio del dashboard
  dominio_links: z
    .string()
    .trim()
    .max(200)
    .refine((d) => d === "" || /^https:\/\/[^\s/?#]+$/.test(d), {
      message: "Debe ser https://dominio.com, sin ruta ni espacios",
    }),
});

// PUT /api/bandeja/dominio
// Guarda el dominio con el que se arman los links de los DMs de una cuenta
export async function PUT(request: Request) {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const validacion = await bodyValido(request, SchemaDominio);
  if (validacion instanceof Response) return validacion;
  const data = validacion.data;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("meta_conexiones")
    .update({ dominio_links: data.dominio_links || null })
    .eq("id", data.conexion_id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, dominio_links: data.dominio_links || null });
}
