import { fetchWorkspaceRequirements, type KaneoConfig } from "./client";

// Lee los Requisitos de Negocio (issueType "requirement") del workspace y arma
// las métricas para el dashboard. El fork expone GET /api/task/requirements que
// ya trae el spec y el avance de historias calculado, así que es una sola
// llamada (antes: un recorrido tablero-por-tablero + un getTask por requisito).

export const TRAZABILIDAD_LABEL: Record<string, string> = {
  inicio: "Inicio",
  cotizacion: "Cotización",
  desarrollo: "Desarrollo",
  pruebas: "Pruebas",
  finalizado: "Finalizado",
  bloqueado: "Bloqueado",
};

export type RequisitoMetrica = {
  id: string;
  numero: number | null;
  titulo: string;
  proyecto: string;
  trazabilidad: string;
  plannedPct: number;
  executedPct: number | null;
  fase: string;
  plataforma: string;
  tipoCambio: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  atrasado: boolean;
  totalHistorias: number;
  historiasHechas: number;
};

export type RequisitosMetrics = {
  generadoEn: string;
  totalRequisitos: number;
  totalHistorias: number;
  porTrazabilidad: { estado: string; label: string; total: number }[];
  avanceGlobalPlan: number;
  avanceGlobalReal: number;
  atrasados: number;
  requisitos: RequisitoMetrica[];
};

export async function calcularRequisitos(
  config: KaneoConfig,
  workspaceId: string,
): Promise<RequisitosMetrics> {
  const crudos = await fetchWorkspaceRequirements(config, workspaceId);

  const requisitos: RequisitoMetrica[] = crudos.map((r) => {
    const spec = r.spec ?? {};
    return {
      id: r.id,
      numero: r.number,
      titulo: r.title,
      proyecto: r.projectName,
      trazabilidad: spec.traceabilityStatus ?? "inicio",
      plannedPct: spec.plannedPct ?? 0,
      executedPct: r.executedPct,
      fase: spec.implementationPhase ?? "",
      plataforma: spec.platform ?? "",
      tipoCambio: spec.changeType ?? "",
      fechaInicio: r.startDate,
      fechaFin: r.dueDate,
      atrasado:
        !!r.dueDate &&
        new Date(r.dueDate).getTime() < Date.now() &&
        (r.executedPct ?? 0) < 100,
      totalHistorias: r.totalStories,
      historiasHechas: r.doneStories,
    };
  });

  const trazMap = new Map<string, number>();
  for (const r of requisitos) {
    trazMap.set(r.trazabilidad, (trazMap.get(r.trazabilidad) ?? 0) + 1);
  }

  const totalHistorias = requisitos.reduce((s, r) => s + r.totalHistorias, 0);
  const avancePlan =
    requisitos.length > 0
      ? Math.round(requisitos.reduce((s, r) => s + r.plannedPct, 0) / requisitos.length)
      : 0;
  const avanceReal =
    requisitos.length > 0
      ? Math.round(
          requisitos.reduce((s, r) => s + (r.executedPct ?? 0), 0) / requisitos.length,
        )
      : 0;

  return {
    generadoEn: new Date().toISOString(),
    totalRequisitos: requisitos.length,
    totalHistorias,
    porTrazabilidad: Object.keys(TRAZABILIDAD_LABEL).map((estado) => ({
      estado,
      label: TRAZABILIDAD_LABEL[estado],
      total: trazMap.get(estado) ?? 0,
    })),
    avanceGlobalPlan: avancePlan,
    avanceGlobalReal: avanceReal,
    atrasados: requisitos.filter((r) => r.atrasado).length,
    requisitos: requisitos.sort((a, b) => b.plannedPct - a.plannedPct),
  };
}
