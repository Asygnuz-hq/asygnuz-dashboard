import { createClient } from "@/lib/supabase/server";

// Todas las rutas /api/portal-admin/* gestionan datos de OTROS tenants
// (los clientes de Growth), así que usan el cliente de servicio
// (service_role, bypassa RLS) — pero solo después de comprobar acá que
// quien llama tiene el permiso. A propósito NO es "eres admin de ASYGNUZ"
// (eso lo cumple cualquiera del equipo, Pablo/Andrés incluidos): JM pidió
// que esto lo vea y use solo la(s) persona(s) marcadas con
// gestiona_portales en su fila de profiles (ver gestiona_portales() en
// schema-portal-admin-solo-jm.sql).
export async function requireAsygnuzAdmin(): Promise<{ userId: string } | Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: puede } = await supabase.rpc("gestiona_portales");
  if (puede !== true) {
    return Response.json({ error: "No tienes permiso para gestionar portales de clientes." }, { status: 403 });
  }

  return { userId: user.id };
}
