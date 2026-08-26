import { calcularMetricasCrecimiento } from "@/lib/espocrm/metrics";
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
    const metricas = await calcularMetricasCrecimiento();
    return Response.json(metricas);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error desconocido consultando EspoCRM" },
      { status: 502 }
    );
  }
}
