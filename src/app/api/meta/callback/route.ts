import { createClient } from "@/lib/supabase/server";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchCuentasDisponibles,
} from "@/lib/meta/client";

// Meta redirige aquí después de que el cliente autoriza el login. Cambia el
// código por un token de larga duración (~60 días), detecta la cuenta de
// anuncios e Instagram asociadas, y las guarda en Supabase.
//
// v1: si la persona que autorizó tiene varias cuentas de anuncios, se toma
// la primera automáticamente. Si un cliente maneja más de una cuenta, hay
// que ajustar esto para dejarlo elegir — no es el caso más común.
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
    return Response.json({ error: "Falta el código o el state de Meta." }, { status: 400 });
  }

  let clienteNombre: string;
  try {
    clienteNombre = JSON.parse(Buffer.from(state, "base64url").toString()).clienteNombre;
  } catch {
    return Response.json({ error: "State inválido." }, { status: 400 });
  }

  try {
    const shortLivedToken = await exchangeCodeForToken(code);
    const { access_token, expires_in } = await exchangeForLongLivedToken(shortLivedToken);
    const cuentas = await fetchCuentasDisponibles(access_token);

    if (cuentas.length === 0) {
      return Response.redirect(
        new URL(
          `/metricas/clientes?error=${encodeURIComponent(
            "No se encontró ninguna cuenta de anuncios asociada a ese login."
          )}`,
          request.url
        ),
        302
      );
    }

    const cuenta = cuentas[0];
    const expiraEn = new Date(Date.now() + expires_in * 1000).toISOString();

    const { error: dbError } = await supabase.from("meta_conexiones").upsert(
      {
        cliente_nombre: clienteNombre,
        ad_account_id: cuenta.ad_account_id,
        page_id: cuenta.page_id,
        instagram_business_id: cuenta.instagram_business_id,
        access_token,
        token_expira_en: expiraEn,
        conectado_por: user.id,
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: "ad_account_id" }
    );

    if (dbError) throw new Error(dbError.message);

    return Response.redirect(
      new URL(`/metricas/clientes?conectado=${encodeURIComponent(clienteNombre)}`, request.url),
      302
    );
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error desconocido conectando con Meta";
    return Response.redirect(
      new URL(`/metricas/clientes?error=${encodeURIComponent(mensaje)}`, request.url),
      302
    );
  }
}
