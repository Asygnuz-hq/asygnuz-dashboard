// Cliente de solo lectura contra la API de Kaneo. Corre siempre en servidor
// (route handlers / server components) — la API key nunca debe llegar al navegador.

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
};

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name} (configuración de Kaneo). Revisa .env.local.`
    );
  }
  return value;
}

async function kaneoFetch<T>(
  path: string,
  init?: { method?: "GET" | "POST" | "DELETE"; body?: unknown }
): Promise<T> {
  const baseUrl = env("KANEO_API_URL");
  const apiKey = env("KANEO_API_KEY");
  const res = await fetch(`${baseUrl}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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

export async function fetchProjects(workspaceId: string): Promise<KaneoProject[]> {
  return kaneoFetch<KaneoProject[]>(`/api/project?workspaceId=${workspaceId}`);
}

export async function fetchProjectTasks(projectId: string): Promise<KaneoTask[]> {
  const resp = await kaneoFetch<{ data: { columns: { tasks: KaneoTask[] }[] } }>(
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
export async function fetchTaskRelations(taskId: string): Promise<KaneoTaskRelation[]> {
  try {
    return await kaneoFetch<KaneoTaskRelation[]>(`/api/task-relation/${taskId}`);
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

export async function fetchWorkspaceMembers(workspaceId: string): Promise<KaneoWorkspaceMember[]> {
  return kaneoFetch<KaneoWorkspaceMember[]>(`/api/workspace/${workspaceId}/members`);
}

// Los siguientes 3 requieren el endpoint /api/project-member del fork
// (Asygnuz-hq/kaneo, PR #1) — no existe aún en el Kaneo de producción.
export type KaneoProjectMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  createdAt: string;
};

export async function fetchProjectMembers(projectId: string): Promise<KaneoProjectMember[]> {
  return kaneoFetch<KaneoProjectMember[]>(`/api/project-member/${projectId}`);
}

export async function addProjectMember(projectId: string, userId: string): Promise<void> {
  await kaneoFetch(`/api/project-member/${projectId}`, { method: "POST", body: { userId } });
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  await kaneoFetch(`/api/project-member/${projectId}/${userId}`, { method: "DELETE" });
}
