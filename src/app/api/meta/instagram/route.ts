import { createClient } from "@/lib/supabase/server";
import { fetchInstagramMedia, fetchInstagramStoriesActivas, type MetaConexion } from "@/lib/meta/client";

// Devuelve las últimas publicaciones de Instagram (reels, fotos, carruseles)
// y las historias activas ahora mismo, con sus métricas.
// ?conexion_id=<id de meta_conexiones>
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const conexionId = searchParams.get("conexion_id");
  if (!conexionId) {
    return Response.json({ error: "Falta conexion_id." }, { status: 400 });
  }

  const { data: conexion, error } = await supabase
    .from("meta_conexiones")
    .select("*")
    .eq("id", conexionId)
    .single<MetaConexion>();

  if (error || !conexion) {
    return Response.json({ error: "Conexión no encontrada." }, { status: 404 });
  }

  try {
    const [media, historias] = await Promise.all([
      fetchInstagramMedia(conexion),
      fetchInstagramStoriesActivas(conexion).catch(() => []), // sin historias activas no es un error
    ]);
    return Response.json({ cliente: conexion.cliente_nombre, media, historias });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error desconocido consultando Instagram" },
      { status: 502 }
    );
  }
}
