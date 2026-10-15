import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAsygnuzAdmin } from "@/lib/portal/adminAuth";
import { bodyValido } from "@/lib/api/validarBody";
import { calcularVentana24h } from "@/lib/bandeja/texto";
import { enviarMensajeInstagramDirecto, type MetaConexion } from "@/lib/meta/client";

const SchemaResponder = z.object({
  texto: z.string().min(1, "El texto no puede estar vacío").max(1000, "Máximo 1000 caracteres"),
});

// POST /api/bandeja/conversaciones/[id]/responder
// Envía un mensaje manual por DM desde la interfaz del dashboard.
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
  const { texto } = validacion.data;

  const supabase = createAdminClient();

  // 1. Obtener la conversación
  const { data: conv, error: convErr } = await supabase
    .from("ig_conversaciones")
    .select("id, conexion_id, tenant_id, ig_usuario_id, ultimo_mensaje_usuario_en")
    .eq("id", id)
    .maybeSingle();

  if (convErr || !conv) {
    return Response.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  // 2. Comprobar ventana de 24 horas
  const ventana = calcularVentana24h(conv.ultimo_mensaje_usuario_en);
  if (ventana.vencida) {
    return Response.json(
      {
        error: "No se puede enviar el mensaje: la ventana de 24 horas de Meta ha vencido.",
      },
      { status: 400 }
    );
  }

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
    // 4. Enviar DM por la Graph API
    const metaRes = await enviarMensajeInstagramDirecto(
      conexion.instagram_access_token,
      conexion.instagram_business_id,
      conv.ig_usuario_id,
      texto
    );

    // 5. Guardar en ig_mensajes
    const { data: mensajeCreado, error: msgErr } = await supabase
      .from("ig_mensajes")
      .insert({
        conversacion_id: conv.id,
        remitente: "cuenta",
        texto,
        enviado_por: "dashboard",
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

    // 7. Registrar acción
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
