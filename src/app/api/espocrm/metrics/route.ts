import { calcularMetricasCrecimiento } from "@/lib/espocrm/metrics";
import { createClient } from "@/lib/supabase/server";
import { bloqueoMfa } from "@/lib/api/mfa";
import { modulosDelTenant } from "@/lib/modulosServidor";
import { getEspoConfigForCurrentUser } from "@/lib/espocrm/tenant-config";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const bloqueo = await bloqueoMfa(supabase);
  if (bloqueo) return bloqueo;

  // Cada tenant lee SU EspoCRM (tabla tenant_espocrm, Kaneo #34), y solo si
  // tiene el módulo CRM contratado.
  const modulos = await modulosDelTenant(supabase);
  if (!modulos || modulos.crm !== true) {
    return Response.json({ error: "Módulo CRM no habilitado." }, { status: 403 });
  }

  const config = await getEspoConfigForCurrentUser(supabase);
  if (!config) {
    return Response.json({ error: "Tu organización todavía no tiene un EspoCRM conectado." }, { status: 404 });
  }

  try {
    const metricas = await calcularMetricasCrecimiento(config);
    return Response.json(metricas);
  } catch (err) {
    // El detalle (URL interna, cuerpo de EspoCRM) solo va al log del
    // servidor, no al navegador.
    console.error("[espocrm]", err instanceof Error ? err.message : err);
    return Response.json({ error: "No se pudo consultar EspoCRM." }, { status: 502 });
  }
}
