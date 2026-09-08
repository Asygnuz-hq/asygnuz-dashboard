import { createTaskComment, getTaskComments } from "@/lib/kaneo/client";
import { getKaneoConfigForCurrentUser, kaneoErrorResponse } from "@/lib/kaneo/tenant-config";

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
  const body = await request.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) {
    return Response.json({ error: "Falta content" }, { status: 400 });
  }

  try {
    const { config } = await getKaneoConfigForCurrentUser();
    await createTaskComment(config, id, content);
    return Response.json({ ok: true });
  } catch (err) {
    return kaneoErrorResponse(err, "Error creando el comentario en Kaneo");
  }
}
