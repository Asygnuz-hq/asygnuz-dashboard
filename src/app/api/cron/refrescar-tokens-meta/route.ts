import { cronAutorizado } from "@/lib/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeForLongLivedToken, exchangeInstagramLongLivedToken } from "@/lib/meta/client";

// Vercel llama esta ruta una vez al día (ver vercel.json) con el header
// Authorization: Bearer $CRON_SECRET. Cualquier otra llamada se rechaza.
//
// Los tokens de Meta (anuncios/página e Instagram) duran ~60 días y nadie
// los estaba renovando — al vencer, el dashboard se queda mudo hasta que
// alguien reconecte manualmente (así se descubrió el bug de "Juanma" el
// 2026-09-04). Mientras un token siga vigente, Meta permite volver a
// cambiarlo por uno de 60 días más sin que el cliente tenga que re-loguearse
// — por eso corre todos los días buscando lo que vence pronto, en vez de
// esperar a que ya haya vencido.
export async function GET(request: Request) {
  if (!cronAutorizado(request)) {
    return new Response("No autorizado", { status: 401 });
  }

  const supabase = createAdminClient();
  const pronto = new Date(Date.now() + 7 * 86400000).toISOString();

  const { data: conexiones, error } = await supabase
    .from("meta_conexiones")
    .select("id, cliente_nombre, access_token, token_expira_en, instagram_access_token, instagram_token_expira_en")
    .or(`token_expira_en.lt.${pronto},instagram_token_expira_en.lt.${pronto}`);

  if (error) {
    return Response.json({ ok: false, motivo: error.message }, { status: 500 });
  }

  // Secuencial, no Promise.all — todas las conexiones comparten la misma
  // App de Meta, así que no conviene ráfaguear la Graph API en paralelo.
  const resultados: { cliente: string; ads: string; instagram: string }[] = [];

  for (const c of conexiones ?? []) {
    let ads = "sin cambios";
    let instagram = "sin cambios";

    if (c.access_token && c.token_expira_en && c.token_expira_en < pronto) {
      try {
        const { access_token, expires_in } = await exchangeForLongLivedToken(c.access_token);
        await supabase
          .from("meta_conexiones")
          .update({
            access_token,
            token_expira_en: new Date(Date.now() + expires_in * 1000).toISOString(),
          })
          .eq("id", c.id);
        ads = "renovado";
      } catch (err) {
        ads = `error: ${err instanceof Error ? err.message : "desconocido"}`;
      }
    }

    if (c.instagram_access_token && c.instagram_token_expira_en && c.instagram_token_expira_en < pronto) {
      try {
        const { access_token, expires_in } = await exchangeInstagramLongLivedToken(c.instagram_access_token);
        await supabase
          .from("meta_conexiones")
          .update({
            instagram_access_token: access_token,
            instagram_token_expira_en: new Date(Date.now() + expires_in * 1000).toISOString(),
          })
          .eq("id", c.id);
        instagram = "renovado";
      } catch (err) {
        instagram = `error: ${err instanceof Error ? err.message : "desconocido"}`;
      }
    }

    resultados.push({ cliente: c.cliente_nombre, ads, instagram });
  }

  return Response.json({ ok: true, revisadas: conexiones?.length ?? 0, resultados });
}
