import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { validarTokenAgente } from "@/lib/bandeja/tokenAgente";
import { bodyValido } from "@/lib/api/validarBody";
import { calcularVentana24h } from "@/lib/bandeja/texto";
import { enviarMensajeInstagramDirecto, type MetaConexion } from "@/lib/meta/client";

const SchemaResponderAgente = z.object({
  conversacion_id: z.string().uuid("ID de conversación inválido"),
  texto: z.string().min(1, "El texto no puede estar vacío").max(1000, "Máximo 1000 caracteres"),
});

// POST /api/bandeja/agente/responder
// Envía una respuesta por DM a nombre de la cuenta usando Claude Code.
// Protegido con Bearer token de agente.
export async function POST(request: Request) {
  const auth = await validarTokenAgente(request);
  if (!auth.valido) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const validacion = await bodyValido(request, SchemaResponderAgente);
  if (validacion instanceof Response) return validacion;
  const { conversacion_id, texto } = validacion.data;

  const supabase = createAdminClient();

  // 1. Obtener la conversación
  const { data: conv, error: convErr } = await supabase
    .from("ig_conversaciones")
    .select("id, conexion_id, tenant_id, ig_usuario_id, ultimo_mensaje_usuario_en, estado")
    .eq("id", conversacion_id)
    .maybeSingle();

  if (convErr || !conv) {
    return Response.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  // 2. Verificar ventana de 24 horas
  const ventana = calcularVentana24h(conv.ultimo_mensaje_usuario_en);
  if (ventana.vencida) {
    return Response.json(
      {
        error: "No se puede responder: la ventana de 24 horas de Meta ya venció. El usuario debe enviar un nuevo mensaje.",
      },
      { status: 400 }
    );
  }

  // 3. Obtener credenciales de Meta de la conexión
  const { data: conexion, error: conxErr } = await supabase
    .from("meta_conexiones")
    .select("id, instagram_business_id, instagram_access_token")
    .eq("id", conv.conexion_id)
    .single<MetaConexion>();

  if (conxErr || !conexion || !conexion.instagram_access_token || !conexion.instagram_business_id) {
    return Response.json(
      { error: "La cuenta de Instagram asociada no tiene un token activo o ID configurado." },
      { status: 400 }
    );
  }

  try {
    // 4. Enviar DM a través de Instagram Graph API
    const metaRes = await enviarMensajeInstagramDirecto(
      conexion.instagram_access_token,
      conexion.instagram_business_id,
      conv.ig_usuario_id,
      texto
    );

    // 5. Registrar el mensaje en ig_mensajes
    const { data: mensajeCreado, error: msgErr } = await supabase
      .from("ig_mensajes")
      .insert({
        conversacion_id: conv.id,
        remitente: "cuenta",
        texto,
        enviado_por: "claude",
        estado_envio: "enviado",
        meta_mensaje_id: metaRes.messageId ?? null,
      })
      .select()
      .single();

    if (msgErr) {
      console.error("Error guardando mensaje en ig_mensajes:", msgErr);
    }

    // 6. Actualizar conversación a respondida
    await supabase
      .from("ig_conversaciones")
      .update({
        estado: "respondida",
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", conv.id);

    // 7. Registrar en ig_acciones
    await supabase.from("ig_acciones").insert({
      conexion_id: conv.conexion_id,
      tenant_id: conv.tenant_id,
      conversacion_id: conv.id,
      tipo_accion: "respuesta_dm",
      resultado: "exito",
    });

    return Response.json({
      ok: true,
      mensaje: mensajeCreado,
      meta_message_id: metaRes.messageId,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Error desconocido enviando mensaje a Meta";

    // Registrar fallo en ig_acciones
    await supabase.from("ig_acciones").insert({
      conexion_id: conv.conexion_id,
      tenant_id: conv.tenant_id,
      conversacion_id: conv.id,
      tipo_accion: "respuesta_dm",
      resultado: "error",
      error_detalle: errorMsg,
    });

    return Response.json({ error: errorMsg }, { status: 500 });
  }
}
