import { createClient } from "@/lib/supabase/server";
import { leerConexionConTokens } from "@/lib/meta/conexion";
import { fetchInstagramDemografia, type MetaConexion } from "@/lib/meta/client";

// Demografía de audiencia (edad/género, ciudad, país). Meta exige un
// mínimo de audiencia por desglose (~100 personas) — cuentas chicas
// recibirán null en cada campo, no es un error.
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

  const conexion = await leerConexionConTokens(supabase, conexionId);

  if (!conexion) {
    return Response.json({ error: "Conexión no encontrada." }, { status: 404 });
  }

  try {
    const demografia = await fetchInstagramDemografia(conexion);
    return Response.json({ demografia });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error desconocido consultando demografía" },
      { status: 502 }
    );
  }
}
