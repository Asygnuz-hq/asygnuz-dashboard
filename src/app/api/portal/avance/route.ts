import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bloqueoMfa } from "@/lib/api/mfa";
import { calcularAvance } from "@/lib/portal/avance";

// Panel de Avance del cliente que tiene la sesión. El tenant sale SIEMPRE de
// la sesión (tenant_actual), nunca de la URL: un cliente no puede pedir el
// avance de otro.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const bloqueo = await bloqueoMfa(supabase);
  if (bloqueo) return bloqueo;

  const { data: tenantRows } = await supabase.rpc("tenant_actual");
  const tenant = (Array.isArray(tenantRows) ? tenantRows[0] : tenantRows) as { id: string } | null;
  if (!tenant) return Response.json({ error: "Sin organización asignada." }, { status: 403 });

  const { data: fila } = await createAdminClient()
    .from("tenants")
    .select("modulos_habilitados")
    .eq("id", tenant.id)
    .single();
  const modulos = (fila?.modulos_habilitados ?? {}) as Record<string, boolean>;
  if (modulos.portal_cliente !== true) {
    return Response.json({ error: "Tu cuenta no tiene el portal de cliente activo." }, { status: 403 });
  }

  return Response.json({ avance: await calcularAvance(tenant.id) });
}
