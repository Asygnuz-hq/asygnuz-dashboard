import { fetchProjects, fetchProjectTasks, fetchTaskRelations, type KaneoTask } from "./client";

// Los 2 workspaces reales tras la separación (2026-08-13). Cada uno ya trae
// sus propios proyectos — no hace falta clasificar por slug como antes de
// dividir el workspace único.
function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}.`);
  return value;
}

const DONE_STATUS_SLUGS = new Set(["done"]);

export type ProyectoMetrica = {
  id: string;
  nombre: string;
  slug: string;
  frente: "Growth" | "Software";
  totalTareas: number;
  completadas: number;
  atrasadas: number;
  pctAvance: number;
  epics: EpicResumen[];
};

export type EpicResumen = {
  id: string;
  titulo: string;
  estado: string;
  hijos: { id: string; titulo: string; estado: string; asignado: string | null }[];
};

export type PersonaMetrica = {
  nombre: string;
  activas: number;
  atrasadas: number;
  completadas: number;
};

export type PuntoTendencia = { etiqueta: string; Growth: number; Software: number };

export type MetricasKaneo = {
  generadoEn: string;
  totalTareas: number;
  totalActivas: number;
  totalCompletadas: number;
  totalAtrasadas: number;
  sinAsignar: number;
  porFrente: { frente: string; total: number; activas: number; completadas: number; atrasadas: number }[];
  porProyecto: ProyectoMetrica[];
  porPersona: PersonaMetrica[];
  prioridadAltaEstancada: { proyecto: string; titulo: string; prioridad: string; dias: number }[];
  tendenciaCreacion: PuntoTendencia[];
};

function esAtrasada(t: KaneoTask): boolean {
  if (!t.dueDate || DONE_STATUS_SLUGS.has(t.status)) return false;
  return new Date(t.dueDate).getTime() < Date.now();
}

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function inicioDeSemana(iso: string): string {
  const d = new Date(iso);
  const dia = d.getDay();
  const diff = d.getDate() - dia + (dia === 0 ? -6 : 1); // lunes como inicio
  const lunes = new Date(d.setDate(diff));
  return lunes.toISOString().slice(0, 10);
}

async function tareasConFrente(workspaceId: string, frente: "Growth" | "Software") {
  const proyectos = await fetchProjects(workspaceId);
  const activos = proyectos.filter((p) => !p.archivedAt);
  const porProyecto = await Promise.all(
    activos.map(async (p) => ({ proyecto: p, tareas: await fetchProjectTasks(p.id) }))
  );
  return porProyecto.map(({ proyecto, tareas }) => ({ proyecto, tareas, frente }));
}

async function construirEpics(tareas: KaneoTask[]): Promise<EpicResumen[]> {
  // Una tarea es "epic" para efectos del reporte si tiene al menos una
  // relación de subtarea donde ella es el origen (padre).
  const porTarea = await Promise.all(
    tareas.map(async (t) => ({ tarea: t, relaciones: await fetchTaskRelations(t.id) }))
  );
  const tareaPorId = new Map(tareas.map((t) => [t.id, t]));

  const epics: EpicResumen[] = [];
  for (const { tarea, relaciones } of porTarea) {
    const hijosIds = relaciones
      .filter((r) => r.relationType === "subtask" && r.sourceTaskId === tarea.id)
      .map((r) => r.targetTaskId);
    if (hijosIds.length === 0) continue;
    epics.push({
      id: tarea.id,
      titulo: tarea.title,
      estado: tarea.status,
      hijos: hijosIds
        .map((id) => tareaPorId.get(id))
        .filter((t): t is KaneoTask => Boolean(t))
        .map((t) => ({ id: t.id, titulo: t.title, estado: t.status, asignado: t.assigneeName })),
    });
  }
  return epics;
}

export async function calcularMetricas(): Promise<MetricasKaneo> {
  const wsGrowth = env("KANEO_WORKSPACE_ID_GROWTH");
  const wsSoftware = env("KANEO_WORKSPACE_ID_SOFTWARE");

  const [growthData, softwareData] = await Promise.all([
    tareasConFrente(wsGrowth, "Growth"),
    tareasConFrente(wsSoftware, "Software"),
  ]);
  const porProyectoData = [...growthData, ...softwareData];

  const porProyecto: ProyectoMetrica[] = await Promise.all(
    porProyectoData.map(async ({ proyecto, tareas, frente }) => {
      const completadas = tareas.filter((t) => DONE_STATUS_SLUGS.has(t.status)).length;
      const atrasadas = tareas.filter(esAtrasada).length;
      const epics = await construirEpics(tareas);
      return {
        id: proyecto.id,
        nombre: proyecto.name,
        slug: proyecto.slug,
        frente,
        totalTareas: tareas.length,
        completadas,
        atrasadas,
        pctAvance: tareas.length > 0 ? completadas / tareas.length : 0,
        epics,
      };
    })
  );

  const todasLasTareas = porProyectoData.flatMap(({ proyecto, tareas, frente }) =>
    tareas.map((t) => ({ ...t, __proyectoNombre: proyecto.name, __frente: frente }))
  );

  const totalCompletadas = todasLasTareas.filter((t) => DONE_STATUS_SLUGS.has(t.status)).length;
  const totalAtrasadas = todasLasTareas.filter(esAtrasada).length;
  const sinAsignar = todasLasTareas.filter((t) => !t.assigneeId && !DONE_STATUS_SLUGS.has(t.status)).length;

  const frenteMap = new Map<string, { total: number; activas: number; completadas: number; atrasadas: number }>();
  for (const pm of porProyecto) {
    const acc = frenteMap.get(pm.frente) ?? { total: 0, activas: 0, completadas: 0, atrasadas: 0 };
    acc.total += pm.totalTareas;
    acc.completadas += pm.completadas;
    acc.activas += pm.totalTareas - pm.completadas;
    acc.atrasadas += pm.atrasadas;
    frenteMap.set(pm.frente, acc);
  }

  const personaMap = new Map<string, PersonaMetrica>();
  for (const t of todasLasTareas) {
    const nombre = t.assigneeName ?? "Sin asignar";
    if (nombre === "Sin asignar") continue;
    const acc = personaMap.get(nombre) ?? { nombre, activas: 0, atrasadas: 0, completadas: 0 };
    if (DONE_STATUS_SLUGS.has(t.status)) acc.completadas += 1;
    else acc.activas += 1;
    if (esAtrasada(t)) acc.atrasadas += 1;
    personaMap.set(nombre, acc);
  }

  const prioridadAltaEstancada = todasLasTareas
    .filter((t) => (t.priority === "high" || t.priority === "urgent") && t.status === "to-do")
    .map((t) => ({
      proyecto: t.__proyectoNombre,
      titulo: t.title,
      prioridad: t.priority,
      dias: diasDesde(t.createdAt),
    }))
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 15);

  // Tendencia: tareas creadas por semana, por frente (con lo que hay hoy;
  // se vuelve más útil semana a semana a medida que se acumula historial).
  const semanaMap = new Map<string, { Growth: number; Software: number }>();
  for (const t of todasLasTareas) {
    const semana = inicioDeSemana(t.createdAt);
    const acc = semanaMap.get(semana) ?? { Growth: 0, Software: 0 };
    acc[t.__frente] += 1;
    semanaMap.set(semana, acc);
  }
  const tendenciaCreacion: PuntoTendencia[] = Array.from(semanaMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([semana, v]) => ({ etiqueta: semana, ...v }));

  return {
    generadoEn: new Date().toISOString(),
    totalTareas: todasLasTareas.length,
    totalActivas: todasLasTareas.length - totalCompletadas,
    totalCompletadas,
    totalAtrasadas,
    sinAsignar,
    porFrente: Array.from(frenteMap.entries()).map(([frente, v]) => ({ frente, ...v })),
    porProyecto: porProyecto.sort((a, b) => b.totalTareas - a.totalTareas),
    porPersona: Array.from(personaMap.values()).sort((a, b) => b.activas - a.activas),
    prioridadAltaEstancada,
    tendenciaCreacion,
  };
}
