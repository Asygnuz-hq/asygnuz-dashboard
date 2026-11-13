// Etapas de un negocio (2026-11-13). Siguen al lead después de Prospección
// (EspoCRM llega hasta "Reunión"/"Propuesta"): aquí vive desde el diagnóstico
// hasta la entrega. La probabilidad por defecto se usa si el negocio no trae una propia.

export const ETAPAS = [
  { id: "diagnostico", nombre: "Diagnóstico", prob: 0.1, abierta: true },
  { id: "caso", nombre: "Caso de negocio", prob: 0.2, abierta: true },
  { id: "propuesta", nombre: "Propuesta enviada", prob: 0.4, abierta: true },
  { id: "negociacion", nombre: "Negociación", prob: 0.6, abierta: true },
  { id: "ganado", nombre: "Ganado", prob: 1, abierta: false },
  { id: "desarrollo", nombre: "En desarrollo", prob: 1, abierta: false },
  { id: "entregado", nombre: "Entregado", prob: 1, abierta: false },
  { id: "perdido", nombre: "Perdido", prob: 0, abierta: false },
] as const;

export type EtapaId = (typeof ETAPAS)[number]["id"];

export const ETAPA = Object.fromEntries(ETAPAS.map((e) => [e.id, e])) as Record<EtapaId, (typeof ETAPAS)[number]>;

/** Ganado, en desarrollo o entregado: ya es plata comprometida. */
export const esGanado = (e: EtapaId) => e === "ganado" || e === "desarrollo" || e === "entregado";

export const probDe = (etapa: EtapaId, propia: number | null) => propia ?? ETAPA[etapa]?.prob ?? 0;
