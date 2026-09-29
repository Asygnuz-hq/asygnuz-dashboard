import { updateTaskPriority } from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";
import { bodyValido } from "@/lib/api/validarBody";
import { actualizarPrioridadSchema } from "@/lib/kaneo/schemas";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const validado = await bodyValido(request, actualizarPrioridadSchema);
  if (validado instanceof Response) return validado;
  const { priority } = validado.data;

  try {
    const { config } = await getKaneoConfigForCurrentUser();
    const task = await updateTaskPriority(config, id, priority);
    return Response.json(task);
  } catch (err) {
    return kaneoErrorResponse(err, "Error actualizando la prioridad en Kaneo");
  }
}
