import { calcularMetricasCrecimiento } from "@/lib/espocrm/metrics";

export async function GET() {
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
