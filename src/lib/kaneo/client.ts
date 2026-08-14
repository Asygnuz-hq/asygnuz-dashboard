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

async function kaneoFetch<T>(path: string): Promise<T> {
  const baseUrl = env("KANEO_API_URL");
  const apiKey = env("KANEO_API_KEY");
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    // Los datos operativos cambian seguido; no cachear entre requests.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Kaneo API ${path} -> HTTP ${res.status}`);
  }
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
