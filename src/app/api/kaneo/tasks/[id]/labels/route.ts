import { getTaskLabels } from "@/lib/kaneo/client";
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
    const labels = await getTaskLabels(id);
    return Response.json(labels);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error leyendo etiquetas en Kaneo" },
      { status: 502 }
    );
  }
}
