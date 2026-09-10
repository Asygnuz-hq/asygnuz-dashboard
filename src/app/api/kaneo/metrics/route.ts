import { calcularMetricas } from "@/lib/kaneo/metrics";
import {
  fuenteDeRequest,
  getKaneoConfigForCurrentUser,
  kaneoErrorResponse,
} from "@/lib/kaneo/tenant-config";

export async function GET(req: Request) {
  try {
    const { config, workspaceId } = await getKaneoConfigForCurrentUser(
      fuenteDeRequest(req),
    );
    const metricas = await calcularMetricas(config, workspaceId);
    return Response.json(metricas);
  } catch (err) {
    return kaneoErrorResponse(err, "Error desconocido consultando Kaneo");
  }
}
