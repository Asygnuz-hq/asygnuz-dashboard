// Cliente de solo lectura contra la API de EspoCRM. Corre siempre en servidor
// (route handlers) — la API key nunca debe llegar al navegador.

export type EspoLead = {
  id: string;
  name: string;
  accountName: string | null;
  status: string;
  source: string | null;
  phoneNumber: string | null;
  website: string | null;
  description: string | null;
  createdAt: string;
  modifiedAt: string;
};

export type EspoOpportunity = {
  id: string;
  name: string;
  stage: string;
  amount: number;
  amountCurrency: string;
  createdAt: string;
  closeDate: string | null;
};

// Credenciales del EspoCRM del tenant de la sesión — las resuelve
// getEspoConfigForCurrentUser() (tabla tenant_espocrm), nunca variables de
// entorno globales (Kaneo #34).
export type EspoConfig = { apiUrl: string; apiKey: string };

async function espoFetch<T>(config: EspoConfig, path: string): Promise<T> {
  const res = await fetch(`${config.apiUrl}${path}`, {
    headers: { "X-Api-Key": config.apiKey },
    // Datos operativos: no cachear entre requests.
    cache: "no-store",
  });
  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`EspoCRM API ${path} -> HTTP ${res.status}${detalle ? `: ${detalle}` : ""}`);
  }
  return res.json() as Promise<T>;
}

// EspoCRM pagina de a 200 por defecto; los volúmenes actuales (decenas/cientos
// de leads) caben en un par de vueltas. Se trae todo para agregar en memoria,
// igual que el cliente de Kaneo.
async function fetchAll<T>(config: EspoConfig, entity: string, select: string): Promise<T[]> {
  const pageSize = 200;
  let offset = 0;
  const out: T[] = [];
  for (;;) {
    const resp = await espoFetch<{ total: number; list: T[] }>(
      config,
      `/api/v1/${entity}?maxSize=${pageSize}&offset=${offset}&select=${select}&orderBy=createdAt&order=desc`
    );
    out.push(...resp.list);
    if (out.length >= resp.total || resp.list.length === 0) break;
    offset += pageSize;
  }
  return out;
}

export async function fetchLeads(config: EspoConfig): Promise<EspoLead[]> {
  return fetchAll<EspoLead>(
    config,
    "Lead",
    "id,name,accountName,status,source,phoneNumber,website,description,createdAt,modifiedAt"
  );
}

export async function fetchOpportunities(config: EspoConfig): Promise<EspoOpportunity[]> {
  return fetchAll<EspoOpportunity>(
    config,
    "Opportunity",
    "id,name,stage,amount,amountCurrency,createdAt,closeDate"
  );
}
