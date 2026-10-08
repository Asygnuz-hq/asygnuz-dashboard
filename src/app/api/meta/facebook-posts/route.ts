import { createClient } from "@/lib/supabase/server";
import { bloqueoMfa } from "@/lib/api/mfa";
import { leerConexionConTokens } from "@/lib/meta/conexion";
import { fetchFacebookPagePosts, type MetaConexion } from "@/lib/meta/client";

// Publicaciones orgánicas de la Página de Facebook (no Instagram) — usa el
// token de anuncios, obtiene un token de página al vuelo.
// ?conexion_id=<id de meta_conexiones>
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

  const conexion = await leerConexionConTokens(supabase, conexionId);

  if (!conexion) {
    return Response.json({ error: "Conexión no encontrada." }, { status: 404 });
  }

  try {
    const posts = await fetchFacebookPagePosts(conexion);
    return Response.json({ posts });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error desconocido consultando Facebook" },
      { status: 502 }
    );
  }
}
