// Cliente de solo lectura contra la API de Kaneo. Corre siempre en servidor
// (route handlers / server components) — la API key nunca debe llegar al navegador.
//
// Multi-tenant: cada cliente del SaaS tiene su propia instancia de Kaneo
// (mismo servidor físico, workspace/api key propios) -- por eso toda función
// de acá recibe un KaneoConfig como primer argumento en vez de leer
// KANEO_API_URL/KANEO_API_KEY de process.env. Quien llama resuelve ese
// config con getKaneoConfigForCurrentUser() (ver tenant-config.ts), nunca
// lo pasa un componente de cliente.

export type KaneoConfig = { apiUrl: string; apiKey: string };

export type KaneoProject = {
  id: string;
  workspaceId: string;
  slug: string;
  icon: string | null;
  name: string;
  description: string | null;
  createdAt: string;
  isPublic: boolean;
  archivedAt: string | null;
  lastTaskNumber: number;
};

export type KaneoTaskLabel = { id: string; name: string; color: string };

export type KaneoTask = {
  id: string;
  title: string;
  number: number;
  description: string | null;
  status: string;
  priority: "no-priority" | "low" | "medium" | "high" | "urgent";
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  userId: string | null;
  assigneeName: string | null;
  assigneeId: string | null;
  projectId: string;
  // Fork ASYGNUZ: "requirement" (Requisito de Negocio) se comporta como épica.
  issueType?: "task" | "story" | "bug" | "epic" | "requirement" | null;
};

async function kaneoFetch<T>(
  config: KaneoConfig,
  path: string,
  init?: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown }
): Promise<T> {
  const res = await fetch(`${config.apiUrl}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    // Los datos operativos cambian seguido; no cachear entre requests.
    cache: "no-store",
  });
  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`Kaneo API ${path} -> HTTP ${res.status}${detalle ? `: ${detalle}` : ""}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function fetchProjects(config: KaneoConfig, workspaceId: string): Promise<KaneoProject[]> {
  return kaneoFetch<KaneoProject[]>(config, `/api/project?workspaceId=${workspaceId}`);
}

// ASYGNUZ: desde 2026-09-01 volvimos a un solo workspace (antes había uno
// separado por frente, con su propio KANEO_WORKSPACE_ID_GROWTH/SOFTWARE).
// Ahora el frente se distingue por el nombre del proyecto: prefijo
// "[Growth] "/"[Software] " para los proyectos de cliente, o el nombre
// exacto de los proyectos internos de seguimiento de cada unidad. Lo que no
// matchea (p. ej. "Proyectos Asygnuz", el catch-all general) no pertenece a
// ningún frente y se excluye de los reportes por frente. Es una convención
// propia del tenant ASYGNUZ, no algo que otros clientes del SaaS necesiten.
export function frenteDeProyecto(nombre: string): "Growth" | "Software" | null {
  if (nombre.startsWith("[Growth] ") || nombre === "ASYGNUZ Growth") return "Growth";
  if (nombre.startsWith("[Software] ") || nombre === "ASYGNUZ Software") return "Software";
  return null;
}

export async function fetchProjectTasks(config: KaneoConfig, projectId: string): Promise<KaneoTask[]> {
  const resp = await kaneoFetch<{ data: { columns: { tasks: KaneoTask[] }[] } }>(
    config,
    `/api/task/tasks/${projectId}`
  );
  return resp.data.columns.flatMap((c) => c.tasks);
}

export type KaneoTaskRelation = {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
  relationType: "subtask" | "blocks" | "related";
};

// No hay endpoint masivo de relaciones: se consulta tarea por tarea.
export async function fetchTaskRelations(config: KaneoConfig, taskId: string): Promise<KaneoTaskRelation[]> {
  try {
    return await kaneoFetch<KaneoTaskRelation[]>(config, `/api/task-relation/${taskId}`);
  } catch {
    return [];
  }
}

export type KaneoWorkspaceMember = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
};

export async function fetchWorkspaceMembers(
  config: KaneoConfig,
  workspaceId: string
): Promise<KaneoWorkspaceMember[]> {
  return kaneoFetch<KaneoWorkspaceMember[]>(config, `/api/workspace/${workspaceId}/members`);
}

// Los siguientes 3 usan el endpoint /api/project-member del fork
// (Asygnuz-hq/kaneo, PR #1) — en producción desde 2026-08-14.
export type KaneoProjectMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  createdAt: string;
};

export async function fetchProjectMembers(
  config: KaneoConfig,
  projectId: string
): Promise<KaneoProjectMember[]> {
  return kaneoFetch<KaneoProjectMember[]>(config, `/api/project-member/${projectId}`);
}

export async function addProjectMember(config: KaneoConfig, projectId: string, userId: string): Promise<void> {
  await kaneoFetch(config, `/api/project-member/${projectId}`, { method: "POST", body: { userId } });
}

export async function removeProjectMember(
  config: KaneoConfig,
  projectId: string,
  userId: string
): Promise<void> {
  await kaneoFetch(config, `/api/project-member/${projectId}/${userId}`, { method: "DELETE" });
}

// Escritura de tareas -- la llave de Kaneo que usa este cliente está acotada
// a task:[read,create,update] (ver apps/api/src/user/controllers en el fork),
// nunca puede hacer más que eso aunque el resto de la cuenta tenga más acceso.

export async function createTask(
  config: KaneoConfig,
  projectId: string,
  input: { title: string; description?: string; status: string; priority?: string }
): Promise<KaneoTask> {
  return kaneoFetch<KaneoTask>(config, `/api/task/${projectId}`, {
    method: "POST",
    body: {
      title: input.title,
      description: input.description ?? "",
      status: input.status,
      priority: input.priority ?? "no-priority",
    },
  });
}

export async function updateTaskStatus(config: KaneoConfig, taskId: string, status: string): Promise<KaneoTask> {
  return kaneoFetch<KaneoTask>(config, `/api/task/status/${taskId}`, {
    method: "PUT",
    body: { status },
  });
}

export async function getTask(config: KaneoConfig, taskId: string): Promise<KaneoTask> {
  return kaneoFetch<KaneoTask>(config, `/api/task/${taskId}`);
}

export async function updateTaskTitle(config: KaneoConfig, taskId: string, title: string): Promise<KaneoTask> {
  return kaneoFetch<KaneoTask>(config, `/api/task/title/${taskId}`, { method: "PUT", body: { title } });
}

export async function updateTaskDescription(
  config: KaneoConfig,
  taskId: string,
  description: string
): Promise<KaneoTask> {
  return kaneoFetch<KaneoTask>(config, `/api/task/description/${taskId}`, {
    method: "PUT",
    body: { description },
  });
}

export async function updateTaskPriority(
  config: KaneoConfig,
  taskId: string,
  priority: KaneoTask["priority"]
): Promise<KaneoTask> {
  return kaneoFetch<KaneoTask>(config, `/api/task/priority/${taskId}`, {
    method: "PUT",
    body: { priority },
  });
}

export type KaneoComment = {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: { name: string; image: string | null };
};

// GET /api/comment/{taskId} no exige task:update (solo membresía del
// workspace), pero crear sí -- ambas ya cubiertas por la llave acotada.
export async function getTaskComments(config: KaneoConfig, taskId: string): Promise<KaneoComment[]> {
  return kaneoFetch<KaneoComment[]>(config, `/api/comment/${taskId}`);
}

export async function createTaskComment(config: KaneoConfig, taskId: string, content: string): Promise<void> {
  await kaneoFetch(config, `/api/comment/${taskId}`, { method: "POST", body: { content } });
}

// /api/task/{id} (getTask) no trae labels -- solo el tablero las embebe.
export async function getTaskLabels(config: KaneoConfig, taskId: string): Promise<KaneoTaskLabel[]> {
  return kaneoFetch<KaneoTaskLabel[]>(config, `/api/label/task/${taskId}`);
}
