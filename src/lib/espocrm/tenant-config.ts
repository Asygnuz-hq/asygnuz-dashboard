import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EspoConfig } from "./client";

// Credenciales del EspoCRM del tenant de la sesión (Kaneo #34) — mismo
// patrón que src/lib/kaneo/tenant-config.ts:
// 1) tenant_actual() con el cliente de la sesión (RLS activo) determina el
//    tenant, sin confiar en nada que mande el navegador.
// 2) tenant_espocrm con createAdminClient() (service_role): la tabla no tiene
//    ninguna política RLS a propósito (schema-espocrm-por-tenant.sql).
// null = el tenant no tiene un EspoCRM conectado.
export async function getEspoConfigForCurrentUser(supabase: SupabaseClient): Promise<EspoConfig | null> {
  const { data: tenantRows } = await supabase.rpc("tenant_actual");
  const tenantRow = Array.isArray(tenantRows) ? tenantRows[0] : tenantRows;
  if (!tenantRow?.id) return null;

  const { data } = await createAdminClient()
    .from("tenant_espocrm")
    .select("espocrm_api_url, espocrm_api_key")
    .eq("tenant_id", tenantRow.id)
    .maybeSingle<{ espocrm_api_url: string; espocrm_api_key: string }>();
  if (!data) return null;

  return { apiUrl: data.espocrm_api_url.replace(/\/+$/, ""), apiKey: data.espocrm_api_key };
}
