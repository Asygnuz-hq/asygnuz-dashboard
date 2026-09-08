import { createTask } from "@/lib/kaneo/client";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const projectId = body?.projectId;
  const title = body?.title?.trim();
  if (!projectId || !title) {
    return Response.json({ error: "Faltan projectId o title" }, { status: 400 });
  }

  try {
    const task = await createTask(projectId, {
      title,
      status: body?.status || "to-do",
      priority: body?.priority,
      description: body?.description,
    });
    return Response.json(task);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error creando la tarea en Kaneo" },
      { status: 502 }
    );
  }
}
