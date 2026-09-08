import { updateTaskPriority } from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";

const VALID = new Set(["no-priority", "low", "medium", "high", "urgent"]);

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const priority = body?.priority;
  if (typeof priority !== "string" || !VALID.has(priority)) {
    return Response.json({ error: "priority inválida" }, { status: 400 });
  }

  try {
    const { config } = await getKaneoConfigForCurrentUser();
    const task = await updateTaskPriority(
      config,
      id,
      priority as "no-priority" | "low" | "medium" | "high" | "urgent"
    );
    return Response.json(task);
  } catch (err) {
    return kaneoErrorResponse(err, "Error actualizando la prioridad en Kaneo");
  }
}
