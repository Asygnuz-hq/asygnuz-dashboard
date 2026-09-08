import { getTaskLabels } from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { config } = await getKaneoConfigForCurrentUser();
    const labels = await getTaskLabels(config, id);
    return Response.json(labels);
  } catch (err) {
    return kaneoErrorResponse(err, "Error leyendo etiquetas en Kaneo");
  }
}
