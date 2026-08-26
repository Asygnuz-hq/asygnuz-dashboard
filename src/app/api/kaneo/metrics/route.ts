import { calcularMetricas } from "@/lib/kaneo/metrics";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const metricas = await calcularMetricas();
    return Response.json(metricas);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error desconocido consultando Kaneo" },
      { status: 502 }
    );
  }
}
