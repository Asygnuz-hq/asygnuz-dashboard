import { updateTaskPriority } from "@/lib/kaneo/client";
import { createClient } from "@/lib/supabase/server";

const VALID = new Set(["no-priority", "low", "medium", "high", "urgent"]);

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const priority = body?.priority;
  if (typeof priority !== "string" || !VALID.has(priority)) {
    return Response.json({ error: "priority inválida" }, { status: 400 });
  }

  try {
    const task = await updateTaskPriority(id, priority as "no-priority" | "low" | "medium" | "high" | "urgent");
    return Response.json(task);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error actualizando la prioridad en Kaneo" },
      { status: 502 }
    );
  }
}
