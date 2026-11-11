import { createClient } from "@/lib/supabase/server";
import { bloqueoMfa } from "@/lib/api/mfa";
import { modulosDelTenant } from "@/lib/modulosServidor";
import { bodyValido } from "@/lib/api/validarBody";
import { getEspoConfigForCurrentUser } from "@/lib/espocrm/tenant-config";
import type { EspoConfig } from "@/lib/espocrm/client";
import { actualizarLead, cambioLeadSchema, obtenerProspeccion } from "@/lib/espocrm/prospeccion";

// Flag propio "prospeccion" (como "analitica"): esta pantalla escribe en el
// EspoCRM del tenant, así que no basta con tener "crm" (que tiene cualquier
// cliente con el módulo contratado).
async function autorizar(): Promise<EspoConfig | Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const bloqueo = await bloqueoMfa(supabase);
  if (bloqueo) return bloqueo;

  const modulos = await modulosDelTenant(supabase);
  if (modulos?.prospeccion !== true) {
    return Response.json({ error: "Prospección no habilitada para tu cuenta." }, { status: 403 });
  }
  const config = await getEspoConfigForCurrentUser(supabase);
  if (!config) {
    return Response.json({ error: "Tu organización todavía no tiene un EspoCRM conectado." }, { status: 404 });
  }
  return config;
}

function errorEspo(err: unknown) {
  // El detalle (URL interna, cuerpo de EspoCRM) solo va al log del servidor.
  console.error("[espocrm prospeccion]", err instanceof Error ? err.message : err);
  return Response.json({ error: "No se pudo consultar EspoCRM." }, { status: 502 });
}

export async function GET() {
  const config = await autorizar();
  if (config instanceof Response) return config;
  try {
    return Response.json(await obtenerProspeccion(config));
  } catch (err) {
    return errorEspo(err);
  }
}

export async function PATCH(request: Request) {
  const config = await autorizar();
  if (config instanceof Response) return config;
  const body = await bodyValido(request, cambioLeadSchema);
  if (body instanceof Response) return body;
  try {
    return Response.json(await actualizarLead(config, body.data));
  } catch (err) {
    return errorEspo(err);
  }
}
