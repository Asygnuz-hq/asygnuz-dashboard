import { createClient } from "@/lib/supabase/server";
import { bloqueoMfa } from "@/lib/api/mfa";
import { bodyValido } from "@/lib/api/validarBody";
import { publicacionNotaSchema } from "@/lib/meta/schemas";

// Etiquetas de campaña por publicación — para agrupar el rendimiento de
// varias publicaciones bajo un mismo nombre (ej. "Lanzamiento agosto").
// GET ?conexion_id=<id> -> { notas: { [media_id]: etiqueta } }
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const bloqueo = await bloqueoMfa(supabase);
  if (bloqueo) return bloqueo;

  const { searchParams } = new URL(request.url);
  const conexionId = searchParams.get("conexion_id");
  if (!conexionId) {
    return Response.json({ error: "Falta conexion_id." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("meta_publicacion_notas")
    .select("media_id, etiqueta")
    .eq("conexion_id", conexionId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const notas: Record<string, string> = {};
  for (const fila of data) notas[fila.media_id] = fila.etiqueta;
  return Response.json({ notas });
}

// body: { conexionId, mediaId, etiqueta } — etiqueta vacía borra la nota.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const bloqueo = await bloqueoMfa(supabase);
  if (bloqueo) return bloqueo;

  const validado = await bodyValido(request, publicacionNotaSchema);
  if (validado instanceof Response) return validado;
  const { conexionId, mediaId, etiqueta } = validado.data;

  if (!etiqueta || !etiqueta.trim()) {
    const { error } = await supabase
      .from("meta_publicacion_notas")
      .delete()
      .eq("conexion_id", conexionId)
      .eq("media_id", mediaId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  const { error } = await supabase
    .from("meta_publicacion_notas")
    .upsert(
      { conexion_id: conexionId, media_id: mediaId, etiqueta: etiqueta.trim() },
      { onConflict: "conexion_id,media_id" }
    );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
