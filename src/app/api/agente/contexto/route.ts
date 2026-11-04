import { createAdminClient } from "@/lib/supabase/admin";
import { tokenDePortal } from "@/lib/bandeja/tokenAgente";

// GET /api/agente/contexto
// Portal del token, sus pilares y la guía de marca de sus cuentas de Instagram.
export async function GET(request: Request) {
  const auth = await tokenDePortal(request);
  if (auth instanceof Response) return auth;

  const admin = createAdminClient();
  const [{ data: tenant }, { data: pilares }, { data: vinculos }] = await Promise.all([
    admin.from("tenants").select("id, nombre, slug").eq("id", auth.tenantId).maybeSingle(),
    admin.from("portal_pilares").select("id, icono, titulo, texto, orden").eq("tenant_id", auth.tenantId).order("orden"),
    admin.from("portal_meta_conexiones").select("conexion_id").eq("tenant_id", auth.tenantId),
  ]);

  const conexionIds = (vinculos ?? []).map((v) => v.conexion_id);
  // Lista cerrada de columnas: meta_conexiones también guarda los tokens de Meta.
  const { data: cuentas } = conexionIds.length
    ? await admin.from("meta_conexiones").select("id, cliente_nombre, instagram_username, guia_marca").in("id", conexionIds)
    : { data: [] };

  return Response.json({ portal: tenant, puede_escribir: auth.puedeEscribir, pilares: pilares ?? [], cuentas: cuentas ?? [] });
}
