"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

export function QuickAddTask({
  projectId,
  status,
  onDone,
  compact = false,
}: {
  projectId: string;
  /** Columna destino (slug); por defecto la crea en "to-do" como hace Kaneo. */
  status?: string;
  onDone: () => void;
  /** Botón "+" icono-solo (encabezado de columna del tablero) en vez del link de texto. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/kaneo/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title, status }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error creando la tarea");
      setTitle("");
      setOpen(false);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return compact ? (
      <button
        onClick={() => setOpen(true)}
        title="Nueva tarea"
        className="flex items-center rounded-md p-1 text-muted transition-colors hover:bg-surface-alt hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
      </button>
    ) : (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-accent-bright font-medium self-start"
      >
        + Nueva tarea
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título de la tarea"
          disabled={saving}
          className="flex-1 text-xs rounded border border-border bg-background px-2 py-1"
        />
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="text-xs rounded bg-accent text-accent-foreground px-2 py-1 disabled:opacity-60"
        >
          {saving ? "..." : "Crear"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={saving}
          className="text-xs text-muted px-1"
        >
          Cancelar
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
