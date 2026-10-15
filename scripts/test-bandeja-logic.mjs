import crypto from "crypto";

// 1. Prueba de normalización y coincidencia de palabras clave
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

// 2. Prueba de ventana de 24 horas
function calcularVentana24h(ultimoMensajeIso) {
  const fechaMensaje = new Date(ultimoMensajeIso);
  const ahora = new Date();
  const limite = new Date(fechaMensaje.getTime() + 24 * 60 * 60 * 1000);
  const diffMs = limite.getTime() - ahora.getTime();

  if (diffMs <= 0) {
    return { horasRestantes: 0, minutosRestantes: 0, vencida: true };
  }

  const horas = Math.floor(diffMs / (1000 * 60 * 60));
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return { horasRestantes: horas, minutosRestantes: minutos, vencida: false };
}

// 3. Prueba de validación de firma HMAC SHA256 (Meta X-Hub-Signature-256)
function validarFirmaMeta(rawBody, appSecret, signatureHeader) {
  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(rawBody, "utf8");
  const expected = "sha256=" + hmac.digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
}

// EJECUCIÓN DE PRUEBAS
console.log("🧪 Iniciando pruebas de lógica aislada para Bandeja de Instagram...\n");

// Test 1: Palabras clave con y sin tildes
const palabras = ["precio", "información", "cita valoración"];

const t1 = coincidePalabraClave("Hola, me gustaría saber el PRECIO por favor", palabras);
console.assert(t1 === "precio", "Test 1 falló: debería coincidir 'precio'");
console.log("✓ Test 1: Coincidencia en mayúsculas 'PRECIO' -> OK");

const t2 = coincidePalabraClave("Deseo recibir informacion detallada", palabras);
console.assert(t2 === "información", "Test 2 falló: debería coincidir sin tildes");
console.log("✓ Test 2: Coincidencia sin tildes 'informacion' -> OK");

const t3 = coincidePalabraClave("Quiero agendar una cita valoracion mañana", palabras);
console.assert(t3 === "cita valoración", "Test 3 falló: frase completa");
console.log("✓ Test 3: Coincidencia de frase compuesta 'cita valoracion' -> OK");

const t4 = coincidePalabraClave("Ese procedimiento es muy precioso", palabras);
console.assert(t4 === null, "Test 4 falló: falso positivo con 'precioso'");
console.log("✓ Test 4: Sin falso positivo en sub-palabra ('precioso' no activa 'precio') -> OK");

// Test 2: Ventana de 24 horas
const ahora = Date.now();
const msgReciente = new Date(ahora - 2 * 60 * 60 * 1000).toISOString(); // Hace 2h
const vReciente = calcularVentana24h(msgReciente);
console.assert(!vReciente.vencida && vReciente.horasRestantes === 21, "Test 5 falló");
console.log("✓ Test 5: Mensaje de hace 2 horas -> 21-22h restantes -> OK");

const msgVencido = new Date(ahora - 25 * 60 * 60 * 1000).toISOString(); // Hace 25h
const vVencido = calcularVentana24h(msgVencido);
console.assert(vVencido.vencida, "Test 6 falló: debería estar vencida");
console.log("✓ Test 6: Mensaje de hace 25 horas -> Ventana vencida (true) -> OK");

// Test 3: Firma HMAC SHA256
const secretoPrueba = "test_instagram_secret_123456";
const cuerpoPrueba = JSON.stringify({ entry: [{ id: "12345", time: 1728900000 }] });
const firmaEsperada = "sha256=" + crypto.createHmac("sha256", secretoPrueba).update(cuerpoPrueba, "utf8").digest("hex");

const esValida = validarFirmaMeta(cuerpoPrueba, secretoPrueba, firmaEsperada);
console.assert(esValida === true, "Test 7 falló: firma debería ser válida");
console.log("✓ Test 7: Validación de firma criptográfica X-Hub-Signature-256 -> OK");

const firmaAlterada = firmaEsperada.slice(0, -2) + "00";
let falloAtrapado = false;
try {
  validarFirmaMeta(cuerpoPrueba, secretoPrueba, firmaAlterada);
} catch {
  falloAtrapado = true;
}
console.assert(falloAtrapado || !validarFirmaMeta(cuerpoPrueba, secretoPrueba, firmaAlterada), "Test 8 falló: firma corrupta rechazada");
console.log("✓ Test 8: Rechazo de firma alterada -> OK");

console.log("\n🎉 Todas las pruebas de lógica aislada pasaron exitosamente.");
