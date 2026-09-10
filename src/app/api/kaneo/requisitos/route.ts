import { calcularRequisitos } from "@/lib/kaneo/requisitos-metrics";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";

export async function GET() {
  try {
    const { config, workspaceId } = await getKaneoConfigForCurrentUser();
    const metrics = await calcularRequisitos(config, workspaceId);
    return Response.json(metrics);
  } catch (err) {
    return kaneoErrorResponse(err, "Error leyendo los requisitos de Kaneo");
  }
}
