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

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name} (configuración de EspoCRM). Revisa .env.local.`);
  }
  return value;
}

async function espoFetch<T>(path: string): Promise<T> {
  const baseUrl = env("ESPOCRM_API_URL");
  const apiKey = env("ESPOCRM_API_KEY");
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { "X-Api-Key": apiKey },
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
async function fetchAll<T>(entity: string, select: string): Promise<T[]> {
  const pageSize = 200;
  let offset = 0;
  const out: T[] = [];
  for (;;) {
    const resp = await espoFetch<{ total: number; list: T[] }>(
      `/api/v1/${entity}?maxSize=${pageSize}&offset=${offset}&select=${select}&orderBy=createdAt&order=desc`
    );
    out.push(...resp.list);
    if (out.length >= resp.total || resp.list.length === 0) break;
    offset += pageSize;
  }
  return out;
}

export async function fetchLeads(): Promise<EspoLead[]> {
  return fetchAll<EspoLead>(
    "Lead",
    "id,name,accountName,status,source,phoneNumber,website,description,createdAt,modifiedAt"
  );
}

export async function fetchOpportunities(): Promise<EspoOpportunity[]> {
  return fetchAll<EspoOpportunity>(
    "Opportunity",
    "id,name,stage,amount,amountCurrency,createdAt,closeDate"
  );
}
