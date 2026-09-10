import {
  fetchProjects,
  fetchProjectTasks,
  fetchTaskRelations,
  getTask,
  type KaneoConfig,
} from "./client";

// Lee los Requisitos de Negocio (issueType "requirement") de todos los
// proyectos del workspace y arma las métricas para el dashboard. El board
// no devuelve el spec ni el % ejecutado, así que por cada requisito se
// hace un GET /api/task/{id} (son pocos: N proyectos * pocos requisitos).

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

type Spec = {
  traceabilityStatus?: string;
  plannedPct?: number;
  implementationPhase?: string;
  platform?: string;
  changeType?: string;
};

const DONE_SLUGS = new Set(["done", "finalizado", "archived"]);

export async function calcularRequisitos(
  config: KaneoConfig,
  workspaceId: string,
): Promise<RequisitosMetrics> {
  const proyectos = (await fetchProjects(config, workspaceId)).filter((p) => !p.archivedAt);

  const requisitos: RequisitoMetrica[] = [];

  for (const proyecto of proyectos) {
    const tareas = await fetchProjectTasks(config, proyecto.id);
    const reqTasks = tareas.filter((t) => t.issueType === "requirement");
    if (reqTasks.length === 0) continue;

    const tareaPorId = new Map(tareas.map((t) => [t.id, t]));

    for (const rt of reqTasks) {
      const [full, relaciones] = await Promise.all([
        getTask(config, rt.id) as Promise<
          typeof rt & { spec?: Spec | null; executedPct?: number | null }
        >,
        fetchTaskRelations(config, rt.id),
      ]);
      const spec = full.spec ?? {};
      const hijosIds = relaciones
        .filter((r) => r.relationType === "subtask" && r.sourceTaskId === rt.id)
        .map((r) => r.targetTaskId);
      const historias = hijosIds
        .map((id) => tareaPorId.get(id))
        .filter((h): h is (typeof tareas)[number] => Boolean(h));
      const hechas = historias.filter((h) => DONE_SLUGS.has(h.status)).length;

      requisitos.push({
        id: rt.id,
        numero: rt.number,
        titulo: rt.title,
        proyecto: proyecto.name,
        trazabilidad: spec.traceabilityStatus ?? "inicio",
        plannedPct: spec.plannedPct ?? 0,
        executedPct: full.executedPct ?? null,
        fase: spec.implementationPhase ?? "",
        plataforma: spec.platform ?? "",
        tipoCambio: spec.changeType ?? "",
        fechaInicio: rt.startDate,
        fechaFin: rt.dueDate,
        atrasado:
          !!rt.dueDate &&
          new Date(rt.dueDate).getTime() < Date.now() &&
          (full.executedPct ?? 0) < 100,
        totalHistorias: historias.length,
        historiasHechas: hechas,
      });
    }
  }

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
