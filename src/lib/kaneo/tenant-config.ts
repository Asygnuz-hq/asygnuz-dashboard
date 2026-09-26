import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { KaneoConfig } from "./client";
import { KaneoHttpError } from "./errores";
import { FUENTE_PRINCIPAL, type KaneoFuente } from "./fuentes";

export { FUENTE_PRINCIPAL, type KaneoFuente };

// Resuelve las credenciales de Kaneo del tenant del usuario que hace la
// petición -- nunca de una variable de entorno global, y nunca de un
// tenantId que venga del cliente (eso abriría la puerta a que un cliente
// del SaaS pida el Kaneo de otro solo cambiando un parámetro).
//
// Dos pasos, dos clientes de Supabase distintos a propósito:
// 1) tenant_actual() con el cliente normal (RLS activo, atado a la cookie
//    de sesión) -- determina el tenant sin confiar en nada que mande el
//    llamador.
// 2) tenant_kaneo / tenant_kaneo_fuentes con createAdminClient()
//    (service_role) -- esas tablas no tienen ninguna política RLS a
//    propósito (ver schema-kaneo-*.sql), así que solo el servidor puede
//    leerlas, jamás un componente de cliente.
//
// Un tenant tiene SIEMPRE un Kaneo principal (tenant_kaneo) y OPCIONALMENTE
// fuentes adicionales de solo lectura (tenant_kaneo_fuentes) -- p. ej. el
// Kaneo de un cliente al que se le da soporte. El id "principal" o la
// ausencia de fuenteId resuelven el Kaneo principal; cualquier otro id se
// valida contra el tenant de la sesión antes de usarse.
export class KaneoConfigError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function tenantDeLaSesion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new KaneoConfigError("No autorizado", 401);
  }

  const { data: tenantRows } = await supabase.rpc("tenant_actual");
  const tenantRow = Array.isArray(tenantRows) ? tenantRows[0] : tenantRows;
  if (!tenantRow) {
    throw new KaneoConfigError(
      "No se pudo determinar la organización del usuario",
      403,
    );
  }
  return tenantRow as { id: string; nombre: string; logo_url: string | null };
}

export async function getKaneoConfigForCurrentUser(fuenteId?: string): Promise<{
  config: KaneoConfig;
  workspaceId: string;
  tenantId: string;
  fuenteId: string;
  fuenteNombre: string;
}> {
  const tenantRow = await tenantDeLaSesion();
  const admin = createAdminClient();

  // Fuente adicional: solo si el id pertenece al tenant de la sesión.
  if (fuenteId && fuenteId !== FUENTE_PRINCIPAL) {
    const { data: fuente } = await admin
      .from("tenant_kaneo_fuentes")
      .select("id, nombre, kaneo_api_url, kaneo_workspace_id, kaneo_api_key")
      .eq("id", fuenteId)
      .eq("tenant_id", tenantRow.id)
      .maybeSingle();
    if (!fuente) {
      throw new KaneoConfigError("Fuente de Kaneo no encontrada", 404);
    }
    return {
      config: {
        apiUrl: fuente.kaneo_api_url,
        apiKey: fuente.kaneo_api_key,
      },
      workspaceId: fuente.kaneo_workspace_id,
      tenantId: tenantRow.id,
      fuenteId: fuente.id,
      fuenteNombre: fuente.nombre,
    };
  }

  const { data: kaneoRow } = await admin
    .from("tenant_kaneo")
    .select("kaneo_api_url, kaneo_workspace_id, kaneo_api_key")
    .eq("tenant_id", tenantRow.id)
    .maybeSingle();
  if (!kaneoRow) {
    throw new KaneoConfigError(
      "Este cliente no tiene el módulo de gestión de proyectos configurado",
      404,
    );
  }

  return {
    config: {
      apiUrl: kaneoRow.kaneo_api_url,
      apiKey: kaneoRow.kaneo_api_key,
    },
    workspaceId: kaneoRow.kaneo_workspace_id,
    tenantId: tenantRow.id,
    fuenteId: FUENTE_PRINCIPAL,
    fuenteNombre: tenantRow.nombre,
  };
}

// Las fuentes de Kaneo que el tenant de la sesión puede consultar: siempre
// el Kaneo principal + las adicionales registradas. Sin api keys.
export async function listKaneoFuentes(): Promise<KaneoFuente[]> {
  const tenantRow = await tenantDeLaSesion();
  const admin = createAdminClient();

  const fuentes: KaneoFuente[] = [];

  const { data: principal } = await admin
    .from("tenant_kaneo")
    .select("tenant_id")
    .eq("tenant_id", tenantRow.id)
    .maybeSingle();
  if (principal) {
    fuentes.push({
      id: FUENTE_PRINCIPAL,
      nombre: tenantRow.nombre,
      principal: true,
    });
  }

  const { data: extras } = await admin
    .from("tenant_kaneo_fuentes")
    .select("id, nombre")
    .eq("tenant_id", tenantRow.id)
    .order("creado_en", { ascending: true });
  for (const f of extras ?? []) {
    fuentes.push({ id: f.id, nombre: f.nombre, principal: false });
  }

  return fuentes;
}

// Lee ?fuente= de una request y lo normaliza. No valida nada acá -- la
// validación (que la fuente sea del tenant) la hace getKaneoConfigForCurrentUser.
export function fuenteDeRequest(req: Request): string | undefined {
  const value = new URL(req.url).searchParams.get("fuente")?.trim();
  return value ? value : undefined;
}

// Un solo lugar para traducir un fallo de esta resolución (o de la llamada a
// Kaneo que sigue) a la respuesta HTTP -- así cada ruta de /api/kaneo/* no
// repite el mismo try/catch de 3 líneas.
export function kaneoErrorResponse(err: unknown, fallback: string): Response {
  if (err instanceof KaneoConfigError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  // Antes se devolvía err.message tal cual: incluía la ruta interna de Kaneo y
  // el cuerpo de su respuesta. Ahora el detalle queda en los logs (lo escribe
  // kaneoFetch) y al navegador solo llega un mensaje genérico.
  if (err instanceof KaneoHttpError) {
    const mapa: Record<number, [number, string]> = {
      400: [400, "Solicitud inválida."],
      422: [400, "Solicitud inválida."],
      404: [404, "No encontrado en Kaneo."],
      401: [502, "Kaneo rechazó la credencial de este cliente."],
      403: [502, "Kaneo no permite esta operación con la credencial de este cliente."],
    };
    const [status, mensaje] = mapa[err.status] ?? [502, fallback];
    return Response.json({ error: mensaje }, { status });
  }
  console.error("[kaneo]", err);
  return Response.json({ error: fallback }, { status: 502 });
}
