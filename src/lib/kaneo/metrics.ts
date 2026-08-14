import { fetchProjects, fetchProjectTasks, type KaneoTask } from "./client";

// Mientras el workspace de Kaneo siga sin dividirse en Growth/Software, esta
// tabla es la que decide a qué frente pertenece cada proyecto para las
// métricas. Si el workspace ya está dividido, esto deja de usarse (cada
// proyecto ya vive en su propio workspace) — ver memoria del proyecto Kaneo.
const FRENTE_POR_SLUG: Record<string, "Growth" | "Software"> = {
  growth: "Growth",
  "hybrid-2160": "Growth",
  "mayra-fit": "Growth",
  "glam-studio": "Growth",
  "santi-saga": "Growth",
  "mariana-henao": "Growth",
  "video-analitica": "Software",
  "pro-app": "Software",
  eficacia: "Software",
  software: "Software",
  financieramente: "Software",
};

const DONE_STATUS_SLUGS = new Set(["done"]);

export type ProyectoMetrica = {
  id: string;
  nombre: string;
  slug: string;
  frente: "Growth" | "Software" | "Sin clasificar";
  totalTareas: number;
  completadas: number;
  atrasadas: number;
  pctAvance: number;
};

export type PersonaMetrica = {
  nombre: string;
  activas: number;
  atrasadas: number;
  completadas: number;
};

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
};

function esAtrasada(t: KaneoTask): boolean {
  if (!t.dueDate || DONE_STATUS_SLUGS.has(t.status)) return false;
  return new Date(t.dueDate).getTime() < Date.now();
}

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export async function calcularMetricas(workspaceId: string): Promise<MetricasKaneo> {
  const proyectos = await fetchProjects(workspaceId);
  const activos = proyectos.filter((p) => !p.archivedAt);

  const tareasPorProyecto = await Promise.all(
    activos.map(async (p) => ({ proyecto: p, tareas: await fetchProjectTasks(p.id) }))
  );

  const porProyecto: ProyectoMetrica[] = tareasPorProyecto.map(({ proyecto, tareas }) => {
    const completadas = tareas.filter((t) => DONE_STATUS_SLUGS.has(t.status)).length;
    const atrasadas = tareas.filter(esAtrasada).length;
    return {
      id: proyecto.id,
      nombre: proyecto.name,
      slug: proyecto.slug,
      frente: FRENTE_POR_SLUG[proyecto.slug] ?? "Sin clasificar",
      totalTareas: tareas.length,
      completadas,
      atrasadas,
      pctAvance: tareas.length > 0 ? completadas / tareas.length : 0,
    };
  });

  const todasLasTareas = tareasPorProyecto.flatMap(({ proyecto, tareas }) =>
    tareas.map((t) => ({ ...t, __proyectoNombre: proyecto.name }))
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
  };
}
