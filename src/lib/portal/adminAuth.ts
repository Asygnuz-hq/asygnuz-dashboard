import { createClient } from "@/lib/supabase/server";
import { ASYGNUZ_TENANT_ID } from "@/lib/constantes";

// Todas las rutas /api/portal-admin/* gestionan datos de OTROS tenants
// (los clientes de Growth), así que usan el cliente de servicio
// (service_role, bypassa RLS) — pero solo después de comprobar acá que
// quien llama de verdad es un admin del tenant ASYGNUZ. Mismo criterio que
// ya usa /api/espocrm/metrics para el módulo crm, llevado a "eres admin de
// ASYGNUZ" en vez de "tu tenant tiene este módulo".
export async function requireAsygnuzAdmin(): Promise<{ userId: string } | Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil || perfil.rol !== "admin" || perfil.tenant_id !== ASYGNUZ_TENANT_ID) {
    return Response.json({ error: "Solo un admin de ASYGNUZ puede hacer esto." }, { status: 403 });
  }

  return { userId: user.id };
}
