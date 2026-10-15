import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { bodyValido } from "@/lib/api/validarBody";
import { determinarCanalRespuesta } from "@/lib/bandeja/texto";
import {
  enviarMensajeInstagramDirecto,
  enviarRespuestaPrivadaComentario,
  publicarRespuestaComentario,
  type MetaConexion,
} from "@/lib/meta/client";

const SchemaResponder = z.object({
  texto: z.string().min(1, "El texto no puede estar vacío").max(1000, "Máximo 1000 caracteres"),
  tipo_envio: z.enum(["automatica", "privada", "publica"]).default("automatica"),
});

// POST /api/bandeja/conversaciones/[id]/responder
// Envía un mensaje manual respetando estrictamente las políticas de Meta contra DMs en frío.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAsygnuzAdmin();
  if (auth instanceof Response) return auth;

  const { id } = await params;
  if (!id) return Response.json({ error: "Falta ID de conversación" }, { status: 400 });

  const validacion = await bodyValido(request, SchemaResponder);
  if (validacion instanceof Response) return validacion;
  const { texto, tipo_envio } = validacion.data;

  const supabase = createAdminClient();

  // 1. Obtener la conversación completa
  const { data: conv, error: convErr } = await supabase
    .from("ig_conversaciones")
    .select(
      "id, conexion_id, tenant_id, ig_usuario_id, ultimo_mensaje_usuario_en, ultimo_dm_usuario_en, ha_enviado_dm, comment_id_origen, respuesta_privada_enviada, estado"
    )
    .eq("id", id)
    .maybeSingle();

  if (convErr || !conv) {
    return Response.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  // 2. Determinar canal permitido según políticas de Meta
  const canalInfo = determinarCanalRespuesta(conv);

  // 3. Obtener credenciales de Meta
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
    let metaMessageId: string | undefined;
    let tipoAccion = "respuesta_dm";
    let actualizacionConv: Record<string, unknown> = {
      estado: "respondida",
      actualizado_en: new Date().toISOString(),
    };

    if (tipo_envio === "publica") {
      if (!conv.comment_id_origen) {
        return Response.json(
          { error: "Esta conversación no tiene un comentario de origen para responder públicamente." },
          { status: 400 }
        );
      }
      const resPub = await publicarRespuestaComentario(
        conexion.instagram_access_token,
        conv.comment_id_origen,
        texto
      );
      metaMessageId = resPub.commentId;
      tipoAccion = "respuesta_publica_comentario";
    } else {
      // Envío privado: verificar canal permitido
      if (canalInfo.canal === "solo_publica") {
        return Response.json(
          {
            error: `No se puede enviar mensaje privado a este usuario (riesgo de bloqueo por DM en frío): ${canalInfo.motivo}`,
            canal_respuesta: "solo_publica",
          },
          { status: 400 }
        );
      }

      if (canalInfo.canal === "respuesta_privada") {
        if (!conv.comment_id_origen) {
          return Response.json(
            { error: "Falta el ID del comentario de origen para la respuesta privada." },
            { status: 400 }
          );
        }
        const resPriv = await enviarRespuestaPrivadaComentario(
          conexion.instagram_access_token,
          conexion.instagram_business_id,
          conv.comment_id_origen,
          texto
        );
        metaMessageId = resPriv.messageId;
        tipoAccion = "respuesta_privada_comentario";
        actualizacionConv.respuesta_privada_enviada = true;
      } else {
        // canal === 'dm': DM normal permitido
        const metaRes = await enviarMensajeInstagramDirecto(
          conexion.instagram_access_token,
          conexion.instagram_business_id,
          conv.ig_usuario_id,
          texto
        );
        metaMessageId = metaRes.messageId;
        tipoAccion = "respuesta_dm";
      }
    }

    // 4. Guardar en ig_mensajes
    const { data: mensajeCreado, error: msgErr } = await supabase
      .from("ig_mensajes")
      .insert({
        conversacion_id: conv.id,
        remitente: "cuenta",
        texto,
        enviado_por: "dashboard",
        estado_envio: "enviado",
        meta_mensaje_id: metaMessageId ?? null,
      })
      .select()
      .single();

    if (msgErr) {
      console.error("Error guardando mensaje en ig_mensajes:", msgErr);
    }

    // 5. Actualizar conversación
    await supabase
      .from("ig_conversaciones")
      .update(actualizacionConv)
      .eq("id", conv.id);

    // 6. Registrar acción exitosa
    await supabase.from("ig_acciones").insert({
      conexion_id: conv.conexion_id,
      tenant_id: conv.tenant_id,
      conversacion_id: conv.id,
      tipo_accion: tipoAccion,
      resultado: "exito",
    });

    return Response.json({
      ok: true,
      mensaje: mensajeCreado,
      meta_message_id: metaMessageId,
      canal_usado: tipoAccion,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Error desconocido enviando mensaje a Meta";

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
