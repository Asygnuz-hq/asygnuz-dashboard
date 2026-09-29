import { updateTaskStatus } from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";
import { bodyValido } from "@/lib/api/validarBody";
import { actualizarEstadoSchema } from "@/lib/kaneo/schemas";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const validado = await bodyValido(request, actualizarEstadoSchema);
  if (validado instanceof Response) return validado;
  const { status } = validado.data;

  try {
    const { config } = await getKaneoConfigForCurrentUser();
    const task = await updateTaskStatus(config, id, status);
    return Response.json(task);
  } catch (err) {
    return kaneoErrorResponse(err, "Error actualizando la tarea en Kaneo");
  }
}
