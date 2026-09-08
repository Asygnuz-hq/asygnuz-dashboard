import { updateTaskDescription } from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const description = typeof body?.description === "string" ? body.description : null;
  if (description === null) {
    return Response.json({ error: "Falta description" }, { status: 400 });
  }

  try {
    const { config } = await getKaneoConfigForCurrentUser();
    const task = await updateTaskDescription(config, id, description);
    return Response.json(task);
  } catch (err) {
    return kaneoErrorResponse(err, "Error actualizando la descripción en Kaneo");
  }
}
