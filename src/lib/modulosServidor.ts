import type { SupabaseClient } from "@supabase/supabase-js";
import type { Modulo } from "@/lib/moduloDeRuta";

const ORDEN: Modulo[] = ["financiero", "marketing_pauta", "crm", "operacion", "nomina"];

// Módulos que tiene contratados el tenant de la sesión, resueltos EN EL
// SERVIDOR. Antes la única barrera era esconder botones en el switcher:
// entrando por URL directa se veía cualquier módulo. null = no se pudo
// resolver (se trata como "sin acceso", nunca como "todo permitido").
export async function modulosDelTenant(supabase: SupabaseClient): Promise<Record<string, boolean> | null> {
  const { data, error } = await supabase.rpc("modulos_habilitados_tenant");
  if (error || !data || typeof data !== "object") return null;
  return data as Record<string, boolean>;
}

export function primerModuloHabilitado(modulos: Record<string, boolean>): Modulo | null {
  return ORDEN.find((m) => modulos[m] === true) ?? null;
}
