import { createTaskComment, getTaskComments } from "@/lib/kaneo/client";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const comments = await getTaskComments(id);
    return Response.json(comments);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error leyendo comentarios en Kaneo" },
      { status: 502 }
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) {
    return Response.json({ error: "Falta content" }, { status: 400 });
  }

  try {
    await createTaskComment(id, content);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error creando el comentario en Kaneo" },
      { status: 502 }
    );
  }
}
