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
