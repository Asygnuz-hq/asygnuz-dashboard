import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

// Un portal también puede tener vinculadas cuentas de anuncios: un flujo necesita Instagram.
export async function conexionesInstagramDelPortal(admin: Admin, tenantId: string): Promise<string[]> {
  const { data: vinculos, error } = await admin
    .from("portal_meta_conexiones")
    .select("conexion_id")
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
  const ids = (vinculos ?? []).map((v) => v.conexion_id as string);
  if (ids.length === 0) return [];

  const { data: conexiones, error: errorConexiones } = await admin
    .from("meta_conexiones")
    .select("id") // lista cerrada: esta tabla también guarda los tokens de Meta
    .in("id", ids)
    .not("instagram_business_id", "is", null);
  if (errorConexiones) throw new Error(errorConexiones.message);
  return (conexiones ?? []).map((c) => c.id as string);
}

export async function flujosActivosDeConexion(admin: Admin, conexionId: string) {
  const { data, error } = await admin
    .from("ig_flujos")
    .select("id, nombre, palabras_clave, aplica_a")
    .eq("conexion_id", conexionId)
    .eq("activo", true);
  if (error) throw new Error(error.message);
  return data ?? [];
}
