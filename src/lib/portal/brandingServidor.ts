import { createAdminClient } from "@/lib/supabase/admin";
import type { BrandingPortal } from "@/lib/portal/subdominio";

/**
 * Resuelve en el servidor el branding visual (no sensible) de un portal de
 * cliente por su subdominio o slug. Solo responde para tenants con el módulo
 * `portal_cliente` activo.
 */
export async function obtenerBrandingPorSubdominio(
  subdominio: string | null | undefined
): Promise<BrandingPortal | null> {
  if (!subdominio) return null;
  const limpio = subdominio.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(limpio)) return null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("tenants")
      .select("id, nombre, slug, subdominio, logo_url, color_acento, tagline_portal, splash_habilitado, modulos_habilitados")
      .or(`subdominio.eq.${limpio},slug.eq.${limpio}`)
      .limit(5);

    if (error || !data) return null;

    const fila = data.find(
      (t) =>
        t.modulos_habilitados &&
        typeof t.modulos_habilitados === "object" &&
        (t.modulos_habilitados as Record<string, unknown>).portal_cliente === true
    );
    if (!fila) return null;

    return {
      id: fila.id,
      nombre: fila.nombre,
      slug: fila.slug,
      subdominio: fila.subdominio ?? null,
      logoUrl: fila.logo_url ?? null,
      colorAcento: fila.color_acento ?? null,
      taglinePortal: fila.tagline_portal ?? null,
      splashHabilitado: fila.splash_habilitado ?? true,
    };
  } catch {
    return null;
  }
}
