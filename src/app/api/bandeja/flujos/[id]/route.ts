import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { bodyValido } from "@/lib/api/validarBody";

const SchemaBoton = z.object({
  titulo: z.string().min(1, "El título del botón no puede estar vacío"),
  url: z
    .string()
    .url("Debe ser una URL válida")
    .refine((u) => u.startsWith("https://"), {
      message: "La URL de destino debe ser segura (https://)",
    }),
});

const SchemaActualizarFlujo = z.object({
  nombre: z.string().min(1).max(100).optional(),
  palabras_clave: z.array(z.string().min(1)).optional(),
  aplica_a: z.string().optional(),
  respuesta_privada: z.string().min(1).optional(),
  respuesta_publica: z.array(z.string()).optional(),
  botones: z.array(SchemaBoton).optional(),
  activo: z.boolean().optional(),
});

// PATCH /api/bandeja/flujos/[id]
// Actualiza un flujo y sincroniza sus botones con los links de rastreo
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const { id } = await params;
  if (!id) return Response.json({ error: "Falta ID de flujo" }, { status: 400 });

  const validacion = await bodyValido(request, SchemaActualizarFlujo);
  if (validacion instanceof Response) return validacion;
  const data = validacion.data;

  const supabase = createAdminClient();

  // 1. Actualizar el flujo
  const camposActualizar: Record<string, unknown> = {
    ...data,
    actualizado_en: new Date().toISOString(),
  };

  const { data: flujoActualizado, error } = await supabase
    .from("ig_flujos")
    .update(camposActualizar)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // 2. Si se modificaron botones, actualizar o sincronizar ig_links_tracking
  if (data.botones) {
    // Solo los links base: los de envíos anteriores conservan su historial de clics
    await supabase.from("ig_links_tracking").delete().eq("flujo_id", id).eq("por_envio", false);
    if (data.botones.length > 0) {
      const nuevosLinks = data.botones.map((b) => ({
        flujo_id: id,
        conexion_id: flujoActualizado.conexion_id,
        tenant_id: flujoActualizado.tenant_id,
        url_destino: b.url,
        titulo: b.titulo,
      }));
      await supabase.from("ig_links_tracking").insert(nuevosLinks);
    }
  }

  return Response.json({ ok: true, flujo: flujoActualizado });
}

// DELETE /api/bandeja/flujos/[id]
// Elimina un flujo y sus links asociados
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const { id } = await params;
  if (!id) return Response.json({ error: "Falta ID de flujo" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("ig_flujos").delete().eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, mensaje: "Flujo eliminado" });
}
