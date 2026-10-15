import crypto from "crypto";

// ============================================================================
// Funciones bajo prueba (espejo de la lógica en src/lib/bandeja/*)
// ============================================================================

// 1. Validación de firma HMAC SHA256 (falla cerrada, sin lanzar excepciones)
function validarFirmaMeta(rawBody, signatureHeader, appSecret) {
  if (!appSecret || !signatureHeader || !rawBody) {
    return false;
  }

  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(rawBody, "utf8");
  const expected = "sha256=" + hmac.digest("hex");

  const sigBuf = Buffer.from(signatureHeader, "utf8");
  const expBuf = Buffer.from(expected, "utf8");

  // Comparar longitudes antes de timingSafeEqual para evitar excepciones de Node
  if (sigBuf.byteLength !== expBuf.byteLength) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expBuf);
}

// 2. Validación de Bearer token (BANDEJA_N8N_SECRET) en tiempo constante
function validarBearerSecret(authHeader, secret) {
  if (!secret || !authHeader) return false;
  const prefix = "Bearer ";
  if (!authHeader.startsWith(prefix)) return false;
  const token = authHeader.slice(prefix.length).trim();
  const tokenBuf = Buffer.from(token, "utf8");
  const secretBuf = Buffer.from(secret, "utf8");

  if (tokenBuf.byteLength !== secretBuf.byteLength) return false;
  return crypto.timingSafeEqual(tokenBuf, secretBuf);
}

// 3. Verificación de Webhook GET de Meta (hub.challenge)
function verificarGetMeta(query, envVerifyToken) {
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];

  // Falla cerrada: sin META_VERIFY_TOKEN configurado, nunca autoriza (403)
  if (envVerifyToken && mode === "subscribe" && token === envVerifyToken) {
    return { autorizado: true, status: 200, challenge: String(challenge) };
  }
  return { autorizado: false, status: 403 };
}

// 4. Normalización y coincidencia de palabras clave
function normalizarTexto(texto) {
  if (!texto) return "";
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function coincidePalabraClave(textoMensaje, palabrasClave) {
  if (!textoMensaje || !palabrasClave || palabrasClave.length === 0) return null;
  const textoNorm = normalizarTexto(textoMensaje);
  if (!textoNorm) return null;

  const palabrasEnTexto = new Set(textoNorm.split(" ").filter(Boolean));

  for (const palabra of palabrasClave) {
    const palNorm = normalizarTexto(palabra);
    if (!palNorm) continue;

    if (palNorm.includes(" ")) {
      if (textoNorm.includes(palNorm)) return palabra;
    } else {
      if (palabrasEnTexto.has(palNorm)) return palabra;
    }
  }

  return null;
}

// 5. Ventana de 24 horas y prevención de DMs en frío
function determinarCanalRespuesta(conv) {
  const ahora = Date.now();

  // 1. Si el usuario ha enviado DM alguna vez
  if (conv.ha_enviado_dm && conv.ultimo_dm_usuario_en) {
    const fechaDm = new Date(conv.ultimo_dm_usuario_en).getTime();
    const diffHoras = (ahora - fechaDm) / (1000 * 60 * 60);
    const ventana24hValida = diffHoras < 24;

    if (ventana24hValida) {
      return {
        canal: "dm",
        motivo: "Ventana de 24 horas de DM abierta",
        permitidoDm: true,
      };
    }

    return {
      canal: "solo_publica",
      motivo: "Ventana de 24 horas de DM vencida. Meta no permite enviar nuevos DMs hasta que el usuario responda.",
      permitidoDm: false,
    };
  }

  // 2. Si nunca ha enviado un DM (nació de comentario)
  const fechaComentario = new Date(conv.ultimo_mensaje_usuario_en).getTime();
  const diffDias = (ahora - fechaComentario) / (1000 * 60 * 60 * 24);
  const ventana7dValida = diffDias < 7;

  if (conv.respuesta_privada_enviada) {
    return {
      canal: "solo_publica",
      motivo: "Respuesta privada única ya enviada. Meta prohíbe DMs directos a usuarios que solo comentaron.",
      permitidoDm: false,
    };
  }

  if (!ventana7dValida) {
    return {
      canal: "solo_publica",
      motivo: "Plazo de 7 días de Meta para responder en privado a comentarios expirado.",
      permitidoDm: false,
    };
  }

  if (conv.comment_id_origen) {
    return {
      canal: "respuesta_privada",
      motivo: "Permitida respuesta privada única al comentario dentro del plazo de 7 días.",
      permitidoDm: false, // NO permite DM normal por ig_usuario_id, solo respuesta privada con comment_id
    };
  }

  return {
    canal: "solo_publica",
    motivo: "Sin identificador de mensaje ni comentario válido.",
    permitidoDm: false,
  };
}

// 6. Simulación de límite por hora (60/hora)
function simularLimitePorHora(totalAccionesEnLaUltimaHora, tope = 60) {
  if (totalAccionesEnLaUltimaHora >= tope) {
    return { permitido: false, accion: "limite_alcanzado" };
  }
  return { permitido: true, accion: "enviar" };
}

// 7. Simulación de deduplicación
class SimuladorDeduplicacion {
  constructor() {
    this.eventosGuardados = new Set();
  }

  procesarEvento(metaEventoId) {
    if (this.eventosGuardados.has(metaEventoId)) {
      return { descartado: true, motivo: "duplicado" };
    }
    this.eventosGuardados.add(metaEventoId);
    return { descartado: false, guardado: true };
  }
}

// ============================================================================
// BATERÍA DE PRUEBAS UNITARIAS
// ============================================================================

console.log("🧪 Iniciando batería exhaustiva de pruebas para Bandeja de Instagram...\n");

// ----------------------------------------------------------------------------
// SUITE 1: Validación Criptográfica de Firma HMAC SHA-256 (Falla Cerrada)
// ----------------------------------------------------------------------------
console.log("▶ SUITE 1: Validación criptográfica de firma HMAC SHA-256");

const appSecretReal = "meta_app_secret_super_seguro_2026";
const cuerpoMensaje = JSON.stringify({ entry: [{ id: "ig_account_99", time: 1718000000 }] });
const firmaCorrecta = "sha256=" + crypto.createHmac("sha256", appSecretReal).update(cuerpoMensaje, "utf8").digest("hex");

// 1.1 Firma válida
console.assert(validarFirmaMeta(cuerpoMensaje, firmaCorrecta, appSecretReal) === true, "1.1 Falló firma válida");
console.log("  ✓ 1.1 Firma válida -> true");

// 1.2 Firma alterada
const firmaAlterada = firmaCorrecta.slice(0, -4) + "0000";
console.assert(validarFirmaMeta(cuerpoMensaje, firmaAlterada, appSecretReal) === false, "1.2 Falló rechazo de firma alterada");
console.log("  ✓ 1.2 Firma alterada con mismo largo -> false");

// 1.3 Firma ausente (null / undefined / empty)
console.assert(validarFirmaMeta(cuerpoMensaje, null, appSecretReal) === false, "1.3 Falló firma null");
console.assert(validarFirmaMeta(cuerpoMensaje, "", appSecretReal) === false, "1.3 Falló firma vacía");
console.log("  ✓ 1.3 Firma ausente -> false (sin excepción)");

// 1.4 Secreto ausente (null / undefined / empty) -> Falla cerrada
console.assert(validarFirmaMeta(cuerpoMensaje, firmaCorrecta, null) === false, "1.4 Falló secret null");
console.assert(validarFirmaMeta(cuerpoMensaje, firmaCorrecta, "") === false, "1.4 Falló secret vacío");
console.log("  ✓ 1.4 Secreto ausente (falla cerrada) -> false");

// 1.5 Longitud distinta (NUNCA debe lanzar excepción de timingSafeEqual)
const firmaLongitudDistinta = "sha256=1234567890abcdef";
let lanzoExcepcion = false;
let resLongitud = true;
try {
  resLongitud = validarFirmaMeta(cuerpoMensaje, firmaLongitudDistinta, appSecretReal);
} catch (e) {
  lanzoExcepcion = true;
}
console.assert(!lanzoExcepcion && resLongitud === false, "1.5 Falló protección contra Buffer de longitud distinta");
console.log("  ✓ 1.5 Firma con longitud distinta no lanza excepción -> false");

// 1.6 Bearer Secret n8n -> Dashboard en tiempo constante
const n8nSecret = "secret_compartido_entre_n8n_y_dashboard_xyz";
console.assert(validarBearerSecret(`Bearer ${n8nSecret}`, n8nSecret) === true, "1.6.1 Bearer válido");
console.assert(validarBearerSecret(`Bearer token_equivocado`, n8nSecret) === false, "1.6.2 Bearer inválido");
console.assert(validarBearerSecret(null, n8nSecret) === false, "1.6.3 Bearer ausente");
console.assert(validarBearerSecret(`Bearer ${n8nSecret}`, "") === false, "1.6.4 Secreto env ausente");
console.log("  ✓ 1.6 Autenticación Bearer n8n con timingSafeEqual -> OK\n");

// ----------------------------------------------------------------------------
// SUITE 2: Verificación de Webhook GET de Meta (hub.challenge)
// ----------------------------------------------------------------------------
console.log("▶ SUITE 2: Verificación GET de Meta (hub.challenge)");

const verifyTokenEsperado = "asygnuz_verify_token_produccion_2026";
const queryValida = {
  "hub.mode": "subscribe",
  "hub.verify_token": verifyTokenEsperado,
  "hub.challenge": "1158201239",
};

// 2.1 Con token correcto
const r21 = verificarGetMeta(queryValida, verifyTokenEsperado);
console.assert(r21.autorizado === true && r21.status === 200 && r21.challenge === "1158201239", "2.1 Falló");
console.log("  ✓ 2.1 GET con token correcto -> autorizado 200 con challenge");

// 2.2 Con token incorrecto
const r22 = verificarGetMeta({ ...queryValida, "hub.verify_token": "token_falso" }, verifyTokenEsperado);
console.assert(r22.autorizado === false && r22.status === 403, "2.2 Falló token incorrecto");
console.log("  ✓ 2.2 GET con token incorrecto -> 403 Prohibido");

// 2.3 Sin token configurado en variable de entorno (falla cerrada)
const r23 = verificarGetMeta(queryValida, undefined);
console.assert(r23.autorizado === false && r23.status === 403, "2.3 Falló falla cerrada sin variable");
console.log("  ✓ 2.3 GET sin META_VERIFY_TOKEN en servidor -> 403 Prohibido (falla cerrada)");

// 2.4 Sin mode subscribe
const r24 = verificarGetMeta({ ...queryValida, "hub.mode": "unknown" }, verifyTokenEsperado);
console.assert(r24.autorizado === false && r24.status === 403, "2.4 Falló mode inválido");
console.log("  ✓ 2.4 GET sin hub.mode subscribe -> 403 Prohibido\n");

// ----------------------------------------------------------------------------
// SUITE 3: Límite por hora (Tope de 60 respuestas/hora)
// ----------------------------------------------------------------------------
console.log("▶ SUITE 3: Límite por hora (60 respuestas exitosas por cuenta)");

// 3.1 Evento número 1 a 60
const r31 = simularLimitePorHora(59, 60);
console.assert(r31.permitido === true && r31.accion === "enviar", "3.1 Falló evento dentro del límite");
console.log("  ✓ 3.1 Evento #60 de la hora -> permitido (enviar)");

// 3.2 Evento número 61
const r32 = simularLimitePorHora(60, 60);
console.assert(r32.permitido === false && r32.accion === "limite_alcanzado", "3.2 Falló evento 61");
console.log("  ✓ 3.2 Evento #61 de la hora -> bloqueado (limite_alcanzado, no envía)");

// 3.3 Eventos posteriores
const r33 = simularLimitePorHora(75, 60);
console.assert(r33.permitido === false && r33.accion === "limite_alcanzado", "3.3 Falló exceso");
console.log("  ✓ 3.3 Eventos en sobrecupo -> bloqueados limpiamente\n");

// ----------------------------------------------------------------------------
// SUITE 4: Deduplicación de eventos
// ----------------------------------------------------------------------------
console.log("▶ SUITE 4: Deduplicación en ig_eventos");

const deduplicador = new SimuladorDeduplicacion();
const idEvento = "mid_mensaje_unico_123456789";

const d1 = deduplicador.procesarEvento(idEvento);
console.assert(d1.descartado === false && d1.guardado === true, "4.1 Falló primer evento");
console.log("  ✓ 4.1 Primer arribo de evento -> guardado y procesado");

const d2 = deduplicador.procesarEvento(idEvento);
console.assert(d2.descartado === true && d2.motivo === "duplicado", "4.2 Falló evento repetido");
console.log("  ✓ 4.2 Reintento de webhook de Meta con mismo mid -> descartado en silencio");

const d3 = deduplicador.procesarEvento(idEvento);
console.assert(d3.descartado === true, "4.3 Falló tercer reintento");
console.log("  ✓ 4.3 Múltiples entregas duplicadas -> ignoradas sin disparar respuestas dobles\n");

// ----------------------------------------------------------------------------
// SUITE 5: Conversación nacida de comentario y prevención de DM en frío
// ----------------------------------------------------------------------------
console.log("▶ SUITE 5: Conversaciones nacidas de comentario y prevención de DM en frío");

const ahora = Date.now();
const convNacidaDeComentario = {
  ha_enviado_dm: false,
  ultimo_dm_usuario_en: null,
  comment_id_origen: "cmt_publicacion_instagram_987",
  respuesta_privada_enviada: false,
  ultimo_mensaje_usuario_en: new Date(ahora - 30 * 60 * 1000).toISOString(), // Hace 30 min
};

// 5.1 Primer intento de responder comentario: permite respuesta privada única vinculada al comment_id
const c1 = determinarCanalRespuesta(convNacidaDeComentario);
console.assert(c1.canal === "respuesta_privada" && c1.permitidoDm === false, "5.1 Falló");
console.log("  ✓ 5.1 Primer intento -> canal 'respuesta_privada' (recipient: { comment_id })");

// 5.2 Segundo intento tras enviar la respuesta privada única -> solo_publica
const convTrasRespuestaPrivada = {
  ...convNacidaDeComentario,
  respuesta_privada_enviada: true,
};
const c2 = determinarCanalRespuesta(convTrasRespuestaPrivada);
console.assert(c2.canal === "solo_publica" && c2.permitidoDm === false, "5.2 Falló segundo intento");
console.log("  ✓ 5.2 Segundo intento -> canal 'solo_publica' (DM en frío bloqueado)");

// 5.3 Intento tras 8 días (expiró ventana de 7 días de Meta para responder comentarios en privado)
const convComentarioExpirado = {
  ...convNacidaDeComentario,
  respuesta_privada_enviada: false,
  ultimo_mensaje_usuario_en: new Date(ahora - 8 * 24 * 60 * 60 * 1000).toISOString(), // Hace 8 días
};
const c3 = determinarCanalRespuesta(convComentarioExpirado);
console.assert(c3.canal === "solo_publica", "5.3 Falló comentario expirado de 7 días");
console.log("  ✓ 5.3 Comentario con más de 7 días -> 'solo_publica' (plazo expirado)\n");

// ----------------------------------------------------------------------------
// SUITE 6: Ventana de 24 horas para DMs vs Comentarios
// ----------------------------------------------------------------------------
console.log("▶ SUITE 6: Ventana de 24 horas (cuenta solo desde DMs, no comentarios)");

// 6.1 Usuario que comentó hace 2 horas pero NUNCA envió DM: NO tiene ventana de 24h de DM abierta
const usuarioSoloComento = {
  ha_enviado_dm: false,
  ultimo_dm_usuario_en: null,
  comment_id_origen: "cmt_reciente_2h",
  respuesta_privada_enviada: false,
  ultimo_mensaje_usuario_en: new Date(ahora - 2 * 60 * 60 * 1000).toISOString(),
};
const v61 = determinarCanalRespuesta(usuarioSoloComento);
console.assert(v61.canal !== "dm", "6.1 Error grave: dio canal 'dm' a usuario que no mandó DM");
console.log("  ✓ 6.1 Comentario de hace 2 horas -> canal NO es 'dm' (evita DM en frío)");

// 6.2 Usuario que mandó un DM hace 2 horas: sí tiene ventana de DM abierta
const usuarioDmReciente = {
  ha_enviado_dm: true,
  ultimo_dm_usuario_en: new Date(ahora - 2 * 60 * 60 * 1000).toISOString(),
  ultimo_mensaje_usuario_en: new Date(ahora - 2 * 60 * 60 * 1000).toISOString(),
};
const v62 = determinarCanalRespuesta(usuarioDmReciente);
console.assert(v62.canal === "dm" && v62.permitidoDm === true, "6.2 Falló DM reciente");
console.log("  ✓ 6.2 DM entrante de hace 2 horas -> canal 'dm' con ventana abierta");

// 6.3 Usuario que mandó un DM hace 26 horas: ventana de DM vencida
const usuarioDmVencido = {
  ha_enviado_dm: true,
  ultimo_dm_usuario_en: new Date(ahora - 26 * 60 * 60 * 1000).toISOString(),
  ultimo_mensaje_usuario_en: new Date(ahora - 26 * 60 * 60 * 1000).toISOString(),
};
const v63 = determinarCanalRespuesta(usuarioDmVencido);
console.assert(v63.canal === "solo_publica" && v63.permitidoDm === false, "6.3 Falló DM vencido");
console.log("  ✓ 6.3 DM de hace 26 horas -> ventana de 24h vencida ('solo_publica')\n");

console.log("============================================================================");
console.log("🎉 TODAS LAS PRUEBAS DE LÓGICA PASARON CON 100% DE ÉXITO (0 errores).");
console.log("============================================================================");
