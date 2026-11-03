import { createAdminClient } from "@/lib/supabase/admin";
import { auditarAgente, tokenDePortal } from "@/lib/bandeja/tokenAgente";
import { bodyValido } from "@/lib/api/validarBody";
import { crearContenidoSchema, ESTADOS_CONTENIDO } from "@/lib/portal/schemas";
import { columnasContenido } from "@/lib/portal/contenido";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/agente/parrilla?desde=AAAA-MM-DD&hasta=AAAA-MM-DD&estado=revision
export async function GET(request: Request) {
  const auth = await tokenDePortal(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const estado = searchParams.get("estado");
  if ((desde && !FECHA.test(desde)) || (hasta && !FECHA.test(hasta))) {
    return Response.json({ error: "fecha inválida (AAAA-MM-DD)" }, { status: 400 });
  }
  if (estado && !(ESTADOS_CONTENIDO as readonly string[]).includes(estado)) {
    return Response.json({ error: "estado inválido" }, { status: 400 });
  }

  let consulta = createAdminClient()
    .from("portal_contenido")
    .select("*")
    .eq("tenant_id", auth.tenantId)
    .order("fecha_publicacion", { ascending: true, nullsFirst: false });
  if (desde) consulta = consulta.gte("fecha_publicacion", desde);
  if (hasta) consulta = consulta.lte("fecha_publicacion", hasta);
  if (estado) consulta = consulta.eq("estado", estado);

  const { data, error } = await consulta;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ contenido: data });
}

// POST /api/agente/parrilla
export async function POST(request: Request) {
  const auth = await tokenDePortal(request, true);
  if (auth instanceof Response) return auth;

  const validado = await bodyValido(request, crearContenidoSchema);
  if (validado instanceof Response) return validado;

  const admin = createAdminClient();
  const { count } = await admin
    .from("portal_contenido")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", auth.tenantId);

  const columnas = columnasContenido(validado.data);
  const { data, error } = await admin
    .from("portal_contenido")
    .insert({ tenant_id: auth.tenantId, ...columnas, orden: count ?? 0 })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  await auditarAgente(auth, "parrilla.crear", data.id, columnas);
  return Response.json({ contenido: data });
}
