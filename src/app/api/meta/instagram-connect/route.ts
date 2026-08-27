import { createClient } from "@/lib/supabase/server";
import { buildInstagramAuthUrl } from "@/lib/meta/client";

// Arranca el login de INSTAGRAM (no el de Facebook) para traer contenido
// orgánico — reels, fotos, carruseles, historias. Es un login aparte del
// de anuncios, con sus propias credenciales (META_INSTAGRAM_APP_ID/SECRET).
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
  return Response.redirect(buildInstagramAuthUrl(state), 302);
}
