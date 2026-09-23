import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Protección anti-CSRF del OAuth de Meta. Antes el `state` era solo
// base64({clienteNombre}) y los callbacks no lo validaban: un atacante podía
// hacer que un usuario logueado abriera /api/meta/*-callback?code=<del
// atacante>&state=<forjado> y así pisar el token de un cliente existente.
// Ahora cada conexión arranca con un nonce aleatorio que viaja en el state Y
// en una cookie httpOnly; el callback exige que coincidan.

export const NONCE_COOKIE = "meta_oauth_nonce";
// Path amplio a propósito: el callback vive en /api/meta/..., pero conviene
// que no dependa de cuál de los dos flujos (anuncios / Instagram) lo emitió.
export const NONCE_COOKIE_OPCIONES = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const, // el callback llega como navegación top-level desde Meta
  path: "/api/meta",
  maxAge: 600,
};

export function crearState(clienteNombre: string): { state: string; nonce: string } {
  const nonce = randomBytes(16).toString("base64url");
  const state = Buffer.from(JSON.stringify({ clienteNombre, nonce })).toString("base64url");
  return { state, nonce };
}

export async function validarState(state: string): Promise<{ clienteNombre: string } | null> {
  let parsed: { clienteNombre?: unknown; nonce?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return null;
  }
  if (typeof parsed.clienteNombre !== "string" || typeof parsed.nonce !== "string") return null;

  const cookie = (await cookies()).get(NONCE_COOKIE)?.value;
  if (!cookie) return null;
  const a = Buffer.from(cookie);
  const b = Buffer.from(parsed.nonce);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { clienteNombre: parsed.clienteNombre };
}
