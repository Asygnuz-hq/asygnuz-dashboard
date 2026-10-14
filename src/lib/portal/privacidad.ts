import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Los clientes con Portal (Growth) solo los ve quien gestiona portales
// (gestiona_portales = true, hoy solo JM) — ni el resto del equipo de
// ASYGNUZ. Esto devuelve los proyectos de Kaneo amarrados a algún portal
// que la sesión actual NO debe ver (vacío para quien gestiona portales).
// La parte de Meta se aplica en la base (policy "clientes_solo_gestor" en
// schema-clientes-solo-gestor.sql), no aquí.
export async function proyectosKaneoOcultos(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data: puede } = await supabase.rpc("gestiona_portales");
  if (puede === true) return new Set();

  const { data } = await createAdminClient().from("portal_kaneo_proyectos").select("kaneo_project_id");
  return new Set((data ?? []).map((f) => f.kaneo_project_id as string));
}
