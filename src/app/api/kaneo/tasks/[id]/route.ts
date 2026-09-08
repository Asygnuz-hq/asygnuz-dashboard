import { getTask } from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { config } = await getKaneoConfigForCurrentUser();
    const task = await getTask(config, id);
    return Response.json(task);
  } catch (err) {
    return kaneoErrorResponse(err, "Error leyendo la tarea en Kaneo");
  }
}
