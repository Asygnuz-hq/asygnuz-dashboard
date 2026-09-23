import { timingSafeEqual } from "node:crypto";

// Vercel llama a los crons con `Authorization: Bearer $CRON_SECRET`.
// Antes se comparaba con `!==` contra `Bearer ${process.env.CRON_SECRET}`:
// si la variable no estaba definida, "Bearer undefined" abría la ruta a
// cualquiera. Ahora sin secreto configurado se rechaza todo, y la
// comparación es de tiempo constante.
export function cronAutorizado(request: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const recibido = Buffer.from(request.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${secreto}`);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}
