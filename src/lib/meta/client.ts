// Cliente contra la Graph API de Meta (Marketing API). Corre siempre en
// servidor — el access_token de cada cliente nunca debe llegar al navegador.

const GRAPH_VERSION = "v21.0";
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
// Base de la API de Instagram cuando se conecta por su propio login
// (instagram.com) en vez de por Facebook — usa un dominio y un token
// completamente distintos al de anuncios/páginas.
const GRAPH_INSTAGRAM_URL = `https://graph.instagram.com/${GRAPH_VERSION}`;

export type MetaConexion = {
  id: string;
  cliente_nombre: string;
  ad_account_id: string | null;
  page_id: string | null;
  instagram_business_id: string | null;
  access_token: string;
  token_expira_en: string | null;
  // Token separado del de anuncios — sale del login de Instagram
  // (ver buildInstagramAuthUrl), no del login de Facebook.
  instagram_access_token: string | null;
};

export type MetaInsightRow = {
  campaign_name: string;
  spend: string;
  impressions: string;
  reach: string;
  clicks: string;
  cpc: string;
  cpm: string;
  ctr: string;
  actions?: { action_type: string; value: string }[];
};

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name} (configuración de Meta). Revisa .env.local.`);
  }
  return value;
}

// -------- OAuth: conectar la cuenta de un cliente --------

export function buildAuthUrl(state: string): string {
  const appId = env("META_APP_ID");
  const redirectUri = env("META_REDIRECT_URI");
  // Este flujo pasa por el diálogo de FACEBOOK (facebook.com/dialog/oauth),
  // que solo entiende permisos de anuncios/páginas. Los permisos de
  // Instagram (instagram_business_basic, etc.) pertenecen al producto
  // separado "Instagram API with Instagram Login", cuyo diálogo es
  // instagram.com — no se pueden pedir aquí, Facebook los rechaza con
  // "Invalid Scopes". El contenido orgánico de Instagram se conecta con un
  // flujo aparte (ver /api/meta/instagram-connect).
  const scopes = ["ads_read", "pages_show_list", "business_management"].join(",");
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: scopes,
    response_type: "code",
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

async function graphFetch<T>(
  path: string,
  params: Record<string, string> = {},
  base: string = GRAPH_URL
): Promise<T> {
  const url = new URL(`${base}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { cache: "no-store" });
  const body = await res.json();
  if (!res.ok) {
    const mensaje = body?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Graph API ${path} -> ${mensaje}`);
  }
  return body as T;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const appId = env("META_APP_ID");
  const appSecret = env("META_APP_SECRET");
  const redirectUri = env("META_REDIRECT_URI");
  const data = await graphFetch<{ access_token: string }>("/oauth/access_token", {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  return data.access_token;
}

// Cambia el token de corta duración (~horas) por uno de larga duración
// (~60 días) — el que se guarda en Supabase.
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; expires_in: number }> {
  const appId = env("META_APP_ID");
  const appSecret = env("META_APP_SECRET");
  return graphFetch("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
}

// -------- OAuth: conectar Instagram (login separado, instagram.com) --------
//
// Usa credenciales distintas a META_APP_ID/META_APP_SECRET: el "Instagram
// App ID" / "Instagram App Secret" que aparecen en el panel de Meta bajo
// Instagram > Configuración de la API. El token que resulta solo sirve
// contra graph.instagram.com, no contra graph.facebook.com.

export function buildInstagramAuthUrl(state: string): string {
  const appId = env("META_INSTAGRAM_APP_ID");
  const redirectUri = env("META_INSTAGRAM_REDIRECT_URI");
  const scopes = ["instagram_business_basic", "instagram_business_manage_insights"].join(",");
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

// El intercambio inicial de código -> token es distinto al de Facebook:
// va por POST con form-urlencoded (no query params) a api.instagram.com,
// y de una vez devuelve el user_id de la cuenta de Instagram.
export async function exchangeInstagramCode(
  code: string
): Promise<{ accessToken: string; instagramUserId: string }> {
  const appId = env("META_INSTAGRAM_APP_ID");
  const appSecret = env("META_INSTAGRAM_APP_SECRET");
  const redirectUri = env("META_INSTAGRAM_REDIRECT_URI");

  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Instagram OAuth -> ${data?.error_message ?? JSON.stringify(data)}`);
  }
  return { accessToken: data.access_token, instagramUserId: String(data.user_id) };
}

// Cambia el token corto (~1h) por uno de larga duración (~60 días).
export async function exchangeInstagramLongLivedToken(
  shortLivedToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const appSecret = env("META_INSTAGRAM_APP_SECRET");
  return graphFetch(
    "/access_token",
    { grant_type: "ig_exchange_token", client_secret: appSecret, access_token: shortLivedToken },
    GRAPH_INSTAGRAM_URL
  );
}

// Nombre de usuario de la cuenta que autorizó — solo para mostrarlo en el
// dashboard y confirmar que se conectó la cuenta correcta.
export async function fetchInstagramUsername(accessToken: string, instagramUserId: string): Promise<string> {
  const data = await graphFetch<{ username: string }>(
    `/${instagramUserId}`,
    { fields: "username", access_token: accessToken },
    GRAPH_INSTAGRAM_URL
  );
  return data.username;
}

export type CuentaDisponible = {
  ad_account_id: string;
  ad_account_name: string;
  business_name: string | null;
  page_id: string | null;
  page_name: string | null;
  instagram_business_id: string | null;
};

// Trae las cuentas de anuncios y páginas a las que el usuario que autorizó
// el login le dio acceso a la App — para que elija cuál conectar a qué
// cliente. Una misma persona (ej. la cuenta de Facebook de un familiar)
// puede tener acceso a varios portafolios de Business Manager distintos,
// así que se incluye el nombre del portafolio (business.name) para que se
// pueda distinguir de un vistazo cuál es la cuenta correcta.
export async function fetchCuentasDisponibles(accessToken: string): Promise<CuentaDisponible[]> {
  const cuentas = await graphFetch<{
    data: { account_id: string; name: string; business?: { name: string } }[];
  }>("/me/adaccounts", { access_token: accessToken, fields: "account_id,name,business" });
  const paginas = await graphFetch<{
    data: { id: string; name: string; instagram_business_account?: { id: string } }[];
  }>("/me/accounts", {
    access_token: accessToken,
    fields: "id,name,instagram_business_account",
  });

  const primeraPagina = paginas.data[0];

  return cuentas.data.map((c) => ({
    ad_account_id: `act_${c.account_id}`,
    ad_account_name: c.name,
    business_name: c.business?.name ?? null,
    page_id: primeraPagina?.id ?? null,
    page_name: primeraPagina?.name ?? null,
    instagram_business_id: primeraPagina?.instagram_business_account?.id ?? null,
  }));
}

// -------- Métricas: leer una cuenta ya conectada --------

export async function fetchInsights(
  conexion: MetaConexion,
  opts: { since?: string; until?: string } = {}
): Promise<MetaInsightRow[]> {
  if (!conexion.ad_account_id) {
    throw new Error(`La conexión "${conexion.cliente_nombre}" no tiene cuenta de anuncios asociada.`);
  }
  const params: Record<string, string> = {
    access_token: conexion.access_token,
    level: "campaign",
    fields: "campaign_name,spend,impressions,reach,clicks,cpc,cpm,ctr,actions",
  };
  if (opts.since && opts.until) {
    params.time_range = JSON.stringify({ since: opts.since, until: opts.until });
  } else {
    params.date_preset = "last_30d";
  }
  const data = await graphFetch<{ data: MetaInsightRow[] }>(
    `/${conexion.ad_account_id}/insights`,
    params
  );
  return data.data;
}

// -------- Instagram: contenido orgánico (reels, imágenes, carruseles, historias) --------

export type InstagramMedia = {
  id: string;
  caption: string | null;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  // REELS / STORY / FEED (viene distinto según el tipo real de la publicación).
  media_product_type: string;
  timestamp: string;
  permalink: string;
  // thumbnail_url solo viene en videos/reels — para fotos hay que usar
  // media_url. Se combinan en imagenUrl para no tener que decidirlo en la UI.
  imagenUrl: string | null;
  metricas: Record<string, number>;
};

// Métricas válidas por tipo — pedirle a la Graph API una métrica que no
// aplica a ese tipo de media da error, así que se arma la lista según
// media_product_type en vez de pedir siempre las mismas.
function metricasParaTipo(mediaProductType: string): string[] {
  if (mediaProductType === "REELS") {
    // Meta renombró "plays" a "views" en versiones recientes de la API —
    // se piden las dos porque según la fecha de publicación responde una
    // u otra (el fallback por métrica individual descarta la que falle).
    return ["reach", "likes", "comments", "shares", "saved", "plays", "views", "total_interactions"];
  }
  if (mediaProductType === "STORY") {
    // Las historias expiran a las 24h — solo se pueden leer mientras siguen activas.
    return ["reach", "replies", "exits", "taps_forward", "taps_back"];
  }
  // Publicaciones normales de feed: foto, video o carrusel. Se incluye
  // "views" también por si es un video de feed (no reel).
  return ["reach", "likes", "comments", "shares", "saved", "views", "total_interactions"];
}

async function pedirMetricaUnica(mediaId: string, metric: string, accessToken: string): Promise<number | null> {
  try {
    const data = await graphFetch<{ data: { name: string; values: { value: number }[] }[] }>(
      `/${mediaId}/insights`,
      { access_token: accessToken, metric },
      GRAPH_INSTAGRAM_URL
    );
    return data.data?.[0]?.values?.[0]?.value ?? null;
  } catch {
    return null;
  }
}

async function fetchInsightsDeMedia(mediaId: string, mediaProductType: string, accessToken: string): Promise<Record<string, number>> {
  const metricas = metricasParaTipo(mediaProductType);
  try {
    const data = await graphFetch<{ data: { name: string; values: { value: number }[] }[] }>(
      `/${mediaId}/insights`,
      { access_token: accessToken, metric: metricas.join(",") },
      GRAPH_INSTAGRAM_URL
    );
    const out: Record<string, number> = {};
    for (const m of data.data) {
      out[m.name] = m.values?.[0]?.value ?? 0;
    }
    return out;
  } catch {
    // Si UNA sola métrica de la lista no aplica a esta publicación, la API
    // rechaza el pedido completo y antes se perdían todas las demás. Ahora
    // se piden una por una para quedarse con las que sí respondan.
    const out: Record<string, number> = {};
    await Promise.all(
      metricas.map(async (metric) => {
        const valor = await pedirMetricaUnica(mediaId, metric, accessToken);
        if (valor !== null) out[metric] = valor;
      })
    );
    return out;
  }
}

// Trae las últimas publicaciones (feed + reels) de la cuenta de Instagram
// conectada, con sus métricas. Las historias no se incluyen aquí porque
// expiran a las 24h y /media no las lista — ver fetchInstagramStoriesActivas.
export async function fetchInstagramMedia(conexion: MetaConexion, limite = 50): Promise<InstagramMedia[]> {
  if (!conexion.instagram_business_id || !conexion.instagram_access_token) {
    throw new Error(`La conexión "${conexion.cliente_nombre}" no tiene Instagram conectado.`);
  }
  const token = conexion.instagram_access_token;
  const lista = await graphFetch<{
    data: {
      id: string;
      caption?: string;
      media_type: InstagramMedia["media_type"];
      media_product_type: string;
      timestamp: string;
      permalink: string;
      thumbnail_url?: string;
      media_url?: string;
      like_count?: number;
      comments_count?: number;
    }[];
  }>(
    `/${conexion.instagram_business_id}/media`,
    {
      access_token: token,
      fields:
        "id,caption,media_type,media_product_type,timestamp,permalink,thumbnail_url,media_url,like_count,comments_count",
      limit: String(limite),
    },
    GRAPH_INSTAGRAM_URL
  );

  const conMetricas = await Promise.all(
    lista.data.map(async (m) => {
      const metricas = await fetchInsightsDeMedia(m.id, m.media_product_type, token);
      // like_count/comments_count vienen del objeto de la publicación, no
      // de Insights — casi nunca fallan, así que sirven de respaldo cuando
      // Insights no trae esas dos métricas para este tipo de publicación.
      if (metricas.likes === undefined && m.like_count !== undefined) metricas.likes = m.like_count;
      if (metricas.comments === undefined && m.comments_count !== undefined) metricas.comments = m.comments_count;
      return {
        id: m.id,
        caption: m.caption ?? null,
        media_type: m.media_type,
        media_product_type: m.media_product_type,
        timestamp: m.timestamp,
        permalink: m.permalink,
        imagenUrl: m.thumbnail_url ?? m.media_url ?? null,
        metricas,
      };
    })
  );

  return conMetricas;
}

// Historias activas ahora mismo (últimas 24h) — es la única ventana en la
// que la Graph API las expone, no hay forma de ver historias ya vencidas.
export async function fetchInstagramStoriesActivas(conexion: MetaConexion): Promise<InstagramMedia[]> {
  if (!conexion.instagram_business_id || !conexion.instagram_access_token) {
    throw new Error(`La conexión "${conexion.cliente_nombre}" no tiene Instagram conectado.`);
  }
  const token = conexion.instagram_access_token;
  const lista = await graphFetch<{
    data: {
      id: string;
      media_type: InstagramMedia["media_type"];
      timestamp: string;
      permalink: string;
      thumbnail_url?: string;
    }[];
  }>(
    `/${conexion.instagram_business_id}/stories`,
    { access_token: token, fields: "id,media_type,timestamp,permalink,thumbnail_url" },
    GRAPH_INSTAGRAM_URL
  );

  return Promise.all(
    lista.data.map(async (m) => ({
      id: m.id,
      caption: null,
      media_type: m.media_type,
      media_product_type: "STORY",
      timestamp: m.timestamp,
      permalink: m.permalink,
      imagenUrl: m.thumbnail_url ?? null,
      metricas: await fetchInsightsDeMedia(m.id, "STORY", token),
    }))
  );
}
