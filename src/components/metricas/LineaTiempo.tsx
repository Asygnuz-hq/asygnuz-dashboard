"use client";

import type { TareaAvance } from "@/lib/portal/avanceTipos";

export type LineaTiempoProps = {
  hitos?: TareaAvance[];
  tareas?: TareaAvance[];
  acento?: string;
};

export function LineaTiempo({ hitos, tareas, acento = "var(--acento-cliente)" }: LineaTiempoProps) {
  const listaHitos = hitos ?? tareas ?? [];

  if (listaHitos.length === 0) {
    return <p className="text-xs text-muted">Sin entregas programadas en los próximos días.</p>;
  }

  return (
    <div className="relative flex items-start justify-between w-full py-4 px-2 overflow-x-auto">
      <div className="absolute top-[26px] left-4 right-4 h-0.5 bg-border -z-0" />

      {listaHitos.map((h, i) => {
        const fecha = h.fechaLimite
          ? new Date(h.fechaLimite).toLocaleDateString("es-CO", { day: "numeric", month: "short" })
          : "Pronto";
        const esHito = h.isMilestone;

        return (
          <div key={i} className="relative z-10 flex flex-col items-center text-center max-w-[130px] px-1">
            <div
              className={`w-5 h-5 rounded-full border-2 bg-surface mb-2 flex items-center justify-center transition-all ${
                esHito
                  ? "border-warning bg-warning shadow-[0_0_12px_rgba(217,119,6,0.4)]"
                  : "border-[var(--acento)] shadow-sm"
              }`}
              style={{ borderColor: esHito ? "#ffd700" : acento }}
            >
              {esHito && <span className="text-[10px] text-black font-bold">★</span>}
            </div>
            <span className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
              {h.titulo}
            </span>
            <span className="text-[11px] text-muted mt-0.5 font-medium">{fecha}</span>
          </div>
        );
      })}
    </div>
  );
}
