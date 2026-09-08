import { calcularMetricas } from "@/lib/kaneo/metrics";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";

export async function GET() {
  try {
    const { config, workspaceId } = await getKaneoConfigForCurrentUser();
    const metricas = await calcularMetricas(config, workspaceId);
    return Response.json(metricas);
  } catch (err) {
    return kaneoErrorResponse(err, "Error desconocido consultando Kaneo");
  }
}
