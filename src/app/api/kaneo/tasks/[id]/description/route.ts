import { updateTaskDescription } from "@/lib/kaneo/client";
import { createClient } from "@/lib/supabase/server";

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
  const description = typeof body?.description === "string" ? body.description : null;
  if (description === null) {
    return Response.json({ error: "Falta description" }, { status: 400 });
  }

  try {
    const task = await updateTaskDescription(id, description);
    return Response.json(task);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error actualizando la descripción en Kaneo" },
      { status: 502 }
    );
  }
}
