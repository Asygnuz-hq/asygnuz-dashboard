import { updateTaskDescription } from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";
import { bodyValido } from "@/lib/api/validarBody";
import { actualizarDescripcionSchema } from "@/lib/kaneo/schemas";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const validado = await bodyValido(request, actualizarDescripcionSchema);
  if (validado instanceof Response) return validado;
  const { description } = validado.data;

  try {
    const { config } = await getKaneoConfigForCurrentUser();
    const task = await updateTaskDescription(config, id, description);
    return Response.json(task);
  } catch (err) {
    return kaneoErrorResponse(err, "Error actualizando la descripción en Kaneo");
  }
}
