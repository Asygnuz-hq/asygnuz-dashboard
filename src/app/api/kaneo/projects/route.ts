import { fetchProjects } from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";

export async function GET() {
  try {
    const { config, workspaceId } = await getKaneoConfigForCurrentUser();
    const proyectos = await fetchProjects(config, workspaceId);
    return Response.json(proyectos.filter((p) => !p.archivedAt));
  } catch (err) {
    return kaneoErrorResponse(err, "Error leyendo proyectos de Kaneo");
  }
}
