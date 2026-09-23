import { calcularMetricasCrecimiento } from "@/lib/espocrm/metrics";
import { createClient } from "@/lib/supabase/server";
import { modulosDelTenant } from "@/lib/modulosServidor";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  // EspoCRM usa credenciales globales (las de ASYGNUZ): solo un tenant con el
  // módulo CRM contratado puede leerlo. Cuando exista tenant_espocrm (por
  // cliente) esto se reemplaza por sus propias credenciales.
  const modulos = await modulosDelTenant(supabase);
  if (!modulos || modulos.crm !== true) {
    return Response.json({ error: "Módulo CRM no habilitado." }, { status: 403 });
  }

  try {
    const metricas = await calcularMetricasCrecimiento();
    return Response.json(metricas);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Error desconocido consultando EspoCRM" },
      { status: 502 }
    );
  }
}
