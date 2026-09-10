import { calcularRequisitos } from "@/lib/kaneo/requisitos-metrics";
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
    const metrics = await calcularRequisitos(config, workspaceId);
    return Response.json(metrics);
  } catch (err) {
    return kaneoErrorResponse(err, "Error leyendo los requisitos de Kaneo");
  }
}
