import { fetchProjects } from "@/lib/kaneo/client";
import { createClient } from "@/lib/supabase/server";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}.`);
  return value;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const proyectos = await fetchProjects(env("KANEO_WORKSPACE_ID"));
    return Response.json(proyectos.filter((p) => !p.archivedAt));
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error leyendo proyectos de Kaneo" },
      { status: 502 }
    );
  }
}
