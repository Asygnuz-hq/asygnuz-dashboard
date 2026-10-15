import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { bodyValido } from "@/lib/api/validarBody";
import { calcularVentana24h } from "@/lib/bandeja/texto";

const SchemaActualizarEstado = z.object({
  estado: z.enum(["pendiente", "respondida", "archivada"]),
});

// GET /api/bandeja/conversaciones/[id]
// Trae el detalle de una conversación con su historial completo de mensajes
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const { id } = await params;
  if (!id) return Response.json({ error: "Falta ID de conversación" }, { status: 400 });

  const supabase = createAdminClient();

  // 1. Obtener conversación
  const { data: conv, error: convErr } = await supabase
    .from("ig_conversaciones")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (convErr || !conv) {
    return Response.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  // 2. Obtener datos de la conexión
  const { data: conexion } = await supabase
    .from("meta_conexiones")
    .select("id, cliente_nombre, instagram_username, guia_marca")
    .eq("id", conv.conexion_id)
    .single();

  // 3. Obtener mensajes ordenados cronológicamente
  const { data: mensajes, error: msgErr } = await supabase
    .from("ig_mensajes")
    .select("*")
    .eq("conversacion_id", id)
    .order("creado_en", { ascending: true });

  if (msgErr) {
    return Response.json({ error: msgErr.message }, { status: 500 });
  }

  const ventana = calcularVentana24h(conv.ultimo_mensaje_usuario_en);

  return Response.json({
    conversacion: {
      ...conv,
      horas_restantes: ventana.horasRestantes,
      minutos_restantes: ventana.minutosRestantes,
      vencida: ventana.vencida,
      ventana_etiqueta: ventana.etiqueta,
      cliente_nombre: conexion?.cliente_nombre ?? "Cliente",
      instagram_username: conexion?.instagram_username ?? null,
      guia_marca: conexion?.guia_marca ?? null,
    },
    mensajes: mensajes ?? [],
  });
}

// PATCH /api/bandeja/conversaciones/[id]
// Cambia el estado de una conversación (marcar como respondida, archivar o reabrir)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const { id } = await params;
  if (!id) return Response.json({ error: "Falta ID de conversación" }, { status: 400 });

  const validacion = await bodyValido(request, SchemaActualizarEstado);
  if (validacion instanceof Response) return validacion;
  const { estado } = validacion.data;

  const supabase = createAdminClient();
  const { data: conv, error } = await supabase
    .from("ig_conversaciones")
    .update({ estado, actualizado_en: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, conversacion: conv });
}
