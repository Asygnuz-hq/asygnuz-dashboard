import type { ZodType, ZodTypeDef } from "zod";

// Punto único para validar el body de un POST/PUT antes de tocar Kaneo,
// Supabase o Meta. Antes cada ruta hacía sus propios `typeof body?.x ===`
// a mano (Kaneo #42) — fácil de olvidar un campo o dejar pasar un tipo
// raro (un objeto donde se espera un string, por ejemplo) directo a un
// .eq() de Supabase o a una URL de Kaneo.
//
// Uso:
//   const body = await bodyValido(request, miSchema);
//   if (body instanceof Response) return body;
//   // body.data ya está tipado y validado
export async function bodyValido<T>(
  request: Request,
  // El tercer parámetro (Input) se deja en `any` a propósito: schemas con
  // `.transform()` (ej. status con default) tienen Input != Output, y
  // fijarlo a T rompía la inferencia de TypeScript en cada ruta.
  schema: ZodType<T, ZodTypeDef, any>
): Promise<{ data: T } | Response> {
  const json = await request.json().catch(() => null);
  const resultado = schema.safeParse(json);
  if (!resultado.success) {
    const primero = resultado.error.issues[0];
    const campo = primero?.path?.length ? primero.path.join(".") : null;
    const mensaje = primero ? (campo ? `${campo}: ${primero.message}` : primero.message) : "Body inválido.";
    return Response.json({ error: mensaje }, { status: 400 });
  }
  return { data: resultado.data };
}
