import { createClient } from "@/lib/supabase/server";
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

  const { searchParams } = new URL(request.url);
  const clienteNombre = searchParams.get("cliente");
  if (!clienteNombre) {
    return Response.json({ error: "Falta el nombre del cliente a conectar." }, { status: 400 });
  }

  const state = Buffer.from(JSON.stringify({ clienteNombre })).toString("base64url");
  const authUrl = buildAuthUrl(state);
  return Response.redirect(authUrl, 302);
}
