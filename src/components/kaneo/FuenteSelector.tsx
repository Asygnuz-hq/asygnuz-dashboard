"use client";

import type { KaneoFuente } from "@/lib/kaneo/fuentes";

// Selector para elegir de qué Kaneo se muestran las métricas. No se
// renderiza si el cliente solo tiene su Kaneo principal.
export function FuenteSelector({
  fuentes,
  fuenteId,
  onChange,
}: {
  fuentes: KaneoFuente[];
  fuenteId: string;
  onChange: (id: string) => void;
}) {
  if (fuentes.length <= 1) return null;

  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      Kaneo:
      <select
        value={fuenteId}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
      >
        {fuentes.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nombre}
            {f.principal ? "" : " (externo)"}
          </option>
        ))}
      </select>
    </label>
  );
}
