import { calcularMetricas } from "@/lib/kaneo/metrics";

export async function GET() {
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
