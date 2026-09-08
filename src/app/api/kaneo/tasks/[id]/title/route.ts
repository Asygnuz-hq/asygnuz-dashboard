import { updateTaskTitle } from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return Response.json({ error: "Falta title" }, { status: 400 });
  }

  try {
    const { config } = await getKaneoConfigForCurrentUser();
    const task = await updateTaskTitle(config, id, title);
    return Response.json(task);
  } catch (err) {
    return kaneoErrorResponse(err, "Error actualizando el título en Kaneo");
  }
}
