// Cliente contra la Graph API de Meta (Marketing API). Corre siempre en
// servidor — el access_token de cada cliente nunca debe llegar al navegador.

const GRAPH_VERSION = "v21.0";
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type MetaConexion = {
  id: string;
  cliente_nombre: string;
  ad_account_id: string | null;
  page_id: string | null;
  instagram_business_id: string | null;
  access_token: string;
  token_expira_en: string | null;
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

async function graphFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${GRAPH_URL}${path}`);
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

export type CuentaDisponible = {
  ad_account_id: string;
  ad_account_name: string;
  page_id: string | null;
  page_name: string | null;
  instagram_business_id: string | null;
};

// Trae las cuentas de anuncios y páginas a las que el usuario que autorizó
// el login le dio acceso a la App — para que elija cuál conectar a qué
// cliente si maneja varias.
export async function fetchCuentasDisponibles(accessToken: string): Promise<CuentaDisponible[]> {
  const cuentas = await graphFetch<{ data: { account_id: string; name: string }[] }>(
    "/me/adaccounts",
    { access_token: accessToken, fields: "account_id,name" }
  );
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
  thumbnail_url?: string;
  metricas: Record<string, number>;
};

// Métricas válidas por tipo — pedirle a la Graph API una métrica que no
// aplica a ese tipo de media da error, así que se arma la lista según
// media_product_type en vez de pedir siempre las mismas.
function metricasParaTipo(mediaProductType: string): string[] {
  if (mediaProductType === "REELS") {
    return ["reach", "likes", "comments", "shares", "saved", "plays", "total_interactions"];
  }
  if (mediaProductType === "STORY") {
    // Las historias expiran a las 24h — solo se pueden leer mientras siguen activas.
    return ["reach", "replies", "exits", "taps_forward", "taps_back"];
  }
  // Publicaciones normales de feed: foto, video o carrusel.
  return ["reach", "likes", "comments", "shares", "saved", "total_interactions"];
}

async function fetchInsightsDeMedia(mediaId: string, mediaProductType: string, accessToken: string): Promise<Record<string, number>> {
  const metricas = metricasParaTipo(mediaProductType);
  try {
    const data = await graphFetch<{ data: { name: string; values: { value: number }[] }[] }>(
      `/${mediaId}/insights`,
      { access_token: accessToken, metric: metricas.join(",") }
    );
    const out: Record<string, number> = {};
    for (const m of data.data) {
      out[m.name] = m.values?.[0]?.value ?? 0;
    }
    return out;
  } catch {
    // Publicaciones muy viejas o historias ya expiradas a veces no traen
    // insights — se muestra la publicación igual, solo sin métricas.
    return {};
  }
}

// Trae las últimas publicaciones (feed + reels) de la cuenta de Instagram
// conectada, con sus métricas. Las historias no se incluyen aquí porque
// expiran a las 24h y /media no las lista — ver fetchInstagramStoriesActivas.
export async function fetchInstagramMedia(conexion: MetaConexion, limite = 25): Promise<InstagramMedia[]> {
  if (!conexion.instagram_business_id) {
    throw new Error(`La conexión "${conexion.cliente_nombre}" no tiene cuenta de Instagram asociada.`);
  }
  const lista = await graphFetch<{
    data: {
      id: string;
      caption?: string;
      media_type: InstagramMedia["media_type"];
      media_product_type: string;
      timestamp: string;
      permalink: string;
      thumbnail_url?: string;
    }[];
  }>(`/${conexion.instagram_business_id}/media`, {
    access_token: conexion.access_token,
    fields: "id,caption,media_type,media_product_type,timestamp,permalink,thumbnail_url",
    limit: String(limite),
  });

  const conMetricas = await Promise.all(
    lista.data.map(async (m) => ({
      id: m.id,
      caption: m.caption ?? null,
      media_type: m.media_type,
      media_product_type: m.media_product_type,
      timestamp: m.timestamp,
      permalink: m.permalink,
      thumbnail_url: m.thumbnail_url,
      metricas: await fetchInsightsDeMedia(m.id, m.media_product_type, conexion.access_token),
    }))
  );

  return conMetricas;
}

// Historias activas ahora mismo (últimas 24h) — es la única ventana en la
// que la Graph API las expone, no hay forma de ver historias ya vencidas.
export async function fetchInstagramStoriesActivas(conexion: MetaConexion): Promise<InstagramMedia[]> {
  if (!conexion.instagram_business_id) {
    throw new Error(`La conexión "${conexion.cliente_nombre}" no tiene cuenta de Instagram asociada.`);
  }
  const lista = await graphFetch<{
    data: {
      id: string;
      media_type: InstagramMedia["media_type"];
      timestamp: string;
      permalink: string;
      thumbnail_url?: string;
    }[];
  }>(`/${conexion.instagram_business_id}/stories`, {
    access_token: conexion.access_token,
    fields: "id,media_type,timestamp,permalink,thumbnail_url",
  });

  return Promise.all(
    lista.data.map(async (m) => ({
      id: m.id,
      caption: null,
      media_type: m.media_type,
      media_product_type: "STORY",
      timestamp: m.timestamp,
      permalink: m.permalink,
      thumbnail_url: m.thumbnail_url,
      metricas: await fetchInsightsDeMedia(m.id, "STORY", conexion.access_token),
    }))
  );
}
