// TRM oficial del Banco de la República, vía el dataset público de datos.gov.co
// (recurso "TRM Historica", id mcec-87by). A diferencia de una API de forex
// genérica, esta sí es la tasa que certifica el gobierno colombiano para
// contabilidad, y permite consultar cualquier fecha pasada, no solo "hoy".
export async function fetchTrmOficial(fecha: string): Promise<number | null> {
  try {
    const where = `vigenciadesde<='${fecha}T00:00:00.000' AND vigenciahasta>='${fecha}T00:00:00.000'`;
    const url = `https://www.datos.gov.co/resource/mcec-87by.json?$where=${encodeURIComponent(where)}&$limit=1`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    const valor = Number(data?.[0]?.valor);
    return Number.isFinite(valor) ? valor : null;
  } catch {
    return null;
  }
}
