import { createClient } from "@/lib/supabase/server";
import { validarState } from "@/lib/metaState";
import {
  exchangeInstagramCode,
  exchangeInstagramLongLivedToken,
  fetchInstagramUsername,
} from "@/lib/meta/client";

// Instagram redirige aquí después de autorizar. Guarda el token (separado
// del de anuncios) en la fila del cliente en meta_conexiones — si el
// cliente ya tenía anuncios conectados, se actualiza esa fila; si no,
// se crea una nueva solo con los datos de Instagram.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorMeta = searchParams.get("error_description") ?? searchParams.get("error");

  if (errorMeta) {
    return Response.redirect(
      new URL(`/metricas/clientes?error=${encodeURIComponent(errorMeta)}`, request.url),
      302
    );
  }
  if (!code || !state) {
    return Response.json({ error: "Falta el código o el state de Instagram." }, { status: 400 });
  }

  const estadoValido = await validarState(state);
  if (!estadoValido) {
    return Response.json({ error: "State inválido o vencido. Vuelve a iniciar la conexión." }, { status: 400 });
  }
  const { clienteNombre } = estadoValido;

  try {
    const { accessToken: tokenCorto, instagramUserId } = await exchangeInstagramCode(code);
    const { access_token, expires_in } = await exchangeInstagramLongLivedToken(tokenCorto);
    const username = await fetchInstagramUsername(access_token, instagramUserId).catch(() => null);
    const expiraEn = new Date(Date.now() + expires_in * 1000).toISOString();

    const { data: existente } = await supabase
      .from("meta_conexiones")
      .select("id")
      .eq("cliente_nombre", clienteNombre)
      .maybeSingle();

    const campos = {
      instagram_business_id: instagramUserId,
      instagram_access_token: access_token,
      instagram_token_expira_en: expiraEn,
      instagram_username: username,
      actualizado_en: new Date().toISOString(),
    };

    const { error: dbError } = existente
      ? await supabase.from("meta_conexiones").update(campos).eq("id", existente.id)
      : await supabase
          .from("meta_conexiones")
          .insert({ cliente_nombre: clienteNombre, conectado_por: user.id, ...campos });

    if (dbError) throw new Error(dbError.message);

    return Response.redirect(
      new URL(`/metricas/clientes?conectado=${encodeURIComponent(clienteNombre)}`, request.url),
      302
    );
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error desconocido conectando Instagram";
    return Response.redirect(
      new URL(`/metricas/clientes?error=${encodeURIComponent(mensaje)}`, request.url),
      302
    );
  }
}
