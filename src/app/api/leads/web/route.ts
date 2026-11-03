import { createAdminClient } from "@/lib/supabase/admin";
import { bodyValido } from "@/lib/api/validarBody";
import { secretoValido } from "@/lib/leads/secreto";
import { leadWebSchema } from "@/lib/leads/schemas";

// POST /api/leads/web
// La llama el servidor de la web, nunca el navegador: el secreto no debe llegar al cliente.
export async function POST(request: Request) {
  const secreto = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? null;
  if (!secretoValido(secreto, process.env.LEADS_WEB_SECRET)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const tenantId = process.env.LEADS_WEB_TENANT_ID;
  if (!tenantId) return Response.json({ error: "Falta configurar el portal de destino" }, { status: 500 });

  const validado = await bodyValido(request, leadWebSchema);
  if (validado instanceof Response) return validado;
  const { nombre, email, asunto, mensaje, oferta, origen, utm } = validado.data;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("leads_web")
    .insert({ tenant_id: tenantId, nombre, email, asunto, mensaje, oferta, origen, utm: utm ?? {}, autorizado_en: new Date().toISOString() })
    .select("id")
    .single();

  if (error) return Response.json({ error: "No se pudo guardar el lead" }, { status: 500 });
  return Response.json({ id: data.id }, { status: 201 });
}
