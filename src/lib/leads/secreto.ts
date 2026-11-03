import crypto from "crypto";

// Compara hashes de igual largo para no filtrar el secreto por tiempo de respuesta.
export function secretoValido(recibido: string | null, esperado: string | undefined): boolean {
  if (!recibido || !esperado) return false;
  const a = crypto.createHash("sha256").update(recibido).digest();
  const b = crypto.createHash("sha256").update(esperado).digest();
  return crypto.timingSafeEqual(a, b);
}
