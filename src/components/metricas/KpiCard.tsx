"use client";

import { FUENTE_DISPLAY } from "@/lib/portal/fuente";
import type { DeltaComparativo } from "@/lib/portal/avanceTipos";

type KpiCardProps = {
  etiqueta: string;
  valor: string;
  icono?: string;
  delta?: DeltaComparativo | null;
  benchmark?: string;
  nota?: string;
  acento?: string;
};

export function KpiCard({
  etiqueta,
  valor,
  icono,
  delta,
  benchmark,
  nota,
  acento = "var(--accent-bright)",
}: KpiCardProps) {
  return (
    <div
      className="glass glass-hover rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between"
      style={{ borderTop: `3px solid ${acento}` }}
    >
      <div>
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted mb-2">
          <span>{etiqueta}</span>
          {icono && <span className="text-base" aria-hidden>{icono}</span>}
        </div>
        <p
          className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: FUENTE_DISPLAY }}
        >
          {valor}
        </p>

        {delta && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                delta.esPositivo
                  ? "text-success bg-success/10 border border-success/20"
                  : "text-danger bg-danger/10 border border-danger/20"
              }`}
            >
              {delta.esPositivo ? "▲" : "▼"}{" "}
              {delta.deltaPct > 0 ? `${delta.deltaPct > 0 ? "+" : ""}${delta.deltaPct}%` : `${delta.deltaPct}%`}
            </span>
            <span className="text-[11px] text-muted">vs periodo anterior</span>
          </div>
        )}

        {nota && <p className="mt-1 text-xs text-muted">{nota}</p>}
      </div>

      {benchmark && (
        <div className="mt-3 pt-2.5 border-t border-border/50 text-[11px] text-muted flex items-center gap-1.5">
          <span aria-hidden>📍</span>
          <span>{benchmark}</span>
        </div>
      )}
    </div>
  );
}
