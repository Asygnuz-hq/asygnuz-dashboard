import { calcularMetricas } from "@/lib/kaneo/metrics";
import { proyectosKaneoOcultos } from "@/lib/portal/privacidad";
import {
  FUENTE_PRINCIPAL,
  fuenteDeRequest,
  getKaneoConfigForCurrentUser,
  kaneoErrorResponse,
} from "@/lib/kaneo/tenant-config";

export async function GET(req: Request) {
  try {
    const { config, workspaceId, fuenteId } = await getKaneoConfigForCurrentUser(
      fuenteDeRequest(req),
    );
    // Solo el Kaneo principal tiene proyectos amarrados a portales.
    const ocultos = fuenteId === FUENTE_PRINCIPAL ? await proyectosKaneoOcultos() : new Set<string>();
    const metricas = await calcularMetricas(config, workspaceId, ocultos);
    return Response.json(metricas);
  } catch (err) {
    return kaneoErrorResponse(err, "Error desconocido consultando Kaneo");
  }
}
