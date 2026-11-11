import { z } from "zod";
import { espoFetch, fetchAll, type EspoConfig } from "./client";

// Prospección de House of Dev (odontología y estética). Los datos los llena el
// flujo de n8n "Prospección - Calificar A/B/C"; el puntaje, el nivel y la
// etapa máxima los calcula la fórmula de EspoCRM (Lead → beforeSave). Aquí
// solo se lee y se cambia etapa o pauta.

export const ETAPAS = ["Contactado", "Respondió", "Reunión", "Propuesta", "Cliente"] as const;
export const ETAPAS_CON_PERDIDO = [...ETAPAS, "Perdido"] as const;

export type LeadProspeccion = {
  id: string;
  accountName: string | null;
  name: string;
  phoneNumber: string | null;
  website: string | null;
  cNicho: string | null;
  cNivel: string | null;
  cPuntaje: number | null;
  cRating: number | null;
  cResenas: number | null;
  cInstagram: string | null;
  cTienePauta: string | null;
  cLinkAnuncios: string | null;
  cMensaje: string | null;
  cHallazgos: string | null;
  cEtapa: string | null;
  cEtapaMaxima: string | null;
  cContactadoEn: string | null;
};

const CAMPOS =
  "id,accountName,name,phoneNumber,website,cNicho,cNivel,cPuntaje,cRating,cResenas,cInstagram,cTienePauta,cLinkAnuncios,cMensaje,cHallazgos,cEtapa,cEtapaMaxima,cContactadoEn";

export type FilaEmbudo = { nivel: string; calificados: number; porEtapa: Record<(typeof ETAPAS)[number], number> };

export type Prospeccion = {
  cola: LeadProspeccion[];
  enCurso: LeadProspeccion[];
  embudo: FilaEmbudo[];
  contactadosHoy: number;
  contactadosSemana: number;
  pendientesCalificar: number;
};

const esNicho = (l: LeadProspeccion) => l.cNicho === "Odontología" || l.cNicho === "Estética";

export async function obtenerProspeccion(config: EspoConfig, ahora = new Date()): Promise<Prospeccion> {
  // shortcut: trae todos los leads y filtra en memoria (cientos hoy); pasar a filtros `where` de EspoCRM si pasan de ~5.000.
  const todos = await fetchAll<LeadProspeccion>(config, "Lead", CAMPOS);
  const nicho = todos.filter(esNicho);

  const porPuntaje = (a: LeadProspeccion, b: LeadProspeccion) => (b.cPuntaje ?? 0) - (a.cPuntaje ?? 0);
  const cola = nicho.filter((l) => !l.cEtapa && (l.cNivel === "A" || l.cNivel === "B") && l.cMensaje && !l.cMensaje.startsWith("ERROR")).sort(porPuntaje);
  const enCurso = nicho
    .filter((l) => l.cEtapa && l.cEtapa !== "Cliente" && l.cEtapa !== "Perdido")
    .sort((a, b) => (a.cContactadoEn ?? "").localeCompare(b.cContactadoEn ?? ""));

  const embudo: FilaEmbudo[] = ["A", "B", "C"].map((nivel) => {
    const delNivel = nicho.filter((l) => l.cNivel === nivel);
    const porEtapa = Object.fromEntries(
      ETAPAS.map((e, i) => [e, delNivel.filter((l) => ETAPAS.indexOf(l.cEtapaMaxima as (typeof ETAPAS)[number]) >= i).length])
    ) as FilaEmbudo["porEtapa"];
    return { nivel, calificados: delNivel.length, porEtapa };
  });

  // EspoCRM guarda las fechas en UTC ("2026-11-11 21:10:00"); Colombia es UTC-5 sin horario de verano.
  const diaCo = (d: Date) => new Date(d.getTime() - 5 * 3600_000).toISOString().slice(0, 10);
  const hoy = diaCo(ahora);
  const haceSemana = ahora.getTime() - 7 * 86400_000;
  const fechas = nicho.filter((l) => l.cContactadoEn).map((l) => new Date(l.cContactadoEn!.replace(" ", "T") + "Z"));

  return {
    cola,
    enCurso,
    embudo,
    contactadosHoy: fechas.filter((d) => diaCo(d) === hoy).length,
    contactadosSemana: fechas.filter((d) => d.getTime() >= haceSemana).length,
    pendientesCalificar: todos.filter((l) => !l.cNicho).length,
  };
}

export const cambioLeadSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{10,24}$/, "id inválido"),
  cEtapa: z.enum(["", ...ETAPAS_CON_PERDIDO]).optional(),
  cTienePauta: z.enum(["Sí", "No"]).optional(),
}).refine((b) => b.cEtapa !== undefined || b.cTienePauta !== undefined, "nada que cambiar");

export async function actualizarLead(config: EspoConfig, cambio: z.infer<typeof cambioLeadSchema>): Promise<LeadProspeccion> {
  const { id, ...campos } = cambio;
  // Sin select: EspoCRM devuelve el registro completo ya con la fórmula aplicada (nivel, etapa máxima).
  return espoFetch<LeadProspeccion>(config, `/api/v1/Lead/${id}`, { method: "PUT", body: campos });
}
