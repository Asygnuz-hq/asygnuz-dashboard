import { createTask, fetchProjects } from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";
import { bodyValido } from "@/lib/api/validarBody";
import { crearTareaSchema } from "@/lib/kaneo/schemas";

export async function POST(request: Request) {
  const validado = await bodyValido(request, crearTareaSchema);
  if (validado instanceof Response) return validado;
  const { projectId, title, status, priority, description } = validado.data;

  try {
    const { config, workspaceId } = await getKaneoConfigForCurrentUser();
    // El projectId viene del navegador: se comprueba que sea un proyecto del
    // workspace de ESTE tenant antes de crear nada (no se confía en el id).
    const proyectos = await fetchProjects(config, workspaceId);
    if (!proyectos.some((p) => p.id === projectId)) {
      return Response.json({ error: "Proyecto no encontrado." }, { status: 404 });
    }
    const task = await createTask(config, projectId, {
      title,
      status,
      priority,
      description,
    });
    return Response.json(task);
  } catch (err) {
    return kaneoErrorResponse(err, "Error creando la tarea en Kaneo");
  }
}
