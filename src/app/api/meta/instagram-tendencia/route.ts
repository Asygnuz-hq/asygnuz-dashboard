import { createClient } from "@/lib/supabase/server";
import { bloqueoMfa } from "@/lib/api/mfa";
import { leerConexionConTokens } from "@/lib/meta/conexion";
import { fetchInstagramTendenciaCuenta, type MetaConexion } from "@/lib/meta/client";

// Evolución día a día de la cuenta de Instagram (alcance, visitas al
// perfil, seguidores) — últimos 30 días. ?conexion_id=<id de meta_conexiones>
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
    const tendencia = await fetchInstagramTendenciaCuenta(conexion);
    return Response.json({ tendencia });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error desconocido consultando tendencia" },
      { status: 502 }
    );
  }
}
