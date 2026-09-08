"use client";

import { useCallback, useEffect, useState } from "react";
import type { KaneoColumn, KaneoProject, KaneoTask } from "./client";

const STORAGE_KEY = "asygnuz-tablero-proyecto";

async function api<T>(path: string): Promise<T> {
  const res = await fetch(path);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Error en ${path}`);
  return body as T;
}

export function useTablero() {
  const [proyectos, setProyectos] = useState<KaneoProject[] | null>(null);
  const [proyectoId, setProyectoIdState] = useState<string | null>(null);
  const [columnas, setColumnas] = useState<KaneoColumn[]>([]);
  const [tareas, setTareas] = useState<KaneoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1) proyectos del workspace, una vez.
  useEffect(() => {
    let cancelado = false;
    api<KaneoProject[]>("/api/kaneo/projects")
      .then((ps) => {
        if (cancelado) return;
        setProyectos(ps);
        const guardado = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        const inicial = ps.find((p) => p.id === guardado)?.id ?? ps[0]?.id ?? null;
        setProyectoIdState(inicial);
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : "Error leyendo proyectos");
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const cargarTablero = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const { columns, tasks } = await api<{ columns: KaneoColumn[]; tasks: KaneoTask[] }>(
        `/api/kaneo/projects/${id}/board`
      );
      setColumnas(columns);
      setTareas(tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error leyendo el tablero");
    } finally {
      setLoading(false);
    }
  }, []);

  // 2) tablero del proyecto seleccionado, cada vez que cambia.
  useEffect(() => {
    if (proyectoId) cargarTablero(proyectoId);
  }, [proyectoId, cargarTablero]);

  function setProyectoId(id: string) {
    setProyectoIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // navegación privada -- no pasa nada, solo no se recuerda entre sesiones.
    }
  }

  function recargar() {
    if (proyectoId) cargarTablero(proyectoId);
  }

  // Mover una tarea de columna con actualización optimista -- el tablero se
  // siente inmediato aunque la llamada a Kaneo tarde un poco; si falla, se
  // recarga desde el servidor para no dejar el tablero en un estado falso.
  async function moverTarea(taskId: string, status: string) {
    const anterior = tareas;
    setTareas((ts) => ts.map((t) => (t.id === taskId ? { ...t, status } : t)));
    try {
      const res = await fetch(`/api/kaneo/tasks/${taskId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("No se pudo mover la tarea");
    } catch (err) {
      setTareas(anterior);
      setError(err instanceof Error ? err.message : "Error moviendo la tarea");
    }
  }

  return {
    proyectos,
    proyectoId,
    setProyectoId,
    columnas,
    tareas,
    loading,
    error,
    recargar,
    moverTarea,
  };
}
