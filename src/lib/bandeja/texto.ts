// Normalización de texto y reglas para palabras clave y ventanas de tiempo (es-CO)

/**
 * Normaliza un texto eliminando tildes, diacríticos, mayúsculas y caracteres especiales.
 */
export function normalizarTexto(texto: string): string {
  if (!texto) return "";
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Evalúa si un texto coincide con alguna de las palabras clave especificadas.
 * La coincidencia se hace por palabra completa para evitar falsos positivos
 * (por ejemplo "precio" no debe coincidir con "precioso").
 */
export function coincidePalabraClave(textoMensaje: string, palabrasClave: string[]): string | null {
  if (!textoMensaje || !palabrasClave || palabrasClave.length === 0) return null;
  const textoNorm = normalizarTexto(textoMensaje);
  if (!textoNorm) return null;

  const palabrasEnTexto = new Set(textoNorm.split(" ").filter(Boolean));

  for (const palabra of palabrasClave) {
    const palNorm = normalizarTexto(palabra);
    if (!palNorm) continue;

    // Si la palabra clave tiene múltiples palabras (frase)
    if (palNorm.includes(" ")) {
      if (textoNorm.includes(palNorm)) return palabra;
    } else {
      // Coincidencia exacta de palabra
      if (palabrasEnTexto.has(palNorm)) return palabra;
    }
  }

  return null;
}

/**
 * Convierte un nombre en un valor seguro para utm_campaign: minúsculas, sin tildes
 * y con guiones ("Info Precios" → "info-precios").
 */
export function slugUtm(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

/**
 * Calcula el estado de la ventana de 24 horas de Meta a partir de la fecha
 * del último mensaje recibido del usuario.
 */
export function calcularVentana24h(ultimoMensajeIso: string): {
  horasRestantes: number;
  minutosRestantes: number;
  vencida: boolean;
  etiqueta: string;
} {
  const fechaMensaje = new Date(ultimoMensajeIso);
  const ahora = new Date();
  const limite = new Date(fechaMensaje.getTime() + 24 * 60 * 60 * 1000);
  const diffMs = limite.getTime() - ahora.getTime();

  if (diffMs <= 0) {
    return {
      horasRestantes: 0,
      minutosRestantes: 0,
      vencida: true,
      etiqueta: "Ventana vencida (24 h)",
    };
  }

  const horas = Math.floor(diffMs / (1000 * 60 * 60));
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let etiqueta = `Vence en ${horas} h`;
  if (horas === 0) {
    etiqueta = `Vence en ${minutos} min`;
  } else if (horas <= 3) {
    etiqueta = `⚠️ Vence en ${horas} h ${minutos} min`;
  }

  return {
    horasRestantes: horas,
    minutosRestantes: minutos,
    vencida: false,
    etiqueta,
  };
}

/**
 * Formatea una fecha en formato colombiano amigable
 */
export function formatearHoraAmigable(fechaIso: string): string {
  const fecha = new Date(fechaIso);
  const ahora = new Date();
  const esHoy = fecha.toDateString() === ahora.toDateString();

  if (esHoy) {
    return fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  if (fecha.toDateString() === ayer.toDateString()) {
    return "Ayer " + fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  return fecha.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export type CanalRespuesta = "dm" | "respuesta_privada" | "solo_publica";

/**
 * Determina el canal permitido para responder a una conversación según las políticas de Meta:
 * - 'dm': El usuario ha enviado un DM y está dentro de la ventana de 24 horas desde su último DM.
 * - 'respuesta_privada': Nació de un comentario, el usuario NUNCA ha enviado un DM, no se ha enviado
 *   respuesta privada aún, y está dentro del límite de 7 días de Meta.
 * - 'solo_publica': No se puede contactar por privado (se agotó la respuesta privada única del comentario,
 *   pasaron los 7 días de la regla de comentario, o venció la ventana de 24 horas del último DM).
 */
export function determinarCanalRespuesta(conv: {
  ha_enviado_dm?: boolean | null;
  ultimo_dm_usuario_en?: string | null;
  comment_id_origen?: string | null;
  respuesta_privada_enviada?: boolean | null;
  ultimo_mensaje_usuario_en: string;
}): {
  canal: CanalRespuesta;
  motivo: string;
  ventana24hValida: boolean;
  ventana7dValida: boolean;
} {
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
        ventana24hValida: true,
        ventana7dValida: false,
      };
    }

    return {
      canal: "solo_publica",
      motivo: "Ventana de 24 horas de DM vencida. Meta no permite enviar nuevos DMs hasta que el usuario responda.",
      ventana24hValida: false,
      ventana7dValida: false,
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
      ventana24hValida: false,
      ventana7dValida,
    };
  }

  if (!ventana7dValida) {
    return {
      canal: "solo_publica",
      motivo: "Plazo de 7 días de Meta para responder en privado a comentarios expirado.",
      ventana24hValida: false,
      ventana7dValida: false,
    };
  }

  if (conv.comment_id_origen) {
    return {
      canal: "respuesta_privada",
      motivo: "Permitida respuesta privada única al comentario dentro del plazo de 7 días.",
      ventana24hValida: false,
      ventana7dValida: true,
    };
  }

  return {
    canal: "solo_publica",
    motivo: "Sin identificador de mensaje ni comentario válido.",
    ventana24hValida: false,
    ventana7dValida: false,
  };
}
