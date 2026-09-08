"use client";

import { useEffect, useState } from "react";
import { ActionModal } from "@/components/ActionModal";
import { TaskLabels } from "@/components/kaneo/TaskLabels";
import type { KaneoComment, KaneoTask, KaneoTaskLabel } from "@/lib/kaneo/client";
import { PRIORIDAD_LABEL } from "@/lib/kaneo/labels";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Error en ${path}`);
  return body as T;
}

export function TaskDetailModal({
  taskId,
  onClose,
  onChanged,
}: {
  taskId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [task, setTask] = useState<KaneoTask | null>(null);
  const [comments, setComments] = useState<KaneoComment[]>([]);
  const [labels, setLabels] = useState<KaneoTaskLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [savingField, setSavingField] = useState<string | null>(null);

  const [nuevoComentario, setNuevoComentario] = useState("");
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setLoading(true);
      setError(null);
      try {
        const [t, c, l] = await Promise.all([
          api<KaneoTask>(`/api/kaneo/tasks/${taskId}`),
          api<KaneoComment[]>(`/api/kaneo/tasks/${taskId}/comments`),
          api<KaneoTaskLabel[]>(`/api/kaneo/tasks/${taskId}/labels`),
        ]);
        if (cancelado) return;
        setTask(t);
        setTitle(t.title);
        setDescription(t.description ?? "");
        setComments(c);
        setLabels(l);
      } catch (err) {
        if (!cancelado) setError(err instanceof Error ? err.message : "Error cargando la tarea");
      } finally {
        if (!cancelado) setLoading(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [taskId]);

  async function guardarTitulo() {
    if (!task || title.trim() === task.title) return;
    setSavingField("title");
    try {
      const t = await api<KaneoTask>(`/api/kaneo/tasks/${taskId}/title`, {
        method: "PUT",
        body: JSON.stringify({ title: title.trim() }),
      });
      setTask(t);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando el título");
    } finally {
      setSavingField(null);
    }
  }

  async function guardarDescripcion() {
    if (!task || description === (task.description ?? "")) return;
    setSavingField("description");
    try {
      const t = await api<KaneoTask>(`/api/kaneo/tasks/${taskId}/description`, {
        method: "PUT",
        body: JSON.stringify({ description }),
      });
      setTask(t);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando la descripción");
    } finally {
      setSavingField(null);
    }
  }

  async function cambiarPrioridad(priority: string) {
    if (!task) return;
    setSavingField("priority");
    try {
      const t = await api<KaneoTask>(`/api/kaneo/tasks/${taskId}/priority`, {
        method: "PUT",
        body: JSON.stringify({ priority }),
      });
      setTask(t);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando la prioridad");
    } finally {
      setSavingField(null);
    }
  }

  async function enviarComentario(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;
    setEnviandoComentario(true);
    try {
      await api(`/api/kaneo/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: nuevoComentario.trim() }),
      });
      setNuevoComentario("");
      const c = await api<KaneoComment[]>(`/api/kaneo/tasks/${taskId}/comments`);
      setComments(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error enviando el comentario");
    } finally {
      setEnviandoComentario(false);
    }
  }

  return (
    <ActionModal title={task ? `${task.number ? `#${task.number} — ` : ""}Tarea` : "Tarea"} onClose={onClose} wide>
      <div className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
        {loading && <p className="text-sm text-muted">Cargando…</p>}
        {error && <p className="text-sm text-danger">{error}</p>}

        {task && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted" htmlFor="td-title">
                Título
              </label>
              <input
                id="td-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={guardarTitulo}
                disabled={savingField === "title"}
                className="text-sm rounded border border-border bg-background px-2 py-1.5 font-medium"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted" htmlFor="td-priority">
                Prioridad
              </label>
              <select
                id="td-priority"
                value={task.priority}
                onChange={(e) => cambiarPrioridad(e.target.value)}
                disabled={savingField === "priority"}
                className="text-sm rounded border border-border bg-background px-2 py-1.5 w-fit"
              >
                {Object.entries(PRIORIDAD_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {labels.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted">Etiquetas</span>
                <TaskLabels labels={labels} />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted" htmlFor="td-description">
                Descripción
              </label>
              <textarea
                id="td-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={guardarDescripcion}
                disabled={savingField === "description"}
                rows={4}
                placeholder="Sin descripción"
                className="text-sm rounded border border-border bg-background px-2 py-1.5 resize-y"
              />
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <p className="text-xs text-muted uppercase tracking-wide">
                Comentarios {comments.length > 0 && `(${comments.length})`}
              </p>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="text-sm rounded bg-surface-alt px-2 py-1.5">
                    <p className="text-xs text-muted">{c.user.name}</p>
                    <p>{c.content}</p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-xs text-muted">Sin comentarios todavía.</p>
                )}
              </div>
              <form onSubmit={enviarComentario} className="flex gap-2">
                <input
                  value={nuevoComentario}
                  onChange={(e) => setNuevoComentario(e.target.value)}
                  placeholder="Escribe un comentario…"
                  disabled={enviandoComentario}
                  className="flex-1 text-xs rounded border border-border bg-background px-2 py-1.5"
                />
                <button
                  type="submit"
                  disabled={enviandoComentario || !nuevoComentario.trim()}
                  className="text-xs rounded bg-accent text-accent-foreground px-3 py-1.5 disabled:opacity-60"
                >
                  {enviandoComentario ? "..." : "Comentar"}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </ActionModal>
  );
}
