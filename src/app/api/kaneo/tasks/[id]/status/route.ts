import { updateTaskStatus } from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status;
  if (!status) {
    return Response.json({ error: "Falta status" }, { status: 400 });
  }

  try {
    const { config } = await getKaneoConfigForCurrentUser();
    const task = await updateTaskStatus(config, id, status);
    return Response.json(task);
  } catch (err) {
    return kaneoErrorResponse(err, "Error actualizando la tarea en Kaneo");
  }
}
