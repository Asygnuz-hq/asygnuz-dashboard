import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { KaneoConfig } from "./client";

// Resuelve las credenciales de Kaneo del tenant del usuario que hace la
// petición -- nunca de una variable de entorno global, y nunca de un
// tenantId que venga del cliente (eso abriría la puerta a que un cliente
// del SaaS pida el Kaneo de otro solo cambiando un parámetro).
//
// Dos pasos, dos clientes de Supabase distintos a propósito:
// 1) tenant_actual() con el cliente normal (RLS activo, atado a la cookie
//    de sesión) -- determina el tenant sin confiar en nada que mande el
//    llamador.
// 2) tenant_kaneo con createAdminClient() (service_role) -- esa tabla no
//    tiene ninguna política RLS a propósito (ver schema-kaneo-por-tenant.sql),
//    así que solo el servidor puede leerla, jamás un componente de cliente.
export class KaneoConfigError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function getKaneoConfigForCurrentUser(): Promise<{
  config: KaneoConfig;
  workspaceId: string;
  tenantId: string;
}> {
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
    throw new KaneoConfigError("No se pudo determinar la organización del usuario", 403);
  }

  const admin = createAdminClient();
  const { data: kaneoRow } = await admin
    .from("tenant_kaneo")
    .select("kaneo_api_url, kaneo_workspace_id, kaneo_api_key")
    .eq("tenant_id", tenantRow.id)
    .maybeSingle();
  if (!kaneoRow) {
    throw new KaneoConfigError("Este cliente no tiene el módulo de gestión de proyectos configurado", 404);
  }

  return {
    config: { apiUrl: kaneoRow.kaneo_api_url, apiKey: kaneoRow.kaneo_api_key },
    workspaceId: kaneoRow.kaneo_workspace_id,
    tenantId: tenantRow.id,
  };
}

// Un solo lugar para traducir un fallo de esta resolución (o de la llamada a
// Kaneo que sigue) a la respuesta HTTP -- así cada ruta de /api/kaneo/* no
// repite el mismo try/catch de 3 líneas.
export function kaneoErrorResponse(err: unknown, fallback: string): Response {
  if (err instanceof KaneoConfigError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  return Response.json(
    { error: err instanceof Error ? err.message : fallback },
    { status: 502 }
  );
}
