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
  // instagram_basic queda fuera por ahora: pide tener el producto de
  // Instagram agregado en la App de Meta, que todavía no está. Sin él, el
  // conector igual lee métricas de anuncios normal — solo no trae el
  // instagram_business_id de cada página. Se agrega más adelante si hace falta.
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
