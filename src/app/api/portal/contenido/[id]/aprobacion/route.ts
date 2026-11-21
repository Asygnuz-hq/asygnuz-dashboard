import { createClient } from "@/lib/supabase/server";
import { tenantIdValido } from "@/lib/portal/tenantId";
import { bodyValido } from "@/lib/api/validarBody";
import { aprobacionClienteSchema } from "@/lib/portal/schemas";

// Permite al cliente aprobar o pedir ajustes sobre una pieza propia vía
// RPC security definer (sin otorgar UPDATE directo por RLS).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!tenantIdValido(id)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }

  const validado = await bodyValido(request, aprobacionClienteSchema);
  if (validado instanceof Response) return validado;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "No autenticado." }, { status: 401 });

  const { data, error } = await supabase.rpc("responder_aprobacion_contenido", {
    p_contenido_id: id,
    p_estado: validado.data.estado,
    p_comentario: validado.data.comentario ?? null,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila) {
    return Response.json({ error: "Pieza no encontrada o sin permiso." }, { status: 404 });
  }

  return Response.json({ aprobacion: fila });
}
