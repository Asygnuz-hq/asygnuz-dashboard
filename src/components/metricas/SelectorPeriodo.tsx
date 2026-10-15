"use client";

import type { PeriodoMetricas } from "@/lib/portal/avanceTipos";

export type SelectorPeriodoProps = {
  periodoActual: PeriodoMetricas;
  onCambiar?: (periodo: PeriodoMetricas) => void;
  alCambiar?: (periodo: PeriodoMetricas) => void;
};

const PERIODOS: { id: PeriodoMetricas; label: string }[] = [
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "90d", label: "90 días" },
  { id: "mes", label: "Este mes" },
];

export function SelectorPeriodo({ periodoActual, onCambiar, alCambiar }: SelectorPeriodoProps) {
  const cambiar = onCambiar ?? alCambiar ?? (() => {});

  return (
    <div className="inline-flex items-center p-1 rounded-xl bg-surface-alt/80 border border-border" role="group" aria-label="Periodo de análisis">
      {PERIODOS.map((p) => {
        const activo = p.id === periodoActual;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => cambiar(p.id)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activo
                ? "bg-surface text-foreground shadow-sm font-bold border border-border/40"
                : "text-muted hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
