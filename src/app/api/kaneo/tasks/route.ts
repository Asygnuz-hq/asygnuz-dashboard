import { createTask } from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const projectId = body?.projectId;
  const title = body?.title?.trim();
  if (!projectId || !title) {
    return Response.json({ error: "Faltan projectId o title" }, { status: 400 });
  }

  try {
    const { config } = await getKaneoConfigForCurrentUser();
    const task = await createTask(config, projectId, {
      title,
      status: body?.status || "to-do",
      priority: body?.priority,
      description: body?.description,
    });
    return Response.json(task);
  } catch (err) {
    return kaneoErrorResponse(err, "Error creando la tarea en Kaneo");
  }
}
