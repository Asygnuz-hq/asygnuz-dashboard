"use client";

import { useState } from "react";

export function MarkTaskDone({ taskId, onDone }: { taskId: string; onDone: () => void }) {
  const [saving, setSaving] = useState(false);

  async function handleClick() {
    setSaving(true);
    try {
      const res = await fetch(`/api/kaneo/tasks/${taskId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Error marcando la tarea como hecha");
      }
      onDone();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={saving}
      title="Marcar como hecha"
      className="text-xs text-accent-bright shrink-0 disabled:opacity-60"
    >
      {saving ? "..." : "✓ Hecha"}
    </button>
  );
}
