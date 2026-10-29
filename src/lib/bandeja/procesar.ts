import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { coincidePalabraClave } from "@/lib/bandeja/texto";
import {
  enviarMensajeInstagramDirecto,
  enviarRespuestaPrivadaComentario,
  publicarRespuestaComentario,
  type MetaConexion,
} from "@/lib/meta/client";
import type { IgFlujo, BotonFlujo } from "./tipos";

/**
 * Valida la firma HMAC SHA256 de Meta contra el cuerpo crudo.
 * Falla cerrada: si falta secreto o firma, retorna false inmediatamente.
 */
export function validarFirmaMeta(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string | null | undefined
): boolean {
  if (!appSecret || !signatureHeader) {
    return false;
  }

  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(rawBody, "utf8");
  const expected = "sha256=" + hmac.digest("hex");

  const sigBuf = Buffer.from(signatureHeader, "utf8");
  const expBuf = Buffer.from(expected, "utf8");

  if (sigBuf.byteLength !== expBuf.byteLength) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expBuf);
}

/**
 * Valida el secreto compartido de n8n en tiempo constante.
 */
export function validarBearerSecret(
  authHeader: string | null | undefined,
  secret: string | null | undefined
): boolean {
  if (!secret || !authHeader) return false;
  const prefix = "Bearer ";
  if (!authHeader.startsWith(prefix)) return false;
  const token = authHeader.slice(prefix.length).trim();
  const tokenBuf = Buffer.from(token, "utf8");
  const secretBuf = Buffer.from(secret, "utf8");

  if (tokenBuf.byteLength !== secretBuf.byteLength) return false;
  return crypto.timingSafeEqual(tokenBuf, secretBuf);
}

/**
 * Verifica si la cuenta ha alcanzado el límite por hora de respuestas automáticas exitosas.
 * Por defecto 60 acciones por hora.
 */
export async function verificarLimitePorHora(
  supabase: ReturnType<typeof createAdminClient>,
  conexionId: string,
  topeMaximo: number = 60
): Promise<{ permitido: boolean; totalAccionesHora: number }> {
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("ig_acciones")
    .select("id", { count: "exact", head: true })
    .eq("conexion_id", conexionId)
    .eq("resultado", "exito")
    .gte("ejecutado_en", haceUnaHora);

  if (error) {
    console.error("[Bandeja] Error consultando límite por hora:", error);
  }

  const total = count ?? 0;
  return {
    permitido: total < topeMaximo,
    totalAccionesHora: total,
  };
}

/**
 * Formatea el texto de una respuesta automática inyectando los enlaces de seguimiento
 * para cada botón configurado en el flujo.
 */
function armarTextoConBotones(
  textoBase: string,
  botones: BotonFlujo[] | undefined,
  linksTracking: { id: string; url_destino: string; titulo: string | null }[],
  dominioLinks?: string | null
): string {
  if (!botones || botones.length === 0) return textoBase;

  // Dominio propio de la cuenta (ej. https://valentinamkt.online) si lo tiene
  // configurado; si no, el del dashboard.
  const baseUrl = (
    dominioLinks ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://app.asygnuz.com"
  ).replace(/\/+$/, "");

  const mapLinks = new Map(linksTracking.map((l) => [l.url_destino, l.id]));

  const lineasBotones = botones.map((b) => {
    const linkId = mapLinks.get(b.url);
    const linkUrl = linkId ? `${baseUrl}/r/${linkId}` : b.url;
    return `👉 ${b.titulo}: ${linkUrl}`;
  });

  return `${textoBase}\n\n${lineasBotones.join("\n")}`;
}

/**
 * Crea un link de seguimiento propio para este envío (con la publicación y la palabra
 * clave que lo originó) a partir de los links base del flujo. Si falla, usa los base:
 * el clic igual se cuenta, solo sin detalle de publicación.
 */
async function crearLinksEnvio(
  supabase: ReturnType<typeof createAdminClient>,
  flujo: IgFlujo,
  conexionId: string,
  tenantId: string | null,
  mediaId: string | null,
  palabraClave: string | null,
  eventoId: string | null
): Promise<{ id: string; url_destino: string; titulo: string | null }[]> {
  if (!flujo.botones || flujo.botones.length === 0) return [];

  const { data: base } = await supabase
    .from("ig_links_tracking")
    .select("id, url_destino, titulo")
    .eq("flujo_id", flujo.id)
    .eq("por_envio", false);

  if (!base || base.length === 0) return [];

  const { data: nuevos, error } = await supabase
    .from("ig_links_tracking")
    .insert(
      base.map((l) => ({
        flujo_id: flujo.id,
        conexion_id: conexionId,
        tenant_id: tenantId,
        url_destino: l.url_destino,
        titulo: l.titulo,
        por_envio: true,
        media_id: mediaId,
        palabra_clave: palabraClave,
        evento_id: eventoId,
      }))
    )
    .select("id, url_destino, titulo");

  if (error || !nuevos) {
    console.error("[Bandeja] Error creando links por envío:", error);
    return base;
  }
  return nuevos;
}

export interface ResultadoProcesamiento {
  ok: boolean;
  eventosProcesados: number;
  descartados: number;
  duplicados: number;
  errores: string[];
}

/**
 * Núcleo de procesamiento de webhooks de Instagram en el servidor del dashboard.
 * Ejecuta deduplicación, creación de conversación, control de ventana y cold DM,
 * coincidencia de flujos, límite por hora y registro de auditoría en ig_acciones.
 */
export async function procesarEventoWebhook(
  rawBody: string,
  _headers?: Record<string, string | undefined>
): Promise<ResultadoProcesamiento> {
  const supabase = createAdminClient();
  const topePorHora = Number(process.env.BANDEJA_LIMITE_POR_HORA || "60");

  let parsedBody: Record<string, unknown>;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch (err) {
    return {
      ok: false,
      eventosProcesados: 0,
      descartados: 1,
      duplicados: 0,
      errores: [`JSON inválido: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  const entries = Array.isArray(parsedBody.entry) ? parsedBody.entry : [];
  let eventosProcesados = 0;
  let descartados = 0;
  let duplicados = 0;
  const errores: string[] = [];

  for (const entry of entries) {
    const instagramBusinessId = String(entry.id || "");
    if (!instagramBusinessId) {
      console.warn("[Bandeja] Entry de webhook sin id de cuenta:", entry);
      descartados++;
      continue;
    }

    // 1. Identificar la conexión en base de datos
    const { data: conexion, error: conxErr } = await supabase
      .from("meta_conexiones")
      .select("id, instagram_business_id, instagram_user_id, instagram_access_token, instagram_username, cliente_nombre, dominio_links")
      // entry.id de los webhooks es el id de cuenta profesional (instagram_user_id);
      // el sondeo usa el de Instagram Login (instagram_business_id). Ver
      // supabase/schema-instagram-user-id.sql.
      .or(`instagram_business_id.eq.${instagramBusinessId},instagram_user_id.eq.${instagramBusinessId}`)
      .limit(1)
      .maybeSingle<
        MetaConexion & { instagram_user_id: string | null; dominio_links: string | null }
      >();

    if (conxErr || !conexion) {
      console.warn(
        `[Bandeja] Evento descartado: no existe conexión registrada para instagram_business_id = ${instagramBusinessId}`
      );
      descartados++;
      continue;
    }

    if (!conexion.instagram_access_token) {
      console.warn(
        `[Bandeja] Conexión ${conexion.id} sin instagram_access_token activo. Se descarta envío.`
      );
      descartados++;
      continue;
    }

    // Resolver tenant_id a través de portal_meta_conexiones si existe vinculación
    const { data: portalRel } = await supabase
      .from("portal_meta_conexiones")
      .select("tenant_id")
      .eq("conexion_id", conexion.id)
      .maybeSingle();

    const tenantId = portalRel?.tenant_id ?? null;

    // Ids con los que la propia cuenta puede aparecer como autora (para no
    // responderse a sí misma).
    const idsPropios = new Set(
      [instagramBusinessId, conexion.instagram_business_id, conexion.instagram_user_id]
        .filter(Boolean)
        .map(String)
    );
    const esPropio = (id?: string | null, username?: string | null) =>
      (id != null && idsPropios.has(String(id))) ||
      (!!username && !!conexion.instagram_username && username === conexion.instagram_username);

    // 2. Extraer eventos de mensajes directos (DMs)
    const messagingList = Array.isArray(entry.messaging) ? entry.messaging : [];
    for (const msg of messagingList) {
      // Ignorar ecos generados por la propia cuenta
      if (msg.message?.is_echo) continue;
      if (esPropio(msg.sender?.id)) continue;

      const senderId = String(msg.sender?.id || "");
      if (!senderId) continue;

      const mid = msg.message?.mid || `dm_${instagramBusinessId}_${senderId}_${msg.timestamp || Date.now()}`;
      const textoMensaje = String(msg.message?.text || "").trim();

      // 3. Deduplicación en ig_eventos
      const { data: existeEvento } = await supabase
        .from("ig_eventos")
        .select("id")
        .eq("meta_evento_id", mid)
        .maybeSingle();

      if (existeEvento) {
        duplicados++;
        continue;
      }

      // Guardar evento en ig_eventos
      const { data: eventoGuardado, error: errEvt } = await supabase
        .from("ig_eventos")
        .insert({
          meta_evento_id: mid,
          tipo: "message",
          conexion_id: conexion.id,
          tenant_id: tenantId,
          ig_usuario_id: senderId,
          texto: textoMensaje,
          crudo: msg,
        })
        .select()
        .single();

      if (errEvt) {
        // Violación de clave única por evento concurrente
        duplicados++;
        continue;
      }

      eventosProcesados++;

      // 4. Crear o actualizar la conversación
      const ahoraIso = new Date().toISOString();
      const { data: convExistente } = await supabase
        .from("ig_conversaciones")
        .select("id, ha_enviado_dm, estado")
        .eq("conexion_id", conexion.id)
        .eq("ig_usuario_id", senderId)
        .maybeSingle();

      const esPrimerDm = !convExistente || !convExistente.ha_enviado_dm;

      let convId = convExistente?.id;
      if (!convExistente) {
        const { data: nuevaConv } = await supabase
          .from("ig_conversaciones")
          .insert({
            conexion_id: conexion.id,
            tenant_id: tenantId,
            ig_usuario_id: senderId,
            ha_enviado_dm: true,
            ultimo_dm_usuario_en: ahoraIso,
            ultimo_mensaje_usuario_en: ahoraIso,
            ultimo_mensaje_texto: textoMensaje,
            tipo_ultimo_evento: "message",
            estado: "pendiente",
          })
          .select("id")
          .single();
        convId = nuevaConv?.id;
      } else {
        await supabase
          .from("ig_conversaciones")
          .update({
            ha_enviado_dm: true,
            ultimo_dm_usuario_en: ahoraIso,
            ultimo_mensaje_usuario_en: ahoraIso,
            ultimo_mensaje_texto: textoMensaje,
            tipo_ultimo_evento: "message",
            estado: "pendiente",
            actualizado_en: ahoraIso,
          })
          .eq("id", convExistente.id);
      }

      // Registrar mensaje entrante en ig_mensajes
      if (convId) {
        await supabase.from("ig_mensajes").insert({
          conversacion_id: convId,
          remitente: "usuario",
          texto: textoMensaje,
          estado_envio: "enviado",
          meta_mensaje_id: mid,
        });
      }

      // 5. Buscar flujos automáticos por palabra clave
      const { data: flujos } = await supabase
        .from("ig_flujos")
        .select("*")
        .eq("conexion_id", conexion.id)
        .eq("activo", true);

      let flujoCoincidente: IgFlujo | null = null;
      let palabraCoincidente: string | null = null;
      for (const f of (flujos ?? []) as IgFlujo[]) {
        if (f.aplica_a === "comentarios") continue; // Este flujo solo aplica a comentarios
        const palabra = coincidePalabraClave(textoMensaje, f.palabras_clave);
        if (palabra) {
          flujoCoincidente = f;
          palabraCoincidente = palabra;
          break;
        }
      }

      // 6. Ejecutar respuesta automática de flujo o bienvenida
      if (flujoCoincidente) {
        // Verificar límite por hora
        const limite = await verificarLimitePorHora(supabase, conexion.id, topePorHora);
        if (!limite.permitido) {
          await supabase.from("ig_acciones").insert({
            conexion_id: conexion.id,
            tenant_id: tenantId,
            flujo_id: flujoCoincidente.id,
            evento_id: eventoGuardado.id,
            conversacion_id: convId ?? null,
            tipo_accion: "flujo_dm",
            resultado: "limite_alcanzado",
            error_detalle: `Tope de ${topePorHora} respuestas/hora alcanzado`,
          });
          continue;
        }

        // Un link de tracking propio para este envío (sin publicación: es un DM directo)
        const links = await crearLinksEnvio(
          supabase,
          flujoCoincidente,
          conexion.id,
          tenantId,
          null,
          palabraCoincidente,
          eventoGuardado.id
        );

        const textoFinal = armarTextoConBotones(
          flujoCoincidente.respuesta_privada,
          flujoCoincidente.botones,
          links,
          conexion.dominio_links
        );

        try {
          const resMeta = await enviarMensajeInstagramDirecto(
            conexion.instagram_access_token,
            conexion.instagram_business_id!,
            senderId,
            textoFinal
          );

          if (convId) {
            await supabase.from("ig_mensajes").insert({
              conversacion_id: convId,
              remitente: "cuenta",
              texto: textoFinal,
              enviado_por: "n8n",
              estado_envio: "enviado",
              meta_mensaje_id: resMeta.messageId ?? null,
            });

            await supabase
              .from("ig_conversaciones")
              .update({ estado: "respondida", actualizado_en: new Date().toISOString() })
              .eq("id", convId);
          }

          await supabase.from("ig_acciones").insert({
            conexion_id: conexion.id,
            tenant_id: tenantId,
            flujo_id: flujoCoincidente.id,
            evento_id: eventoGuardado.id,
            conversacion_id: convId ?? null,
            tipo_accion: "flujo_dm",
            resultado: "exito",
          });
        } catch (errEnvio) {
          const msgError = errEnvio instanceof Error ? errEnvio.message : String(errEnvio);
          errores.push(`Error enviando flujo DM: ${msgError}`);
          await supabase.from("ig_acciones").insert({
            conexion_id: conexion.id,
            tenant_id: tenantId,
            flujo_id: flujoCoincidente.id,
            evento_id: eventoGuardado.id,
            conversacion_id: convId ?? null,
            tipo_accion: "flujo_dm",
            resultado: "error",
            error_detalle: msgError,
          });
        }
      } else if (esPrimerDm) {
        // Primer DM de la persona -> verificar si hay mensaje de bienvenida activo
        const { data: bienvenida } = await supabase
          .from("ig_bienvenida")
          .select("*")
          .eq("conexion_id", conexion.id)
          .eq("activo", true)
          .maybeSingle();

        if (bienvenida && bienvenida.mensaje?.trim()) {
          const limite = await verificarLimitePorHora(supabase, conexion.id, topePorHora);
          if (!limite.permitido) {
            await supabase.from("ig_acciones").insert({
              conexion_id: conexion.id,
              tenant_id: tenantId,
              evento_id: eventoGuardado.id,
              conversacion_id: convId ?? null,
              tipo_accion: "bienvenida_dm",
              resultado: "limite_alcanzado",
              error_detalle: `Tope de ${topePorHora} respuestas/hora alcanzado`,
            });
            continue;
          }

          try {
            const resMeta = await enviarMensajeInstagramDirecto(
              conexion.instagram_access_token,
              conexion.instagram_business_id!,
              senderId,
              bienvenida.mensaje
            );

            if (convId) {
              await supabase.from("ig_mensajes").insert({
                conversacion_id: convId,
                remitente: "cuenta",
                texto: bienvenida.mensaje,
                enviado_por: "n8n",
                estado_envio: "enviado",
                meta_mensaje_id: resMeta.messageId ?? null,
              });

              await supabase
                .from("ig_conversaciones")
                .update({ estado: "respondida", actualizado_en: new Date().toISOString() })
                .eq("id", convId);
            }

            await supabase.from("ig_acciones").insert({
              conexion_id: conexion.id,
              tenant_id: tenantId,
              evento_id: eventoGuardado.id,
              conversacion_id: convId ?? null,
              tipo_accion: "bienvenida_dm",
              resultado: "exito",
            });
          } catch (errBnv) {
            const msgError = errBnv instanceof Error ? errBnv.message : String(errBnv);
            errores.push(`Error enviando bienvenida DM: ${msgError}`);
            await supabase.from("ig_acciones").insert({
              conexion_id: conexion.id,
              tenant_id: tenantId,
              evento_id: eventoGuardado.id,
              conversacion_id: convId ?? null,
              tipo_accion: "bienvenida_dm",
              resultado: "error",
              error_detalle: msgError,
            });
          }
        }
      }
    }

    // 7. Extraer eventos de comentarios
    const changesList = Array.isArray(entry.changes) ? entry.changes : [];
    for (const change of changesList) {
      if (change.field !== "comments") continue;
      const val = change.value || {};

      // Ignorar comentarios de la propia cuenta
      if (esPropio(val.from?.id, val.from?.username)) continue;

      const commenterId = String(val.from?.id || "");
      const commentId = String(val.id || "");
      if (!commenterId || !commentId) continue;

      const commenterName = val.from?.username ?? null;
      const textoComentario = String(val.text || "").trim();
      const mediaId = val.media?.id ? String(val.media.id) : null;

      // Deduplicación en ig_eventos
      const { data: existeEvento } = await supabase
        .from("ig_eventos")
        .select("id")
        .eq("meta_evento_id", commentId)
        .maybeSingle();

      if (existeEvento) {
        duplicados++;
        continue;
      }

      // Guardar evento
      const { data: eventoGuardado, error: errEvt } = await supabase
        .from("ig_eventos")
        .insert({
          meta_evento_id: commentId,
          tipo: "comment",
          conexion_id: conexion.id,
          tenant_id: tenantId,
          ig_usuario_id: commenterId,
          ig_usuario_nombre: commenterName,
          texto: textoComentario,
          media_id: mediaId,
          comment_id: commentId,
          crudo: change,
        })
        .select()
        .single();

      if (errEvt) {
        duplicados++;
        continue;
      }

      eventosProcesados++;

      // Crear o actualizar conversación
      const ahoraIso = new Date().toISOString();
      const { data: convExistente } = await supabase
        .from("ig_conversaciones")
        .select("id, ha_enviado_dm")
        .eq("conexion_id", conexion.id)
        .eq("ig_usuario_id", commenterId)
        .maybeSingle();

      let convId = convExistente?.id;
      if (!convExistente) {
        const { data: nuevaConv } = await supabase
          .from("ig_conversaciones")
          .insert({
            conexion_id: conexion.id,
            tenant_id: tenantId,
            ig_usuario_id: commenterId,
            ig_usuario_nombre: commenterName,
            ha_enviado_dm: false,
            comment_id_origen: commentId,
            respuesta_privada_enviada: false,
            ultimo_mensaje_usuario_en: ahoraIso,
            ultimo_mensaje_texto: textoComentario,
            tipo_ultimo_evento: "comment",
            estado: "pendiente",
          })
          .select("id")
          .single();
        convId = nuevaConv?.id;
      } else {
        await supabase
          .from("ig_conversaciones")
          .update({
            ig_usuario_nombre: commenterName ?? undefined,
            comment_id_origen: commentId,
            respuesta_privada_enviada: false, // Nuevo comentario permite nueva respuesta privada
            ultimo_mensaje_usuario_en: ahoraIso,
            ultimo_mensaje_texto: textoComentario,
            tipo_ultimo_evento: "comment",
            estado: "pendiente",
            actualizado_en: ahoraIso,
          })
          .eq("id", convExistente.id);
      }

      // Buscar flujos automáticos por palabra clave aplicables a comentarios
      const { data: flujos } = await supabase
        .from("ig_flujos")
        .select("*")
        .eq("conexion_id", conexion.id)
        .eq("activo", true);

      let flujoCoincidente: IgFlujo | null = null;
      let palabraCoincidente: string | null = null;
      for (const f of (flujos ?? []) as IgFlujo[]) {
        if (f.aplica_a === "mensajes") continue; // Este flujo solo aplica a DMs
        const palabra = coincidePalabraClave(textoComentario, f.palabras_clave);
        if (palabra) {
          flujoCoincidente = f;
          palabraCoincidente = palabra;
          break;
        }
      }

      if (flujoCoincidente) {
        // Verificar límite por hora
        const limite = await verificarLimitePorHora(supabase, conexion.id, topePorHora);
        if (!limite.permitido) {
          await supabase.from("ig_acciones").insert({
            conexion_id: conexion.id,
            tenant_id: tenantId,
            flujo_id: flujoCoincidente.id,
            evento_id: eventoGuardado.id,
            conversacion_id: convId ?? null,
            tipo_accion: "flujo_comentario",
            resultado: "limite_alcanzado",
            error_detalle: `Tope de ${topePorHora} respuestas/hora alcanzado`,
          });
          continue;
        }

        // 1. Respuesta pública al comentario si está configurada
        if (flujoCoincidente.respuesta_publica && flujoCoincidente.respuesta_publica.length > 0) {
          const respPub =
            flujoCoincidente.respuesta_publica[
              Math.floor(Math.random() * flujoCoincidente.respuesta_publica.length)
            ];

          try {
            await publicarRespuestaComentario(conexion.instagram_access_token, commentId, respPub);
            await supabase.from("ig_acciones").insert({
              conexion_id: conexion.id,
              tenant_id: tenantId,
              flujo_id: flujoCoincidente.id,
              evento_id: eventoGuardado.id,
              conversacion_id: convId ?? null,
              tipo_accion: "respuesta_publica_comentario",
              resultado: "exito",
            });
          } catch (errPub) {
            console.error("[Bandeja] Error enviando respuesta pública:", errPub);
          }
        }

        // 2. Respuesta privada al comentario si está configurada
        if (flujoCoincidente.respuesta_privada) {
          const links = await crearLinksEnvio(
            supabase,
            flujoCoincidente,
            conexion.id,
            tenantId,
            mediaId,
            palabraCoincidente,
            eventoGuardado.id
          );

          const textoFinal = armarTextoConBotones(
            flujoCoincidente.respuesta_privada,
            flujoCoincidente.botones,
            links,
            conexion.dominio_links
          );

          try {
            const resMeta = await enviarRespuestaPrivadaComentario(
              conexion.instagram_access_token,
              conexion.instagram_business_id!,
              commentId,
              textoFinal
            );

            if (convId) {
              await supabase.from("ig_mensajes").insert({
                conversacion_id: convId,
                remitente: "cuenta",
                texto: textoFinal,
                enviado_por: "n8n",
                estado_envio: "enviado",
                meta_mensaje_id: resMeta.messageId ?? null,
              });

              await supabase
                .from("ig_conversaciones")
                .update({
                  estado: "respondida",
                  respuesta_privada_enviada: true,
                  actualizado_en: new Date().toISOString(),
                })
                .eq("id", convId);
            }

            await supabase.from("ig_acciones").insert({
              conexion_id: conexion.id,
              tenant_id: tenantId,
              flujo_id: flujoCoincidente.id,
              evento_id: eventoGuardado.id,
              conversacion_id: convId ?? null,
              tipo_accion: "respuesta_privada_comentario",
              resultado: "exito",
            });
          } catch (errPriv) {
            const msgError = errPriv instanceof Error ? errPriv.message : String(errPriv);
            errores.push(`Error enviando respuesta privada a comentario: ${msgError}`);
            await supabase.from("ig_acciones").insert({
              conexion_id: conexion.id,
              tenant_id: tenantId,
              flujo_id: flujoCoincidente.id,
              evento_id: eventoGuardado.id,
              conversacion_id: convId ?? null,
              tipo_accion: "respuesta_privada_comentario",
              resultado: "error",
              error_detalle: msgError,
            });
          }
        }
      }
    }
  }

  return {
    ok: errores.length === 0,
    eventosProcesados,
    descartados,
    duplicados,
    errores,
  };
}
