import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bloqueoMfa } from "@/lib/api/mfa";
import { NONCE_COOKIE, NONCE_COOKIE_OPCIONES, crearState } from "@/lib/metaState";
import { buildAuthUrl } from "@/lib/meta/client";

// Arranca el login de Facebook para conectar la cuenta de anuncios de un
// cliente. Se llama desde el botón "Conectar cliente" del dashboard.
// El nombre del cliente viaja en el "state" para que el callback sepa a
// quién guardarle el token.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const bloqueo = await bloqueoMfa(supabase);
  if (bloqueo) return bloqueo;

  const { searchParams } = new URL(request.url);
  const clienteNombre = searchParams.get("cliente");
  if (!clienteNombre) {
    return Response.json({ error: "Falta el nombre del cliente a conectar." }, { status: 400 });
  }

  const { state, nonce } = crearState(clienteNombre);
  const respuesta = NextResponse.redirect(buildAuthUrl(state), 302);
  respuesta.cookies.set(NONCE_COOKIE, nonce, NONCE_COOKIE_OPCIONES);
  return respuesta;
}
