import { updateTaskTitle } from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";
import { bodyValido } from "@/lib/api/validarBody";
import { actualizarTituloSchema } from "@/lib/kaneo/schemas";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const validado = await bodyValido(request, actualizarTituloSchema);
  if (validado instanceof Response) return validado;
  const { title } = validado.data;

  try {
    const { config } = await getKaneoConfigForCurrentUser();
    const task = await updateTaskTitle(config, id, title);
    return Response.json(task);
  } catch (err) {
    return kaneoErrorResponse(err, "Error actualizando el título en Kaneo");
  }
}
