import { createTaskComment, getTaskComments } from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";
import { bodyValido } from "@/lib/api/validarBody";
import { crearComentarioSchema } from "@/lib/kaneo/schemas";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { config } = await getKaneoConfigForCurrentUser();
    const comments = await getTaskComments(config, id);
    return Response.json(comments);
  } catch (err) {
    return kaneoErrorResponse(err, "Error leyendo comentarios en Kaneo");
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const validado = await bodyValido(request, crearComentarioSchema);
  if (validado instanceof Response) return validado;
  const { content } = validado.data;

  try {
    const { config } = await getKaneoConfigForCurrentUser();
    await createTaskComment(config, id, content);
    return Response.json({ ok: true });
  } catch (err) {
    return kaneoErrorResponse(err, "Error creando el comentario en Kaneo");
  }
}
